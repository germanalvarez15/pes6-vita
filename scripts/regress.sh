#!/usr/bin/env bash
# Upstream's regression suite (tools/regress.sh: boot, match and wireless runs, their captures
# compared by MD5) on this Linux build, against hashes recorded here: upstream's were recorded on
# its Mac (ARM, clang) and floating point need not round the same way on x86 with GCC.
#   regress.sh baseline   record the current build's hashes in $WORK/regress/expected.txt
#   regress.sh            compare the current build against them (exit 1 on a change)
# Upstream's own tools/regress/expected.txt is left as it was.
set -uo pipefail
. "$(dirname "$0")/env.sh"
cd "$UP"
SAVED="$WORK/regress/expected.txt"
mkdir -p "$WORK/regress"
cp tools/regress/expected.txt "$WORK/regress/upstream-expected.txt"
rc=0
if [ "${1:-}" = baseline ]; then
  : > tools/regress/expected.txt
  tools/regress.sh --update; rc=$?
  cp tools/regress/expected.txt "$SAVED"
  echo "--- against upstream's hashes (Mac):"
  join <(awk '{print $1"_"$2, $3}' "$SAVED" | sort) \
       <(awk '{print $1"_"$2, $3}' "$WORK/regress/upstream-expected.txt" | sort) \
    | awk '{ print ($2 == $3 ? "same " : "diff ") $1 }'
else
  [ -s "$SAVED" ] || { echo "no baseline: run regress.sh baseline first"; exit 2; }
  cp "$SAVED" tools/regress/expected.txt
  tools/regress.sh; rc=$?
fi
cp "$WORK/regress/upstream-expected.txt" tools/regress/expected.txt
exit $rc
