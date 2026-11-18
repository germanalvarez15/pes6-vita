#!/usr/bin/env bash
# Reports the tools the build needs. Run inside WSL.
: "${VITASDK:=/usr/local/vitasdk}"
export VITASDK PATH="$VITASDK/bin:$PATH"
for t in gcc g++ clang cmake ninja make python3 git pkg-config arm-vita-eabi-gcc; do
  if command -v "$t" >/dev/null; then printf '%-18s %s\n' "$t" "$("$t" --version 2>&1 | head -1)"
  else printf '%-18s MISSING\n' "$t"; fi
done
for p in sdl2 zlib libavcodec; do printf 'pkg %-14s %s\n' "$p" "$(pkg-config --modversion $p 2>&1 | head -1)"; done
echo "cores: $(nproc)  mem: $(free -g | awk 'NR==2{print $2" GB"}')  swap: $(free -g | awk 'NR==3{print $2" GB"}')"
sudo -n true 2>/dev/null && echo "sudo: passwordless" || echo "sudo: needs password"
