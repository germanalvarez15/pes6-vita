/* PES6 Vita — pre-launch settings screen (launched from the LiveArea Settings button
 * via psla:-config or by holding L at startup) and persistent ux0:data/pes6vita/vita_config.txt. */
#ifndef PES6_VITA_CONFIG_H
#define PES6_VITA_CONFIG_H

typedef struct {
    int tex_filter;     /* 0: Nearest (Sharp), 1: Bilinear (3D), 2: Bilinear (All) */
    int antialiasing;   /* 0: Off, 1: FXAA */
    int post_filter;    /* 0: None, 1: Sharpen, 2: Vivid, 3: CRT Scanlines */
    int resolution;     /* 0: 960x544 (2x Native), 1: 480x272 (1x Perf) */
    int show_fps;       /* 0: Off, 1: On */
    int commentary;     /* 1: On, 0: Off */
    int stadiums;       /* 1: On, 0: Off */
    int attendance;     /* 0: No, 1: Low, 2: Normal, 3: High */
    int save_list;      /* 1: On, 0: Off */
    int ge_behind;      /* 1: On (Faster), 0: Off (Sync) */
} vita_config;

void vita_config_defaults(vita_config *cfg);
void vita_config_load(vita_config *cfg, const char *data_dir);
int  vita_config_save(const vita_config *cfg, const char *data_dir);

/* Show the interactive LiveArea settings screen (before vitaGL and the game start).
 * `sys_lang` is the PS Vita SceSystemParamLang value (SCE_SYSTEM_PARAM_ID_LANG).
 * Saves automatically on exit. Returns 1 to proceed launching the game, 0 to exit to LiveArea. */
int  vita_config_menu(vita_config *cfg, const char *data_dir, int sys_lang);

#endif
