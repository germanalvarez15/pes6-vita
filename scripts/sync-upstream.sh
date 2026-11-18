#!/usr/bin/env bash
# Copies the hand-written sources of external/PES6ANDROIDPORT (branch vita, edited from Windows)
# into the WSL checkout that holds the generated C. The generated C and build trees stay put.
set -euo pipefail
. "$(dirname "$0")/env.sh"
SRC="$REPO/external/PES6ANDROIDPORT"
for d in runtime third_party tools; do
  rsync -rl --checksum --exclude 'build/' --exclude 'build-*/' "$SRC/$d/" "$UP/$d/"
done
echo "synced $(git -C "$SRC" rev-parse --abbrev-ref HEAD) + working tree -> $UP"
