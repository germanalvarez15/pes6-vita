# PES6 Vita — the recompiled game (generated C) + upstream's runtime + a Vita host.
#
# Configure inside WSL with VitaSDK (scripts/05-build-vita.sh does it):
#   cmake -S port -B <build dir> -DPES6_UP=<upstream checkout with build/gen and build/gen_ovl>
cmake_minimum_required(VERSION 3.16)

if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    if(DEFINED ENV{VITASDK})
        set(CMAKE_TOOLCHAIN_FILE "$ENV{VITASDK}/share/vita.toolchain.cmake" CACHE PATH "toolchain file")
    else()
        message(FATAL_ERROR "set VITASDK to the VitaSDK root")
    endif()
endif()

project(pes6vita C CXX)
include("${VITASDK}/share/vita.cmake" REQUIRED)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(VITA_APP_NAME "PES6 Vita")
set(VITA_TITLEID  "PESV00006")
set(VITA_VERSION  "00.03")
# ATTRIBUTE2=12: the extended memory budget; the guest block alone is 128 MB.
set(VITA_MKSFOEX_FLAGS "${VITA_MKSFOEX_FLAGS} -d PARENTAL_LEVEL=1 -d ATTRIBUTE2=12")

set(PES6_UP "" CACHE PATH "upstream checkout (PES6ANDROIDPORT, branch vita) with the generated C")
if(NOT EXISTS "${PES6_UP}/build/gen/pes6_funcs.c" OR NOT EXISTS "${PES6_UP}/build/gen_ovl/overlays_registry.c")
    message(FATAL_ERROR "PES6_UP=${PES6_UP} has no generated sources: run scripts/03-recompile.sh")
endif()
set(PSPRECOMP "${PES6_UP}/third_party/psprecomp")
set(GEN       "${PES6_UP}/build/gen")
set(GEN_OVL   "${PES6_UP}/build/gen_ovl")
set(COMMON    "${PES6_UP}/runtime/common")
set(DESKTOP   "${PES6_UP}/runtime/desktop")

# The same flags upstream gives the generated code (runtime/desktop/CMakeLists.txt): sibling calls
# are needed for correctness, -fwrapv/-fno-strict-aliasing keep MIPS semantics.
set(PES6_GEN_OPT "-O2" CACHE STRING "optimisation level of the generated code")
set(PES6_ARM_MODE "-mthumb" CACHE STRING "-mthumb or -marm for the generated code")
add_compile_options(-w -foptimize-sibling-calls -fwrapv -fno-strict-aliasing
                    -mcpu=cortex-a9 -mfpu=neon -mfloat-abi=hard)
add_compile_definitions(PSP_MEM_FAST)

file(GLOB OVL_SOURCES CONFIGURE_DEPENDS "${GEN_OVL}/ovl_*_funcs_part*.c")

# Its own object library: it takes long to compile and nothing in the host should rebuild it.
add_library(pes6_gen OBJECT
    "${GEN}/pes6_funcs.c"
    "${GEN}/pes6_imports.c"
    ${OVL_SOURCES}
)
target_include_directories(pes6_gen PRIVATE "${GEN}" "${GEN_OVL}" "${PSPRECOMP}/include")
target_compile_options(pes6_gen PRIVATE ${PES6_GEN_OPT} ${PES6_ARM_MODE})
# Each guest function stores its address on entry and after each call returns, for the sampling
# profiler (runtime/common/sampler.c, <psprecomp/prof.h>): two stores per call.
option(PES6_PROF "guest function marks for the sampling profiler" OFF)
if(PES6_PROF)
    target_compile_definitions(pes6_gen PRIVATE PSPRECOMP_PROF)
endif()

set(RUNTIME_SOURCES
    "${PSPRECOMP}/src/cpu.c" "${PSPRECOMP}/src/mem.c" "${PSPRECOMP}/src/dispatch.c"
    "${PSPRECOMP}/src/ctors.c" "${PSPRECOMP}/src/render.c" "${PSPRECOMP}/src/vfpu.c"
    "${PSPRECOMP}/src/hle/hle.c" "${PSPRECOMP}/src/hle/sysmem.c" "${PSPRECOMP}/src/hle/threadman.c"
    "${PSPRECOMP}/src/hle/display.c" "${PSPRECOMP}/src/hle/ge.c" "${PSPRECOMP}/src/hle/sascore.c"
    "${PSPRECOMP}/src/hle/iofilemgr.c" "${PSPRECOMP}/src/hle/misc.c"
    "${DESKTOP}/overlays.c" "${DESKTOP}/input.c"
    "${COMMON}/ge.c" "${COMMON}/mpeg.c" "${COMMON}/atrac.c" "${COMMON}/h264.c" "${COMMON}/at3.c"
    "${COMMON}/audio.c" "${COMMON}/commentary.c" "${COMMON}/widescreen.c" "${COMMON}/tuning.c"
    "${COMMON}/rules.c" "${COMMON}/flow.c" "${COMMON}/faces.c" "${COMMON}/osk.c" "${COMMON}/settings.c"
    "${COMMON}/lang.c" "${COMMON}/version.c" "${COMMON}/afs_mods.c" "${COMMON}/patch.c" "${COMMON}/pcof.c"
    "${COMMON}/bench.c" "${COMMON}/sampler.c" "${COMMON}/iso_eboot.c" "${DESKTOP}/bot.c"
    "${PES6_UP}/third_party/pspdecrypt/PrxDecrypter.cpp" "${PES6_UP}/third_party/pspdecrypt/pspdecrypt_shim.cpp"
    "${PES6_UP}/third_party/pspdecrypt/libkirk/kirk_engine.c" "${PES6_UP}/third_party/pspdecrypt/libkirk/AES.c"
    "${PES6_UP}/third_party/pspdecrypt/libkirk/SHA1.c" "${PES6_UP}/third_party/pspdecrypt/libkirk/bn.c"
    "${PES6_UP}/third_party/pspdecrypt/libkirk/ec.c"
    "${GEN_OVL}/overlays_registry.c"
)

# The hand-written part (host + runtime) on its own, so `--target pes6_host` checks it in seconds.
add_library(pes6_host OBJECT
    src/main.c
    src/stubs.c
    src/screen.c
    src/vita_stdio_lock.c
    ${RUNTIME_SOURCES}
)
target_include_directories(pes6_host PRIVATE src "${GEN}" "${GEN_OVL}" "${PSPRECOMP}/include" "${COMMON}" "${DESKTOP}")
target_compile_options(pes6_host PRIVATE -O2 -g)
target_compile_definitions(pes6_host PRIVATE PES6_PRODUCT_VERSION="" PES6_EBOOT_SIZE=0 PES6_EBOOT_FNV=0)
# The GE draws through vitaGL (runtime/common/ge_gl.c, its PES6_VGL parts).
target_compile_definitions(pes6_host PRIVATE PES6_HAVE_GL)

add_executable(pes6vita
    $<TARGET_OBJECTS:pes6_host>
    $<TARGET_OBJECTS:pes6_gen>
)
set_target_properties(pes6vita PROPERTIES LINKER_LANGUAGE CXX)

# FFmpeg's H.264 and ATRAC3/ATRAC3plus decoders (scripts/07-build-ffmpeg-vita.sh): the game's music,
# its movies and their sound (runtime/common/at3.c, h264.c). Without them both stay silent / black.
set(PES6_FFMPEG "" CACHE PATH "FFmpeg built for the Vita (07-build-ffmpeg-vita.sh output)")
if(PES6_FFMPEG AND EXISTS "${PES6_FFMPEG}/lib/libavcodec.a")
    target_include_directories(pes6_host BEFORE PRIVATE "${PES6_FFMPEG}/include")
    target_compile_definitions(pes6_host PRIVATE PES6_HAVE_FFMPEG)
    target_link_libraries(pes6vita PRIVATE
        "${PES6_FFMPEG}/lib/libavcodec.a" "${PES6_FFMPEG}/lib/libswscale.a" "${PES6_FFMPEG}/lib/libavutil.a")
    message(STATUS "FFmpeg: ${PES6_FFMPEG}")
else()
    message(WARNING "no FFmpeg (PES6_FFMPEG=${PES6_FFMPEG}): no music and no movies")
endif()
set_source_files_properties(${GEN_OVL}/overlays_registry.c PROPERTIES COMPILE_OPTIONS "-O1")
set_source_files_properties("${PES6_UP}/third_party/pspdecrypt/PrxDecrypter.cpp" "${PES6_UP}/third_party/pspdecrypt/pspdecrypt_shim.cpp"
    PROPERTIES COMPILE_OPTIONS "-std=c++17;-O2")
set_source_files_properties("${PES6_UP}/third_party/pspdecrypt/libkirk/SHA1.c" PROPERTIES COMPILE_OPTIONS "-std=gnu89")
# vitaGL and what it needs (the NFS Most Wanted Vita port's list): vitashark + SceShaccCg compile
# the Cg shaders at run time with ur0:data/libshacccg.suprx.
target_link_libraries(pes6vita PRIVATE
    vitaGL vitashark SceShaccCgExt mathneon taihen_stub SceShaccCg_stub SceKernelDmacMgr_stub
    SceGxm_stub SceCommonDialog_stub SceAppUtil_stub SceTouch_stub SceAudio_stub
    stdc++ pthread z m
    SceDisplay_stub SceCtrl_stub ScePower_stub SceSysmodule_stub SceAppMgr_stub
    SceLibKernel_stub SceKernelThreadMgr_stub SceSysmem_stub SceIofilemgr_stub SceRtc_stub
)
target_link_options(pes6vita PRIVATE -Wl,-Map=pes6vita.map)
# As the NFS port: vita-elf-create appends ~3 KB after the text segment ("segment 1 overlaps"
# when the code ends just below a 64 KB boundary); pthread_cancel and pthread_once pulled in so
# libstdc++'s guards are thread safe; fopen and fclose through one lock (vita_stdio_lock.c).
target_link_options(pes6vita PRIVATE -Wl,--defsym,__sce_headroom=0x1000 -Wl,-u,pthread_cancel -Wl,-u,pthread_once)
target_link_options(pes6vita PRIVATE -Wl,--wrap=fopen -Wl,--wrap=fclose -Wl,-u,__wrap_fopen -Wl,-u,__wrap_fclose)

vita_create_self(eboot.bin pes6vita UNSAFE)
# LiveArea art (8-bit palette PNGs, made by tools/livearea.py), as the NFS port's CMakeLists.txt.
# Commentary catalogues (clip numbers only, no sound): port/catalogues/<bank>.txt -> app0:catalogues/.
# The PS2 bank itself is never in the VPK: the player copies it (main.c, setup_commentary).
set(CATALOGUE_FILES)
foreach(bank s_sound e_sound)
    if(EXISTS "${CMAKE_SOURCE_DIR}/catalogues/${bank}.txt")
        list(APPEND CATALOGUE_FILES FILE "${CMAKE_SOURCE_DIR}/catalogues/${bank}.txt" "catalogues/${bank}.txt")
    endif()
endforeach()
vita_create_vpk(pes6vita.vpk ${VITA_TITLEID} eboot.bin
    VERSION ${VITA_VERSION}
    NAME ${VITA_APP_NAME}
    ${CATALOGUE_FILES}
    FILE sce_sys/icon0.png sce_sys/icon0.png
    FILE sce_sys/livearea/contents/bg.png sce_sys/livearea/contents/bg.png
    FILE sce_sys/livearea/contents/startup.png sce_sys/livearea/contents/startup.png
    FILE sce_sys/livearea/contents/template.xml sce_sys/livearea/contents/template.xml
)
