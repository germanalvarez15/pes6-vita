#!/usr/bin/env bash
# Addresses from a Vita crash dump -> function and line in the last Vita build.
#   addr2line-vita.sh 0x83312818 0x83305ab1 ...
set -uo pipefail
. "$(dirname "$0")/env.sh"
ELF="$WORK/vita-build/pes6vita"
arm-vita-eabi-readelf -lW "$ELF" | grep -E "LOAD|Entry" | head -4
for a in "$@"; do
  printf '%s  ' "$a"
  arm-vita-eabi-addr2line -f -C -i -e "$ELF" "$(printf '0x%x' $(( a & ~1 )))" | paste -sd' '
done
