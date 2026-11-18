#!/usr/bin/env bash
# The same measurement as the Vita host, on this PC: reference script to the match, GE without
# drawing, 900 match frames timed from 8@450. Prints the [bench] lines.
#   DRAW=1 06-desktop-bench.sh   draws (software GE) and captures the menu and the match as PPM
# Log and captures: $UP/build/bench/
set -uo pipefail
. "$(dirname "$0")/env.sh"
cd "$UP"
EXTRA_INPUT=""; eval "$(sed -n '/^export PES6_INPUT=/,/EXTRA_INPUT/p' tools/ref_match.sh)"
echo "PES6_INPUT: ${PES6_INPUT:0:60}... (${#PES6_INPUT} chars)"
out=build/bench; mkdir -p "$out"
rm -rf "$out/io"; mkdir -p "$out/io" "$out/nomods"
tag=nodraw; extra=(PES6_GE_NODRAW=1)
if [ "${DRAW:-0}" = 1 ]; then
  tag=draw; extra=(PES6_CAPTURE_AT=4@300,4@2500,8@600,8@900 PES6_CAPTURE_PREFIX="$out/shot")
fi
env PES6_VERSION=original PES6_MENU=0 PES6_MODS="$out/nomods" PES6_IO_ROOT="$out/io" \
    PES6_BENCH=1 PES6_BENCH_FROM=450 PES6_BENCH_EVERY=300 PES6_STOP_AT=8@1350 "${extra[@]}" \
    PES6_PROF="${PROF:-1}" PES6_PROF_OUT="$out/prof.txt" \
    "${BIN:-./runtime/desktop/build/pes6}" build/EBOOT.elf --seconds 1200 > "$out/$tag.log" 2>&1
echo "exit $?"
grep -E "^\[bench\]|dispatch:|bad mem|scene stack|game thread" "$out/$tag.log" | grep -v "scene [0-9]* at" | tail -30
if [ -s "$out/prof.txt" ]; then      # the sampler's table, named (tools/prof_report.py)
  python3 "$REPO/tools/prof_report.py" "$out/prof.txt" --top 25 > "$out/prof_report.txt" && head -60 "$out/prof_report.txt"
fi
ls "$out"/shot* 2>/dev/null || true
