/* PES6 Vita — the host's text screens: see screen.h. */
#include "screen.h"
#include "ge.h"

#include <psp2/display.h>
#include <psp2/kernel/sysmem.h>
#include <vitaGL.h>

#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
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

/* `s` at (x, y), each font cell a k x k block; accented letters lose the accent. */
static void text(int x, int y, int k, const char *s, uint32_t color) {
    for (const unsigned char *p = (const unsigned char *)s; *p && x < SW; p++) {
        char c = (char)*p;
        if (*p == 0xC3 && p[1]) {                      /* UTF-8 Latin-1: á é í ó ú ñ and capitals */
            const unsigned char l = p[1] | 0x20;
            c = l == 0xA1 ? 'a' : l == 0xA9 ? 'e' : l == 0xAD ? 'i' : l == 0xB3 ? 'o' : (l == 0xBA || l == 0xBC) ? 'u'
              : l == 0xB1 ? 'n' : '?';
            if (p[1] < 0xA0) c = (char)(c - 'a' + 'A');
            p++;
        } else if (*p >= 0x80) {
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
                        if (py < 0 || py >= SH) continue;
                        for (int i = 0; i < k; i++) {
                            const int px = x + col * k + i;
                            if (px >= 0 && px < SW) g_px[py * SW + px] = color;
                        }
                    }
                }
        }
        x += 6 * k;
    }
}

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
