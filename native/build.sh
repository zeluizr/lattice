#!/usr/bin/env bash
# Build the lattice-smc helper and place it in prebuilds/<platform>-<arch>/.
# The prebuilt binary is shipped in the npm package so `npx @zeluizr/lattice`
# works without a compiler on the user's machine.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"

arch="$(uname -m)"        # arm64
plat="$(uname -s | tr '[:upper:]' '[:lower:]')"  # darwin
outdir="$root/prebuilds/${plat}-${arch}"
mkdir -p "$outdir"

if [[ "$plat" != "darwin" ]]; then
  echo "lattice-smc only builds on macOS (got $plat) — skipping." >&2
  exit 0
fi

clang -O2 -Wall -framework IOKit -framework CoreFoundation \
  -o "$outdir/lattice-smc" "$here/smc.c"
chmod +x "$outdir/lattice-smc"
echo "built: $outdir/lattice-smc"
