#!/usr/bin/env bash
# Headless desktop host (Linux, GCC): the reference the Vita build is compared against.
# Log: $UP/build/desktop-build.log
set -euo pipefail
. "$(dirname "$0")/env.sh"
cd "$UP"
# PES6_PROF=ON (default here): the generated code keeps the profiler's function marks, as on the Vita.
cmake -S runtime/desktop -B runtime/desktop/build -DCMAKE_BUILD_TYPE=None -DPES6_PROF="${PES6_PROF:-ON}" \
      -DCMAKE_C_STANDARD_LIBRARIES="-lm -lpthread" > build/desktop-build.log 2>&1
/usr/bin/time -v cmake --build runtime/desktop/build --target pes6 -j"${JOBS:-6}" >> build/desktop-build.log 2>&1 \
  && echo BUILD-OK || echo BUILD-FAILED
grep -E "error|Error" build/desktop-build.log | head -30 || true
grep -E "Elapsed|Maximum resident" build/desktop-build.log || true
ls -la runtime/desktop/build/pes6 2>/dev/null || true
