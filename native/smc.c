/*
 * lattice-smc — reads Apple Silicon CPU/GPU temperatures and fan speeds from the
 * AppleSMC via IOKit (no sudo) and prints them as JSON. Ported from the original
 * Python ctypes implementation.
 *
 * Build: clang -O2 -framework IOKit -framework CoreFoundation -o lattice-smc smc.c
 * Output: {"ok":true,"cpu_temp":48.2,"gpu_temp":41.0,"fans":[{"rpm":0,"min":0,"max":0,"pct":0}]}
 */

#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
#include <mach/mach.h>
#include <IOKit/IOKitLib.h>

#define KERNEL_INDEX_SMC 2
#define SMC_CMD_READ_BYTES 5
#define SMC_CMD_READ_KEYINFO 9

typedef struct { uint8_t major, minor, build, reserved; uint16_t release; } SMCVers;
typedef struct { uint16_t version, length; uint32_t cpuPLimit, gpuPLimit, memPLimit; } SMCPLimit;
typedef struct { uint32_t dataSize, dataType; uint8_t dataAttributes; } SMCKeyInfo;
typedef struct {
  uint32_t key;
  SMCVers vers;
  SMCPLimit pLimit;
  SMCKeyInfo keyInfo;
  uint8_t result, status, data8;
  uint32_t data32;
  uint8_t bytes[32];
} SMCParam;

static io_connect_t g_conn = 0;

/* Candidate sensor keys; we keep the ones that return a plausible value. */
static const char *CPU_KEYS[] = {
  "Tp01","Tp02","Tp05","Tp09","Tp0D","Tp0H","Tp0L","Tp0P","Tp0T",
  "Tp0X","Tp0b","Tp0f","Tp0j","Tp0n","Tp0r","Tp0v",
  "Te05","Te0L","Te0P","Te0S", NULL
};
static const char *GPU_KEYS[] = { "Tg05","Tg09","Tg0D","Tg0L","Tg0T","Tg0X", NULL };

static uint32_t k2i(const char *s) {
  return ((uint32_t)(uint8_t)s[0] << 24) | ((uint32_t)(uint8_t)s[1] << 16) |
         ((uint32_t)(uint8_t)s[2] << 8) | (uint32_t)(uint8_t)s[3];
}

static kern_return_t smc_call(SMCParam *in, SMCParam *out) {
  size_t outSize = sizeof(SMCParam);
  return IOConnectCallStructMethod(g_conn, KERNEL_INDEX_SMC, in, sizeof(SMCParam), out, &outSize);
}

static bool read_value(const char *key, double *out_val) {
  SMCParam in, out;
  memset(&in, 0, sizeof(in));
  memset(&out, 0, sizeof(out));
  in.key = k2i(key);
  in.data8 = SMC_CMD_READ_KEYINFO;
  if (smc_call(&in, &out) != kIOReturnSuccess) return false;
  uint32_t size = out.keyInfo.dataSize;
  uint32_t type = out.keyInfo.dataType;
  if (size == 0 || size > 32) return false;

  SMCParam in2, out2;
  memset(&in2, 0, sizeof(in2));
  memset(&out2, 0, sizeof(out2));
  in2.key = k2i(key);
  in2.keyInfo.dataSize = size;
  in2.keyInfo.dataType = type;
  in2.data8 = SMC_CMD_READ_BYTES;
  if (smc_call(&in2, &out2) != kIOReturnSuccess) return false;

  char t[5];
  t[0] = (char)((type >> 24) & 0xff);
  t[1] = (char)((type >> 16) & 0xff);
  t[2] = (char)((type >> 8) & 0xff);
  t[3] = (char)(type & 0xff);
  t[4] = 0;
  uint8_t *b = out2.bytes;

  if (memcmp(t, "flt ", 4) == 0) { float f; memcpy(&f, b, 4); *out_val = (double)f; return true; }
  if (strncmp(t, "ui8", 3) == 0) { *out_val = (double)b[0]; return true; }
  if (memcmp(t, "ui16", 4) == 0) { *out_val = (double)((b[0] << 8) | b[1]); return true; }
  if (memcmp(t, "fpe2", 4) == 0) { *out_val = (double)((b[0] << 8) | b[1]) / 4.0; return true; }
  return false;
}

static bool read_temp(const char *key, double *out_val) {
  double v;
  if (read_value(key, &v) && v > 5.0 && v < 130.0) { *out_val = v; return true; }
  return false;
}

static bool avg_temp(const char **keys, double *out_val) {
  double sum = 0.0;
  int n = 0;
  for (int i = 0; keys[i]; i++) {
    double v;
    if (read_temp(keys[i], &v)) { sum += v; n++; }
  }
  if (n == 0) return false;
  *out_val = sum / n;
  return true;
}

int main(void) {
  io_service_t svc = IOServiceGetMatchingService(0, IOServiceMatching("AppleSMC"));
  if (!svc) { printf("{\"ok\":false,\"error\":\"AppleSMC not found\"}\n"); return 0; }
  if (IOServiceOpen(svc, mach_task_self(), 0, &g_conn) != kIOReturnSuccess) {
    IOObjectRelease(svc);
    printf("{\"ok\":false,\"error\":\"IOServiceOpen failed\"}\n");
    return 0;
  }
  IOObjectRelease(svc);

  double cpu, gpu;
  bool hasCpu = avg_temp(CPU_KEYS, &cpu);
  bool hasGpu = avg_temp(GPU_KEYS, &gpu);

  printf("{\"ok\":true,");
  if (hasCpu) printf("\"cpu_temp\":%.2f,", cpu); else printf("\"cpu_temp\":null,");
  if (hasGpu) printf("\"gpu_temp\":%.2f,", gpu); else printf("\"gpu_temp\":null,");

  printf("\"fans\":[");
  double fn;
  int nfans = read_value("FNum", &fn) ? (int)fn : 0;
  int printed = 0;
  for (int i = 0; i < nfans; i++) {
    char ka[8], kn[8], kx[8];
    snprintf(ka, sizeof(ka), "F%dAc", i);
    snprintf(kn, sizeof(kn), "F%dMn", i);
    snprintf(kx, sizeof(kx), "F%dMx", i);
    double rpm, mn = 0.0, mx = 0.0;
    if (!read_value(ka, &rpm)) continue;
    read_value(kn, &mn);
    read_value(kx, &mx);
    double pct = 0.0;
    if (mx > mn) {
      pct = (rpm - mn) / (mx - mn) * 100.0;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
    }
    if (printed++) printf(",");
    printf("{\"rpm\":%.0f,\"min\":%.0f,\"max\":%.0f,\"pct\":%.0f}", rpm, mn, mx, pct);
  }
  printf("]}\n");

  IOServiceClose(g_conn);
  return 0;
}
