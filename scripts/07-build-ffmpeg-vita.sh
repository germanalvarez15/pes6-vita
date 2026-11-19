#!/usr/bin/env bash
# The pieces of FFmpeg the port uses, built for the Vita: the H.264 decoder (movies), the ATRAC3 and
# ATRAC3plus decoders (music, movie sound) and libswscale. These are the same pieces upstream's
# Android build uses (tools/android_ffmpeg.sh). VitaSDK's own FFmpeg has neither decoder.
# LGPL configuration, nothing else enabled. Output: $WORK/ffmpeg-vita/{include,lib}, which
# port/CMakeLists.txt picks up when it is there. Run once (a few minutes); 05-build-vita.sh runs it if needed.
set -euo pipefail
. "$(dirname "$0")/env.sh"
VER=7.1.1
SRC="$WORK/ffmpeg-$VER"
OUT="$WORK/ffmpeg-vita"
if [ -f "$OUT/lib/libavcodec.a" ] && [ "${1:-}" != again ]; then
  echo "ffmpeg for the Vita: $OUT (07-build-ffmpeg-vita.sh again to rebuild)"; exit 0
fi
if [ ! -d "$SRC" ]; then
  mkdir -p "$WORK/ffmpeg-dl"
  curl -sSfL "https://ffmpeg.org/releases/ffmpeg-$VER.tar.xz" -o "$WORK/ffmpeg-dl/ffmpeg-$VER.tar.xz"
  tar -xf "$WORK/ffmpeg-dl/ffmpeg-$VER.tar.xz" -C "$WORK"
fi
cd "$SRC"
# libavutil's transforms keep a cosine table per power of two up to 2^21 points, in .bss for float,
# int32 and double: 17 MB, which the Vita takes from vitaGL's memory. ATRAC3/ATRAC3plus use 256 and
# 512 points, H.264 none. Above 65536 points the table is one entry and its init writes nothing.
sed -i 's|^    TABLE_DEF(len, len/4 + 1);$|    TABLE_DEF(len, (len) > 65536 ? 1 : len/4 + 1); /* PES6 Vita: no tables above 65536 */|' libavutil/tx_template.c
sed -i 's|^    for (int i = 0; i < len/4; i++)                                \\$|    for (int i = 0; i < ((len) > 65536 ? 0 : len/4); i++)          \\|' libavutil/tx_template.c
[ "$(grep -c 'PES6 Vita: no tables above 65536' libavutil/tx_template.c)" = 1 ] && grep -q '((len) > 65536 ? 0 : len/4)' libavutil/tx_template.c \
  || { echo "tx_template.c patch did not apply" >&2; exit 1; }
# The target flags of VitaSDK's FFmpeg package (vdpm), less --enable-small and -ffast-math.
./configure --prefix="$OUT" --enable-cross-compile --cross-prefix=arm-vita-eabi- \
    --arch=armv7-a --cpu=cortex-a9 --target-os=none --disable-runtime-cpudetect \
    --disable-armv5te --disable-armv6t2 --enable-pthreads \
    --extra-cflags="-std=gnu11 -O2 -ftree-vectorize -fomit-frame-pointer -D_BSD_SOURCE -mfpu=neon -mfloat-abi=hard \
-Wno-error=implicit-function-declaration -Wno-error=int-conversion -Wno-error=incompatible-pointer-types" \
    --disable-everything --disable-programs --disable-doc --disable-network --disable-debug \
    --disable-avdevice --disable-avformat --disable-avfilter --disable-swresample \
    --disable-bzlib --disable-iconv --disable-lzma --disable-zlib --disable-sdl2 --disable-xlib \
    --enable-swscale --enable-decoder=h264 --enable-decoder=atrac3 --enable-decoder=atrac3p \
    --enable-parser=h264 --enable-static --disable-shared > "$WORK/ffmpeg-configure.log" 2>&1 \
  || { tail -30 "$WORK/ffmpeg-configure.log"; exit 1; }
grep -E "^(ARCH|NEON enabled|threading support|License)" "$WORK/ffmpeg-configure.log" || true
make -j"${JOBS:-8}" > "$WORK/ffmpeg-build.log" 2>&1 || { grep -E "error" "$WORK/ffmpeg-build.log" | head -30; exit 1; }
make install > /dev/null
ls -l "$OUT/lib/"*.a
