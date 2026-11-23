/* PES6 Vita — the host's text screens: see screen.h. */
#include "screen.h"
#include "ge.h"

#include <psp2/display.h>
#include <psp2/kernel/processmgr.h>
#include <psp2/kernel/sysmem.h>
#include <vitaGL.h>

#include <stdarg.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SW 960
#define SH 544
#define MAX_LINES 18
#define RGB(r, g, b) ((uint32_t)(r) | ((uint32_t)(g) << 8) | ((uint32_t)(b) << 16) | 0xFF000000u)

/* The 5x7 font of upstream's launcher.c (rows top to bottom, bit 4 = leftmost column). */
static const struct { char c; uint8_t row[7]; } FONT[] = {
    {'A', {14,17,17,31,17,17,17}}, {'B', {30,17,17,30,17,17,30}}, {'C', {14,17,16,16,16,17,14}},
    {'D', {30,17,17,17,17,17,30}}, {'E', {31,16,16,30,16,16,31}}, {'F', {31,16,16,30,16,16,16}},
    {'G', {14,17,16,23,17,17,15}}, {'H', {17,17,17,31,17,17,17}}, {'I', {14,4,4,4,4,4,14}},
    {'J', {7,2,2,2,2,18,12}},      {'K', {17,18,20,24,20,18,17}}, {'L', {16,16,16,16,16,16,31}},
    {'M', {17,27,21,21,17,17,17}}, {'N', {17,17,25,21,19,17,17}}, {'O', {14,17,17,17,17,17,14}},
    {'P', {30,17,17,30,16,16,16}}, {'Q', {14,17,17,17,21,18,13}}, {'R', {30,17,17,30,20,18,17}},
    {'S', {15,16,16,14,1,1,30}},   {'T', {31,4,4,4,4,4,4}},       {'U', {17,17,17,17,17,17,14}},
    {'V', {17,17,17,17,17,10,4}},  {'W', {17,17,17,21,21,21,10}}, {'X', {17,17,10,4,10,17,17}},
    {'Y', {17,17,17,10,4,4,4}},    {'Z', {31,1,2,4,8,16,31}},
    {'a', {0,0,14,1,15,17,15}},    {'b', {16,16,22,25,17,17,30}}, {'c', {0,0,14,16,16,17,14}},
    {'d', {1,1,13,19,17,17,15}},   {'e', {0,0,14,17,31,16,14}},   {'f', {6,9,8,28,8,8,8}},
    {'g', {15,17,17,17,15,1,14}},  {'h', {16,16,22,25,17,17,17}}, {'i', {4,0,12,4,4,4,14}},
    {'j', {2,0,6,2,2,18,12}},      {'k', {16,16,18,20,24,20,18}}, {'l', {12,4,4,4,4,4,14}},
    {'m', {0,0,26,21,21,17,17}},   {'n', {0,0,22,25,17,17,17}},   {'o', {0,0,14,17,17,17,14}},
    {'p', {30,17,17,17,30,16,16}}, {'q', {15,17,17,17,15,1,1}},   {'r', {0,0,22,25,16,16,16}},
    {'s', {0,0,14,16,14,1,30}},    {'t', {8,8,28,8,8,9,6}},       {'u', {0,0,17,17,17,19,13}},
    {'v', {0,0,17,17,17,10,4}},    {'w', {0,0,17,17,21,21,10}},   {'x', {0,0,17,10,4,10,17}},
    {'y', {17,17,17,19,13,1,14}},  {'z', {0,0,31,2,4,8,31}},
    {'0', {14,17,19,21,25,17,14}}, {'1', {4,12,4,4,4,4,14}},      {'2', {14,17,1,2,4,8,31}},
    {'3', {31,2,4,2,1,17,14}},     {'4', {2,6,10,18,31,2,2}},     {'5', {31,16,30,1,1,17,14}},
    {'6', {6,8,16,30,17,17,14}},   {'7', {31,1,2,4,8,8,8}},       {'8', {14,17,17,14,17,17,14}},
    {'9', {14,17,17,15,1,2,12}},
    {'(', {2,4,8,8,8,4,2}},        {')', {8,4,2,2,2,4,8}},        {'-', {0,0,0,31,0,0,0}},
    {'.', {0,0,0,0,0,12,12}},      {':', {0,12,12,0,12,12,0}},    {'/', {1,1,2,4,8,16,16}},
    {'?', {14,17,1,2,4,0,4}},      {'!', {4,4,4,4,4,0,4}},        {'_', {0,0,0,0,0,0,31}},
    {'&', {12,18,20,8,21,18,13}},  {'\'', {4,4,8,0,0,0,0}},       {'>', {8,4,2,1,2,4,8}},
    {',', {0,0,0,0,12,4,8}},       {';', {0,12,12,0,12,4,8}},     {'<', {2,4,8,16,8,4,2}},
    {'+', {0,4,4,31,4,4,0}},       {'=', {0,0,31,0,31,0,0}},      {'%', {24,25,2,4,8,19,3}},
    {'*', {0,4,21,14,21,4,0}},     {'#', {10,10,31,10,31,10,10}}, {'"', {10,10,0,0,0,0,0}},
};

static const uint8_t *glyph(char c) {
    for (size_t i = 0; i < sizeof FONT / sizeof FONT[0]; i++)
        if (FONT[i].c == c) return FONT[i].row;
    if (c >= 'a' && c <= 'z') return glyph((char)(c - 'a' + 'A'));
    return NULL;
}

static int descent(char c) { return c == 'g' || c == 'p' || c == 'q' || c == 'y' ? 2 : c == 'j' ? 1 : 0; }

static uint32_t g_px[SW * SH];
static char g_title[96] = "PES6 Vita";
static char g_lines[MAX_LINES][160];
static int g_n;
static int g_gl;

/* `s` at (x, y) of the pw x ph picture px, each font cell a k x k block; accented letters lose
 * the accent (French, German, Italian, Spanish text: the game's own messages and the port's). */
static void text_in(uint32_t *px, int pw, int ph, int x, int y, int k, const char *s, uint32_t color) {
    for (const unsigned char *p = (const unsigned char *)s; *p && x < pw; p++) {
        char c = (char)*p;
        if (*p == 0xC3 && p[1] >= 0x80 && p[1] <= 0xBF) {   /* UTF-8 Latin-1 letters (U+00C0-00FF) */
            static const char BARE[] = "AAAAAAACEEEEIIIIDNOOOOOxOUUUUYPsaaaaaaaceeeeiiiidnooooo/ouuuuypy";
            _Static_assert(sizeof BARE == 65, "one per letter from U+00C0");
            c = BARE[p[1] - 0x80];
            p++;
        } else if (*p >= 0x80) {                         /* anything else (¿ ¡ ...) is left out */
            continue;
        }
        const uint8_t *g = glyph(c);
        if (g) {
            const int dy = descent(c) * k;
            for (int r = 0; r < 7; r++)
                for (int col = 0; col < 5; col++) {
                    if (!(g[r] & (16 >> col))) continue;
                    for (int j = 0; j < k; j++) {
                        const int py = y + dy + r * k + j;
                        if (py < 0 || py >= ph) continue;
                        for (int i = 0; i < k; i++) {
                            const int qx = x + col * k + i;
                            if (qx >= 0 && qx < pw) px[py * pw + qx] = color;
                        }
                    }
                }
        }
        x += 6 * k;
    }
}

static void text(int x, int y, int k, const char *s, uint32_t color) { text_in(g_px, SW, SH, x, y, k, s, color); }

void screen_line(const char *fmt, ...) {
    if (g_n == MAX_LINES) {
        memmove(g_lines[0], g_lines[1], sizeof g_lines[0] * (MAX_LINES - 1));
        g_n = MAX_LINES - 1;
    }
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(g_lines[g_n++], sizeof g_lines[0], fmt, ap);
    va_end(ap);
}

void screen_clear(void) { g_n = 0; }
void screen_title(const char *title) { snprintf(g_title, sizeof g_title, "%s", title); }

/* ---- presenting ---------------------------------------------------------------------------- */

static uint32_t *g_fb;                /* the raw framebuffer (CDRAM), before vitaGL */

static void raw_present(void) {
    if (!g_fb) {
        void *base = NULL;
        const SceUID blk = sceKernelAllocMemBlock("pes6_screen", SCE_KERNEL_MEMBLOCK_TYPE_USER_CDRAM_RW,
                                                  (SW * SH * 4 + 0x3FFFF) & ~0x3FFFF, NULL);
        if (blk < 0 || sceKernelGetMemBlockBase(blk, &base) < 0) return;
        g_fb = (uint32_t *)base;
    }
    memcpy(g_fb, g_px, sizeof g_px);
    SceDisplayFrameBuf fb;
    memset(&fb, 0, sizeof fb);
    fb.size = sizeof fb;
    fb.base = g_fb;
    fb.pitch = SW;
    fb.pixelformat = SCE_DISPLAY_PIXELFORMAT_A8B8G8R8;
    fb.width = SW;
    fb.height = SH;
    sceDisplaySetFrameBuf(&fb, SCE_DISPLAY_SETBUF_NEXTFRAME);
}

/* On the GE thread (pes6_ge_call): the picture over the whole screen. */
static void gl_present_job(void) {
    pes6_ge_gl_present_image(g_px, SW, SH, SW, SH);
    vglSwapBuffers(GL_FALSE);
}

/* On the GE thread, when vitaGL is up but the GE's programs did not build: vitaGL's own fixed
 * function pipeline. It also takes the screen from vitaGL's splash, which stays up until the
 * app's first scene and would hide the raw framebuffer. */
static void ffp_present_job(void) {
    /* The NFS port's fixed-function quad (DrawMWLook): client-side arrays and glDrawArrays. */
    static const float kQuad[8] = { 0, 0,   SW, 0,   0, SH,   SW, SH };
    static const float kUv[8] = { 0, 0,   1, 0,   0, 1,   1, 1 };
    static GLuint tex;
    if (!tex) glGenTextures(1, &tex);
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    glUseProgram(0);
    glViewport(0, 0, SW, SH);
    glDisable(GL_SCISSOR_TEST);
    glDisable(GL_DEPTH_TEST);
    glDisable(GL_BLEND);
    glColorMask(GL_TRUE, GL_TRUE, GL_TRUE, GL_TRUE);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, SW, SH, 0, GL_RGBA, GL_UNSIGNED_BYTE, g_px);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    glOrtho(0, SW, SH, 0, -1, 1);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    glEnable(GL_TEXTURE_2D);
    glTexEnvi(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    glColor4f(1, 1, 1, 1);
    glDisableClientState(GL_COLOR_ARRAY);
    glEnableClientState(GL_VERTEX_ARRAY);
    glEnableClientState(GL_TEXTURE_COORD_ARRAY);
    glVertexPointer(2, GL_FLOAT, 0, kQuad);
    glTexCoordPointer(2, GL_FLOAT, 0, kUv);
    glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    glDisableClientState(GL_TEXTURE_COORD_ARRAY);
    glDisableClientState(GL_VERTEX_ARRAY);
    vglSwapBuffers(GL_FALSE);
}

void screen_use_gl(int mode) { g_gl = mode; }

void screen_draw(const char *status) {
    for (int i = 0; i < SW * SH; i++) g_px[i] = RGB(10, 20, 40);
    text(48, 36, 4, g_title, RGB(255, 215, 0));
    for (int i = 0; i < g_n; i++) text(48, 96 + i * 22, 3, g_lines[i], RGB(230, 230, 230));
    if (status) text(48, SH - 40, 3, status, RGB(120, 200, 255));
    if (g_gl == SCREEN_GE) pes6_ge_call(gl_present_job);
    else if (g_gl == SCREEN_FFP) pes6_ge_call(ffp_present_job);
    else raw_present();
}

/* ---- notices over the game's picture --------------------------------------------------------
 * The savedata and message dialogs of the PSP complete at once here, with nothing on screen
 * (psprecomp's misc.c): main.c says what happened through screen_notice, and the GE thread draws
 * it over each frame until it expires: a dark box near the bottom, k = 2 text (12 px a letter). */

#define NOTICE_W     900
#define NOTICE_LINES 5
#define NOTICE_CHARS ((NOTICE_W - 32) / 12)

static atomic_flag g_nlock = ATOMIC_FLAG_INIT;
static char g_ntext[640];
static uint64_t g_nuntil;             /* sceKernelGetProcessTimeWide, us */
static unsigned g_ngen;

void screen_notice(unsigned ms, const char *fmt, ...) {
    char t[sizeof g_ntext];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(t, sizeof t, fmt, ap);
    va_end(ap);
    while (atomic_flag_test_and_set(&g_nlock)) {}
    memcpy(g_ntext, t, sizeof t);
    g_nuntil = sceKernelGetProcessTimeWide() + (uint64_t)ms * 1000u;
    g_ngen++;
    atomic_flag_clear(&g_nlock);
}

static int letters(const char *s, size_t n) {   /* the cells text_in draws: ASCII and U+00C0-00FF */
    int c = 0;
    for (size_t i = 0; i < n && s[i]; i++) c += (unsigned char)s[i] < 0x80 || (unsigned char)s[i] == 0xC3;
    return c;
}

/* `t` in lines of at most NOTICE_CHARS letters, broken at spaces; returns how many. */
static int wrap(const char *t, char out[NOTICE_LINES][NOTICE_CHARS * 2 + 1], int *longest) {
    int n = 0;
    *longest = 0;
    while (*t && n < NOTICE_LINES) {
        while (*t == ' ') t++;
        if (!*t) break;
        size_t take = 0, cut = 0;
        while (t[take] && letters(t, take + 1) <= NOTICE_CHARS) {
            take++;
            if (t[take] == ' ' || !t[take]) cut = take;
        }
        if (!t[take]) cut = take;
        if (!cut) cut = take;                    /* one word longer than a line */
        while (cut && ((unsigned char)t[cut] & 0xC0) == 0x80) cut--;   /* not inside a letter */
        if (!cut) break;
        if (cut > NOTICE_CHARS * 2) cut = NOTICE_CHARS * 2;
        memcpy(out[n], t, cut);
        out[n][cut] = 0;
        const int l = letters(out[n], cut);
        if (l > *longest) *longest = l;
        n++;
        t += cut;
    }
    return n;
}

void screen_notice_draw(void) {
    static uint32_t px[NOTICE_W * (NOTICE_LINES * 20 + 22)];
    static unsigned drawn = ~0u;
    static int w, h;
    char t[sizeof g_ntext];
    while (atomic_flag_test_and_set(&g_nlock)) {}
    const uint64_t until = g_nuntil;
    const unsigned gen = g_ngen;
    if (gen != drawn) memcpy(t, g_ntext, sizeof t);
    atomic_flag_clear(&g_nlock);
    if (!until || sceKernelGetProcessTimeWide() >= until) return;
    const int changed = gen != drawn;
    if (changed) {
        drawn = gen;
        char lines[NOTICE_LINES][NOTICE_CHARS * 2 + 1];
        int longest;
        const int n = wrap(t, lines, &longest);
        w = longest * 12 + 32;
        if (w < 240) w = 240;
        if (w > NOTICE_W) w = NOTICE_W;
        h = (n ? n : 1) * 20 + 22;
        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                px[y * w + x] = (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) ? RGB(255, 215, 0) : RGB(16, 24, 44);
        for (int i = 0; i < n; i++) {
            const int lw = letters(lines[i], sizeof lines[i]) * 12;
            text_in(px, w, h, (w - lw) / 2, 13 + i * 20, 2, lines[i], RGB(240, 240, 240));
        }
    }
    pes6_ge_gl_overlay_image(0, px, w, h, changed, (SW - w) / 2, SH - h - 28, SW, SH);
}

/* ---- a list over the game's picture (the PSP's save / load dialog) --------------------------
 * main.c keeps the list's state and sends each change; the GE thread draws it again when it
 * changed: an 800 x 392 panel in the middle, six rows of two lines, the chosen one lit. Its
 * picture (1.2 MB) is taken from the heap the first time, not kept in the BSS. */

#define LIST_W     800
#define LIST_ROWS  6
#define LIST_ROW_H 48
#define LIST_TOP   52
#define LIST_H     (LIST_TOP + LIST_ROWS * LIST_ROW_H + 52)
#define LIST_CHARS ((LIST_W - 48) / 12)

static atomic_flag g_llock = ATOMIC_FLAG_INIT;
static screen_list g_list, g_list_drawn;
static int g_list_on;
static unsigned g_list_gen;

void screen_list_show(const screen_list *l) {
    while (atomic_flag_test_and_set(&g_llock)) {}
    g_list = *l;
    g_list_on = 1;
    g_list_gen++;
    atomic_flag_clear(&g_llock);
}

void screen_list_hide(void) {
    while (atomic_flag_test_and_set(&g_llock)) {}
    g_list_on = 0;
    g_list_gen++;
    atomic_flag_clear(&g_llock);
}

static void fill(uint32_t *px, int pw, int ph, int x, int y, int w, int h, uint32_t c) {
    for (int j = y; j < y + h; j++)
        for (int i = x; i < x + w; i++)
            if (i >= 0 && i < pw && j >= 0 && j < ph) px[j * pw + i] = c;
}

static void frame(uint32_t *px, int pw, int ph, int x, int y, int w, int h, uint32_t inside, uint32_t edge) {
    fill(px, pw, ph, x, y, w, h, edge);
    fill(px, pw, ph, x + 2, y + 2, w - 4, h - 4, inside);
}

/* `s` cut to `max` letters, "..." at the end when it did not fit. */
static void fit(char *out, size_t cap, const char *s, int max) {
    size_t i = 0;
    int l = 0;
    while (s[i] && i + 1 < cap) {
        if (((unsigned char)s[i] & 0xC0) != 0x80 && ++l > max) break;
        i++;
    }
    if (!s[i] || i + 1 >= cap) { memcpy(out, s, i); out[i] = 0; return; }
    size_t k = i;                                     /* room for "..." */
    for (int back = 0; back < 3 && k; ) { k--; if (((unsigned char)s[k] & 0xC0) != 0x80) back++; }
    memcpy(out, s, k);
    memcpy(out + k, "...", 4);
}

void screen_list_draw(void) {
    static uint32_t *px;
    static unsigned drawn = ~0u;
    while (atomic_flag_test_and_set(&g_llock)) {}
    const int on = g_list_on;
    const unsigned gen = g_list_gen;
    if (on && gen != drawn) g_list_drawn = g_list;
    atomic_flag_clear(&g_llock);
    if (!on) { drawn = gen; return; }
    if (!px && !(px = malloc(sizeof *px * LIST_W * LIST_H))) return;
    const int changed = gen != drawn;
    if (changed) {
        drawn = gen;
        const screen_list *l = &g_list_drawn;
        char s[200];
        frame(px, LIST_W, LIST_H, 0, 0, LIST_W, LIST_H, RGB(16, 24, 44), RGB(255, 215, 0));
        text_in(px, LIST_W, LIST_H, 24, 16, 3, l->heading, RGB(255, 215, 0));
        if (l->n > LIST_ROWS) {
            snprintf(s, sizeof s, "%d/%d", l->sel + 1, l->n);
            text_in(px, LIST_W, LIST_H, LIST_W - 24 - letters(s, sizeof s) * 12, 20, 2, s, RGB(170, 180, 200));
        }
        int first = l->sel - LIST_ROWS / 2;
        if (first > l->n - LIST_ROWS) first = l->n - LIST_ROWS;
        if (first < 0) first = 0;
        for (int i = first; i < l->n && i < first + LIST_ROWS; i++) {
            const int y = LIST_TOP + (i - first) * LIST_ROW_H;
            if (i == l->sel) frame(px, LIST_W, LIST_H, 12, y, LIST_W - 24, LIST_ROW_H - 2, RGB(70, 58, 14), RGB(255, 215, 0));
            const int rl = letters(l->row[i].right, sizeof l->row[i].right);   /* the date, on the right */
            if (rl) text_in(px, LIST_W, LIST_H, LIST_W - 24 - rl * 12, y + 8, 2, l->row[i].right, RGB(255, 215, 0));
            fit(s, sizeof s, l->row[i].top, LIST_CHARS - (rl ? rl + 2 : 0));
            text_in(px, LIST_W, LIST_H, 24, y + 8, 2, s, l->row[i].fresh ? RGB(150, 230, 150) : RGB(240, 240, 240));
            fit(s, sizeof s, l->row[i].bottom, LIST_CHARS);
            text_in(px, LIST_W, LIST_H, 24, y + 27, 2, s, RGB(170, 180, 200));
        }
        if (first > 0) text_in(px, LIST_W, LIST_H, LIST_W / 2 - 18, LIST_TOP - 16, 2, "...", RGB(255, 215, 0));
        if (first + LIST_ROWS < l->n)
            text_in(px, LIST_W, LIST_H, LIST_W / 2 - 18, LIST_TOP + LIST_ROWS * LIST_ROW_H + 2, 2, "...", RGB(255, 215, 0));
        text_in(px, LIST_W, LIST_H, 24, LIST_H - 32, 2, l->hint, RGB(120, 200, 255));
        if (l->question[0]) {                         /* the yes / no box over the rows */
            int w = (letters(l->question, sizeof l->question) > letters(l->answers, sizeof l->answers)
                     ? letters(l->question, sizeof l->question) : letters(l->answers, sizeof l->answers)) * 12 + 64;
            if (w < 360) w = 360;
            if (w > LIST_W - 40) w = LIST_W - 40;
            const int h = 84, x = (LIST_W - w) / 2, y = (LIST_H - h) / 2;
            frame(px, LIST_W, LIST_H, x, y, w, h, RGB(30, 40, 70), RGB(255, 215, 0));
            fit(s, sizeof s, l->question, (w - 32) / 12);
            text_in(px, LIST_W, LIST_H, x + (w - letters(s, sizeof s) * 12) / 2, y + 20, 2, s, RGB(240, 240, 240));
            text_in(px, LIST_W, LIST_H, x + (w - letters(l->answers, sizeof l->answers) * 12) / 2, y + 50, 2, l->answers,
                    RGB(120, 200, 255));
        }
    }
    pes6_ge_gl_overlay_image(1, px, LIST_W, LIST_H, changed, (SW - LIST_W) / 2, (SH - LIST_H) / 2, SW, SH);
}

/* ---- live FPS badge (overlay slot 2) -------------------------------------------------------- */
#define FPS_W 112
#define FPS_H 28

static atomic_int g_fps_x10 = -1;               /* -1: hidden; >= 0: fps * 10 */

void screen_fps_update(float fps) {
    if (fps < 0.0f) { atomic_store_explicit(&g_fps_x10, -1, memory_order_relaxed); return; }
    int v = (int)(fps * 10.0f + 0.5f);
    if (v > 999) v = 999;
    atomic_store_explicit(&g_fps_x10, v, memory_order_relaxed);
}

void screen_fps_draw(void) {
    static uint32_t px[FPS_W * FPS_H];
    static int drawn = -2;
    const int v = atomic_load_explicit(&g_fps_x10, memory_order_relaxed);
    if (v < 0) { drawn = -2; return; }
    const int changed = v != drawn;
    if (changed) {
        drawn = v;
        const uint32_t col = v >= 285 ? RGB(100, 240, 120) : v >= 245 ? RGB(255, 215, 60) : RGB(255, 95, 95);
        frame(px, FPS_W, FPS_H, 0, 0, FPS_W, FPS_H, RGB(12, 18, 32), col);
        char s[24];
        snprintf(s, sizeof s, "%2d.%d FPS", v / 10, v % 10);
        const int lw = letters(s, sizeof s) * 12;
        text_in(px, FPS_W, FPS_H, (FPS_W - lw) / 2, 7, 2, s, col);
    }
    pes6_ge_gl_overlay_image(2, px, FPS_W, FPS_H, changed, 12, 10, SW, SH);
}

/* ---- raw canvas primitives for pre-launch screens (vita_config.c) --------------------------- */
uint32_t *screen_canvas(void) { return g_px; }
void screen_canvas_present(void) { raw_present(); }
void screen_fill_rect(uint32_t *px, int pw, int ph, int x, int y, int w, int h, uint32_t color) {
    fill(px, pw, ph, x, y, w, h, color);
}
void screen_frame_rect(uint32_t *px, int pw, int ph, int x, int y, int w, int h, uint32_t inside, uint32_t edge) {
    frame(px, pw, ph, x, y, w, h, inside, edge);
}
void screen_text_at(uint32_t *px, int pw, int ph, int x, int y, int k, const char *s, uint32_t color) {
    text_in(px, pw, ph, x, y, k, s, color);
}
int screen_text_letters(const char *s) { return letters(s, strlen(s)); }
