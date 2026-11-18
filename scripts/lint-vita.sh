#!/usr/bin/env bash
# The hand-written Vita sources with every warning on (the build silences them for the generated C).
set -uo pipefail
. "$(dirname "$0")/env.sh"
bash "$(dirname "$0")/sync-upstream.sh" >/dev/null
files=("$REPO/port/src/main.c" "$REPO/port/src/stubs.c" "$REPO/port/src/screen.c" "$REPO/port/src/vita_stdio_lock.c" "$UP/runtime/common/ge.c" "$UP/runtime/common/bench.c"
       "$UP/runtime/common/sampler.c" "$UP/third_party/psprecomp/src/hle/hle.c"
       "$UP/third_party/psprecomp/src/mem.c" "$UP/third_party/psprecomp/src/hle/threadman.c"
       "$UP/third_party/psprecomp/src/hle/sascore.c")
for f in "${files[@]}"; do
  arm-vita-eabi-gcc -std=gnu11 -fsyntax-only -Wall -Wextra -Wno-unused-parameter -DPSP_MEM_FAST \
    -DPES6_HAVE_GL -DPES6_PRODUCT_VERSION='""' -I"$UP/third_party/psprecomp/include" -I"$UP/runtime/common" \
    -I"$UP/runtime/desktop" -I"$UP/build/gen_ovl" "$f" 2>&1 | grep -E "warning|error" | head -8
done
echo "lint done"
