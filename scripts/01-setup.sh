#!/usr/bin/env bash
# Clones the upstream checkout into the Linux filesystem, links the ISO and builds the
# recompiler toolkit and pspdecrypt.
set -euo pipefail
. "$(dirname "$0")/env.sh"
mkdir -p "$WORK"
if [ ! -d "$UP/.git" ]; then git clone -q "$REPO/external/PES6ANDROIDPORT" "$UP"; fi
git -C "$UP" log --oneline | head -1
mkdir -p "$UP/data" "$UP/build"
iso="$(ls "$REPO"/*.iso | head -1)"
ln -sf "$iso" "$UP/data/pes6.iso"
cd "$UP"
cmake -S third_party/psprecomp -B third_party/psprecomp/build -DCMAKE_BUILD_TYPE=Release >/dev/null
cmake --build third_party/psprecomp/build --target allegrexrecomp -j"$(nproc)" 2>&1 | tail -3
ls -la "$AR"
