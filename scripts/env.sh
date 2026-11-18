# Sourced by the other scripts. Run everything inside WSL.
# The working tree lives on the Linux filesystem: the generated C is ~311 MB and
# compiling it from /mnt/d is slow and D: is short on space.
: "${VITASDK:=/usr/local/vitasdk}"
export VITASDK PATH="$VITASDK/bin:$PATH"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${PES6_WORK:-$HOME/pes6vita}"                          # upstream checkout + build output
UP="$WORK/upstream"
AR="$UP/third_party/psprecomp/build/tools/allegrexrecomp/allegrexrecomp"

# data/pes6.iso links to the ISO in the repo folder; follow it if the file was renamed.
if [ -d "$UP/data" ] && [ ! -e "$UP/data/pes6.iso" ]; then
  _iso="$(ls "$REPO"/*.iso 2>/dev/null | head -1)"
  [ -n "$_iso" ] && ln -sfn "$_iso" "$UP/data/pes6.iso" && echo "data/pes6.iso -> $_iso" >&2
  unset _iso
fi

# Host zlib without root: the distro ships libz.so.1 but not the -dev package, so borrow the
# headers from VitaSDK (same zlib API) and point the linker at the runtime library.
HOSTDEPS="$WORK/hostdeps"
if [ ! -e "$HOSTDEPS/lib/libz.so" ] && [ ! -e /usr/include/zlib.h ]; then
  mkdir -p "$HOSTDEPS/include" "$HOSTDEPS/lib"
  cp "$VITASDK/arm-vita-eabi/include/zlib.h" "$VITASDK/arm-vita-eabi/include/zconf.h" "$HOSTDEPS/include/"
  ln -sf /usr/lib/x86_64-linux-gnu/libz.so.1 "$HOSTDEPS/lib/libz.so"
fi
if [ -d "$HOSTDEPS/include" ]; then
  export C_INCLUDE_PATH="$HOSTDEPS/include${C_INCLUDE_PATH:+:$C_INCLUDE_PATH}"
  export CPLUS_INCLUDE_PATH="$HOSTDEPS/include${CPLUS_INCLUDE_PATH:+:$CPLUS_INCLUDE_PATH}"
  export LIBRARY_PATH="$HOSTDEPS/lib${LIBRARY_PATH:+:$LIBRARY_PATH}"
fi
