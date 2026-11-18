/* PES6 Vita — the host's text screens (status, errors), without vita2d.
 *
 * Lines of text are drawn into a 960x544 RGBA picture with the 5x7 font of upstream's pre-game
 * menu (launcher.c). Until vitaGL is up the picture is the display's framebuffer itself
 * (sceDisplaySetFrameBuf); after screen_use_gl() it goes through the GE thread, which owns the
 * GL context (pes6_ge_gl_present_image, then vglSwapBuffers). */
#ifndef PES6_VITA_SCREEN_H
#define PES6_VITA_SCREEN_H

void screen_line(const char *fmt, ...) __attribute__((format(printf, 1, 2)));
void screen_clear(void);
void screen_title(const char *title);
void screen_draw(const char *status);           /* the lines, and a status line at the bottom */
/* How the screens reach the display from now on: */
enum {
    SCREEN_RAW = 0,   /* the display's framebuffer, before vitaGL */
    SCREEN_GE,        /* through the GE's GL backend (pes6_ge_gl_present_image), on the GE thread */
    SCREEN_FFP,       /* vitaGL is up but the GE's programs are not: its fixed function, on the GE thread */
};
void screen_use_gl(int mode);

#endif
