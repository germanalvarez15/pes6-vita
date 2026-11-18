#!/usr/bin/env bash
# EBOOT.elf + overlays -> C (build/gen, build/gen_ovl). ~311 MB of generated source.
set -euo pipefail
. "$(dirname "$0")/env.sh"
bash "$(dirname "$0")/sync-upstream.sh"      # the emitter is ours too (branch vita)
cd "$UP"
cmake --build third_party/psprecomp/build --target allegrexrecomp -j"$(nproc)" 2>&1 | tail -1
# MIPS registers in C locals inside each function (emit.c, local_regs); LOCAL_REGS=0 = psp_cpu.r[]
export ALLEGREX_LOCAL_REGS="${LOCAL_REGS:-1}"
# VFPU prefixes and more vector operations worked out at translation time (emit.c, vfpu_static)
export ALLEGREX_VFPU_STATIC="${VFPU_STATIC:-1}"
mkdir -p build/names build/gen
python3 tools/names/tunables.py
python3 "$REPO/tools/make_seeds.py" build/EBOOT.elf tools/names/pes6_eboot.txt build/overlays build/seeds_ghidra_ppsspp.txt 08931AE4
ALLEGREX_NAMES=tools/names/pes6_eboot.txt \
ALLEGREX_TUNABLES=build/names/tunables_eboot.txt ALLEGREX_HOOKS=build/names/hooks_eboot.txt \
ALLEGREX_SEEDS=build/seeds_ghidra_ppsspp.txt \
  "$AR" emit build/EBOOT.elf build/gen pes6 2>&1 | tee build/names/emit.log | tail -25
python3 tools/ovl_recomp.py --jobs "$(nproc)" 2>&1 | tee build/names/ovl_recomp.log | tail -45
du -sh build/gen build/gen_ovl
