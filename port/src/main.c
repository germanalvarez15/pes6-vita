/* PES6 Vita — the host: the recompiled game (upstream's generated C and runtime) on the console.
 *
 *   play (default)  the game in real time: the GE draws through vitaGL at 960x544 (twice the PSP's
 *                   480x272: the same shape, so the picture fills the screen) on its own thread on
 *                   core 1, the game runs on core 0, the sound goes out through sceAudioOut from
 *                   core 2, and the pad is read when the game reads it.
 *   bench           PES6_VITA_BENCH=1 in env.txt: the viability benchmark as before -- the reference
 *                   input script from boot to a match, nothing drawn (PES6_GE_NODRAW), virtual
 *                   time, and runtime/common/bench.c timing each game frame.
 *
 * Data: ux0:data/pes6vita/pes6.iso (your own PSP copy, ULES00476). EBOOT.elf is decrypted from
 * it on first run. Extra settings: ux0:data/pes6vita/env.txt, KEY=VALUE lines (PES6_* variables
 * of upstream's desktop host). Log: ux0:data/pes6vita/pes6.log. vitaGL compiles its shaders with
 * Sony's compiler: ur0:data/libshacccg.suprx (extracted with ShaRKBR33D).
 *
 * Every GL call happens on the GE thread, the one that called vglInit (ge.c: pes6_ge_post /
 * pes6_ge_call from the game's thread). L + R + START + SELECT held for two seconds ends the run
 * with the full report in the log. */
#include <psprecomp/cpu.h>
#include <psprecomp/dispatch.h>
#include <psprecomp/hle.h>
#include <psprecomp/mem.h>

#include "afs_mods.h"
#include "commentary.h"
#include "at3.h"
#include "atrac.h"
#include "audio.h"
#include "bench.h"
#include "faces.h"
#include "iso_eboot.h"
#include "ge.h"
#include "h264.h"
#include "lang.h"
#include "mpeg.h"
#include "osk.h"
#include "overlays.h"
#include "pes6_addrs.h"
#include "patch.h"
#include "rules.h"
#include "sampler.h"
#include "screen.h"
#include "settings.h"
#include "tuning.h"
#include "version.h"

#include <psp2/apputil.h>
#include <psp2/audioout.h>
#include <psp2/ctrl.h>
#include <psp2/display.h>
#include <psp2/io/fcntl.h>
#include <psp2/io/stat.h>
#include <psp2/kernel/processmgr.h>
#include <psp2/kernel/threadmgr.h>
#include <psp2/power.h>
#include <psp2/rtc.h>
#include <psp2/system_param.h>
#include <vitaGL.h>

#include <fcntl.h>
#include <signal.h>
#include <stdarg.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

/* Memory (ATTRIBUTE2=12 in the SFO: 365 MB): the guest's 128 MB block is its own memblock
 * (psprecomp/src/mem.c) and the heap holds the runtime's buffers. The game runs on a thread of
 * its own (game_thread) whose big stack also holds the 1 MB host stacks of the guest threads:
 * the kernel kills a thread that makes a syscall with sp outside its own stack, so those cannot
 * come from malloc (threadman.c). The main thread only starts it and waits. What is left after
 * that goes to vitaGL's pools (gl_start), less VGL_RAM_LEFT for later threads and blocks. */
int _newlib_heap_size_user = 64 * 1024 * 1024;
unsigned int sceUserMainThreadStackSize = 1 * 1024 * 1024;

#define DATA_DIR "ux0:data/pes6vita"
#define SCREEN_W 960
#define SCREEN_H 544
#define VGL_RAM_LEFT   (40 * 1024 * 1024)   /* the NFS port's thresholds (plat_video_vita.cpp) */
#define VGL_CDRAM_LEFT (16 * 1024 * 1024)

void psp_recomp_register(void);
void pes6_input_init(void);
extern uint32_t (*pes6_input_extra_buttons)(void);
extern uint32_t (*pes6_input_extra_analog)(void);

/* tools/ref_match.sh: boot -> title -> main menu -> MATCH -> Exhibition -> team select ->
 * settings -> kick-off, with scene-relative times. */
static const char REF_INPUT[] =
    "400:cross,3@200:cross:10,3@330:cross:10,"
    "4@631:cross:4,4@1031:cross:4,4@1431:cross:4,4@1731:right:4,4@1931:down:4,4@2131:cross:4,"
    "4@2431:cross:4,4@2631:down:4,4@2781:right:4,4@2931:cross:4,4@3131:right:4,4@3281:cross:4,"
    "4@3631:cross:4,4@4031:cross:4,5@300:cross:4,5@700:cross:4,8@411:cross:4,8@711:cross:4";

static int g_bench;                   /* PES6_VITA_BENCH=1 */
static int g_gl;                      /* vitaGL is up (on the GE thread) */

void psp_unimplemented(uint32_t addr, const char *what) {
    static int logged;
    if (logged++ < 40) fprintf(stderr, "psprecomp: unimplemented %s at 0x%08X\n", what, addr);
}

static uint64_t now_ns(void) { return (uint64_t)sceKernelGetProcessTimeWide() * 1000ull; }

/* ---- pad: the Vita's buttons in PSP order ---------------------------------------------------
 * Select, start, the d-pad and the shapes have the PSP's bits. The Vita's shoulder buttons come as
 * L/R TRIGGER (0x100 / 0x200, the PSP's L and R); a PS TV controller's L1/R1 too, with its own
 * L1/R1 bits as well. */

static SceCtrlData g_pad;
static int pick_blocks(void);
static uint32_t vita_buttons(void) {
    sceCtrlPeekBufferPositive(0, &g_pad, 1);
    if (pick_blocks()) {                                        /* the save list has them */
        g_pad.lx = g_pad.ly = 128;
        return 0;
    }
    uint32_t b = g_pad.buttons & 0xF3F9u;                       /* select, start, d-pad, L, R, shapes */
    if (g_pad.buttons & SCE_CTRL_L1) b |= 0x100u;
    if (g_pad.buttons & SCE_CTRL_R1) b |= 0x200u;
    return b;
}
static uint32_t vita_analog(void) { return (uint32_t)g_pad.lx | (uint32_t)g_pad.ly << 8; }

/* ---- the end of the run ------------------------------------------------------------------- */

static void finish(const char *why) {
    fprintf(stderr, "\n[vita] %s\n", why);
    pes6_bench_report(stderr);
    psp_sas_report(stderr);                   /* voices, and whether the mix's worker paid (sascore.c) */
    pes6_audio_report(stderr);
    char prof_line[160] = "";
    if (pes6_sampler_on()) {
        pes6_sampler_report(stderr, 40);
        const int rc = pes6_sampler_write(DATA_DIR "/prof.txt");
        fprintf(stderr, "[prof] %s " DATA_DIR "/prof.txt\n", rc == 0 ? "written to" : "could not write");
        pes6_sampler_summary(prof_line, sizeof prof_line);
    }
    {
        uint64_t ge_cpu = 0, ge_wait = 0;
        pes6_ge_thread_stats(&ge_cpu, &ge_wait);
        if (ge_cpu) fprintf(stderr, "GE thread: %.2f s busy, game waited for it %.2f s\n", ge_cpu / 1e9, ge_wait / 1e9);
    }
    fprintf(stderr, "dispatch: %u registered, %llu misses\n", psp_dispatch_count(),
            (unsigned long long)psp_dispatch_misses());
    fprintf(stderr, "bad mem accesses: %llu\n", (unsigned long long)psp_mem_bad_access);
    fprintf(stderr, "scene stack:");
    for (int i = 0; i < 4; i++)
        fprintf(stderr, " (%u,%u)", psp_read32(PES6_SCENE_STACK + i * 8), psp_read32(PES6_SCENE_STACK + i * 8 + 4));
    fprintf(stderr, "\nvblanks: %llu  io bytes: %llu\n", (unsigned long long)psp_display_vblanks(),
            (unsigned long long)psp_io_bytes_read());
    pes6_ge_report(stderr);
    pes6_overlays_report(stderr);
    psp_threadman_dump(stderr);
    psp_hle_dump_recent(stderr);
    fflush(stderr);

    /* The result on screen too: the report's bench lines. */
    FILE *f = fopen(DATA_DIR "/bench.txt", "w");
    if (f) { pes6_bench_report(f); fclose(f); }
    screen_clear();
    screen_line("%s", why);
    f = fopen(DATA_DIR "/bench.txt", "r");
    char line[256];
    while (f && fgets(line, sizeof line, f)) {
        line[strcspn(line, "\n")] = 0;
        if (strstr(line, "frames") || strstr(line, "match") || strstr(line, "run time"))
            screen_line("%s", line + (strncmp(line, "[bench] ", 8) ? 0 : 8));
    }
    if (f) fclose(f);
    if (prof_line[0]) screen_line("Perfil: %s", prof_line);
    screen_line("Informe completo en " DATA_DIR "/pes6.log");
    for (;;) {
        screen_draw("START para salir");
        sceCtrlPeekBufferPositive(0, &g_pad, 1);
        if (g_pad.buttons & SCE_CTRL_START) break;
        sceKernelDelayThread(100000);
    }
    sceKernelExitProcess(0);
}

static void on_stop_signal(int sig) { (void)sig; finish("PES6_STOP_AT alcanzado"); }

/* A jump to code the recompiler did not translate: report it instead of aborting blind. */
static void on_miss(uint32_t addr) {
    char why[96];
    snprintf(why, sizeof why, "salto a codigo no recompilado: 0x%08X", addr);
    psp_miss_context();
    finish(why);
}
static void on_bench_done(void) { finish("medicion completa"); }

/* Commentary (upstream docs/24): the player copies a PS2 PAL bank to DATA_DIR/audio, s_sound.afs
 * (Spanish) or e_sound.afs (English); the catalogue (clip numbers only) comes in the VPK,
 * app0:catalogues/<bank>.txt. The game in Spanish prefers s_sound, any other e_sound; either is taken
 * if it is the only one. Player names: DATA_DIR/audio/names.afs (an original s_sound.afs), else the
 * bank says them. PES6_COMMENTARY=0 turns it off, PES6_COMMENTARY=<path to a bank> picks one.
 * The menu's Commentary setting turns it on or off as on the other hosts. */
static void commentary_task(void) { pes6_commentary_frame(); }

static void setup_commentary(void) {
    const char *env = getenv("PES6_COMMENTARY");
    if (env && !strcmp(env, "0")) { fprintf(stderr, "[commentary] off (PES6_COMMENTARY=0)\n"); return; }
    const char *order[2] = { "s_sound", "e_sound" };
    if (pes6_lang != PES6_LANG_ES) { order[0] = "e_sound"; order[1] = "s_sound"; }
    char afs[512] = "", cat[512] = "";
    for (int i = 0; i < 2 && !cat[0]; i++) {
        if (env && *env) {
            if (!strstr(env, order[i])) continue;
            snprintf(afs, sizeof afs, "%s", env);
        } else snprintf(afs, sizeof afs, DATA_DIR "/audio/%s.afs", order[i]);
        FILE *t = fopen(afs, "rb");
        if (!t) continue;
        fclose(t);
        snprintf(cat, sizeof cat, "app0:catalogues/%s.txt", order[i]);
    }
    if (!cat[0]) { fprintf(stderr, "[commentary] no bank in " DATA_DIR "/audio\n"); return; }
    if (pes6_commentary_open(afs, cat) != 0) { fprintf(stderr, "[commentary] %s: could not open it\n", afs); return; }
    const char *gs = getenv("PES6_GOAL_SHOUT");      /* the PSP's own goal shout goes quiet (docs/39 §2.1) */
    if (!(gs && *gs == '1')) pes6_afs_goal_voice_off();
    pes6_commentary_set_enabled(pes6_settings_current.commentary);
    FILE *n = fopen(DATA_DIR "/audio/names.afs", "rb");
    if (n) { fclose(n); pes6_commentary_open_names(DATA_DIR "/audio/names.afs"); }
    psp_add_vblank_task(commentary_task);
    fprintf(stderr, "[commentary] %s with %s%s\n", afs, cat, n ? ", names from names.afs" : "");
}

static void fatal(const char *msg) {
    fprintf(stderr, "[vita] fatal: %s\n", msg);
    fflush(stderr);
    screen_line("ERROR: %s", msg);
    for (;;) {
        screen_draw("START para salir");
        sceCtrlPeekBufferPositive(0, &g_pad, 1);
        if (g_pad.buttons & SCE_CTRL_START) sceKernelExitProcess(1);
        sceKernelDelayThread(100000);
    }
}

/* ---- settings ----------------------------------------------------------------------------- */

static void apply_env_file(int only_mode) {
    FILE *f = fopen(DATA_DIR "/env.txt", "r");
    char line[2048];
    while (f && fgets(line, sizeof line, f)) {
        line[strcspn(line, "\r\n")] = 0;
        char *eq = strchr(line, '=');
        if (line[0] == '#' || !eq) continue;
        *eq = 0;
        if (only_mode) {
            if (!strcmp(line, "PES6_VITA_BENCH")) g_bench = eq[1] == '1';
            continue;
        }
        setenv(line, eq + 1, 1);
        fprintf(stderr, "env.txt: %s=%s\n", line, eq + 1);
    }
    if (f) fclose(f);
}

static void load_env(void) {
    apply_env_file(1);                                         /* the mode picks the defaults */
    setenv("PES6_DISC_ISO", DATA_DIR "/pes6.iso", 1);
    setenv("PES6_IO_ROOT", DATA_DIR, 1);
    setenv("PES6_MODS", DATA_DIR "/mods", 1);
    setenv("PES6_VERSION", "original", 1);
    setenv("PES6_MENU", "0", 1);
    setenv("PES6_GE_THREADS", "1", 1);                         /* no rasterizer workers */
    setenv("PES6_GE_ASYNC", "1", 1);                           /* the GE on core 1 (0: on the game's) */
    setenv("PES6_GE_BEHIND", "1", 1);                          /* the GE draws a frame behind the game (0: DrawSync waits) */
    setenv("PES6_SAS_THREAD", "1", 1);                         /* half the sound mix on core 2 (0: all on core 0) */
    if (g_bench) {
        setenv("PES6_INPUT", REF_INPUT, 1);
        setenv("PES6_GE_NODRAW", "1", 1);
        setenv("PES6_BENCH", "1", 1);
        setenv("PES6_BENCH_FROM", "450", 1);
        setenv("PES6_BENCH_FRAMES", "2700", 1);                /* 90 s of match at 30 fps */
        setenv("PES6_PROF", "1", 1);                           /* sampler on core 2 (sampler.h) */
    }
    apply_env_file(0);
}

/* ---- files -------------------------------------------------------------------------------- */

static uint32_t g_module_end;

static int load_elf(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return -1;
    unsigned char eh[52];
    if (fread(eh, 1, sizeof eh, f) != sizeof eh || memcmp(eh, "\x7f" "ELF", 4) != 0) { fclose(f); return -1; }
    const uint32_t e_phoff = eh[28] | eh[29] << 8 | eh[30] << 16 | (uint32_t)eh[31] << 24;
    const uint16_t e_phentsize = eh[42] | eh[43] << 8, e_phnum = eh[44] | eh[45] << 8;
    for (int i = 0; i < e_phnum; i++) {
        unsigned char ph[32];
        fseek(f, (long)(e_phoff + (uint32_t)i * e_phentsize), SEEK_SET);
        if (fread(ph, 1, sizeof ph, f) != sizeof ph) break;
#define U32(o) (ph[o] | ph[o + 1] << 8 | ph[o + 2] << 16 | (uint32_t)ph[o + 3] << 24)
        if (U32(0) != 1) continue;                               /* PT_LOAD */
        const uint32_t off = U32(4), vaddr = U32(8), filesz = U32(16), memsz = U32(20);
#undef U32
        if (vaddr + memsz > g_module_end) g_module_end = vaddr + memsz;
        unsigned char *buf = malloc(filesz);
        if (!buf) { fclose(f); return -1; }
        fseek(f, (long)off, SEEK_SET);
        const int ok = fread(buf, 1, filesz, f) == filesz && psp_mem_write_block(vaddr, buf, filesz) == 0;
        free(buf);
        if (!ok) { fclose(f); return -1; }
        fprintf(stderr, "loaded PT_LOAD vaddr=0x%08X filesz=0x%X memsz=0x%X\n", vaddr, filesz, memsz);
    }
    fclose(f);
    return 0;
}

static int file_exists(const char *path) {
    SceIoStat st;
    return sceIoGetstat(path, &st) >= 0;
}

/* ---- threads: one core each ----------------------------------------------------------------
 * The game on user core 0 (game_thread is created there), the GE -- and with it vitaGL -- on
 * core 1, the sound (output, half the SAS mix) and the profiler's sampler on core 2. vitaGL's
 * own threads keep the masks it gives them (as in the NFS port, no vglSetupGarbageCollector). */

static void pin(const char *what, int mask) {
    const int rc = sceKernelChangeThreadCpuAffinityMask(sceKernelGetThreadId(), mask);
    fprintf(stderr, "[vita] %s thread 0x%X on core mask 0x%X: 0x%08X\n", what, (unsigned)sceKernelGetThreadId(), (unsigned)mask,
            (unsigned)rc);
}
static void sampler_pin(void) { pin("sampler", SCE_KERNEL_CPU_MASK_USER_2); }
static void sas_pin(void) { pin("sound mix worker", SCE_KERNEL_CPU_MASK_USER_2); }
static void atrac_pin(void) { pin("music decoder", SCE_KERNEL_CPU_MASK_USER_2); }

/* vitaGL compiles shaders at run time with Sony's compiler, which users extract with ShaRKBR33D. */
static int have_shader_compiler(void) {
    return file_exists("ur0:data/libshacccg.suprx") || file_exists("ur0:data/external/libshacccg.suprx");
}

/* On the GE thread, before anything else runs there: vitaGL, then the GE's GL backend at x2.
 * vitaGL shows its splash from vglInit until the app's first scene, so after a failure here the
 * error has to be drawn through vitaGL too (screen.c, SCREEN_FFP). */
static atomic_int g_gl_state;         /* 0 not yet, 1 up, -1 failed */
static atomic_int g_vgl_up;           /* vglInit returned */
static void gl_start(void) {
    pin("GE", SCE_KERNEL_CPU_MASK_USER_1);
    fprintf(stderr, "[vita] vitaGL init...\n");
    if (vglInitWithCustomThreshold(0x40000, SCREEN_W, SCREEN_H, VGL_RAM_LEFT, VGL_CDRAM_LEFT, 0x7FFFFFFF, 0x8C6000,
                                   SCE_GXM_MULTISAMPLE_NONE))
        fprintf(stderr, "[vita] vitaGL: %dx%d fell back to the display's maximum\n", SCREEN_W, SCREEN_H);
    atomic_store(&g_vgl_up, 1);
    vglWaitVblankStart(GL_TRUE);                         /* flips on vblank: no tearing */
    fprintf(stderr, "[vita] vitaGL up: free RAM %u KB, CDRAM %u KB, phycont %u KB\n",
            (unsigned)(vglMemFree(VGL_MEM_RAM) / 1024), (unsigned)(vglMemFree(VGL_MEM_VRAM) / 1024),
            (unsigned)(vglMemFree(VGL_MEM_PHYCONT) / 1024));
    const int rc = pes6_ge_gl_enable(SCREEN_W / 480);
    fprintf(stderr, "[vita] GE on the GPU at %dx%d: %s\n", SCREEN_W, SCREEN_H, rc == 0 ? "yes" : "FAILED");
    atomic_store(&g_gl_state, rc == 0 ? 1 : -1);
}

/* ---- sound: what the game's channels have queued (audio.c), 44.1 kHz stereo ----------------- */

#define AUDIO_FRAMES 512              /* 11.6 ms a block; a multiple of 64, as sceAudioOut asks */

static int audio_thread(SceSize args, void *argp) {
    (void)args;
    (void)argp;
    const int port = sceAudioOutOpenPort(SCE_AUDIO_OUT_PORT_TYPE_BGM, AUDIO_FRAMES, 44100, SCE_AUDIO_OUT_MODE_STEREO);
    fprintf(stderr, "[vita] sound out: port 0x%08X (BGM, 44.1 kHz, %d frames a block)\n", (unsigned)port, AUDIO_FRAMES);
    if (port < 0) return 0;
    static int16_t pcm[2][AUDIO_FRAMES * 2] __attribute__((aligned(64)));
    pes6_audio_set_sink(1);
    for (int k = 0;; k ^= 1) {
        pes6_audio_pull(pcm[k], AUDIO_FRAMES);
        sceAudioOutOutput(port, pcm[k]);               /* blocks until the previous block is playing */
    }
    return 0;
}

/* ---- where the GE thread's time goes: pes6_ge_stage (ge.h) sampled from core 2 --------------
 * One read of a byte every ~200 us; the [fps] line prints the share of each stage. PES6_GE_SAMPLE=0
 * in env.txt leaves it off. */
static _Atomic uint32_t g_stage_hits[PES6_GE_STAGES];

static int stage_sampler(SceSize args, void *argp) {
    (void)args; (void)argp;
    for (;;) {
        const unsigned s = pes6_ge_stage;
        if (s < PES6_GE_STAGES) atomic_fetch_add_explicit(&g_stage_hits[s], 1, memory_order_relaxed);
        sceKernelDelayThread(200);
    }
    return 0;
}

static void stage_sampler_start(void) {
    const char *e = getenv("PES6_GE_SAMPLE");
    if (e && e[0] == '0') return;
    const SceUID th = sceKernelCreateThread("pes6_ge_sample", stage_sampler, 160, 16 * 1024, 0, SCE_KERNEL_CPU_MASK_USER_2, NULL);
    if (th >= 0) sceKernelStartThread(th, 0, NULL);
}

/* "idle 30 list 12 ..." of the samples since the last call, in percent. */
static void stage_report(char *out, size_t size) {
    static const char *const NAME[PES6_GE_STAGES] = { "idle", "list", "setup", "vprep", "verts", "tex", "gldraw", "flush", "present", "swap", "vwait" };
    static uint32_t last[PES6_GE_STAGES];
    uint32_t d[PES6_GE_STAGES], total = 0;
    for (int i = 0; i < PES6_GE_STAGES; i++) {
        const uint32_t v = atomic_load_explicit(&g_stage_hits[i], memory_order_relaxed);
        d[i] = v - last[i];
        last[i] = v;
        total += d[i];
    }
    size_t at = 0;
    out[0] = 0;
    for (int i = 0; i < PES6_GE_STAGES && total; i++)
        at += (size_t)snprintf(out + at, at < size ? size - at : 0, "%s%s %.0f", i ? ", " : "", NAME[i], d[i] * 100.0 / total);
}

/* ---- what the PSP's dialogs would have shown ---------------------------------------------------
 * The savedata and message dialogs complete at once, with nothing on screen (psprecomp's misc.c):
 * saving a cup looked like nothing happened. Their outcome is shown as a notice over the picture
 * (screen.c). PES6_NOTICES=0 in env.txt: none, as before. */
/* The notices and the save list speak the game's language, the one the player picks at every start
 * (PES6_GAME_LANGUAGE, pes6_addrs.h); with any other value, the Vita's (lang.h). Accents are
 * dropped when drawn (screen.c's font). */
enum {
    T_LOADED, T_NO_DATA, T_LOAD_FAIL, T_SAVED, T_SAVE_FAIL, T_DELETED, T_NO_DELETE, T_YES,
    T_SAVE, T_DELETE, T_LOAD, T_HINT, T_NEW, T_NEW_SLOT, T_ASK_DELETE, T_ASK_OVER, T_YES_NO, T_COUNT
};
static const char *const TEXT[T_COUNT][PES6_GAME_LANGUAGES] = {   /* English, French, German, Italian, Spanish */
    [T_LOADED]     = { "Data loaded", "Données chargées", "Daten geladen", "Dati caricati", "Datos cargados" },
    [T_NO_DATA]    = { "No saved data", "Aucune donnée sauvegardée", "Keine gespeicherten Daten", "Nessun dato salvato",
                       "No hay datos guardados" },
    [T_LOAD_FAIL]  = { "Could not load the data (0x%08X)", "Impossible de charger les données (0x%08X)",
                       "Daten konnten nicht geladen werden (0x%08X)", "Impossibile caricare i dati (0x%08X)",
                       "No se pudieron cargar los datos (0x%08X)" },
    [T_SAVED]      = { "Data saved", "Données sauvegardées", "Daten gespeichert", "Dati salvati", "Datos guardados" },
    [T_SAVE_FAIL]  = { "Could not save the data (0x%08X)", "Impossible de sauvegarder les données (0x%08X)",
                       "Daten konnten nicht gespeichert werden (0x%08X)", "Impossibile salvare i dati (0x%08X)",
                       "No se pudieron guardar los datos (0x%08X)" },
    [T_DELETED]    = { "Data deleted", "Données supprimées", "Daten gelöscht", "Dati eliminati", "Datos borrados" },
    [T_NO_DELETE]  = { "No data to delete", "Aucune donnée à supprimer", "Keine Daten zum Löschen", "Nessun dato da eliminare",
                       "No hay datos para borrar" },
    [T_YES]        = { " (Yes)", " (Oui)", " (Ja)", " (Sì)", " (Sí)" },
    [T_SAVE]       = { "Save data", "Sauvegarder", "Daten speichern", "Salva dati", "Guardar datos" },
    [T_DELETE]     = { "Delete data", "Supprimer", "Daten löschen", "Elimina dati", "Borrar datos" },
    [T_LOAD]       = { "Load data", "Charger", "Daten laden", "Carica dati", "Cargar datos" },
    [T_HINT]       = { "Up/Down: choose   X: OK   O: back", "Haut/Bas : choisir   X : OK   O : retour",
                       "Auf/Ab: wählen   X: OK   O: zurück", "Su/Giù: scegli   X: OK   O: indietro",
                       "Arriba/Abajo: elegir   X: aceptar   O: volver" },
    [T_NEW]        = { "New data", "Nouvelles données", "Neue Daten", "Nuovi dati", "Nuevos datos" },
    [T_NEW_SLOT]   = { "Save in a new slot", "Sauvegarder dans un nouvel emplacement", "In einem neuen Platz speichern",
                       "Salva in un nuovo slot", "Guardar en un espacio nuevo" },
    [T_ASK_DELETE] = { "Delete this data?", "Supprimer ces données ?", "Diese Daten löschen?", "Eliminare questi dati?",
                       "¿Borrar estos datos?" },
    [T_ASK_OVER]   = { "Save over this data?", "Écraser ces données ?", "Diese Daten überschreiben?", "Sovrascrivere questi dati?",
                       "¿Sobrescribir estos datos?" },
    [T_YES_NO]     = { "X: yes   O: no", "X : oui   O : non", "X: ja   O: nein", "X: sì   O: no", "X: sí   O: no" },
};

static const char *T(int id) {
    uint32_t g = psp_read32(PES6_GAME_LANGUAGE);
    if (g >= PES6_GAME_LANGUAGES) g = pes6_lang == PES6_LANG_ES ? PES6_GAME_ES : PES6_GAME_EN;
    return TEXT[id][g];
}

static void savedata_notice(uint32_t mode, uint32_t result) {
    const unsigned r = (unsigned)result;
    if (r == 1) return;                              /* the player backed out of the list */
    switch (mode) {
    case 2: case 4:                                  /* load, load from the list */
        if (r == 0) screen_notice(2500, "%s", T(T_LOADED));
        else if (r == 0x80110307u) screen_notice(3000, "%s", T(T_NO_DATA));
        else screen_notice(4000, T(T_LOAD_FAIL), r);
        break;
    case 1: case 3: case 5:                          /* autosave, save, save from the list */
        if (r == 0) screen_notice(2500, "%s", T(T_SAVED));
        else screen_notice(4000, T(T_SAVE_FAIL), r);
        break;
    case 6: case 7:                                  /* delete */
        if (r == 0) screen_notice(2500, "%s", T(T_DELETED));
        else screen_notice(3000, "%s", T(T_NO_DELETE));
        break;
    default: break;                                  /* the Option File at boot, sizes: nothing */
    }
}

static void msgdialog_notice(const char *text, int yes_no) {
    screen_notice(yes_no ? 6000 : 5000, "%s%s", text, yes_no ? T(T_YES) : "");
}

/* ---- the PSP's save / load list ----------------------------------------------------------------
 * A list request (Cup or League -> Load Data, Save) shows the game's slots, as the PSP's dialog:
 * up / down (or the stick) and X pick one, O backs out; saving over a save, or deleting one,
 * asks first. A save offers a new slot first, so there can be several cups. All of it runs on the
 * game's thread (the HLE call, the vblank hook, the buttons the game reads): no locks here;
 * screen.c draws it on the GE thread. While the list is up, and until every button is let go
 * after it, the game gets no buttons. PES6_SAVEDATA_LIST=0 in env.txt: no list, as before. */
static struct {
    int on, mode, n, sel, asking, held;
    uint32_t prev;                                   /* the buttons at the last vblank */
    int exists[SCREEN_LIST_MAX];
    screen_list l;
} g_pick;
static int g_pick_release;                           /* no buttons for the game until all let go */

/* A save's two lines: its title and the first line of its detail, then the rest of the detail.
 * A line after a label ("Time / Date Saved :") goes on the right of the first: the date. */
static void pick_rows(const psp_savedata_slot *s, char *top, size_t tn, char *bottom, size_t bn, char *right, size_t rn) {
    char d[sizeof s->detail];
    snprintf(d, sizeof d, "%s", s->detail);
    top[0] = bottom[0] = right[0] = 0;
    int k = 0, labelled = 0;
    for (char *line = strtok(d, "\n"); line; line = strtok(NULL, "\n")) {
        while (*line == ' ') line++;
        size_t len = strlen(line);
        while (len && line[len - 1] == ' ') line[--len] = 0;
        if (!len) continue;
        if (line[len - 1] == ':') { labelled = 1; continue; }
        if (labelled && !right[0]) { snprintf(right, rn, "%s", line); labelled = 0; continue; }
        labelled = 0;
        if (k++ == 0) {
            snprintf(top, tn, "%s%s%s", s->title, s->title[0] ? " - " : "", line);
        } else {
            const size_t at = strlen(bottom);
            snprintf(bottom + at, bn - at, "%s%s", at ? " - " : "", line);
        }
    }
    if (!k) snprintf(top, tn, "%s", s->title[0] ? s->title : s->name);
}

static void pick_answer(int i) {
    g_pick.on = 0;
    g_pick_release = 1;
    screen_list_hide();
    fprintf(stderr, "[vita] save list: %s %d\n", i < 0 ? "backed out" : "chose", i);
    psp_savedata_choose_answer(i);
}

static int savedata_choose(uint32_t mode, const psp_savedata_slot *slots, int n, int initial) {
    if (!g_gl || n <= 0) return -1;
    if (n > SCREEN_LIST_MAX) n = SCREEN_LIST_MAX;
    memset(&g_pick.l, 0, sizeof g_pick.l);
    snprintf(g_pick.l.heading, sizeof g_pick.l.heading, "%s",
             mode == 5 ? T(T_SAVE) : mode == 6 ? T(T_DELETE) : T(T_LOAD));
    snprintf(g_pick.l.hint, sizeof g_pick.l.hint, "%s", T(T_HINT));
    for (int i = 0; i < n; i++) {
        g_pick.exists[i] = slots[i].exists;
        if (slots[i].exists) {
            pick_rows(&slots[i], g_pick.l.row[i].top, sizeof g_pick.l.row[i].top, g_pick.l.row[i].bottom,
                      sizeof g_pick.l.row[i].bottom, g_pick.l.row[i].right, sizeof g_pick.l.row[i].right);
        } else {
            snprintf(g_pick.l.row[i].top, sizeof g_pick.l.row[i].top, "%s", T(T_NEW));
            snprintf(g_pick.l.row[i].bottom, sizeof g_pick.l.row[i].bottom, "%s", T(T_NEW_SLOT));
            g_pick.l.row[i].fresh = 1;
        }
    }
    g_pick.mode = (int)mode;
    g_pick.n = g_pick.l.n = n;
    g_pick.sel = g_pick.l.sel = initial >= 0 && initial < n ? initial : 0;
    g_pick.asking = g_pick.held = 0;
    SceCtrlData pad;
    sceCtrlPeekBufferPositive(0, &pad, 1);
    g_pick.prev = pad.buttons;                       /* the X that chose Save is not a pick */
    g_pick.on = 1;
    screen_list_show(&g_pick.l);
    fprintf(stderr, "[vita] save list (mode %u): %d slot(s), on %d\n", mode, n, g_pick.sel);
    return 0;
}

/* While the list is up, and after it until the buttons and the stick are let go. */
static int pick_blocks(void) {
    if (g_pick.on) return 1;
    if (!g_pick_release) return 0;
    if (g_pad.buttons == 0 && abs(g_pad.lx - 128) < 40 && abs(g_pad.ly - 128) < 40) g_pick_release = 0;
    return g_pick_release;
}

/* Each vblank, with the pad as read there. */
static void pick_vblank(const SceCtrlData *pad) {
    if (!g_pick.on) return;
    uint32_t b = pad->buttons;
    if (pad->ly < 50) b |= SCE_CTRL_UP;
    else if (pad->ly > 205) b |= SCE_CTRL_DOWN;
    const uint32_t press = b & ~g_pick.prev;
    g_pick.prev = b;
    int move = 0;
    if (b & (SCE_CTRL_UP | SCE_CTRL_DOWN)) {
        const int again = ++g_pick.held > 24 && g_pick.held % 6 == 0;   /* held: repeats */
        if ((press | (again ? b : 0)) & SCE_CTRL_UP) move = -1;
        else if ((press | (again ? b : 0)) & SCE_CTRL_DOWN) move = 1;
    } else {
        g_pick.held = 0;
    }
    int changed = 0;
    if (g_pick.asking) {
        if (press & SCE_CTRL_CROSS) { pick_answer(g_pick.sel); return; }
        if (press & SCE_CTRL_CIRCLE) { g_pick.asking = 0; g_pick.l.question[0] = 0; changed = 1; }
    } else if (press & SCE_CTRL_CROSS) {
        if ((g_pick.mode == 5 && g_pick.exists[g_pick.sel]) || g_pick.mode == 6) {
            g_pick.asking = 1;
            snprintf(g_pick.l.question, sizeof g_pick.l.question, "%s",
                     g_pick.mode == 6 ? T(T_ASK_DELETE) : T(T_ASK_OVER));
            snprintf(g_pick.l.answers, sizeof g_pick.l.answers, "%s", T(T_YES_NO));
            changed = 1;
        } else {
            pick_answer(g_pick.sel);
            return;
        }
    } else if (press & SCE_CTRL_CIRCLE) {
        pick_answer(-1);
        return;
    } else if (move) {
        const int s = g_pick.sel + move;
        if (s >= 0 && s < g_pick.n) { g_pick.sel = s; changed = 1; }
    }
    if (changed) {
        g_pick.l.sel = g_pick.sel;
        screen_list_show(&g_pick.l);
    }
}

/* The port's own text in Spanish on a Vita set to Spanish, English otherwise (lang.h). */
static const char *vita_locale(void) {
    SceAppUtilInitParam ip;
    SceAppUtilBootParam bp;
    memset(&ip, 0, sizeof ip);
    memset(&bp, 0, sizeof bp);
    sceAppUtilInit(&ip, &bp);                        /* already up: an error that changes nothing */
    int lang = -1;
    if (sceAppUtilSystemParamGetInt(SCE_SYSTEM_PARAM_ID_LANG, &lang) < 0) return "en";
    return lang == SCE_SYSTEM_PARAM_LANG_SPANISH ? "es" : "en";
}

static void audio_start(void) {
    const SceUID th = sceKernelCreateThread("pes6_audio", audio_thread, 64, 64 * 1024, 0, SCE_KERNEL_CPU_MASK_USER_2, NULL);
    if (th >= 0) sceKernelStartThread(th, 0, NULL);
    else fprintf(stderr, "[vita] no sound thread: 0x%08X\n", (unsigned)th);
}

/* ---- the picture: once per vblank, from the scheduler (game thread) -------------------------- */

static uint32_t g_pixels[480 * 272];
static atomic_int g_shows;            /* pictures on their way to the screen */

/* On the GE thread: the frame the game shows, then the flip. */
static _Atomic uint64_t g_present_ns, g_swap_ns, g_queue_wait_ns;   /* for the [fps] line */
static void show_job(uint64_t fb_stride, uint64_t fmt) {
    const uint32_t fb = (uint32_t)fb_stride, stride = (uint32_t)(fb_stride >> 32);
    const uint64_t t0 = now_ns();
    pes6_ge_stage = PES6_GE_PRESENT;
    if (!pes6_ge_gl_present(fb, SCREEN_W, SCREEN_H) && pes6_ge_read_rgba(g_pixels, fb, stride, (int)fmt) == 0)
        pes6_ge_gl_present_pixels(g_pixels, SCREEN_W, SCREEN_H);    /* a buffer the game filled itself (movies) */
    screen_list_draw();                                             /* the save list, over it */
    screen_notice_draw();                                           /* "Data saved" and the like */
    const uint64_t t1 = now_ns();
    pes6_ge_stage = PES6_GE_SWAP;
    vglSwapBuffers(GL_FALSE);
    pes6_ge_stage = PES6_GE_LIST;
    atomic_fetch_add(&g_present_ns, t1 - t0);                       /* the frame's GL commands and the blit */
    atomic_fetch_add(&g_swap_ns, now_ns() - t1);                    /* the swap: vblank and GPU waits */
    atomic_fetch_sub(&g_shows, 1);
}

/* How long each picture stayed on screen, in vblanks: 2 is 30 fps, 3 or more a visible drop. */
static uint32_t g_hold[5], g_hold_max;

static void on_vblank(void) {
    static uint64_t shown = ~0ull, vblanks, last_flip;
    vblanks++;
    if (g_gl && psp_display_flips() != shown) {
        shown = psp_display_flips();
        if (last_flip) {
            const uint64_t held = vblanks - last_flip;
            g_hold[held < 4 ? held : 4]++;
            if (held > g_hold_max) g_hold_max = (uint32_t)held;
        }
        last_flip = vblanks;
        if (atomic_load(&g_shows) >= 2) {
            const uint64_t w0 = now_ns();
            while (atomic_load(&g_shows) >= 2) sceKernelDelayThread(500);
            atomic_fetch_add(&g_queue_wait_ns, now_ns() - w0);
        }
        atomic_fetch_add(&g_shows, 1);
        pes6_ge_post(show_job, (uint64_t)psp_display_framebuffer() | (uint64_t)psp_display_stride() << 32,
                     (uint64_t)(psp_display_format() & 0xFF));
    }

    /* L + R + START + SELECT for two seconds: end the run with the report. */
    static uint64_t held_since;
    SceCtrlData pad;
    sceCtrlPeekBufferPositive(0, &pad, 1);
    pick_vblank(&pad);                                              /* the save list, when it is up */
    const unsigned all = SCE_CTRL_LTRIGGER | SCE_CTRL_RTRIGGER | SCE_CTRL_START | SCE_CTRL_SELECT;
    if ((pad.buttons & all) == all) {
        if (!held_since) held_since = now_ns();
        else if (now_ns() - held_since > 2000000000ull) finish("salida pedida (L+R+START+SELECT)");
    } else {
        held_since = 0;
    }

    /* Every 10 s: the frame rate the game shows and the GE thread's load, in the log. */
    static uint64_t t0, flips0, ge0, wait0, present0, swap0, queue0;
    const uint64_t t = now_ns(), flips = psp_display_flips();
    if (!t0) { t0 = t; flips0 = flips; }
    if (t - t0 >= 10000000000ull) {
        uint64_t ge = 0, wait = 0;
        pes6_ge_thread_stats(&ge, &wait);
        const uint64_t present = atomic_load(&g_present_ns), swap = atomic_load(&g_swap_ns), queue = atomic_load(&g_queue_wait_ns);
        const double n = flips > flips0 ? (double)(flips - flips0) : 1.0;
        /* the clocks too: an overclocking plugin can change them while the game runs */
        fprintf(stderr, "[fps] %.1f fps; CPU %d MHz, GPU %d MHz; GE thread busy %.0f%%; scene %u; a frame (ms): GE present %.1f, "
                        "swap %.1f; game waited for the GE %.1f (sync) + %.1f (2 pictures queued)\n",
                (double)(flips - flips0) * 1e9 / (double)(t - t0), scePowerGetArmClockFrequency(), scePowerGetGpuClockFrequency(),
                (double)(ge - ge0) * 100.0 / (double)(t - t0), psp_read32(PES6_SCENE_STACK), (present - present0) / 1e6 / n,
                (swap - swap0) / 1e6 / n, (wait - wait0) / 1e6 / n, (queue - queue0) / 1e6 / n);
        char stages[200];
        stage_report(stages, sizeof stages);
        static uint64_t prims0, verts0, cmds0;
        const pes6_ge_stats *gs = pes6_ge_get_stats();
        fprintf(stderr, "[ge] a frame: %.0f prims, %.0f vertices, %.0f commands; GE thread time (%% of all): %s\n",
                (gs->prims - prims0) / n, (gs->vertices - verts0) / n, (gs->commands - cmds0) / n, stages);
        fprintf(stderr, "[fps] pictures on screen for 1 vblank %u, 2 (30 fps) %u, 3 (a drop to 20) %u, 4+ %u; longest %u vblanks\n",
                g_hold[1], g_hold[2], g_hold[3], g_hold[4], g_hold_max);
        /* The music (ATRAC3plus): decoded ahead on core 2, what is left on the game's thread; the
         * movies (H.264 and their sound) are decoded on the game's thread. */
        static uint64_t at3_0, game_0, h264_0;
        const uint64_t at3 = pes6_at3_ns, game = pes6_atrac_game_ns(), h264 = pes6_h264_ns;
        fprintf(stderr, "[fps] a frame: music %.2f ms on the game's thread (ATRAC decoding %.2f ms on all cores), "
                        "movie pictures %.2f ms%s\n",
                (game - game_0) / 1e6 / n, (at3 - at3_0) / 1e6 / n, (h264 - h264_0) / 1e6 / n,
                pes6_at3_available() ? "" : " (built without FFmpeg: no music, no movies)");
        at3_0 = at3;
        game_0 = game;
        h264_0 = h264;
        memset(g_hold, 0, sizeof g_hold);
        g_hold_max = 0;
        prims0 = gs->prims;
        verts0 = gs->vertices;
        cmds0 = gs->commands;
        t0 = t;
        flips0 = flips;
        ge0 = ge;
        wait0 = wait; present0 = present; swap0 = swap; queue0 = queue;
    }
}

/* Bench: once per ~2 s of real time, from a vblank task: the time it takes is not the game's. */
static void status_task(void) {
    static uint64_t last;
    const uint64_t t0 = now_ns();
    if (t0 - last < 2000000000ull) return;
    last = t0;
    char status[200];
    pes6_bench_status(status, sizeof status);
    screen_draw(status);
    pes6_bench_exclude_ns(now_ns() - t0);
}

/* The settings' quality on the GE thread (pes6_ge_gl_configure: textures and the picture smoothed
 * or not; the resolution stays at x2). */
static int g_quality;
static void configure_job(void) {
    pes6_ge_gl_configure(0, g_quality == QUALITY_HIGH, g_quality != QUALITY_LOW);
}

/* ---- setup -------------------------------------------------------------------------------- */

static int game_thread(SceSize args, void *argp) {
    (void)args;
    (void)argp;
    load_env();
    screen_title(g_bench ? "PES6 Vita - prueba de CPU" : "PES6 Vita");
    screen_line("CPU %d MHz, bus %d MHz, GPU %d MHz", scePowerGetArmClockFrequency(), scePowerGetBusClockFrequency(),
                scePowerGetGpuClockFrequency());
    screen_draw(NULL);

    /* The guest's 128 MB first: vitaGL takes most of what is left. */
    if (psp_mem_init() != 0) fatal("no hay memoria para los 128 MB del PSP");
    if (!have_shader_compiler())
        fatal("falta ur0:data/libshacccg.suprx: extraelo con ShaRKBR33D");

    /* vitaGL on the GE thread (core 1); on this one if that thread can't start. */
    if (pes6_ge_thread_start(gl_start) != 0) {
        fprintf(stderr, "[vita] no GE thread: the GE and vitaGL on the game's thread\n");
        gl_start();
    }
    stage_sampler_start();
    for (int ms = 0; atomic_load(&g_gl_state) == 0; ms += 10) {
        if (ms == 60000) {
            fprintf(stderr, "[vita] vitaGL did not come up in 60 s (vglInit %s)\n", atomic_load(&g_vgl_up) ? "returned" : "stuck");
            fatal(atomic_load(&g_vgl_up) ? "los shaders no terminaron de compilar en 60 s" : "vitaGL no arranco en 60 s");
        }
        sceKernelDelayThread(10000);
    }
    if (atomic_load(&g_gl_state) < 0) {
        screen_use_gl(SCREEN_FFP);
        fatal("no se pudieron compilar los shaders del GE (ver pes6.log)");
    }
    g_gl = 1;
    screen_use_gl(SCREEN_GE);
    screen_line("Graficos: vitaGL a %dx%d", SCREEN_W, SCREEN_H);
    screen_draw(NULL);

    const char *iso = getenv("PES6_DISC_ISO");
    if (!file_exists(iso)) fatal("falta " DATA_DIR "/pes6.iso (PES6 PSP, ULES00476)");

    char elf[256];
    snprintf(elf, sizeof elf, "%s/EBOOT.elf", DATA_DIR);
    if (!file_exists(elf)) {
        screen_line("Descifrando el EBOOT de la ISO...");
        screen_draw(NULL);
        const int fd = open(iso, O_RDONLY);
        const int rc = fd >= 0 ? pes6_iso_eboot(fd, elf) : -1;
        if (fd >= 0) close(fd);
        if (rc != 0) fatal(rc < 0 ? "no se pudo abrir la ISO" : pes6_iso_eboot_message(rc));
    }

    screen_line("Cargando el juego recompilado...");
    screen_draw(NULL);
    if (load_elf(elf) != 0) fatal("no se pudo cargar EBOOT.elf");

    psp_hle_init();
    {
        /* The PSP's clock from the Vita's local date and time, not psprecomp's fixed 2006 date:
         * the game writes it in its saves. PES6_REAL_CLOCK=0 in env.txt: the 2006 date. */
        const char *rc = getenv("PES6_REAL_CLOCK");
        SceDateTime now;
        if ((!rc || *rc != '0') && !getenv("PES6_CLOCK") && sceRtcGetCurrentClockLocalTime(&now) >= 0) {
            psp_clock_set_start(now.year, now.month, now.day, now.hour, now.minute, now.second);
            fprintf(stderr, "[vita] clock from %04u-%02u-%02u %02u:%02u\n", now.year, now.month, now.day, now.hour, now.minute);
        }
    }
    psp_io_set_root(getenv("PES6_IO_ROOT"));
    pes6_tuning_init(psp_io_root());
    pes6_tuning_apply_data("EBOOT.elf");
    pes6_rules_init(psp_io_root());
    psp_sysmem_set_range((g_module_end + 0xFFu) & ~0xFFu, 0);
    psp_cpu_reset();
    psp_recomp_register();
    pes6_overlays_init();
    psp_set_miss_handler(on_miss);              /* after registration: psp_dispatch_reset clears it */
    pes6_ge_init();
    {
        const char *s = getenv("PES6_SAS_THREAD");
        if (s && *s == '1') {
            const int rc = psp_sas_worker_start(sas_pin);
            fprintf(stderr, "[vita] sound mix worker: %d\n", rc);
        }
    }
    /* The music's ATRAC3plus frames decoded ahead on core 2, not on the game's (atrac.c);
     * PES6_ATRAC_AHEAD=0 in env.txt decodes them on the game's thread as before. */
    fprintf(stderr, "[vita] music decoder ahead on core 2: %s\n", pes6_atrac_worker_start(atrac_pin) == 0 ? "on" : "off");
    pes6_input_extra_buttons = vita_buttons;
    pes6_input_extra_analog = vita_analog;
    pes6_input_init();
    pes6_lang_init(vita_locale());
    {
        const char *s = getenv("PES6_NOTICES");
        if (!s || *s != '0') {
            psp_savedata_notice = savedata_notice;
            psp_msgdialog_notice = msgdialog_notice;
        }
        psp_savedata_choose = savedata_choose;       /* off with PES6_SAVEDATA_LIST=0 (misc.c) */
        fprintf(stderr, "[vita] language %s; notices for saving and loading: %s\n", pes6_lang == PES6_LANG_ES ? "es" : "en",
                psp_savedata_notice ? "on" : "off");
    }

    pes6_settings settings;
    pes6_settings_load(&settings, psp_io_root());
    pes6_settings_current = settings;
    g_quality = settings.quality;
    pes6_ge_call(configure_job);
    {
        static pes6_version v[PES6_PATCH_MAX + 1];
        const char *mods = getenv("PES6_MODS");
        const int n = pes6_versions_list(mods, v, PES6_PATCH_MAX + 1);
        int i = pes6_version_find(v, n, getenv("PES6_VERSION"));
        if (i < 0) i = 0;
        if (n == 0 || pes6_version_apply(&v[i], psp_io_root(), mods) != 0) fatal("no se pudo preparar la version del juego");
    }
    /* Players' own faces come only with a patch (mods/<id>/faces, faces.c; the version above sets
     * PES6_MOD). Without one the hooks still cost: every model the game draws walks the players
     * and posts to the GE, and every new texture is named by its texels for the swap. */
    {
        const char *mod = getenv("PES6_MOD");
        if (mod && *mod) pes6_faces_init();
        else fprintf(stderr, "[faces] off: no patch\n");
    }
    pes6_mpeg_init();
    pes6_atrac_init();
    pes6_audio_init();
    setup_commentary();
    pes6_osk_init();
    pes6_bench_done = on_bench_done;
    pes6_bench_init();
    pes6_sampler_init(sampler_pin);
    signal(SIGALRM, on_stop_signal);                  /* input.c raises it at PES6_STOP_AT */

    psp_cpu.r[PSP_REG_GP] = PES6_MODULE_GP;
    psp_cpu.r[PSP_REG_SP] = PES6_HOST_STACK;
    psp_cpu.r[PSP_REG_RA] = 0;
    psp_cpu.r[PSP_REG_K0] = PES6_SCRATCH_K0;
    psp_cpu.r[PSP_REG_K1] = PES6_SCRATCH_K1;

    if (g_bench) {
        screen_line("Corriendo: arranque -> menu -> partido (sin dibujar)");
        screen_line("La medicion empieza en el partido; tarda varios minutos.");
        screen_draw(NULL);
        psp_add_vblank_task(status_task);
    } else {
        /* Real time from here: guest time follows the clock, the scheduler sleeps when the game
         * waits, and the vblank hook shows each new frame. */
        audio_start();
        psp_threadman_set_realtime(1);
        psp_set_vblank_hook(on_vblank);
    }
    fprintf(stderr, "entry 0x%08X (%s)\n", PES6_ENTRY, g_bench ? "bench" : "play");

    psp_dispatch(PES6_ENTRY);
    psp_threadman_run();
    finish("el juego termino solo (inesperado)");
    return 0;
}

int main(void) {
    scePowerSetArmClockFrequency(444);
    scePowerSetBusClockFrequency(222);
    scePowerSetGpuClockFrequency(222);
    scePowerSetGpuXbarClockFrequency(166);
    sceCtrlSetSamplingMode(SCE_CTRL_MODE_ANALOG);
    sceIoMkdir(DATA_DIR, 0777);
    freopen(DATA_DIR "/pes6.log", "w", stderr);
    setvbuf(stderr, NULL, _IOLBF, 0);

    /* The biggest stack the kernel grants: 4 MB for the thread itself, the rest are guest
     * threads' host stacks (the game makes ~7). */
    static const unsigned stack_mb[] = { 32, 24, 16, 12 };
    SceUID th = -1;
    for (unsigned i = 0; i < sizeof stack_mb / sizeof stack_mb[0] && th < 0; i++) {
        th = sceKernelCreateThread("pes6_game", game_thread, 0x10000100, stack_mb[i] * 1024u * 1024u, 0,
                                   SCE_KERNEL_CPU_MASK_USER_0, NULL);
        fprintf(stderr, "[vita] game thread with a %u MB stack: 0x%08X\n", stack_mb[i], (unsigned)th);
    }
    if (th < 0) return 1;
    sceKernelStartThread(th, 0, NULL);
    sceKernelWaitThreadEnd(th, NULL, NULL);
    sceKernelExitProcess(0);
    return 0;
}
