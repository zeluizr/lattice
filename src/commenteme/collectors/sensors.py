"""Temperatura (CPU/GPU), ventoinha e bateria — Apple Silicon, SEM sudo.

Temperatura e RPM vêm do SMC via IOKit (ctypes). A ligação é montada com os
tipos exatos (argtypes/restype) para não dar segfault; em caso de qualquer
problema o coletor desliga (ok=False) sem derrubar o app.

Bateria vem do psutil (+ ioreg AppleSmartBattery para ciclos/saúde/temp). Em
desktops (Mac mini/Studio) não há bateria → present=False.
"""

from __future__ import annotations

import ctypes
import re
import struct
import subprocess
import sys
from ctypes import (
    POINTER,
    Structure,
    byref,
    c_char_p,
    c_int,
    c_size_t,
    c_uint8,
    c_uint16,
    c_uint32,
    c_void_p,
    sizeof,
)

import psutil

_KERNEL_INDEX = 2
_READ_BYTES = 5
_READ_KEYINFO = 9

# candidatos de sensores (filtramos no init os que existem nesta máquina)
_CPU_KEYS = [
    "Tp01", "Tp02", "Tp05", "Tp09", "Tp0D", "Tp0H", "Tp0L", "Tp0P", "Tp0T",
    "Tp0X", "Tp0b", "Tp0f", "Tp0j", "Tp0n", "Tp0r", "Tp0v",
    "Te05", "Te0L", "Te0P", "Te0S",
]
_GPU_KEYS = ["Tg05", "Tg09", "Tg0D", "Tg0L", "Tg0T", "Tg0X"]


class _V(Structure):
    _fields_ = [("a", c_uint8), ("b", c_uint8), ("c", c_uint8), ("d", c_uint8), ("e", c_uint16)]


class _P(Structure):
    _fields_ = [("v", c_uint16), ("l", c_uint16), ("c", c_uint32), ("g", c_uint32), ("m", c_uint32)]


class _KI(Structure):
    _fields_ = [("dataSize", c_uint32), ("dataType", c_uint32), ("dataAttributes", c_uint8)]


class _S(Structure):
    _fields_ = [
        ("key", c_uint32), ("vers", _V), ("pl", _P), ("keyInfo", _KI),
        ("result", c_uint8), ("status", c_uint8), ("data8", c_uint8),
        ("data32", c_uint32), ("bytes", c_uint8 * 32),
    ]


def _k2i(s: str) -> int:
    return (ord(s[0]) << 24) | (ord(s[1]) << 16) | (ord(s[2]) << 8) | ord(s[3])


def _i2t(v: int) -> bytes:
    return bytes([(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF])


class SensorsCollector:
    def __init__(self):
        self.ok = False
        self.error: str | None = None
        self._conn = None
        self._cpu_keys: list[str] = []
        self._gpu_keys: list[str] = []
        if sys.platform != "darwin":
            self.error = "SMC só no macOS"
            return
        try:
            self._open()
            self._discover()
            self.ok = True
        except Exception as e:  # noqa: BLE001
            self.error = f"SMC indisponível: {e}"

    def _open(self) -> None:
        iokit = ctypes.CDLL("/System/Library/Frameworks/IOKit.framework/IOKit")
        libc = ctypes.CDLL("/usr/lib/libSystem.dylib")
        self._iokit = iokit
        self._task = c_uint32.in_dll(libc, "mach_task_self_").value

        iokit.IOServiceMatching.restype = c_void_p
        iokit.IOServiceMatching.argtypes = [c_char_p]
        iokit.IOServiceGetMatchingService.restype = c_uint32
        iokit.IOServiceGetMatchingService.argtypes = [c_uint32, c_void_p]
        iokit.IOServiceOpen.restype = c_int
        iokit.IOServiceOpen.argtypes = [c_uint32, c_uint32, c_uint32, POINTER(c_uint32)]
        iokit.IOConnectCallStructMethod.restype = c_int
        iokit.IOConnectCallStructMethod.argtypes = [
            c_uint32, c_uint32, c_void_p, c_size_t, c_void_p, POINTER(c_size_t),
        ]

        svc = iokit.IOServiceGetMatchingService(0, iokit.IOServiceMatching(b"AppleSMC"))
        if not svc:
            raise RuntimeError("AppleSMC ausente")
        conn = c_uint32(0)
        if iokit.IOServiceOpen(svc, self._task, 0, byref(conn)) != 0:
            raise RuntimeError("IOServiceOpen falhou")
        self._conn = conn.value

    def _call(self, inp: _S):
        out = _S()
        osz = c_size_t(sizeof(_S))
        r = self._iokit.IOConnectCallStructMethod(
            self._conn, _KERNEL_INDEX, byref(inp), sizeof(_S), byref(out), byref(osz)
        )
        return r, out

    def _read_raw(self, key: str):
        p = _S()
        p.key = _k2i(key)
        p.data8 = _READ_KEYINFO
        r, o = self._call(p)
        if r != 0:
            return None
        size = o.keyInfo.dataSize
        p2 = _S()
        p2.key = _k2i(key)
        p2.keyInfo.dataSize = size
        p2.keyInfo.dataType = o.keyInfo.dataType
        p2.data8 = _READ_BYTES
        r2, o2 = self._call(p2)
        if r2 != 0:
            return None
        return _i2t(o.keyInfo.dataType), size, bytes(bytearray(o2.bytes[:size]))

    @staticmethod
    def _decode(dt: bytes, raw: bytes):
        if dt == b"flt ":
            return struct.unpack("<f", raw[:4])[0]
        if dt[:3] == b"ui8":
            return raw[0]
        if dt == b"ui16":
            return struct.unpack(">H", raw[:2])[0]
        if dt == b"fpe2":
            return struct.unpack(">H", raw[:2])[0] / 4.0
        return None

    def _read_val(self, key: str):
        rk = self._read_raw(key)
        if not rk:
            return None
        return self._decode(rk[0], rk[2])

    def _read_temp(self, key: str):
        v = self._read_val(key)
        return v if (v is not None and 5 < v < 130) else None

    def _discover(self) -> None:
        self._cpu_keys = [k for k in _CPU_KEYS if self._read_temp(k) is not None]
        self._gpu_keys = [k for k in _GPU_KEYS if self._read_temp(k) is not None]

    def read(self) -> dict:
        if not self.ok:
            return {"ok": False, "error": self.error}

        def avg(keys):
            vals = [v for k in keys if (v := self._read_temp(k)) is not None]
            return sum(vals) / len(vals) if vals else None

        fans = []
        n = self._read_val("FNum") or 0
        for i in range(int(n)):
            rpm = self._read_val(f"F{i}Ac")
            mn = self._read_val(f"F{i}Mn") or 0
            mx = self._read_val(f"F{i}Mx") or 0
            if rpm is None:
                continue
            pct = 0.0
            if mx and mx > mn:
                pct = max(0.0, min(100.0, (rpm - mn) / (mx - mn) * 100))
            fans.append({"rpm": rpm, "min": mn, "max": mx, "pct": pct})

        return {
            "ok": True,
            "cpu_temp": avg(self._cpu_keys),
            "gpu_temp": avg(self._gpu_keys),
            "fans": fans,
        }


def read_battery() -> dict:
    """Bateria via psutil (+ ioreg). present=False em desktops."""
    try:
        b = psutil.sensors_battery()
    except Exception:
        b = None
    if b is None:
        return {"present": False}

    res = {
        "present": True,
        "percent": b.percent,
        "plugged": bool(b.power_plugged),
        "secsleft": b.secsleft,
        "charging": bool(b.power_plugged) and b.percent < 100,
    }
    try:
        out = subprocess.run(
            ["ioreg", "-rn", "AppleSmartBattery", "-w", "0"],
            capture_output=True, text=True, timeout=2,
        ).stdout

        def gi(k):
            m = re.search(r'"%s"\s*=\s*(-?\d+)' % k, out)
            return int(m.group(1)) if m else None

        res["cycles"] = gi("CycleCount")
        mx = gi("AppleRawMaxCapacity") or gi("MaxCapacity")
        dz = gi("DesignCapacity")
        if mx and dz and dz > 0:
            res["health"] = mx / dz * 100
        temp = gi("Temperature")
        if temp:
            res["temp_c"] = temp / 100.0
    except Exception:
        pass
    return res


if __name__ == "__main__":
    import json

    s = SensorsCollector()
    print("SMC:", json.dumps(s.read(), ensure_ascii=False))
    print("Bateria:", read_battery())
