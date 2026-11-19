#!/usr/bin/env bash
# The Vita benchmark: port/ against the WSL checkout's generated C.
#   05-build-vita.sh host    only the hand-written part (seconds): compile errors first
#   05-build-vita.sh         everything, then eboot.bin and the .vpk
# Log: $WORK/vita-build/build.log. The VPK is copied to <repo>/out/.
set -euo pipefail
. "$(dirname "$0")/env.sh"
B="$WORK/vita-build"
mkdir -p "$B" "$REPO/out"
bash "$(dirname "$0")/sync-upstream.sh"
bash "$(dirname "$0")/07-build-ffmpeg-vita.sh"
cmake -S "$REPO/port" -B "$B" -DPES6_UP="$UP" -DPES6_FFMPEG="$WORK/ffmpeg-vita" -DCMAKE_BUILD_TYPE=None -DPES6_GEN_OPT="${PES6_GEN_OPT:--O2}" -DPES6_PROF="${PES6_PROF:-OFF}" > "$B/configure.log" 2>&1 \
  || { tail -30 "$B/configure.log"; exit 1; }
target=all
[ "${1:-}" = host ] && target=pes6_host
if /usr/bin/time -v cmake --build "$B" --target "$target" -j"${JOBS:-4}" -- -k > "$B/build.log" 2>&1; then
  echo BUILD-OK
else
  echo BUILD-FAILED
  grep -E "error|undefined reference" "$B/build.log" | head -40
fi
grep -E "Elapsed|Maximum resident" "$B/build.log" || true
if [ "$target" = all ] && [ -f "$B/pes6vita.vpk" ]; then
  arm-vita-eabi-size "$B/pes6vita" || true
  ls -la "$B/eboot.bin" "$B/pes6vita.vpk"
  cp "$B/pes6vita.vpk" "$REPO/out/"
fi
