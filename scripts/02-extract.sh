#!/usr/bin/env bash
# ISO -> decrypted EBOOT.elf + the MWo3 code overlays.
set -euo pipefail
. "$(dirname "$0")/env.sh"
cd "$UP"
"$AR" info data/pes6.iso | head -12
mkdir -p build/overlays

# The decrypter: upstream's own ISO -> EBOOT path (runtime/common/iso_eboot.c + pspdecrypt).
if [ ! -x build/iso_eboot ]; then
  d=third_party/pspdecrypt; o=build/iso_eboot_obj; mkdir -p $o
  for f in $d/libkirk/*.c; do gcc -O2 -w -std=gnu89 -c "$f" -o "$o/$(basename "$f").o"; done
  g++ -O2 -w -std=c++17 -c $d/PrxDecrypter.cpp -o $o/PrxDecrypter.o
  g++ -O2 -w -std=c++17 -c $d/pspdecrypt_shim.cpp -o $o/shim.o
  gcc -O2 -w -DPES6_EBOOT_SIZE=0 -DPES6_EBOOT_FNV=0 -c runtime/common/iso_eboot.c -o $o/iso_eboot.o
  gcc -O2 -w -c "$REPO/tools/iso_eboot_main.c" -o $o/main.o
  g++ -o build/iso_eboot $o/*.o -lz
fi
build/iso_eboot data/pes6.iso build/EBOOT.elf
ls -la build/EBOOT.elf
"$AR" cover build/EBOOT.elf | tail -8
python3 tools/afs_overlays.py data/pes6.iso build/overlays | tail -5
echo "overlays: $(ls build/overlays | wc -l)"
