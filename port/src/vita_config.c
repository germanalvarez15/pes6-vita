/* PES6 Vita — pre-launch LiveArea settings screen and config persistence.
 * Localized to the PS Vita system language (EN, ES, FR, DE, IT, PT; English fallback). */
#include "vita_config.h"
#include "screen.h"
#include "patch.h"
#include "version.h"

#include <psp2/ctrl.h>
#include <psp2/display.h>
#include <psp2/system_param.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SW 960
#define SH 544
#define RGB(r, g, b) ((uint32_t)(r) | ((uint32_t)(g) << 8) | ((uint32_t)(b) << 16) | 0xFF000000u)

static int clampi(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }

void vita_config_defaults(vita_config *cfg) {
    memset(cfg, 0, sizeof *cfg);
    snprintf(cfg->patch, sizeof cfg->patch, "original");
    cfg->tex_filter   = 1;   /* Bilinear (3D): smooth pitch/kits/stadium, crisp 2D UI, zero CPU cost */
    cfg->antialiasing = 0;   /* Off by default; FXAA 1 toggle away */
    cfg->post_filter  = 0;   /* None */
    cfg->resolution   = 0;   /* 960x544 (2x Native) */
    cfg->show_fps     = 0;   /* Off */
    cfg->commentary   = 1;   /* On */
    cfg->stadiums     = 1;   /* On */
    cfg->attendance   = 3;   /* High */
    cfg->save_list    = 1;   /* On */
    cfg->ge_behind    = 1;   /* On (Faster) */
}

void vita_config_load(vita_config *cfg, const char *data_dir) {
    vita_config_defaults(cfg);
    char path[256];
    snprintf(path, sizeof path, "%s/vita_config.txt", data_dir);
    FILE *f = fopen(path, "r");
    if (!f) return;
    char line[256];
    while (fgets(line, sizeof line, f)) {
        line[strcspn(line, "\r\n")] = 0;
        char *eq = strchr(line, '=');
        if (!eq || line[0] == '#') continue;
        *eq = 0;
        if (!strcmp(line, "patch") && eq[1]) {
            snprintf(cfg->patch, sizeof cfg->patch, "%s", eq + 1);
            continue;
        }
        const int v = atoi(eq + 1);
        if (!strcmp(line, "tex_filter"))        cfg->tex_filter   = clampi(v, 0, 2);
        else if (!strcmp(line, "antialiasing")) cfg->antialiasing = clampi(v, 0, 1);
        else if (!strcmp(line, "post_filter"))  cfg->post_filter  = clampi(v, 0, 3);
        else if (!strcmp(line, "resolution"))   cfg->resolution   = clampi(v, 0, 1);
        else if (!strcmp(line, "show_fps"))     cfg->show_fps     = clampi(v, 0, 1);
        else if (!strcmp(line, "commentary"))   cfg->commentary   = clampi(v, 0, 1);
        else if (!strcmp(line, "stadiums"))     cfg->stadiums     = clampi(v, 0, 1);
        else if (!strcmp(line, "attendance"))   cfg->attendance   = clampi(v, 0, 3);
        else if (!strcmp(line, "save_list"))    cfg->save_list    = clampi(v, 0, 1);
        else if (!strcmp(line, "ge_behind"))    cfg->ge_behind    = clampi(v, 0, 1);
    }
    fclose(f);
}

int vita_config_save(const vita_config *cfg, const char *data_dir) {
    char path[256];
    snprintf(path, sizeof path, "%s/vita_config.txt", data_dir);
    FILE *f = fopen(path, "w");
    if (!f) return -1;
    fprintf(f,
            "# PES6 Vita settings (configured from LiveArea)\n"
            "patch=%s\n"
            "tex_filter=%d\n"
            "antialiasing=%d\n"
            "post_filter=%d\n"
            "resolution=%d\n"
            "show_fps=%d\n"
            "commentary=%d\n"
            "stadiums=%d\n"
            "attendance=%d\n"
            "save_list=%d\n"
            "ge_behind=%d\n",
            cfg->patch[0] ? cfg->patch : "original",
            cfg->tex_filter, cfg->antialiasing, cfg->post_filter, cfg->resolution,
            cfg->show_fps, cfg->commentary, cfg->stadiums, cfg->attendance,
            cfg->save_list, cfg->ge_behind);
    return fclose(f) == 0 ? 0 : -1;
}

/* ---- localization (PS Vita system language) ------------------------------------------------- */

enum { LANG_EN, LANG_ES, LANG_FR, LANG_DE, LANG_IT, LANG_PT, LANG_COUNT };

static int map_sys_lang(int sys_lang) {
    switch (sys_lang) {
    case SCE_SYSTEM_PARAM_LANG_SPANISH:       return LANG_ES;
    case SCE_SYSTEM_PARAM_LANG_FRENCH:        return LANG_FR;
    case SCE_SYSTEM_PARAM_LANG_GERMAN:        return LANG_DE;
    case SCE_SYSTEM_PARAM_LANG_ITALIAN:       return LANG_IT;
    case SCE_SYSTEM_PARAM_LANG_PORTUGUESE_PT:
    case SCE_SYSTEM_PARAM_LANG_PORTUGUESE_BR: return LANG_PT;
    default:                                  return LANG_EN;
    }
}

enum {
    ITEM_PATCH,
    ITEM_TEX_FILTER,
    ITEM_AA,
    ITEM_POST_FILTER,
    ITEM_RESOLUTION,
    ITEM_SHOW_FPS,
    ITEM_COMMENTARY,
    ITEM_STADIUMS,
    ITEM_ATTENDANCE,
    ITEM_SAVE_LIST,
    ITEM_GE_BEHIND,
    ITEM_PLAY,
    ITEM_EXIT,
    ITEM_COUNT
};

static pes6_version g_versions[PES6_PATCH_MAX + 1];
static int g_nversions = 1;

static void refresh_versions(const char *data_dir) {
    char mods[512];
    snprintf(mods, sizeof mods, "%s/mods", data_dir);
    g_nversions = pes6_versions_list(mods, g_versions, PES6_PATCH_MAX + 1);
    if (g_nversions < 1) {
        snprintf(g_versions[0].id, sizeof g_versions[0].id, "original");
        snprintf(g_versions[0].title, sizeof g_versions[0].title, "Original");
        g_nversions = 1;
    }
}

typedef struct {
    const char *title;
    const char *defaults_toast;
    const char *hint;
    const char *on;
    const char *off;
    const char *behind_on;
    const char *behind_off;
    const char *tex[3];
    const char *post[4];
    const char *att[4];
    const char *label[ITEM_COUNT];
    const char *desc[ITEM_COUNT];
} cfg_strings;

static const cfg_strings STR[LANG_COUNT] = {
    [LANG_EN] = {
        .title = "PES6 VITA - SETTINGS",
        .defaults_toast = "Defaults restored",
        .hint = "D-Pad: move/change  X: toggle  Triangle: defaults  START: play  O: exit",
        .on = "On", .off = "Off",
        .behind_on = "On (Faster)", .behind_off = "Off (Sync)",
        .tex  = { "Sharp (Nearest)", "Bilinear (3D)", "Bilinear (All)" },
        .post = { "None", "Sharpen", "Vivid", "CRT Scanlines" },
        .att  = { "No", "Low", "Normal", "High" },
        .label = {
            "Game Patch / Mod",
            "Texture Filtering", "Anti-Aliasing", "Visual Filter", "Internal Resolution",
            "Show FPS Counter", "Match Commentary", "Custom Stadiums", "Default Attendance",
            "PSP Save List Dialog", "Async GE Frame-Behind",
            "Save & Launch Game", "Save & Return to LiveArea",
        },
        .desc = {
            "Select active patch from ux0:data/pes6vita/mods/ (teams, squads, faces, crests).",
            "Bilinear 3D smooths pitch & kits while keeping 2D menus sharp.",
            "FXAA smooths jagged edges on players, pitch lines and goalposts.",
            "Post-processing: Sharpen pairs with FXAA; Vivid boosts colors.",
            "960x544 is native 2x Vita res; 480x272 reduces GPU load.",
            "Displays a small real-time FPS counter in the top-left corner.",
            "Enables PS2/community PES6 commentary in ux0:data/pes6vita/audio/.",
            "Enables converted PS2 stadiums in ux0:data/pes6vita/stadiums/.",
            "Default crowd level in Match Settings (No, Low, Normal, High).",
            "Shows the multi-slot PSP save/load picker for Cup and League.",
            "Draws GE one frame behind the CPU for higher FPS in matches.",
            "Save changes to vita_config.txt and boot PES6 immediately.",
            "Save changes to vita_config.txt and return to PS Vita LiveArea.",
        },
    },
    [LANG_ES] = {
        .title = "PES6 VITA - AJUSTES",
        .defaults_toast = "Valores restaurados",
        .hint = "D-Pad: mover/cambiar  X: elegir  Triangulo: default  START: jugar  O: salir",
        .on = "Si", .off = "No",
        .behind_on = "Si (Rapido)", .behind_off = "No (Sync)",
        .tex  = { "Nitido (Nearest)", "Bilinear (3D)", "Bilinear (Todo)" },
        .post = { "Ninguno", "Nitidez (Sharpen)", "Vivido", "Scanlines CRT" },
        .att  = { "Sin publico", "Bajo", "Normal", "Alto" },
        .label = {
            "Parche / Version",
            "Filtrado de texturas", "Anti-Aliasing", "Filtro visual", "Resolucion interna",
            "Mostrar contador FPS", "Relatos / Comentarios", "Estadios personalizados", "Publico por defecto",
            "Lista de partidas guardadas", "GE asincrono (Frame-Behind)",
            "Guardar e iniciar juego", "Guardar y volver al LiveArea",
        },
        .desc = {
            "Elige el parche activo en ux0:data/pes6vita/mods/ (equipos, plantillas, caras).",
            "Bilinear 3D suaviza cesped y kits dejando los menus 2D nitidos.",
            "FXAA suaviza bordes dentados de jugadores, lineas y arcos.",
            "Post-procesado: Nitidez combina con FXAA; Vivido realza colores.",
            "960x544 es nativa x2 de Vita; 480x272 reduce la carga de GPU.",
            "Muestra un contador de FPS en la esquina superior izquierda.",
            "Activa relatos de PES6 desde ux0:data/pes6vita/audio/.",
            "Activa estadios de PS2 desde ux0:data/pes6vita/stadiums/.",
            "Nivel de publico por defecto en Ajustes de Partido.",
            "Muestra el selector de varias partidas en Copas y Ligas.",
            "Dibuja el GE un frame detras de la CPU para mejores FPS.",
            "Guarda los cambios en vita_config.txt y arranca PES6 ahora.",
            "Guarda los cambios en vita_config.txt y vuelve al LiveArea.",
        },
    },
    [LANG_FR] = {
        .title = "PES6 VITA - PARAMETRES",
        .defaults_toast = "Valeurs par defaut",
        .hint = "Croix: naviguer  X: changer  Triangle: defaut  START: jouer  O: quitter",
        .on = "Oui", .off = "Non",
        .behind_on = "Oui (Rapide)", .behind_off = "Non (Sync)",
        .tex  = { "Net (Nearest)", "Bilineaire (3D)", "Bilineaire (Tout)" },
        .post = { "Aucun", "Nettete (Sharpen)", "Vif", "Scanlines CRT" },
        .att  = { "Aucun", "Faible", "Normal", "Eleve" },
        .label = {
            "Patch / Version du jeu",
            "Filtrage des textures", "Anticrenelage (AA)", "Filtre visuel", "Resolution interne",
            "Afficher le compteur FPS", "Commentaires du match", "Stades personnalises", "Affluence par defaut",
            "Liste des sauvegardes PSP", "GE asynchrone (Frame-Behind)",
            "Sauvegarder et lancer", "Sauvegarder et quitter",
        },
        .desc = {
            "Choisit le patch actif dans ux0:data/pes6vita/mods/ (equipes, visages, emblemes).",
            "Bilineaire 3D lisse terrain et maillots, garde les menus 2D nets.",
            "FXAA lisse les bords creneles des joueurs, lignes et buts.",
            "Post-traitement: Nettete avec FXAA; Vif renforce les couleurs.",
            "960x544 est la resolution native 2x; 480x272 allege le GPU.",
            "Affiche un petit compteur FPS en temps reel en haut a gauche.",
            "Active les commentaires PES6 dans ux0:data/pes6vita/audio/.",
            "Active les stades PS2 dans ux0:data/pes6vita/stadiums/.",
            "Niveau de foule par defaut dans les parametres du match.",
            "Affiche le selecteur multi-emplacements pour Coupe et Ligue.",
            "Dessine le GE une image apres le CPU pour plus de FPS.",
            "Enregistre vita_config.txt et lance PES6 immediatement.",
            "Enregistre vita_config.txt et retourne au LiveArea.",
        },
    },
    [LANG_DE] = {
        .title = "PES6 VITA - EINSTELLUNGEN",
        .defaults_toast = "Standard wiederhergestellt",
        .hint = "Steuerkreuz: wahlen  X: andern  Dreieck: Std  START: spielen  O: zuruck",
        .on = "Ein", .off = "Aus",
        .behind_on = "Ein (Schnell)", .behind_off = "Aus (Sync)",
        .tex  = { "Scharf (Nearest)", "Bilinear (3D)", "Bilinear (Alle)" },
        .post = { "Keiner", "Scharfen", "Lebendig", "CRT-Scanlines" },
        .att  = { "Keine", "Niedrig", "Normal", "Hoch" },
        .label = {
            "Spiel-Patch / Version",
            "Texturfilterung", "Anti-Aliasing", "Bildfilter", "Interne Auflosung",
            "FPS-Anzeige", "Spielkommentar", "Eigene Stadien", "Standard-Zuschauer",
            "PSP-Speicherliste", "Asynchrones GE (Frame-Behind)",
            "Speichern & Spiel starten", "Speichern & zum LiveArea",
        },
        .desc = {
            "Wahlt den aktiven Patch aus ux0:data/pes6vita/mods/ (Teams, Kader, Gesichter).",
            "Bilinear 3D glattet Rasen & Trikots, 2D-Menus bleiben scharf.",
            "FXAA glattet Treppeneffekte bei Spielern, Linien und Toren.",
            "Nachbearbeitung: Scharfen mit FXAA; Lebendig betont Farben.",
            "960x544 ist native 2x-Auflosung; 480x272 entlastet die GPU.",
            "Zeigt oben links eine kleine Echtzeit-FPS-Anzeige an.",
            "Aktiviert PES6-Kommentar aus ux0:data/pes6vita/audio/.",
            "Aktiviert PS2-Stadien aus ux0:data/pes6vita/stadiums/.",
            "Standard-Publikum in den Spieleinstellungen.",
            "Zeigt die PSP-Speicherauswahl fur Pokal und Liga an.",
            "Zeichnet GE einen Frame hinter der CPU fur hohere FPS.",
            "Speichert vita_config.txt und startet PES6 sofort.",
            "Speichert vita_config.txt und kehrt zum LiveArea zuruck.",
        },
    },
    [LANG_IT] = {
        .title = "PES6 VITA - IMPOSTAZIONI",
        .defaults_toast = "Valori ripristinati",
        .hint = "D-Pad: muovi/cambia  X: scegli  Triangolo: def  START: gioca  O: esci",
        .on = "Si", .off = "No",
        .behind_on = "Si (Veloce)", .behind_off = "No (Sync)",
        .tex  = { "Nitido (Nearest)", "Bilineare (3D)", "Bilineare (Tutto)" },
        .post = { "Nessuno", "Nitidezza", "Vivido", "Scanlines CRT" },
        .att  = { "Nessuno", "Basso", "Normale", "Alto" },
        .label = {
            "Patch / Versione gioco",
            "Filtro texture", "Anti-Aliasing", "Filtro visivo", "Risoluzione interna",
            "Mostra contatore FPS", "Telecronaca", "Stadi personalizzati", "Pubblico predefinito",
            "Lista salvataggi PSP", "GE asincrono (Frame-Behind)",
            "Salva e avvia il gioco", "Salva e torna al LiveArea",
        },
        .desc = {
            "Scegli la patch attiva in ux0:data/pes6vita/mods/ (squadre, rose, volti, stemmi).",
            "Bilineare 3D ammorbidisce campo e divise, menu 2D nitidi.",
            "FXAA riduce le scalettature su giocatori, linee e porte.",
            "Post-processing: Nitidezza con FXAA; Vivido esalta i colori.",
            "960x544 e nativa 2x di Vita; 480x272 riduce il carico GPU.",
            "Mostra un piccolo contatore FPS in alto a sinistra.",
            "Attiva la telecronaca PES6 da ux0:data/pes6vita/audio/.",
            "Attiva gli stadi PS2 da ux0:data/pes6vita/stadiums/.",
            "Livello pubblico predefinito nelle Impostazioni Partita.",
            "Mostra il selettore salvataggi multipli per Coppa e Lega.",
            "Disegna il GE un frame dietro la CPU per FPS piu stabili.",
            "Salva le modifiche in vita_config.txt e avvia subito PES6.",
            "Salva le modifiche in vita_config.txt e torna al LiveArea.",
        },
    },
    [LANG_PT] = {
        .title = "PES6 VITA - CONFIGURACOES",
        .defaults_toast = "Padroes restaurados",
        .hint = "D-Pad: mover/mudar  X: alterar  Triangulo: padrao  START: jogar  O: sair",
        .on = "Sim", .off = "Nao",
        .behind_on = "Sim (Rapido)", .behind_off = "Nao (Sync)",
        .tex  = { "Nitido (Nearest)", "Bilinear (3D)", "Bilinear (Tudo)" },
        .post = { "Nenhum", "Nitidez (Sharpen)", "Vivido", "Scanlines CRT" },
        .att  = { "Vazio", "Baixo", "Normal", "Alto" },
        .label = {
            "Patch / Versao do jogo",
            "Filtro de texturas", "Anti-Aliasing", "Filtro visual", "Resolucao interna",
            "Mostrar contador FPS", "Narracao / Comentarios", "Estadios personalizados", "Publico padrao",
            "Lista de saves PSP", "GE assincrono (Frame-Behind)",
            "Salvar e iniciar jogo", "Salvar e voltar ao LiveArea",
        },
        .desc = {
            "Escolhe o patch ativo em ux0:data/pes6vita/mods/ (times, elencos, faces, escudos).",
            "Bilinear 3D suaviza gramado e kits mantendo menus 2D nitidos.",
            "FXAA suaviza serrilhados em jogadores, linhas e traves.",
            "Pos-processamento: Nitidez com FXAA; Vivido realca cores.",
            "960x544 e nativa 2x do Vita; 480x272 reduz a carga da GPU.",
            "Exibe um pequeno contador de FPS no canto superior esquerdo.",
            "Ativa narracao de PES6 em ux0:data/pes6vita/audio/.",
            "Ativa estadios de PS2 em ux0:data/pes6vita/stadiums/.",
            "Nivel de publico padrao nas configuracoes de partida.",
            "Mostra seletor de varios saves em Copas e Ligas.",
            "Desenha o GE um frame atras da CPU para mais FPS.",
            "Salva em vita_config.txt e inicia PES6 imediatamente.",
            "Salva em vita_config.txt e volta para o LiveArea.",
        },
    },
};

static const char *item_value(const vita_config *c, int idx, const cfg_strings *s) {
    static const char *const AA_TXT[2] = { "Off", "FXAA" };
    static const char *const RES_TXT[2] = { "960x544 (2x)", "480x272 (1x)" };
    static char patch_title[40];

    switch (idx) {
    case ITEM_PATCH: {
        int vi = pes6_version_find(g_versions, g_nversions, c->patch);
        if (vi < 0) vi = 0;
        snprintf(patch_title, sizeof patch_title, "%.36s", g_versions[vi].title);
        return patch_title;
    }
    case ITEM_TEX_FILTER:  return s->tex[c->tex_filter];
    case ITEM_AA:          return AA_TXT[c->antialiasing];
    case ITEM_POST_FILTER: return s->post[c->post_filter];
    case ITEM_RESOLUTION:  return RES_TXT[c->resolution];
    case ITEM_SHOW_FPS:    return c->show_fps ? s->on : s->off;
    case ITEM_COMMENTARY:  return c->commentary ? s->on : s->off;
    case ITEM_STADIUMS:    return c->stadiums ? s->on : s->off;
    case ITEM_ATTENDANCE:  return s->att[c->attendance];
    case ITEM_SAVE_LIST:   return c->save_list ? s->on : s->off;
    case ITEM_GE_BEHIND:   return c->ge_behind ? s->behind_on : s->behind_off;
    default:               return "";
    }
}

static void item_step(vita_config *c, int idx, int delta) {
    switch (idx) {
    case ITEM_PATCH: {
        int vi = pes6_version_find(g_versions, g_nversions, c->patch);
        if (vi < 0) vi = 0;
        vi = (vi + g_nversions + delta) % g_nversions;
        snprintf(c->patch, sizeof c->patch, "%s", g_versions[vi].id);
        break;
    }
    case ITEM_TEX_FILTER:  c->tex_filter   = (c->tex_filter + 3 + delta) % 3; break;
    case ITEM_AA:          c->antialiasing = (c->antialiasing + 2 + delta) % 2; break;
    case ITEM_POST_FILTER: c->post_filter  = (c->post_filter + 4 + delta) % 4; break;
    case ITEM_RESOLUTION:  c->resolution   = (c->resolution + 2 + delta) % 2; break;
    case ITEM_SHOW_FPS:    c->show_fps     = !c->show_fps; break;
    case ITEM_COMMENTARY:  c->commentary   = !c->commentary; break;
    case ITEM_STADIUMS:    c->stadiums     = !c->stadiums; break;
    case ITEM_ATTENDANCE:  c->attendance   = (c->attendance + 4 + delta) % 4; break;
    case ITEM_SAVE_LIST:   c->save_list    = !c->save_list; break;
    case ITEM_GE_BEHIND:   c->ge_behind    = !c->ge_behind; break;
    default: break;
    }
}

static void draw_menu(const vita_config *cfg, int sel, const cfg_strings *s, const char *toast) {
    uint32_t *px = screen_canvas();

    /* Background */
    screen_fill_rect(px, SW, SH, 0, 0, SW, SH, RGB(10, 16, 30));

    /* Header bar */
    screen_fill_rect(px, SW, SH, 0, 0, SW, 56, RGB(18, 28, 52));
    screen_fill_rect(px, SW, SH, 0, 54, SW, 3, RGB(255, 215, 0));
    screen_text_at(px, SW, SH, 32, 16, 3, s->title, RGB(255, 215, 0));
    const char *sub = toast && toast[0] ? toast : "LiveArea Config";
    screen_text_at(px, SW, SH, SW - 32 - screen_text_letters(sub) * 12, 22, 2, sub,
                   toast && toast[0] ? RGB(130, 240, 140) : RGB(160, 175, 205));

    /* Main panel with 13 compact rows */
    const int panel_x = 32, panel_w = SW - 64;
    const int row_y0 = 64, row_h = 29;

    for (int i = 0; i < ITEM_COUNT; i++) {
        const int y = row_y0 + i * row_h + (i >= ITEM_PLAY ? 6 : 0);
        const int is_action = i >= ITEM_PLAY;
        const int active = i == sel;

        if (active) {
            const uint32_t bg = is_action ? RGB(30, 74, 46) : RGB(66, 54, 14);
            const uint32_t bd = is_action ? RGB(110, 240, 140) : RGB(255, 215, 0);
            screen_frame_rect(px, SW, SH, panel_x, y, panel_w, row_h - 2, bg, bd);
        } else if (is_action) {
            screen_frame_rect(px, SW, SH, panel_x, y, panel_w, row_h - 2, RGB(18, 28, 48), RGB(50, 70, 105));
        } else if (i & 1) {
            screen_fill_rect(px, SW, SH, panel_x, y, panel_w, row_h - 2, RGB(14, 21, 38));
        }

        const uint32_t lcol = is_action
            ? (active ? RGB(160, 255, 180) : RGB(190, 225, 200))
            : (active ? RGB(255, 245, 200) : RGB(225, 230, 240));
        screen_text_at(px, SW, SH, panel_x + 16, y + 6, 2, s->label[i], lcol);

        if (!is_action) {
            char val[64];
            snprintf(val, sizeof val, active ? "< %s >" : "%s", item_value(cfg, i, s));
            const int vw = screen_text_letters(val) * 12;
            const uint32_t vcol = active ? RGB(255, 215, 0) : RGB(130, 205, 255);
            screen_text_at(px, SW, SH, panel_x + panel_w - 16 - vw, y + 6, 2, val, vcol);
        } else {
            const char *tag = i == ITEM_PLAY ? "[START / X]" : "[O / X]";
            const int tw = screen_text_letters(tag) * 12;
            screen_text_at(px, SW, SH, panel_x + panel_w - 16 - tw, y + 6, 2, tag,
                           active ? RGB(255, 215, 0) : RGB(130, 145, 175));
        }
    }

    /* Description box */
    const int desc_y = SH - 88;
    screen_frame_rect(px, SW, SH, panel_x, desc_y, panel_w, 42, RGB(16, 24, 44), RGB(70, 95, 140));
    screen_text_at(px, SW, SH, panel_x + 16, desc_y + 13, 2, s->desc[sel], RGB(210, 225, 245));

    /* Bottom controls hint */
    screen_text_at(px, SW, SH, (SW - screen_text_letters(s->hint) * 12) / 2, SH - 30, 2, s->hint, RGB(120, 200, 255));

    screen_canvas_present();
}

int vita_config_menu(vita_config *cfg, const char *data_dir, int sys_lang) {
    refresh_versions(data_dir);
    if (pes6_version_find(g_versions, g_nversions, cfg->patch) < 0)
        snprintf(cfg->patch, sizeof cfg->patch, "%s", g_versions[0].id);
    const cfg_strings *s = &STR[map_sys_lang(sys_lang)];
    int sel = 0;
    uint32_t prev = 0xFFFFFFFFu;   /* ignore buttons still held from LiveArea tap */
    int held_v = 0, held_h = 0;
    char toast[48] = "";
    int toast_frames = 0;
    int dirty = 1;

    SceCtrlData pad;
    /* Wait briefly for initial release so holding L or tapping X doesn't immediately trigger */
    for (int i = 0; i < 6; i++) {
        sceCtrlPeekBufferPositive(0, &pad, 1);
        prev = pad.buttons;
        sceDisplayWaitVblankStart();
    }

    for (;;) {
        if (dirty) {
            draw_menu(cfg, sel, s, toast_frames > 0 ? toast : "");
            dirty = 0;
        }
        sceDisplayWaitVblankStart();
        if (toast_frames > 0 && --toast_frames == 0) dirty = 1;

        sceCtrlPeekBufferPositive(0, &pad, 1);
        uint32_t b = pad.buttons;
        if (pad.ly < 50) b |= SCE_CTRL_UP;
        else if (pad.ly > 205) b |= SCE_CTRL_DOWN;
        if (pad.lx < 50) b |= SCE_CTRL_LEFT;
        else if (pad.lx > 205) b |= SCE_CTRL_RIGHT;

        const uint32_t press = b & ~prev;
        prev = b;

        int move_v = 0;
        if (b & (SCE_CTRL_UP | SCE_CTRL_DOWN)) {
            const int rep = ++held_v > 20 && held_v % 5 == 0;
            if ((press | (rep ? b : 0)) & SCE_CTRL_UP) move_v = -1;
            else if ((press | (rep ? b : 0)) & SCE_CTRL_DOWN) move_v = 1;
        } else {
            held_v = 0;
        }

        int move_h = 0;
        if (b & (SCE_CTRL_LEFT | SCE_CTRL_RIGHT)) {
            const int rep = ++held_h > 20 && held_h % 6 == 0;
            if ((press | (rep ? b : 0)) & SCE_CTRL_LEFT) move_h = -1;
            else if ((press | (rep ? b : 0)) & SCE_CTRL_RIGHT) move_h = 1;
        } else {
            held_h = 0;
        }

        if (move_v) {
            sel = (sel + ITEM_COUNT + move_v) % ITEM_COUNT;
            dirty = 1;
        } else if (move_h && sel < ITEM_PLAY) {
            item_step(cfg, sel, move_h);
            dirty = 1;
        } else if (press & SCE_CTRL_CROSS) {
            if (sel == ITEM_PLAY) {
                vita_config_save(cfg, data_dir);
                return 1;
            } else if (sel == ITEM_EXIT) {
                vita_config_save(cfg, data_dir);
                return 0;
            } else {
                item_step(cfg, sel, 1);
                dirty = 1;
            }
        } else if (press & SCE_CTRL_START) {
            vita_config_save(cfg, data_dir);
            return 1;
        } else if (press & SCE_CTRL_CIRCLE) {
            vita_config_save(cfg, data_dir);
            return 0;
        } else if (press & SCE_CTRL_TRIANGLE) {
            vita_config_defaults(cfg);
            snprintf(toast, sizeof toast, "%s", s->defaults_toast);
            toast_frames = 90;
            dirty = 1;
        }
    }
}
