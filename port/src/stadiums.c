/* PES6 Vita — dynamic PS2 stadium loader, multi-density crowd support, preload cache sync,
 * and native Match Settings rows (Row 9: Stadium, Row 11: Attendance) (docs/STADIUMS.md). */
#include "stadiums.h"

#include "lang.h"
#include "pes6_addrs.h"
#include "screen.h"

#include <psprecomp/hle.h>
#include <psprecomp/mem.h>

#include <dirent.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <zlib.h>

#define DATA_DIR             "ux0:data/pes6vita"
#define STADIUMS_DIR         DATA_DIR "/stadiums"
#define SLOT133_OFF          ((int64_t)133 * 0x8000)
#define SLOT133_SIZE         835584u
#define STADIUM_FILE_MAX     (3u << 20) /* 3 MB max for 9-member multi-density .bin bundles */
#define SLOT133_MEMBERS      7u
#define STADIUM_V2_MEMBERS   9u
#define STADIUM_MAX_CAT      (SCREEN_LIST_MAX - 2) /* 2 rows reserved: Auto + Original */

/* EBOOT resident preload cache (0x08823AA0 / 0x08824190 / 0x0882D250).
 * PES6 unpacks bundles 0x10034..0x10038 (including 0x10037 = Slot 133) ONCE into
 * 0x08400000..0x08800000 and records {vid, size, ptr} in 0x089EA530. Subsequent matches
 * memcpy directly from entry.ptr without re-reading Slot 133 from disc0:. We stage only the
 * 5 active unpacked payloads (day, night, 9024, 9025, 9051; ~600 KB total, 2048-byte aligned)
 * in unused guest kernel RAM 0x08200000..0x082FEFFF and redirect the 7 matching entries in
 * 0x089EA530 (aliasing 9581/9583 -> day and 9582/9584 -> night). The top 256 B at 0x082FFF00
 * hold the 4-entry text ID table for the native Attendance row. */
#define PRELOAD_STATE_ADDR   0x089EA510u /* u32: 2 == loaded */
#define PRELOAD_COUNT_ADDR   0x089EA514u /* u32: ~517 entries */
#define PRELOAD_TABLE_ADDR   0x089EA530u /* array of { u32 vid, u32 size, u32 ptr } */
#define PRELOAD_MAX_ENTRIES  640u
#define STADIUM_CACHE_BASE   0x08200000u /* 1 MB unused guest RAM (PSP_RAM_BASE + 2 MB) */
#define STADIUM_CACHE_CAP    0x000FF000u /* 1020 KB payload arena; 0x082FFF00+ reserved for UI tables */
#define MS_CROWD_VALTBL_ADDR 0x082FFF00u /* 4 x u32 native text IDs for Row 11 (Attendance) */

/* Native Match Settings rows inside select1.ovl (id 0x08 at 0x08CD5800).
 * - Row 9 ("Turf grain" -> "Stadium"): Konami left the 36-stadium + Random renderer intact.
 * - Row 11 ("Ball Effect" -> "Attendance"): 4-level crowd density (No / Low / Normal / High). */
#define OVL_SELECT1_AT       0x08CD5800u
#define OVL_SELECT1_ID       0x08u
#define OVL_FORMATION_ID     0x09u
#define OVL_SELECT_AT        0x08D4E800u
#define OVL_SELECT_ID        0x13u
#define OVL_LEAGUE_AT        0x08E9B800u
#define OVL_LEAGUECUP_ID     0x16u
#define OVL_ML_ID            0x17u

#define STADIUM_DB_ADDR      0x089C1A10u /* 37 entries x 20 B: +1 = u8 sid (0..35, [36] = 255 Random) */
#define STADIUM_DB_COUNT     37u
#define MATCH_STADIUM_ADDR   0x08A2F3CCu /* u8 active match stadium_id */
#define MATCH_ATT_FLAGS_ADDR 0x08A10A30u /* bits 5/6 (0x60) randomize home/away attendance in 0x088AB940 */
#define MATCH_HOME_ATT_ADDR  0x08A2F3DCu /* u8 match config home attendance (0..3) */
#define MATCH_AWAY_ATT_ADDR  0x08A2F3DDu /* u8 match config away attendance (0..3) */
#define MATCH_BALL_EFF_ADDR  0x08A2F3E3u /* u8 Ball Effect (kept 0 since Row 11 is Attendance) */
#define STAD_HOME_ATT_ADDR   0x089F5F79u /* u8 live stadium home attendance (0..3) */
#define STAD_AWAY_ATT_ADDR   0x089F5F7Au /* u8 live stadium away attendance (0..3) */
#define CROWD_VIS_ANY_ADDR   0x089F6230u /* u32 engine crowd draw flag (set by 0x088353CC) */
#define CROWD_VIS_HOME_ADDR  0x089F6234u /* u32 home stands crowd draw flag */
#define CROWD_VIS_AWAY_ADDR  0x089F6238u /* u32 away stand crowd draw flag */

#define MS_STATE_ADDR        0x08CF95C0u /* select1.ovl (0x08CD9100): 0=idle, 1=fadein, 2=live, 3=closing */
#define MS_DIRTY_ADDR        0x08A1096Cu /* bit 1 (0x2) forces 0x08CD8E50 to redraw row values */
#define MS_ROW9_TPL_ADDR     0x08CEFB78u /* 0x08CEEC90 + 9 * 424: static template copied by 0x08CD86F0 */
#define MS_ROW9_LIVE_ADDR    0x08CFA4B0u /* 0x08CF95C8 + 9 * 424: live widget */
#define MS_ROW9_LABEL_ADDR   0x08CF17E8u /* 0x08CF17C8 + 8 * 4: label text ID */
#define MS_ROW9_VALPTR_ADDR  0x08CF0E6Cu /* 0x08CF0E48 + 9 * 4: val table ptr (NULL -> stadium renderer) */
#define MS_ROW9_HELP_ADDR    0x08CF13BCu /* 0x08CF0E88 + 9 * 148: 37 help text IDs */

#define MS_ROW11_TPL_ADDR    0x08CEFEC8u /* 0x08CEEC90 + 11 * 424: static template */
#define MS_ROW11_LIVE_ADDR   0x08CFA800u /* 0x08CF95C8 + 11 * 424: live widget (+24 locked flag) */
#define MS_ROW11_LABEL_ADDR  0x08CF17F0u /* 0x08CF17C8 + 10 * 4: label text ID */
#define MS_ROW11_VALPTR_ADDR 0x08CF0E74u /* 0x08CF0E48 + 11 * 4: val table ptr (-> MS_CROWD_VALTBL_ADDR) */
#define MS_ROW11_HELP_ADDR   0x08CF14E4u /* 0x08CF0E88 + 11 * 148: 4 help text IDs */

#define TID_TURF_GRAIN       0x0320002Bu
#define TID_STADIUM_LABEL    0x00020022u /* "Stadium" / "Estadio" / "Stade" / "Stadion" / "Stadio" */
#define TID_STADIUM_HELP     0x00CA002Eu /* "Select stadium." / "Permite seleccionar el estadio." */

#define TID_BALL_EFFECT      0x012C0031u
#define TID_ATTENDANCE_LABEL 0x00020076u /* "Attendance" / "Número de espectadores" */
#define TID_ATTENDANCE_HELP  0x00CA004Fu /* "Choose the number of home team supporters." / "Elige el número..." */
#define TID_CROWD_NONE       0x0324000Au /* "No" / "No" */
#define TID_CROWD_LOW        0x012C0098u /* "Low" / "Poco" */
#define TID_CROWD_NORMAL     0x012C0097u /* "Normal" / "Normal" */
#define TID_CROWD_HIGH       0x012C0096u /* "High" / "Mucho" */

typedef struct {
    int id;
    const char *slug;
    const char *name;
    const char *sub;
} known_stadium;

static const known_stadium KNOWN[38] = {
    { 0,  "club_house",        "Club House",                      "Entrenamiento / Liga Master" },
    { 1,  "san_siro",          "San Siro",                        "Inter / A.C. Milan / Italia" },
    { 2,  "camp_nou",          "Catalonia Stadium (Camp Nou)",    "FC Barcelona / Espana / Brasil" },
    { 3,  "highbury",          "Highbury",                        "Arsenal" },
    { 4,  "orange_arena",      "Orange Arena (Amsterdam ArenA)",  "Ajax / Paises Bajos" },
    { 5,  "stade_louis_ii",    "Stade Louis II",                  "AS Monaco" },
    { 6,  "old_trafford",      "Old Trafford",                    "Manchester United / Inglaterra" },
    { 7,  "nakhon_ratchasima", "Nakhon Ratchasima",               "Corea del Sur / Man Blue" },
    { 8,  "bombonera",         "La Bombonera (Gran Chaco)",       "Argentina / Boca / River" },
    { 9,  "cuito_cuanavale",   "Cuito Cuanavale",                 "Everton / Saint-Etienne" },
    { 10, "amerigo_atlantis",  "Amerigo Atlantis",                "EE.UU. / Grecia / Zaragoza" },
    { 11, "delle_alpi",        "Stadio Delle Alpi",               "Juventus / Torino" },
    { 12, "olimpico",          "Stadio Olimpico",                 "A.S. Roma / Lazio" },
    { 13, "ennio_tardini",     "Stadio Ennio Tardini",            "Parma / FC Porto" },
    { 14, "anfield",           "Anfield (Red Cauldron)",          "Liverpool / Athletic Club" },
    { 15, "parc_des_princes",  "Parc des Princes (Lutecia)",      "PSG / Francia" },
    { 16, "velodrome",         "Stade Velodrome (Massilia)",      "Olympique Marseille" },
    { 17, "bernabeu",          "Santiago Bernabeu",               "Real Madrid" },
    { 18, "westfalenstadion",  "Signal Iduna Park (Borussia)",    "Dortmund / Alemania" },
    { 19, "stockholm_arena",   "Stockholm Arena (Rasunda)",       "Suecia / Mexico" },
    { 20, "st_james_park",     "St. James Park (Magpie Park)",    "Newcastle / Uruguay" },
    { 21, "de_kuip",           "De Kuip (Rotterdam Stadion)",     "Feyenoord" },
    { 22, "blautraum",         "Blautraum Stadion",               "SchucoArena (gemelo PS2)" },
    { 23, "diamond_stadium",   "Diamond Stadium (Munich)",        "Bayern Munich / Chelsea" },
    { 24, "berlin_olimpia",    "Hauptstadtstadion (Berlin)",      "Alemania / Fulham" },
    { 25, "riazor",            "Estadio de Riazor",               "Deportivo / Tottenham" },
    { 26, "mestalla",          "Mestalla (Estadio Palo)",         "Valencia C.F. / Peru" },
    { 27, "nangsoh",           "Nangsoh Stadium (Seoul)",         "Corea del Sur" },
    { 28, "kanji_dome",        "Kanji Dome (Sapporo)",            "WE10 / Japon" },
    { 29, "dietro_monte",      "Dietro Monte (Kashima)",          "WE10 / Japon" },
    { 30, "porto_folio",       "Porto Folio (Yokohama)",          "WE10 / Japon" },
    { 31, "queensland_park",   "Queens land Park (Osaka)",        "WE10 / Japon" },
    { 32, "haze_hills",        "Haze Hills (Tokyo)",              "WE10 / Japon" },
    { 33, "kusunoki_mihama",   "Kusunoki-Mihama (Saitama)",       "WE10 / Japon" },
    { 34, "occhio_del_mar",    "Occhio Del Mar (Oita)",           "WE10 / Japon" },
    { 35, "ayase_nakano",      "Ayase-Nakano (Toyota)",           "WE10 / Japon" },
    { 36, "hidden_a",          "Estadio Oculto A",                "Estadio extra (9927)" },
    { 37, "hidden_b",          "Estadio Oculto B",                "Estadio extra (10587)" },
};

typedef struct {
    int  known_id;           /* 0..37 if known, else -1 */
    char slug[64];
    char name[96];
    char sub[128];
    char path[256];
} stadium_entry;

enum {
    MODE_OFF = 0,
    MODE_AUTO = 1,           /* pick by home team from 0_text.afs[49] part[2] */
    MODE_ORIGINAL = 2,       /* force original PSP stadium */
    MODE_FIXED = 3,          /* locked to g_fixed_idx in g_entries */
};

enum {
    CROWD_NONE   = 0,        /* No / empty stands (home_att=0, away_att=0) */
    CROWD_LOW    = 1,        /* Low / Poco (L0_MIN, home_att=1, away_att=1) */
    CROWD_NORMAL = 2,        /* Normal (L2_MED, home_att=2, away_att=2) */
    CROWD_HIGH   = 3,        /* High / Mucho (L3_FULL, home_att=3, away_att=3) */
};

static int           g_enabled;
static int           g_mode = MODE_OFF;
static int           g_fixed_idx = -1;
static int           g_loaded_idx = -2;      /* -2 unknown, -1 original PSP, >= 0 index in g_entries */
static int           g_loaded_crowd = -1;    /* crowd density currently staged in 0x08200000 */
static uint16_t      g_crowd_level = CROWD_HIGH;
static int           g_last_home_team = -1;
static int64_t       g_afs_off;
static int64_t       g_afs_size;

static uint8_t       g_home_table[PES6_TEAM_COUNT];
static int           g_have_home_table;

static stadium_entry g_entries[STADIUM_MAX_CAT];
static int           g_nentries;
static int           g_id_to_entry[38];      /* known_id (0..37) -> index in g_entries, or -1 */

/* Staged 7-member Slot 133 payload descriptors inside STADIUM_CACHE_BASE (0x08200000). */
static int           g_staged_valid;
static uint32_t      g_staged_gen;
static uint32_t      g_cache_synced_gen;
static int           g_slot0_idx = -1;
static uint32_t      g_staged_vids[SLOT133_MEMBERS];
static uint32_t      g_staged_sizes[SLOT133_MEMBERS];
static uint32_t      g_staged_ptrs[SLOT133_MEMBERS];

/* Native Match Settings Row 9 (Stadium) + Row 11 (Attendance) tracking state. */
static uint32_t      g_ms_prev_state;
static int           g_ms_row_synced;
static int           g_ms_commit_pending;
static uint16_t      g_ms_synced_val = 36u;
static uint16_t      g_ms_live_val = 36u;
static uint16_t      g_ms_synced_crowd = CROWD_HIGH;
static uint16_t      g_ms_live_crowd = CROWD_HIGH;

/* Optional power-user overlay picker (L + R + TRIANGLE outside Match Settings / matches). */
static struct {
    int         on;
    int         sel;
    int         held;
    uint32_t    prev;
    screen_list l;
} g_ui;
static int g_ui_release;

static int is_es(void) {
    uint32_t g = psp_read32(PES6_GAME_LANGUAGE);
    if (g < PES6_GAME_LANGUAGES) return g == PES6_GAME_ES;
    return pes6_lang == PES6_LANG_ES;
}

static uint32_t rd32_le(const uint8_t *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static int ovl_resident(uint32_t addr, uint32_t id) {
    return psp_read32(addr) == PES6_MWO3_MAGIC && psp_read32(addr + 4u) == id;
}

static int in_match_setup(uint32_t scene) {
    if (scene == PES6_SCENE_MATCH) return 0;
    if (scene == PES6_SCENE_WIRELESS && ovl_resident(PES6_OVL_GAME_AT, PES6_OVL_GAME_ID)) return 0;
    if (scene == PES6_SCENE_LOADING || scene == PES6_SCENE_ML) return 1;
    return ovl_resident(OVL_SELECT_AT, OVL_SELECT_ID) ||
           ovl_resident(OVL_SELECT1_AT, OVL_SELECT1_ID) ||
           ovl_resident(OVL_SELECT1_AT, OVL_FORMATION_ID) ||
           ovl_resident(OVL_LEAGUE_AT, OVL_LEAGUECUP_ID) ||
           ovl_resident(OVL_LEAGUE_AT, OVL_ML_ID);
}

static const char *active_stadium_label(void) {
    if (g_loaded_idx >= 0 && g_loaded_idx < g_nentries) return g_entries[g_loaded_idx].name;
    return "Original (PSP)";
}

/* Map an internal stadium ID (0..35) to its index (0..35) in EBOOT's 0x089C1A10 table, or 36 (Random). */
static uint16_t sid_to_db_idx(int sid) {
    if (sid < 0 || sid >= 36) return 36u;
    for (uint32_t i = 0; i < 36u; i++) {
        if ((int)psp_read8(STADIUM_DB_ADDR + i * 20u + 1u) == sid) return (uint16_t)i;
    }
    return 36u;
}

static uint16_t current_mode_to_db_idx(void) {
    if (g_mode == MODE_AUTO) return 36u;
    if (g_mode == MODE_ORIGINAL) return sid_to_db_idx(22);
    if (g_mode == MODE_FIXED && g_fixed_idx >= 0 && g_fixed_idx < g_nentries) {
        return sid_to_db_idx(g_entries[g_fixed_idx].known_id);
    }
    return 36u;
}

/* Read the 296-byte team -> home stadium ID table directly from the player's own pes6.iso
 * (0_text.afs member 49, part[2], compressed with Konami's 0x10600 zlib header). */
static void load_home_stadium_table(void) {
    const char *iso_path = getenv("PES6_DISC_ISO");
    if (!iso_path || !*iso_path) iso_path = DATA_DIR "/pes6.iso";
    FILE *f = fopen(iso_path, "rb");
    if (!f) return;

    uint8_t e[8];
    if (fseek(f, (long)(g_afs_off + 49 * 8), SEEK_SET) != 0 || fread(e, 1, 8, f) != 8) {
        fclose(f);
        return;
    }
    const uint32_t start_sec = rd32_le(e);
    const uint32_t nsec = rd32_le(e + 4);
    const size_t mlen = (size_t)nsec * 2048u;
    if (!nsec || mlen > (2u << 20)) {
        fclose(f);
        return;
    }
    uint8_t *buf = (uint8_t *)malloc(mlen);
    if (!buf) {
        fclose(f);
        return;
    }
    const int ok = fseek(f, (long)(g_afs_off + (int64_t)start_sec * 2048), SEEK_SET) == 0 &&
                   fread(buf, 1, mlen, f) == mlen;
    fclose(f);
    if (!ok || mlen < 0x60) {
        free(buf);
        return;
    }
    const uint32_t cnt = rd32_le(buf + 0x20);
    if (cnt >= 3 && rd32_le(buf) == 0x600u) {
        const uint32_t po = 0x20u + rd32_le(buf + 0x28 + 2 * 4);
        if (po + 32u <= mlen) {
            const uint32_t pk = rd32_le(buf + po);
            const uint32_t csz = rd32_le(buf + po + 4);
            const uint32_t usz = rd32_le(buf + po + 8);
            if ((pk & 0x10000u) && usz == PES6_TEAM_COUNT && po + 32u + csz <= mlen) {
                uLongf dlen = PES6_TEAM_COUNT;
                if (uncompress(g_home_table, &dlen, buf + po + 32u, csz) == Z_OK && dlen == PES6_TEAM_COUNT) {
                    g_have_home_table = 1;
                    fprintf(stderr, "[stadium] loaded 296-team home stadium table from 0_text.afs[49]\n");
                }
            }
        }
    }
    free(buf);
}

static int file_ok_stadium(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    const long len = ftell(f);
    if (len < 64 || (uint32_t)len > STADIUM_FILE_MAX) {
        fclose(f);
        return 0;
    }
    uint8_t h[8];
    fseek(f, 0, SEEK_SET);
    const int ok = fread(h, 1, 8, f) == 8;
    fclose(f);
    if (!ok) return 0;
    const uint32_t cnt = rd32_le(h);
    return cnt == SLOT133_MEMBERS || cnt == STADIUM_V2_MEMBERS;
}

static void add_entry(int known_id, const char *slug, const char *name, const char *sub, const char *path) {
    if (g_nentries >= STADIUM_MAX_CAT) return;
    for (int i = 0; i < g_nentries; i++) {
        if (!strcmp(g_entries[i].slug, slug)) return;
    }
    stadium_entry *en = &g_entries[g_nentries];
    en->known_id = known_id;
    snprintf(en->slug, sizeof en->slug, "%s", slug);
    snprintf(en->name, sizeof en->name, "%s", name);
    snprintf(en->sub, sizeof en->sub, "%s", sub);
    snprintf(en->path, sizeof en->path, "%s", path);
    if (known_id >= 0 && known_id < 38) g_id_to_entry[known_id] = g_nentries;
    g_nentries++;
}

static void scan_stadiums_dir(void) {
    g_nentries = 0;
    for (int i = 0; i < 38; i++) g_id_to_entry[i] = -1;

    /* First add known stadiums in canonical ID order (0..37) if present on disk */
    char path[256];
    for (int i = 0; i < 38; i++) {
        snprintf(path, sizeof path, STADIUMS_DIR "/%s/133.bin", KNOWN[i].slug);
        if (file_ok_stadium(path)) {
            add_entry(KNOWN[i].id, KNOWN[i].slug, KNOWN[i].name, KNOWN[i].sub, path);
            continue;
        }
        snprintf(path, sizeof path, STADIUMS_DIR "/%s.bin", KNOWN[i].slug);
        if (file_ok_stadium(path)) {
            add_entry(KNOWN[i].id, KNOWN[i].slug, KNOWN[i].name, KNOWN[i].sub, path);
        }
    }

    /* Then add any extra user-named .bin files in STADIUMS_DIR */
    DIR *d = opendir(STADIUMS_DIR);
    if (!d) return;
    struct dirent *de;
    while ((de = readdir(d)) && g_nentries < STADIUM_MAX_CAT) {
        if (de->d_name[0] == '.') continue;
        const size_t nl = strlen(de->d_name);
        if (nl > 4 && !strcmp(de->d_name + nl - 4, ".bin")) {
            char slug[64];
            size_t sl = nl - 4;
            if (sl >= sizeof slug) sl = sizeof slug - 1;
            memcpy(slug, de->d_name, sl);
            slug[sl] = 0;
            snprintf(path, sizeof path, STADIUMS_DIR "/%s", de->d_name);
            if (file_ok_stadium(path)) {
                add_entry(-1, slug, slug, de->d_name, path);
            }
        }
    }
    closedir(d);
}

/* Redirect the 7 Slot 133 entries (9581..9584, 9024, 9025, 9051) in PES6's resident
 * preload cache table (0x089EA530) to our staged payloads at STADIUM_CACHE_BASE (0x08200000). */
static void sync_preload_cache(void) {
    if (!g_staged_valid) return;
    if (psp_read32(PRELOAD_STATE_ADDR) != 2u) return;
    const uint32_t count = psp_read32(PRELOAD_COUNT_ADDR);
    if (count == 0u || count > PRELOAD_MAX_ENTRIES) return;

    int updated = 0;
    g_slot0_idx = -1;
    for (uint32_t i = 0; i < count; i++) {
        const uint32_t ent = PRELOAD_TABLE_ADDR + i * 12u;
        const uint32_t vid = psp_read32(ent);
        for (uint32_t k = 0; k < SLOT133_MEMBERS; k++) {
            if (vid == g_staged_vids[k]) {
                psp_write32(ent + 4u, g_staged_sizes[k]);
                psp_write32(ent + 8u, g_staged_ptrs[k]);
                if (k == 0u) g_slot0_idx = (int)i;
                updated++;
                break;
            }
        }
    }
    if (updated > 0) {
        g_cache_synced_gen = g_staged_gen;
        fprintf(stderr, "[stadium] preload cache synced (%d/%u entries -> 0x%08X)\n",
                updated, SLOT133_MEMBERS, STADIUM_CACHE_BASE);
    }
}

/* Stage the 7 unpacked payloads from an in-memory 7-member Slot 133 buffer (used for Original PSP). */
static void stage_slot133_payloads(const uint8_t *buf, uint32_t len) {
    if (len < 64u || rd32_le(buf) != SLOT133_MEMBERS) return;

    uint32_t src_off = 64u;
    uint32_t dst_off = 0u;
    uint32_t vids[SLOT133_MEMBERS], sizes[SLOT133_MEMBERS], ptrs[SLOT133_MEMBERS];

    for (uint32_t i = 0; i < SLOT133_MEMBERS; i++) {
        vids[i] = rd32_le(buf + 8u + i * 4u);
        sizes[i] = rd32_le(buf + 36u + i * 4u);
        const uint32_t aligned = (sizes[i] + 2047u) & ~2047u;
        if (src_off + sizes[i] > len || dst_off + aligned > STADIUM_CACHE_CAP) {
            fprintf(stderr, "[stadium] stage overflow at member %u (sz=%u)\n", i, sizes[i]);
            return;
        }
        void *dst = psp_mem_ptr(STADIUM_CACHE_BASE + dst_off, aligned);
        if (!dst) return;
        memcpy(dst, buf + src_off, sizes[i]);
        if (aligned > sizes[i]) memset((uint8_t *)dst + sizes[i], 0, aligned - sizes[i]);
        ptrs[i] = STADIUM_CACHE_BASE + dst_off;
        src_off += sizes[i];
        dst_off += aligned;
    }

    for (uint32_t i = 0; i < SLOT133_MEMBERS; i++) {
        g_staged_vids[i] = vids[i];
        g_staged_sizes[i] = sizes[i];
        g_staged_ptrs[i] = ptrs[i];
    }
    g_staged_valid = 1;
    g_staged_gen++;
    sync_preload_cache();
}

/* Stage ONLY the 5 active payloads (day, night, 9024, 9025, 9051) for `crowd` directly from a
 * 7-member (classic) or 9-member (multi-density v2) stadium .bin into STADIUM_CACHE_BASE
 * (0x08200000, ~600 KB), aliasing 9581/9583 -> day and 9582/9584 -> night in 0x089EA530. */
static int stage_stadium_file(FILE *f, uint32_t file_len, uint16_t crowd) {
    uint8_t hdr[80];
    if (file_len < 64u || fseek(f, 0, SEEK_SET) != 0 || fread(hdr, 1, 8, f) != 8) return -1;
    const uint32_t cnt = rd32_le(hdr);
    if (cnt != SLOT133_MEMBERS && cnt != STADIUM_V2_MEMBERS) return -1;
    const uint32_t hdr_len = 8u + 8u * cnt;
    if (file_len < hdr_len || fread(hdr + 8, 1, hdr_len - 8u, f) != hdr_len - 8u) return -1;

    uint32_t vids[STADIUM_V2_MEMBERS], sizes[STADIUM_V2_MEMBERS], offs[STADIUM_V2_MEMBERS];
    uint32_t cur = hdr_len;
    for (uint32_t i = 0; i < cnt; i++) {
        vids[i] = rd32_le(hdr + 8u + i * 4u);
        sizes[i] = rd32_le(hdr + 8u + (cnt + i) * 4u);
        offs[i] = cur;
        if (sizes[i] > file_len || cur + sizes[i] > file_len) return -1;
        cur += sizes[i];
    }

    uint32_t day_idx = 0u, night_idx = 1u;
    if (cnt == STADIUM_V2_MEMBERS) {
        if (crowd >= CROWD_HIGH)        { day_idx = 0u; night_idx = 1u; } /* L3_FULL */
        else if (crowd == CROWD_NORMAL) { day_idx = 2u; night_idx = 3u; } /* L2_MED */
        else                            { day_idx = 7u; night_idx = 8u; } /* L0_MIN */
    } else {
        if (crowd >= CROWD_HIGH)        { day_idx = 0u; night_idx = 1u; }
        else                            { day_idx = 2u; night_idx = 3u; }
    }

    const uint32_t active[5] = { day_idx, night_idx, 4u, 5u, 6u };
    uint32_t staged_ptr[5], staged_sz[5];
    uint32_t dst_off = 0u;
    for (int k = 0; k < 5; k++) {
        const uint32_t m = active[k];
        const uint32_t sz = sizes[m];
        const uint32_t aligned = (sz + 2047u) & ~2047u;
        if (dst_off + aligned > STADIUM_CACHE_CAP) {
            fprintf(stderr, "[stadium] stage overflow at active[%d] (m=%u sz=%u)\n", k, m, sz);
            return -1;
        }
        void *dst = psp_mem_ptr(STADIUM_CACHE_BASE + dst_off, aligned);
        if (!dst) return -1;
        if (fseek(f, (long)offs[m], SEEK_SET) != 0 || fread(dst, 1, sz, f) != sz) return -1;
        if (aligned > sz) memset((uint8_t *)dst + sz, 0, aligned - sz);
        staged_ptr[k] = STADIUM_CACHE_BASE + dst_off;
        staged_sz[k] = sz;
        dst_off += aligned;
    }

    /* Map all 7 preload cache entries: 9581/9583 -> day, 9582/9584 -> night, 9024/9025/9051 -> extras. */
    g_staged_vids[0] = vids[0]; g_staged_sizes[0] = staged_sz[0]; g_staged_ptrs[0] = staged_ptr[0];
    g_staged_vids[1] = vids[1]; g_staged_sizes[1] = staged_sz[1]; g_staged_ptrs[1] = staged_ptr[1];
    g_staged_vids[2] = vids[2]; g_staged_sizes[2] = staged_sz[0]; g_staged_ptrs[2] = staged_ptr[0];
    g_staged_vids[3] = vids[3]; g_staged_sizes[3] = staged_sz[1]; g_staged_ptrs[3] = staged_ptr[1];
    g_staged_vids[4] = vids[4]; g_staged_sizes[4] = staged_sz[2]; g_staged_ptrs[4] = staged_ptr[2];
    g_staged_vids[5] = vids[5]; g_staged_sizes[5] = staged_sz[3]; g_staged_ptrs[5] = staged_ptr[3];
    g_staged_vids[6] = vids[6]; g_staged_sizes[6] = staged_sz[4]; g_staged_ptrs[6] = staged_ptr[4];
    g_staged_valid = 1;
    g_staged_gen++;
    sync_preload_cache();
    return 0;
}

/* Apply a raw Slot 133 buffer (835 584 B) to both the disc patch layer (leak-free in-place)
 * and PES6's resident preload cache (0x089EA530 -> 0x08200000). */
static int apply_slot133_bytes(const uint8_t *buf, uint32_t len, const char *label) {
    if (SLOT133_OFF + (int64_t)len > g_afs_size) return -1;
    if (psp_io_disc_patch(g_afs_off + SLOT133_OFF, buf, len) != 0) return -1;
    stage_slot133_payloads(buf, len);
    fprintf(stderr, "[stadium] active -> %s (%u B)\n", label, len);
    return 0;
}

static int apply_original_psp_stadium(void) {
    if (g_loaded_idx == -1 && g_staged_valid) {
        sync_preload_cache();
        return 0;
    }
    const char *iso_path = getenv("PES6_DISC_ISO");
    if (!iso_path || !*iso_path) iso_path = DATA_DIR "/pes6.iso";
    FILE *f = fopen(iso_path, "rb");
    if (!f) return -1;
    uint8_t *buf = (uint8_t *)malloc(SLOT133_SIZE);
    if (!buf) { fclose(f); return -1; }
    const int ok = fseek(f, (long)(g_afs_off + SLOT133_OFF), SEEK_SET) == 0 &&
                   fread(buf, 1, SLOT133_SIZE, f) == SLOT133_SIZE;
    fclose(f);
    int rc = -1;
    if (ok) rc = apply_slot133_bytes(buf, SLOT133_SIZE, "Original (PSP)");
    free(buf);
    if (rc == 0) {
        g_loaded_idx = -1;
        g_loaded_crowd = (int)g_crowd_level;
    }
    return rc;
}

static int apply_entry_idx(int idx, int show_toast) {
    if (idx < 0 || idx >= g_nentries) return -1;
    const stadium_entry *en = &g_entries[idx];
    if (g_loaded_idx == idx && g_loaded_crowd == (int)g_crowd_level) {
        sync_preload_cache();
        if (show_toast) screen_notice(2500, "%s: %s", is_es() ? "Estadio" : "Stadium", en->name);
        return 0;
    }
    FILE *f = fopen(en->path, "rb");
    if (!f) {
        fprintf(stderr, "[stadium] %s: could not open\n", en->path);
        return -1;
    }
    fseek(f, 0, SEEK_END);
    const long len = ftell(f);
    if (len < 64 || (uint32_t)len > STADIUM_FILE_MAX) {
        fclose(f);
        return -1;
    }

    /* For classic <=835 KB 7-member files, also mirror into disc0: Slot 133 for pre-preload boot. */
    uint8_t h4[4];
    fseek(f, 0, SEEK_SET);
    if (fread(h4, 1, 4, f) == 4 && rd32_le(h4) == SLOT133_MEMBERS &&
        (uint32_t)len <= SLOT133_SIZE && SLOT133_OFF + (int64_t)SLOT133_SIZE <= g_afs_size) {
        uint8_t *buf = (uint8_t *)calloc(1, SLOT133_SIZE);
        if (buf) {
            fseek(f, 0, SEEK_SET);
            if (fread(buf, 1, (size_t)len, f) == (size_t)len) {
                psp_io_disc_patch(g_afs_off + SLOT133_OFF, buf, SLOT133_SIZE);
            }
            free(buf);
        }
    }

    const int rc = stage_stadium_file(f, (uint32_t)len, g_crowd_level);
    fclose(f);
    if (rc == 0) {
        g_loaded_idx = idx;
        g_loaded_crowd = (int)g_crowd_level;
        fprintf(stderr, "[stadium] active -> %s (crowd=%u, %ld B)\n", en->name, (unsigned)g_crowd_level, len);
        if (show_toast) screen_notice(2500, "%s: %s", is_es() ? "Estadio" : "Stadium", en->name);
    }
    return rc;
}

static int find_entry_by_spec(const char *spec) {
    if (!spec || !*spec) return -1;
    char *end = NULL;
    long num = strtol(spec, &end, 10);
    if (end && *end == 0 && num >= 0 && num < 38 && g_id_to_entry[num] >= 0) {
        return g_id_to_entry[num];
    }
    for (int i = 0; i < g_nentries; i++) {
        if (!strcasecmp(g_entries[i].slug, spec)) return i;
    }
    return -1;
}

static void apply_auto_home_team(int show_toast) {
    if (g_mode != MODE_AUTO || !g_have_home_table) return;
    const uint16_t home = psp_read16(PES6_MATCH_TEAMS);
    if (home < PES6_TEAM_COUNT && (int)home != g_last_home_team) {
        g_last_home_team = (int)home;
        const uint8_t sid = g_home_table[home];
        const int eidx = (sid < 38) ? g_id_to_entry[sid] : -1;
        if (eidx >= 0) {
            apply_entry_idx(eidx, show_toast);
        } else {
            apply_original_psp_stadium();
        }
    }
}

/* Keep EBOOT's attendance flags synced with g_crowd_level and prevent 0x088AB940 from
 * randomly rolling attendance == 0 (empty stands) or enabling rainbow Ball Effect. */
static void sync_crowd_engine_state(uint32_t scene) {
    const uint8_t att = (uint8_t)(g_crowd_level <= CROWD_HIGH ? g_crowd_level : CROWD_HIGH);
    const uint8_t fl = psp_read8(MATCH_ATT_FLAGS_ADDR);
    if (fl & 0x60u) psp_write8(MATCH_ATT_FLAGS_ADDR, (uint8_t)(fl & ~0x60u));
    psp_write8(MATCH_BALL_EFF_ADDR, 0u);
    psp_write8(MATCH_HOME_ATT_ADDR, att);
    psp_write8(MATCH_AWAY_ATT_ADDR, att);
    psp_write8(STAD_HOME_ATT_ADDR, att);
    psp_write8(STAD_AWAY_ATT_ADDR, att);
    if (scene == PES6_SCENE_LOADING || scene == PES6_SCENE_MATCH) {
        const uint32_t vis = (att > 0u) ? 1u : 0u;
        psp_write32(CROWD_VIS_ANY_ADDR, vis);
        psp_write32(CROWD_VIS_HOME_ADDR, vis);
        psp_write32(CROWD_VIS_AWAY_ADDR, vis);
    }
}

static void apply_crowd_choice(uint16_t chosen) {
    if (chosen > CROWD_HIGH) chosen = CROWD_HIGH;
    const int changed = (chosen != g_crowd_level);
    g_crowd_level = chosen;
    if (changed) {
        fprintf(stderr, "[stadium] crowd level -> %u\n", (unsigned)g_crowd_level);
    }
    if (g_loaded_idx >= 0 && g_loaded_idx < g_nentries && g_loaded_crowd != (int)g_crowd_level) {
        apply_entry_idx(g_loaded_idx, 0);
    }
    sync_crowd_engine_state(psp_read32(PES6_SCENE_STACK));
}

static void apply_db_stadium_choice(uint16_t chosen) {
    if (chosen >= 36u) {
        g_mode = MODE_AUTO;
        g_fixed_idx = -1;
        g_last_home_team = -1;
        apply_auto_home_team(0);
        return;
    }
    const uint8_t sid = psp_read8(STADIUM_DB_ADDR + (uint32_t)chosen * 20u + 1u);
    if (sid < 38u && g_id_to_entry[sid] >= 0) {
        g_mode = MODE_FIXED;
        g_fixed_idx = g_id_to_entry[sid];
        apply_entry_idx(g_fixed_idx, 0);
        psp_write8(MATCH_STADIUM_ADDR, sid);
    } else if (sid == 22u) {
        g_mode = MODE_ORIGINAL;
        g_fixed_idx = -1;
        apply_original_psp_stadium();
        psp_write8(MATCH_STADIUM_ADDR, 22u);
    }
}

/* Re-enable native Match Settings rows inside select1.ovl:
 *   Row 9:  "Turf grain"  -> "Stadium" / "Estadio" (36 stadiums + Random)
 *   Row 11: "Ball Effect" -> "Attendance" / "Número de espectadores" (No / Low / Normal / High) */
static void patch_select1_native_rows(void) {
    if (!ovl_resident(OVL_SELECT1_AT, OVL_SELECT1_ID)) {
        /* If select1.ovl was replaced directly by formation.ovl before state 0 was observed,
         * apply the live Row 11 (Attendance) and Row 9 (Stadium) selections now. */
        if (g_ms_commit_pending && ovl_resident(OVL_SELECT1_AT, OVL_FORMATION_ID)) {
            apply_crowd_choice(g_ms_live_crowd);
            apply_db_stadium_choice(g_ms_live_val);
        }
        g_ms_prev_state = 0;
        g_ms_row_synced = 0;
        g_ms_commit_pending = 0;
        return;
    }

    /* 1. Patch static tables once per overlay load. */
    if (psp_read32(MS_ROW9_LABEL_ADDR) == TID_TURF_GRAIN) {
        psp_write32(MS_ROW9_LABEL_ADDR, TID_STADIUM_LABEL);
        psp_write32(MS_ROW9_VALPTR_ADDR, 0u);
        for (uint32_t k = 0; k < STADIUM_DB_COUNT; k++) {
            psp_write32(MS_ROW9_HELP_ADDR + k * 4u, TID_STADIUM_HELP);
        }
        psp_write16(MS_ROW9_TPL_ADDR + 0u, 36u); /* default: 36 == Random / Auto */
        psp_write16(MS_ROW9_TPL_ADDR + 8u, 36u); /* max: 36 (0..35 stadiums + 36 Random) */
        fprintf(stderr, "[stadium] enabled native Match Settings row 9 (Stadium: 36 + Random)\n");
    }
    if (psp_read32(MS_ROW11_LABEL_ADDR) == TID_BALL_EFFECT) {
        psp_write32(MS_CROWD_VALTBL_ADDR + 0u,  TID_CROWD_NONE);
        psp_write32(MS_CROWD_VALTBL_ADDR + 4u,  TID_CROWD_LOW);
        psp_write32(MS_CROWD_VALTBL_ADDR + 8u,  TID_CROWD_NORMAL);
        psp_write32(MS_CROWD_VALTBL_ADDR + 12u, TID_CROWD_HIGH);
        psp_write32(MS_ROW11_LABEL_ADDR, TID_ATTENDANCE_LABEL);
        psp_write32(MS_ROW11_VALPTR_ADDR, MS_CROWD_VALTBL_ADDR);
        for (uint32_t k = 0; k < 4u; k++) {
            psp_write32(MS_ROW11_HELP_ADDR + k * 4u, TID_ATTENDANCE_HELP);
        }
        psp_write16(MS_ROW11_TPL_ADDR + 0u, g_crowd_level);
        psp_write16(MS_ROW11_TPL_ADDR + 8u, CROWD_HIGH);
        psp_write32(MS_ROW11_TPL_ADDR + 24u, 0u); /* always unlocked (bypass PES-Shop lock) */
        fprintf(stderr, "[stadium] enabled native Match Settings row 11 (Attendance: No/Low/Normal/High)\n");
    }

    const uint32_t st = psp_read32(MS_STATE_ADDR);

    /* 2. On entering Match Settings (state 1 or 2), sync Row 9 & Row 11 ranges, masks, and values. */
    if ((st == 1u || st == 2u) && !g_ms_row_synced) {
        /* Row 9: Stadium */
        psp_write16(MS_ROW9_LIVE_ADDR + 20u, 36u);
        psp_write16(MS_ROW9_LIVE_ADDR + 22u, 36u);
        for (uint32_t i = 0; i < STADIUM_DB_COUNT; i++) {
            const uint8_t sid = psp_read8(STADIUM_DB_ADDR + i * 20u + 1u);
            const uint32_t avail = (sid == 255u || sid == 22u || (sid < 38u && g_id_to_entry[sid] >= 0));
            psp_write32(MS_ROW9_LIVE_ADDR + 32u + i * 4u, avail ? 0u : 1u);
        }
        const uint16_t cur = current_mode_to_db_idx();
        psp_write16(MS_ROW9_LIVE_ADDR + 12u, cur);
        psp_write16(MS_ROW9_LIVE_ADDR + 14u, cur);

        /* Row 11: Attendance (always unlocked regardless of PES-Shop Ball Effect unlock state) */
        psp_write32(MS_ROW11_LIVE_ADDR + 24u, 0u);
        psp_write16(MS_ROW11_LIVE_ADDR + 20u, CROWD_HIGH);
        psp_write16(MS_ROW11_LIVE_ADDR + 22u, CROWD_HIGH);
        for (uint32_t i = 0; i < 4u; i++) {
            psp_write32(MS_ROW11_LIVE_ADDR + 32u + i * 4u, 0u);
        }
        psp_write16(MS_ROW11_LIVE_ADDR + 12u, g_crowd_level);
        psp_write16(MS_ROW11_LIVE_ADDR + 14u, g_crowd_level);

        psp_write32(MS_DIRTY_ADDR, psp_read32(MS_DIRTY_ADDR) | 2u);
        g_ms_synced_val = cur;
        g_ms_live_val = cur;
        g_ms_synced_crowd = g_crowd_level;
        g_ms_live_crowd = g_crowd_level;
        g_ms_row_synced = 1;
        g_ms_commit_pending = 0;
    }

    if (st == 2u) {
        /* Keep Row 11 unlocked even if mode init touched +24 after state 1. */
        if (psp_read32(MS_ROW11_LIVE_ADDR + 24u) != 0u) {
            psp_write32(MS_ROW11_LIVE_ADDR + 24u, 0u);
        }
        g_ms_live_val = psp_read16(MS_ROW9_LIVE_ADDR + 14u);
        g_ms_live_crowd = psp_read16(MS_ROW11_LIVE_ADDR + 14u);
    }

    /* 3. Track leaving interactive state (2 -> 3) and apply committed Row 11 & Row 9 values. */
    if (g_ms_prev_state == 2u && st != 2u) {
        g_ms_commit_pending = 1;
    }
    if (g_ms_commit_pending) {
        const uint16_t committed_stad = psp_read16(MS_ROW9_LIVE_ADDR + 12u);
        const uint16_t committed_crowd = psp_read16(MS_ROW11_LIVE_ADDR + 12u);
        if (st == 0u || st == 4u ||
            committed_stad != g_ms_synced_val || committed_crowd != g_ms_synced_crowd) {
            g_ms_commit_pending = 0;
            g_ms_row_synced = 0;
            apply_crowd_choice(committed_crowd);
            apply_db_stadium_choice(committed_stad);
        }
    }
    if (st == 0u) g_ms_row_synced = 0;
    g_ms_prev_state = st;
}

static void ui_refresh(void) {
    const int es = is_es();
    memset(&g_ui.l, 0, sizeof g_ui.l);
    snprintf(g_ui.l.heading, sizeof g_ui.l.heading, "%s",
             es ? "Elegir estadio (PS2 -> Vita)" : "Choose stadium (PS2 -> Vita)");
    snprintf(g_ui.l.hint, sizeof g_ui.l.hint, "%s",
             es ? "Arriba/Abajo: mover   L/R: pagina   X: elegir   O: volver"
                : "Up/Down: move   L/R: page   X: select   O: back");

    const char *act = es ? "ACTIVO" : "ACTIVE";
    /* Row 0: Auto (Home team) */
    snprintf(g_ui.l.row[0].top, sizeof g_ui.l.row[0].top, "%s",
             es ? "Auto (Estadio del equipo local)" : "Auto (Home team stadium)");
    snprintf(g_ui.l.row[0].bottom, sizeof g_ui.l.row[0].bottom, "%s",
             es ? "Cambia automaticamente segun el equipo local (296 equipos)"
                : "Automatically matches the home team (296 teams)");
    if (g_mode == MODE_AUTO) snprintf(g_ui.l.row[0].right, sizeof g_ui.l.row[0].right, "%s", act);
    g_ui.l.row[0].fresh = 1;

    /* Row 1: Original PSP */
    snprintf(g_ui.l.row[1].top, sizeof g_ui.l.row[1].top, "%s",
             es ? "Original (Estadio PSP por defecto)" : "Original (Default PSP stadium)");
    snprintf(g_ui.l.row[1].bottom, sizeof g_ui.l.row[1].bottom, "%s", "Blautraum Stadion (PSP 9581)");
    if (g_mode == MODE_ORIGINAL) snprintf(g_ui.l.row[1].right, sizeof g_ui.l.row[1].right, "%s", act);

    /* Rows 2..n+1: Installed .bin stadiums */
    for (int i = 0; i < g_nentries; i++) {
        const int r = i + 2;
        snprintf(g_ui.l.row[r].top, sizeof g_ui.l.row[r].top, "%s", g_entries[i].name);
        snprintf(g_ui.l.row[r].bottom, sizeof g_ui.l.row[r].bottom, "%s (%s.bin)", g_entries[i].sub, g_entries[i].slug);
        if (g_mode == MODE_FIXED && g_fixed_idx == i) {
            snprintf(g_ui.l.row[r].right, sizeof g_ui.l.row[r].right, "%s", act);
        }
    }
    g_ui.l.n = g_nentries + 2;
    if (g_ui.sel < 0) g_ui.sel = 0;
    if (g_ui.sel >= g_ui.l.n) g_ui.sel = g_ui.l.n - 1;
    g_ui.l.sel = g_ui.sel;
    screen_list_show(&g_ui.l);
}

static void ui_open(const SceCtrlData *pad) {
    if (g_mode == MODE_AUTO) g_ui.sel = 0;
    else if (g_mode == MODE_ORIGINAL) g_ui.sel = 1;
    else if (g_mode == MODE_FIXED && g_fixed_idx >= 0) g_ui.sel = g_fixed_idx + 2;
    else g_ui.sel = 0;
    g_ui.held = 0;
    g_ui.prev = pad->buttons;
    g_ui.on = 1;
    ui_refresh();
}

static void ui_close(void) {
    g_ui.on = 0;
    g_ui_release = 1;
    screen_list_hide();
}

static uint16_t parse_crowd_env(const char *s) {
    if (!s || !*s) return CROWD_HIGH;
    if (!strcmp(s, "0") || !strcasecmp(s, "no") || !strcasecmp(s, "none") || !strcasecmp(s, "off")) return CROWD_NONE;
    if (!strcmp(s, "1") || !strcasecmp(s, "low") || !strcasecmp(s, "poco")) return CROWD_LOW;
    if (!strcmp(s, "2") || !strcasecmp(s, "normal") || !strcasecmp(s, "med") || !strcasecmp(s, "medium")) return CROWD_NORMAL;
    return CROWD_HIGH;
}

void stadiums_init(void) {
    const char *env = getenv("PES6_STADIUM");
    if (env && !strcmp(env, "0")) {
        fprintf(stderr, "[stadium] off (PES6_STADIUM=0)\n");
        g_enabled = 0;
        g_mode = MODE_OFF;
        return;
    }
    if (psp_io_disc_extent("PSP_GAME/USRDIR/0_text.afs", &g_afs_off, &g_afs_size) != 0) {
        fprintf(stderr, "[stadium] 0_text.afs not found on disc\n");
        return;
    }

    scan_stadiums_dir();
    if (g_nentries == 0 && (!env || !*env)) {
        fprintf(stderr, "[stadium] off (no .bin files in " STADIUMS_DIR ")\n");
        return;
    }

    g_crowd_level = parse_crowd_env(getenv("PES6_CROWD"));
    g_enabled = 1;
    load_home_stadium_table();
    fprintf(stderr, "[stadium] found %d stadium(s) in " STADIUMS_DIR
                    " (crowd=%u, native Match Settings rows 9 & 11)\n",
            g_nentries, (unsigned)g_crowd_level);

    if (!env || !*env || !strcasecmp(env, "auto") || !strcasecmp(env, "menu")) {
        g_mode = MODE_AUTO;
        g_loaded_idx = -1;
        screen_line("Estadios: %d disp. (Ajustes del partido -> Estadio / Espectadores)", g_nentries);
        screen_draw(NULL);
        return;
    }

    const int idx = find_entry_by_spec(env);
    if (idx >= 0) {
        g_mode = MODE_FIXED;
        g_fixed_idx = idx;
        if (apply_entry_idx(idx, 0) == 0) {
            screen_line("Estadio: %s", g_entries[idx].name);
            screen_draw(NULL);
        }
        return;
    }

    /* Fallback: explicit path in PES6_STADIUM */
    if ((strchr(env, '/') || strchr(env, ':')) && file_ok_stadium(env)) {
        add_entry(-1, "custom", env, env, env);
        g_mode = MODE_FIXED;
        g_fixed_idx = g_nentries - 1;
        if (apply_entry_idx(g_fixed_idx, 0) == 0) {
            screen_line("Estadio: %s", env);
            screen_draw(NULL);
        }
        return;
    }

    fprintf(stderr, "[stadium] '%s' not found; falling back to auto\n", env);
    g_mode = MODE_AUTO;
    g_loaded_idx = -1;
}

int stadiums_blocks_input(void) {
    if (!g_enabled) return 0;
    if (g_ui.on) return 1;
    if (!g_ui_release) return 0;
    SceCtrlData p;
    sceCtrlPeekBufferPositive(0, &p, 1);
    const int stick = p.lx < 96 || p.lx > 160 || p.ly < 96 || p.ly > 160;
    if ((p.buttons & 0xF3F9u) == 0 && !stick) g_ui_release = 0;
    return g_ui_release;
}

void stadiums_vblank(const SceCtrlData *pad, int external_list_open) {
    if (!g_enabled) return;

    const uint32_t scene = psp_read32(PES6_SCENE_STACK);

    /* 0. Keep PES6's resident preload cache (0x089EA530) synced whenever loaded (state == 2) */
    if (g_staged_valid && scene != PES6_SCENE_MATCH && psp_read32(PRELOAD_STATE_ADDR) == 2u) {
        const int drifted = g_slot0_idx < 0 ||
                            psp_read32(PRELOAD_TABLE_ADDR + (uint32_t)g_slot0_idx * 12u + 8u) != g_staged_ptrs[0];
        if (g_cache_synced_gen != g_staged_gen || drifted) {
            sync_preload_cache();
        }
    }

    /* 1. Native Match Settings Row 9 ("Stadium") and Row 11 ("Attendance") inside select1.ovl */
    if (scene != PES6_SCENE_MATCH && g_nentries > 0) {
        patch_select1_native_rows();
    }

    /* 1b. Keep attendance level synced into EBOOT match/stadium state (and disable random 0-roll) */
    if (scene == PES6_SCENE_MATCH || in_match_setup(scene)) {
        sync_crowd_engine_state(scene);
    }

    /* 2. Drive the optional power-user Stadium Picker overlay when open */
    if (g_ui.on) {
        const uint32_t press = pad->buttons & ~g_ui.prev;
        g_ui.prev = pad->buttons;
        int move = 0;
        const int up = (pad->buttons & SCE_CTRL_UP) || pad->ly < 64;
        const int down = (pad->buttons & SCE_CTRL_DOWN) || pad->ly > 192;
        if (up || down) {
            if (g_ui.held == 0 || (g_ui.held >= 20 && g_ui.held % 4 == 0)) move = up ? -1 : 1;
            g_ui.held++;
        } else {
            g_ui.held = 0;
        }
        if (press & (SCE_CTRL_LTRIGGER | SCE_CTRL_L1)) move = -5;
        if (press & (SCE_CTRL_RTRIGGER | SCE_CTRL_R1)) move = 5;

        if (press & SCE_CTRL_CIRCLE) {
            ui_close();
            return;
        }
        if (press & SCE_CTRL_CROSS) {
            const int s = g_ui.sel;
            ui_close();
            if (s == 0) {
                g_mode = MODE_AUTO;
                g_fixed_idx = -1;
                g_last_home_team = -1;
                apply_auto_home_team(0);
                screen_notice(2500, "%s: %s (%s)",
                              is_es() ? "Estadio" : "Stadium", active_stadium_label(), "Auto");
            } else if (s == 1) {
                g_mode = MODE_ORIGINAL;
                g_fixed_idx = -1;
                apply_original_psp_stadium();
                screen_notice(2500, "%s: Original (PSP)", is_es() ? "Estadio" : "Stadium");
            } else if (s >= 2 && s - 2 < g_nentries) {
                g_mode = MODE_FIXED;
                g_fixed_idx = s - 2;
                apply_entry_idx(g_fixed_idx, 1);
            }
            g_ms_row_synced = 0;
            return;
        }
        if (move != 0) {
            int ns = g_ui.sel + move;
            if (ns < 0) ns = 0;
            if (ns >= g_ui.l.n) ns = g_ui.l.n - 1;
            if (ns != g_ui.sel) {
                g_ui.sel = g_ui.l.sel = ns;
                screen_list_show(&g_ui.l);
            }
        }
        return;
    }

    /* 3. Automatic Home-Team Stadium swap when entering team/match setup or loading */
    if (g_mode == MODE_AUTO && g_have_home_table && in_match_setup(scene)) {
        apply_auto_home_team(0);
    }

    /* 4. Optional power-user shortcut: L + R + TRIANGLE anywhere outside a match */
    if (!external_list_open && scene != PES6_SCENE_MATCH && g_nentries > 0) {
        const unsigned combo = SCE_CTRL_LTRIGGER | SCE_CTRL_RTRIGGER | SCE_CTRL_TRIANGLE;
        const unsigned alt_combo = SCE_CTRL_L1 | SCE_CTRL_R1 | SCE_CTRL_TRIANGLE;
        if (((pad->buttons & combo) == combo || (pad->buttons & alt_combo) == alt_combo) &&
            !(pad->buttons & (SCE_CTRL_START | SCE_CTRL_SELECT))) {
            ui_open(pad);
            return;
        }
    }
}
