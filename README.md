# PES6 → PS Vita

Port of Pro Evolution Soccer 6 (PSP, `ULES00476`) to the PS Vita, built on
[PES6ANDROIDPORT](https://github.com/haveniiii/PES6ANDROIDPORT) (GPL-3.0): the PSP code is
statically recompiled to C and runs against a runtime that replaces the PSP firmware. This repo
adds the Vita host and the changes the shared runtime needs on 32-bit ARM.

**Stage: first playable build (17/11).** The game runs in real time with its picture at 960x544
through vitaGL, sound through `sceAudioOut` and the Vita's controls. The CPU viability spike that
came before (the game headless from boot to a match, timing every frame against the 33.3 ms of
30 fps) is still there: `PES6_VITA_BENCH=1` in `env.txt`.

## Layout

| Path | What |
|---|---|
| `external/PES6ANDROIDPORT/` | upstream checkout, branch `vita` holds our changes (`git diff master`) |
| `port/` | CMake project for the Vita (`src/main.c` = the host, `src/screen.c` = its text screens, `src/stubs.c`) |
| `scripts/` | build steps, run inside WSL (Ubuntu) |
| `tools/` | small helpers (seed list for the recompiler, ISO → EBOOT) |
| `*.iso` | your own copy of the game; never committed |

The heavy work happens on the Linux side: `~/pes6vita/upstream` is a clone of the upstream
checkout holding the decrypted EBOOT, the overlays and ~300 MB of generated C (D: has no room
and is slow from WSL). `scripts/sync-upstream.sh` copies the hand-written sources there.

## Changes to upstream (branch `vita`)

- `mem.h` / `mem.c`: guest memory as one committed 128 MB memblock (27-bit mask) instead of a
  lazy 1 GB `mmap` reservation.
- `threadman.c`: AAPCS context switch in ARM assembly (no `ucontext` on the Vita). The host
  stacks of the guest threads are 1 MB slots carved from the stack of the OS thread that runs
  the game, not `malloc` blocks: the Vita kernel kills a thread that makes a syscall with `sp`
  outside its own kernel-given stack (that was the first crash on the console). Each slot is
  painted; the scheduler aborts if a thread reaches its last 16 KB, and the thread dump reports
  how deep each one went.
- `ge.c`: the GE thread's CPU time from the Vita kernel (no `CLOCK_THREAD_CPUTIME_ID` there);
  GL widescreen setters stubbed when built without GL.
- `runtime/common/bench.c`: `PES6_BENCH=1` times each game frame by scene, used by both hosts;
  every 100 match frames it prints that window's average and, with the GE on its own thread,
  the GE's cost per frame and how long the game waited for it.
- Profiler (below): `emit.c` (`PSPRECOMP_PROF` marks, `PSP_CALLED`), `include/psprecomp/prof.h`,
  marks in `hle.c` and `threadman.c`, `runtime/common/sampler.c`.
- `runtime/desktop/main.c`: `PES6_GE_ASYNC=1` also without a window, as the Vita runs it.
- `emit.c`, the translator (17/11, both on in `03-recompile.sh`; `LOCAL_REGS=0` / `VFPU_STATIC=0`
  turn them off):
  - `ALLEGREX_LOCAL_REGS=1`: each function keeps the MIPS registers it uses in C locals instead
    of `psp_cpu.r[]`. Guest memory is reached through pointers and, under
    `-fno-strict-aliasing`, any guest store may write `psp_cpu`, so before the compiler reloaded
    every register after every store. Locals whose address is never taken cannot alias. They are
    loaded on entry and reloaded after every call. Before each call or exit, only the ones that
    may have changed on some path to that point are stored back. That is a data-flow pass over
    the function's lines (`finish_body`), and the functions are buffered so it can see each one
    whole.
  - `ALLEGREX_VFPU_STATIC=1`: `vpfxs/vpfxt/vpfxd` sit right before the operation they modify, so
    the translator applies them in the C (lanes picked, negated, made absolute or constant; result
    saturated or masked) instead of storing them and sending the operation down the runtime's
    general path. `vslt/vsge/vmin/vmax`, `vcmp`, `vidt`, `vcrsp/vqmul` and `mtv/mfv` go inline
    as well, with the runtime's expressions in the same order (same bits). If a prefix is pending
    at run time anyway (set on another path), the operation still goes to the runtime.
  - The regression suite (`scripts/regress.sh`) gives the same captures before and after.
- `hle.c` (17/11): a firmware call finds its NID in a hash table instead of scanning the ~400
  entries (1.8–2.4 % of the game's core on the Vita).
- `sascore.c`, the sound mixer (17/11), with the same output to the bit (the dumped audio,
  `PES6_AUDIO_DUMP`, has the same MD5 as before in every mode):
  - a voice whose envelope will not move for the rest of the grain (nearly all of PES6's: instant
    attack, level held) is mixed in a tight loop with the envelope as a constant;
  - the active voices can be split with a worker thread on another core (`psp_sas_worker_start`;
    the Vita host puts it on user core 2, `PES6_SAS_THREAD=0` turns it off). Integer sums do not
    depend on the order, and the call stays synchronous, so the guest's threads run in the same
    order. Whether it is worth waking the worker is measured as the game runs: in each cycle of 256
    mixes, 16 go alone and 16 with the worker, timing the calling thread per voice-sample, and the
    rest go the cheaper way. The report prints both costs (`sas: worker thread ...`).
    `PSP_SAS_SHARE=<percent>` forces the worker at that share.
- `ge_gl.c`, the GE on the GPU through vitaGL (17/11, the `PES6_VGL` parts; the GLES 3 path of the
  PC and Android is unchanged):
  - the two programs in Cg, compiled at run time by Sony's compiler (`libshacccg.suprx`), with
    the uniforms as floats;
  - no flat varyings: a flat-shaded triangle takes its last vertex's colour on the CPU;
  - SceGxm has no constant blend colour, so the GE's FIX blend factors become ONE or ZERO when
    they are white or black (the usual case). Otherwise the shader applies them: a FIX source
    multiplies the colour, and a FIX destination puts `1 - grey` in the output alpha and blends
    with `ONE_MINUS_SRC_ALPHA`. That works because blending never writes the destination's alpha
    on a GE. The report counts both cases;
  - no `GL_DEPTH_CLAMP`: the vertex shader holds z inside the planes;
  - present: a textured quad instead of `glBlitFramebuffer`. Pictures from the CPU (movies, the
    host's screens) are new textures each time, not sub-image writes the GPU may still be reading;
  - the frame's vertex array is 3.7 MB, not 18.
- `ge.c`, GE thread: the ring's `head` and `tail` are stored `seq_cst` instead of `release`. With
  a release store the game thread and the GE thread could each miss the other's "I am going to
  sleep" (store-then-load reordering, on x86 and on ARM) and both wait forever; it happened on
  the PC on 17/11 with the profiler's extra thread running. Upstream's Android build has the same
  code.

## Profiler

`PES6_PROF=1` (the Vita default) starts a sampler thread (on the Vita, pinned to user core 2,
which nothing else uses). Every 100 µs (`PES6_PROF_US`), during match frames from
`PES6_BENCH_FROM` on, it reads where the thread running guest code is:

- which guest thread is on the CPU (`user_main`, the sound threads, ...);
- whether it is in game code, a firmware call (which one; finding the call in the HLE table is
  counted apart), the scheduler or the host's vblank tasks;
- in game code, which function: with `PSPRECOMP_PROF` the generated code stores each function's
  address on entry and again after every call it makes returns (two stores per call). The Vita
  build always has it (`PES6_PROF` in `port/CMakeLists.txt`); `04-build-desktop.sh` turns it on
  for the PC too.

The results go to `pes6.log` (shares by kind and thread, top 40) and `prof.txt` (every entry
plus the resident overlays). On the PC, `tools/prof_report.py prof.txt` names each function from
the generated C (module, name, size), groups `_part_` helpers with their owner and ranks firmware
calls. `06-desktop-bench.sh` runs it on the PC's own profile. For a Vita run, copy
`ux0:data/pes6vita/prof.txt` to the PC and run, from PowerShell:

```
wsl -d Ubuntu -- python3 ./tools/prof_report.py prof.txt
```

First PC profile (17/11, GE on its own thread, 8@450–1349): game code 74 %, firmware 25 %,
scheduler 0.7 %. Biggest firmware shares: `sceGeListEnQueue` 7.8 %, `__sceSasCore` 7.1 %,
`sceGeDrawSync` 4.3 %. Biggest game code: the VFPU maths library around 0x0899xxxx
(`matrix_mogrify`, `vqmul_q` and their neighbours) and the 3D scene setup. The profiling build is
a little slower (two stores per guest call): compare shares, not milliseconds, against runs
without it.

## Steps (from PowerShell)

```
wsl -d Ubuntu -- bash -l ./scripts/01-setup.sh          # clone, toolkit
wsl -d Ubuntu -- bash -l ./scripts/02-extract.sh        # ISO -> EBOOT.elf, overlays
wsl -d Ubuntu -- bash -l ./scripts/03-recompile.sh      # -> generated C
wsl -d Ubuntu -- bash -l ./scripts/04-build-desktop.sh  # headless PC host
wsl -d Ubuntu -- bash -l ./scripts/06-desktop-bench.sh  # reference numbers
wsl -d Ubuntu -- bash -l ./scripts/05-build-vita.sh     # -> out/pes6vita.vpk
```

`05-build-vita.sh host` compiles only the hand-written part, in seconds.

## Results so far

| Where | Match cost per game frame (one core, no drawing) |
|---|---|
| PC, Intel i5-8300H (`06-desktop-bench.sh`), GE inline | 1.16 ms average; by windows of 300 frames 0.73, 1.23 and 1.53 ms; worst 10.3 ms |
| PC, same, GE on its own thread (`PES6_GE_ASYNC=1`) | 1.07 ms average (0.74, 1.15, 1.31); the GE thread 0.23–0.33 ms per frame, the game waiting for it 0.03–0.05 |
| PS Vita, 444 MHz, GE inline (first run, 17/11) | 24.5 ms average over 8@450–1349 (73.5 % of 33.3 ms), worst 94.9 ms, 114 of 900 frames over 33 ms |

The Vita average climbs as play opens up, like on the PC. By windows of 100 frames:
14.6 (kick-off), 17.4, 18.7, 23.3, 25.0, 28.9, 28.8, 28.7 and 35.2 ms (8@1250–1349). Against
the PC's windows of 300 frames that is 23×, 21× and 20×. The figure includes the game logic, the
HLE (audio mixing too) and walking the GE lists and vertices on the same core; drawing itself is
not in it. Host stacks: the deepest guest thread used 9 KB of its 1 MB slot. (An earlier PC run
gave 2.05 ms: it shared the CPU with a compile.)

Second Vita run (VPK of 17:50, 17/11): the game thread on user core 0 and the GE on core 1
(`PES6_GE_ASYNC=1`, now the default), 2700 match frames (90 s). `PES6_GE_ASYNC=0` in `env.txt`
repeats the first run.

- Over the same stretch as the first run (8@450–1349): 21.6 ms instead of 24.5 (−12 %), and 30
  frames over 33 ms instead of 114. The match does not play out identically between runs (real
  time on the console), so single windows do not compare one to one.
- Whole run: 19.7 ms average (59 % of 33.3 ms), 103 of 2700 frames over 33 ms, 18 over 50, worst
  106 ms. Busiest window 8@1749–1849: 34.5 ms, 57 of its 100 frames over 33 ms. Open play sits at
  22–29 ms per window; 8@2049–3149 is a steady ~14.4 ms with identical GE figures, a calm or
  stopped phase (no picture in this run to tell which).
- GE thread: 5.5 ms per frame, up to 11 in the busiest windows, without drawing. That includes
  its spin of up to 2000 polls before sleeping, so it overstates the work. The game waited for
  it 0.0–0.4 ms per frame: the GE is off the game's core.
- Left: the game thread itself (the game's code, the HLE, the sound threads' mixing) is at the
  limit in busy play. Next is profiling where its time goes on the console.

Third Vita run (VPK of 18:55, 17/11): the same with the profiler (`out/vita-runs/`, not
committed). 20.6 ms average (61.7 %); over 8@450–1349 22.6 ms against 21.6 without the
function marks, so the profiling build costs ~5 %. 125 123 samples (2 251 per second: the
Vita's thread delay is coarser than 100 µs) over 55.6 s of match. Where the game's core goes:

| Share | What |
|---|---|
| 80.4 % | game code: 62.3 % EBOOT, 17.6 % `game.ovl`, 0.5 % `training_free.ovl` |
| 11.4 % | `__sceSasCore` (our C sound mixer, run by the game's sound thread "thread 1") |
| 2.6 % | `sceGeDrawSync` 1.4 + `sceGeListEnQueue` 1.2 |
| 1.8 % | finding the firmware function: `psp_hle_call` scans the table linearly |
| 0.9 % / 0.4 % | scheduler / vblank tasks |

No game function passes 3.2 %; by 64 KB region of the EBOOT: 0x0881xxxx (3D scene and render
setup: `scene3d_update_lights`, `tex_find`, `tex_bind`...) 23.5 %, 0x0898xxxx (libgu: `sceGu*`
display-list building) 10.3 %, 0x0899xxxx (VFPU maths library: `matrix_mogrify`, `vqmul_q`...)
10.2 %, 0x0885xxxx (`atan2_u16`, 2D) 4.2 %, 2D drawing 2.4 %. `game.ovl` (players' AI, ball,
match) is spread over many functions. The CPU side of drawing (building the lists, ~46 %) costs
far more than the match logic (~18 %).

What that suggests, cheapest first: the HLE lookup as a table (~1.8 %); the sound mixer off the
game's core (~11 %); libgu and the VFPU library as native code through the emitter's hooks
(most of ~20 %); then the emitter keeping MIPS registers in C locals instead of `psp_cpu`, which
touches all of the 80 % (every guest store may alias `psp_cpu` under `-fno-strict-aliasing`, so
GCC reloads registers after each one).

Translator (17/11, `emit.c` above): on the PC, `06-desktop-bench.sh` alternating the new and old
builds (both with the profiler's marks), the match goes from 1.05–1.07 ms per frame to 0.92–0.93
(−12 %), worst frame from 3.4 to 2.7 ms. In steps: locals only, within the noise (x86 forwards a
store to the next load cheaply); storing only what changed on each path, 0.99; the VFPU at
translation time, 0.92. Vita ELF code: 42.6 MB before, 44.3 MB with the first version (registers
stored at every call), 41.8 MB now.

Fourth Vita run (VPK of 21:14, 17/11, `out/vita-runs/*-locals*`): the new translator, the same
settings as the third run (GE on its own core, profiler on, 2700 frames).

| | Third run | Fourth run |
|---|---|---|
| Match average | 20.56 ms (61.7 %) | **17.26 ms (51.8 %)**, −16 % |
| 8@450–1349 | 22.63 ms | 19.41 ms, −14 % |
| Busiest window (8@1749–1849) | 35.8 ms, 60 frames over 33 ms | 26.5 ms, 17 over 33 ms |
| Calm phase (8@2049–3149) | ~14.4 ms | ~13.1 ms |
| Frames over 33 / 50 ms | 140 / 21 | 28 / 5 |

Where it went (share × average, in ms per frame; the two matches do not play out frame for frame
identically): game code 16.5 → 13.2 (−20 %); the VFPU library at 0x0899xxxx 2.09 → 1.07 (−49 %;
`matrix_mogrify` 0.64 → 0.09); 3D scene setup at 0x0881xxxx 4.8 → 3.8 (−21 %); libgu 2.11 → 2.03
(it builds display lists with integer stores, little to gain here). Unchanged, as expected:
`__sceSasCore` 2.35 → 2.30 ms (now 13.3 % of the core) and the firmware lookup 0.37 → 0.41.
With the profiler, the new build is already faster than the old one without it (19.7 ms).

Quick wins (VPK of 21:53, 17/11; `hle.c` and `sascore.c` above). On the PC, the firmware lookup
falls from 1.0–1.2 % to 0.0–0.2 % of the time, and the mixer from 8.9 % to 7.8–8.1 %. The worker
does not pay there: mixing alone costs the calling thread 5–6 ns per voice-sample, and 24–35 ns
with the worker, because waking a thread under WSL takes longer than a whole mix (~15 µs). So it
picked "alone" in every cycle. On the Vita a mix takes ~400 µs, so the numbers may come out the
other way. The `sas: worker thread` line says which: in `pes6.log` from the next VPK on, since
the Vita host did not print the mixer's report until then.

Fifth Vita run (VPK of 21:53, 17/11, `out/vita-runs/*-quickwins*`), same settings:

| | Fourth run | Fifth run |
|---|---|---|
| Match average | 17.26 ms (51.8 %) | **16.04 ms (48.1 %)**, −7 % |
| 8@450–1349 | 19.41 ms | 18.30 ms |
| Busiest window (8@1749–1849) | 26.5 ms, 17 frames over 33 ms | 25.3 ms, 15 over 33 ms |
| Calm phase (8@2049–3149) | ~13.1 ms | ~11.9 ms |
| Frames over 33 / 50 ms | 28 / 5 | 24 / 5, worst 98.7 ms |
| `__sceSasCore` on the game's core | 2.30 ms (13.3 %) | 0.54 ms (3.4 %) |
| Firmware lookup | 0.41 ms (2.4 %) | 0.05 ms (0.3 %) |

The mixer cost 77 % less on the game's core. The PC's fast path alone gave ~10 %, so most of
that is probably the worker on core 2 paying off on the Vita (to be confirmed by the next log).
Since the first run (24.5 ms, GE on the same core, old translator) the match costs 35 % less.

Both runs: boot to the match with no dispatch misses and no bad memory accesses. A drawing run
on the PC (`DRAW=1`) renders the menu and the match correctly (`out/shots/`, not committed).

Vita build: 39 MB of code (Thumb-2), 21 MB of BSS, eboot.bin 22.8 MB; with the 128 MB guest
block, the 64 MB heap and the game thread's stack (up to 32 MB: 4 MB for itself, the rest guest
host stacks) it needs ~290 MB of the 365 MB (`ATTRIBUTE2=12`). `port/src/main.c` creates that
thread with the biggest stack the kernel grants (32, 24, 16 or 12 MB) and logs which.

## Playing on the Vita

1. Install `out/pes6vita.vpk` (VitaShell).
2. vitaGL needs Sony's shader compiler: `ur0:data/libshacccg.suprx` (or
   `ur0:data/external/`), extracted with ShaRKBR33D. Without it the app says so and stops.
3. Copy your ISO to `ux0:data/pes6vita/pes6.iso`. The first run decrypts `EBOOT.elf` from it.
4. Controls are the PSP's: d-pad, left stick, the shapes, L / R, START, SELECT. Holding
   L + R + START + SELECT for two seconds ends the run and writes the full report to the log.

`ux0:data/pes6vita/pes6.log` gets, every 10 s, the frame rate the game shows and the GE thread's
load (`[fps] ...`). `ux0:data/pes6vita/env.txt` takes `KEY=VALUE` lines (`PES6_*` variables of
upstream's hosts).

How the host is laid out (`port/src/main.c`):
- vitaGL runs on the GE thread (core 1), the thread that calls `vglInit`. Every GL call happens
  there: the game's thread asks for it through `pes6_ge_post` / `pes6_ge_call`.
- The game is on core 0, in real time (`psp_threadman_set_realtime`). Once per vblank the
  scheduler's hook sends each new frame to the GE thread, at most two in flight. vitaGL flips
  on vblank.
- The sound is on core 2. A thread pulls the game's channels (`pes6_audio_pull`) into a 44.1 kHz
  BGM port, in 512-frame blocks. The SAS worker and vitaGL's garbage collector are on core 2 too.
- vitaGL gets the memory that is left after the guest's 128 MB, the heap and the game thread's
  stack, less 16 MB of RAM and 4 MB of CDRAM.
- Text screens (`screen.c`) use upstream's 5x7 menu font. Before vitaGL is up they go straight
  to the display's framebuffer; after that, through the GE thread.

## Running the benchmark on the Vita

1. Put `PES6_VITA_BENCH=1` in `ux0:data/pes6vita/env.txt` and open **PES6 Vita**. The game boots,
   goes through the menus by itself and plays a match without drawing it; the screen shows
   progress every ~2 s.
2. After the match frames it shows the result. The full report is in
   `ux0:data/pes6vita/pes6.log`, the numbers alone in `ux0:data/pes6vita/bench.txt`.

Other lines in `env.txt` change the run (e.g. `PES6_BENCH_FRAMES=300`).
