# Pro Evolution Soccer 6 for PS Vita

An unofficial port of *Pro Evolution Soccer 6* (PSP, Europe, ULES00476) to the PS Vita.

> **This project does not include any game data.** You need your own legal copy of the game as an ISO file.

> **Only the European version works: ULES00476** (English, French, German, Spanish and Italian). The American release (*Winning Eleven: Pro Evolution Soccer 2007*) and the Japanese one (*World Soccer Winning Eleven 10*) are different programs and will not run. The code is printed on the box and on the UMD.

> ⚠️ **Beta.** This is an early version: expect bugs and crashes. Your reports help a lot (see [Reporting issues](#reporting-issues)).

## Features

- **Native Vita build:** no Adrenaline, no PSP emulation layer.
- **Renders at the Vita's native 960x544 resolution** through vitaGL, instead of the PSP's 480x272.
- **Native audio and controls.**
- **The match at 30 fps** at the Vita's standard 444 MHz.
- **Music:** the menu music and the game's songs.
- **Several saves, as on the PSP:** saving or loading opens a list of your saves, in the language you pick when the game starts, with the Vita's date and time.
- **All 38 PS2 stadiums & crowd attendance** (optional): restore all 38 PS2 PES6 stadiums (Camp Nou, Santiago Bernabéu, La Bombonera, San Siro, Old Trafford, Anfield, and more) with Day/Night lighting, 3D goalposts, pitch adboards, and a native **Stadium** and **Attendance** selector inside Match Settings. See [Stadiums and attendance](#stadiums-and-attendance).
- **Match commentary** (optional): the PSP version has none, so the port plays PES6 PS2 or community PES6 commentary banks. See [Match commentary](#match-commentary).

## What you need

| Item | Why |
| --- | --- |
| A PS Vita with homebrew enabled | To run the game. |
| Your copy of *Pro Evolution Soccer 6* for PSP, Europe (ULES00476), as an ISO | The game data comes from it. |
| `libshacccg.suprx` on the Vita | The graphics library needs it. If you have run other vitaGL homebrew, you already have it. Otherwise extract it with [ShaRKBR33D](https://github.com/Rinnegatamante/ShaRKBR33D). |
| About 1.3 GB free on the Vita | For the ISO. |

## Installation

1. **Install the game** on the Vita: download `pes6vita.vpk` from the [Releases](../../releases) page and install it with VitaShell.
2. **Copy your ISO** to `ux0:data/pes6vita/pes6.iso` on the Vita. Create the `pes6vita` folder inside `data` if it does not exist, and name the file exactly `pes6.iso`.
3. **Start the game** from the LiveArea. The first start takes a little longer: it prepares the game from your ISO.

### Updating from an earlier version

Install the new `pes6vita.vpk` over the old one. Your ISO, saves, stadiums, and commentary in `ux0:data/pes6vita/` stay where they are.

## Stadiums and attendance

The PSP version of PES6 only came with a single stadium, even though Konami left all **38 PS2 stadiums** inside your European PSP ISO (`ULES00476`). You do **not** need a PS2 disc or any downloads to unlock them.

### Easy way: Browser Helper (no installation required)

Open the **[Web Helper](https://germanalvarez15.github.io/pes6-vita/)** *(100% private and local — everything runs inside your browser; your ISO is never uploaded anywhere)*:

1. Stay on the **38 Official Stadiums** tab and drop your PSP `pes6.iso` (`ULES00476`).
2. Select the stadiums you want (or click **All (38)** / **Popular (14)**) and press **Convert & Download for PS Vita**.
3. Unzip the downloaded `stadiums.zip` file. Inside you will find `.bin` files such as `bernabeu.bin`, `bombonera.bin`, `camp_nou.bin`, and `san_siro.bin`.
4. Connect your Vita to your computer with VitaShell (USB or FTP) and copy the `.bin` files into:
   ```text
   ux0:data/pes6vita/stadiums/
   ```
   *(Create the `stadiums` folder in lowercase if it does not exist.)*

*(Command-line alternative: `python3 tools/convert_stadium.py --iso pes6.iso --all --out out/stadiums`.)*

### Choosing stadium and crowd size in-game

1. Before starting any match, open **Match Settings**.
2. **Stadium:** press Left/Right to pick any installed stadium. Leave it on **Random** to automatically match the home team's stadium.
3. **Attendance:** press Left/Right to choose how full the stands are: **No** (empty), **Low**, **Normal**, or **High** (packed).

*(Optional: you can also press **L + R + Triangle** in menus outside a match to open a quick stadium picker, including any custom-named `.bin` files.)*

### Importing stadiums from community PES6 PS2 patches

If you have a community **PES6 PS2** patch (a patched PS2 ISO, a PS2 `0_TEXT.AFS`, or a standalone PS2 stadium `.bin`):

1. Load your PSP `pes6.iso` in the **38 Official Stadiums** tab first (used only as a template for 3D goalposts and pitch adboards).
2. Switch to the **Import Stadium (PS2 Patch)** tab and drop your PS2 patch file.
3. Pick which stadium to extract and which Vita slot to save it as (replacing one of the 36 slots makes it appear directly in Match Settings; choosing a custom name makes it selectable with **L + R + Triangle**).
4. The tool converts the stadium, automatically checks Vita memory limits so it will not crash your console, and downloads the ready-to-copy `.bin` file for `ux0:data/pes6vita/stadiums/`.

> **Note:** Only **PES6 PS2** stadiums are supported. Stadiums made for **PES6 PC (Kitserver / Stadium Server)** use a different format and will not work.

To disable custom stadiums completely, add `PES6_STADIUM=0` to `ux0:data/pes6vita/env.txt`. You can also set the default crowd level with `PES6_CROWD=0..3` (default `3` = High).

## Match commentary

The PSP version has no commentary. The port plays **Pro Evolution Soccer 6** commentary banks in `.afs` format — both the **original PES6 PS2** commentary and **community commentary patches made for PES6** (PS2 or PC `s_sound.afs` / `e_sound.afs` packs). Banks from other PES games (2008, 2009, 2010…) or loose MP3/WAV files do not work.

### Option A — From your PES6 PS2 ISO (no 7-Zip needed)

1. Open the **[Web Helper](https://germanalvarez15.github.io/pes6-vita/)** and go to the **Commentary (Stock & Patches)** tab.
2. Drop your PES6 PS2 ISO. The page detects the commentary files inside the disc (`e_sound.afs` for English, `s_sound.afs` for Spanish) and lets you extract them with one click.
   *(You can also extract `E_SOUND.AFS` or `S_SOUND.AFS` manually from the root of the PS2 ISO using 7-Zip.)*

### Option B — From a community PES6 commentary patch

1. Unzip the patch until you have the `.afs` file (usually named `s_sound.afs` or `e_sound.afs`).
2. Drop it onto the **Commentary (Stock & Patches)** tab of the Web Helper. In under a second it verifies that the audio clips are valid PES6 CRI ADX and tells you the exact filename to use.

### Installing commentary on the Vita

1. Copy the file to your Vita in lowercase:
   - `ux0:data/pes6vita/audio/e_sound.afs` for English
   - `ux0:data/pes6vita/audio/s_sound.afs` for Spanish
   *(Create the `audio` folder if it does not exist.)*
2. Start the game and make sure commentary is enabled in the in-game sound settings.

If both files are present, the game in Spanish uses `s_sound.afs` and any other language uses `e_sound.afs`. To turn commentary off completely, add `PES6_COMMENTARY=0` to `ux0:data/pes6vita/env.txt`.

## Folder layout on your PS Vita

```text
ux0:data/pes6vita/
├── pes6.iso                # Your European PES6 PSP ISO (ULES00476)
├── audio/
│   ├── e_sound.afs         # English commentary (optional)
│   └── s_sound.afs         # Spanish commentary (optional)
└── stadiums/
    ├── bernabeu.bin        # Converted stadiums (optional)
    ├── bombonera.bin
    ├── camp_nou.bin
    └── ...
```

## Controls

The same as on the PSP: d-pad, left stick, the face buttons, L and R, START and SELECT.

To close the game at any moment, hold **L + R + START + SELECT** for two seconds.

## Reporting issues

Found a bug or a crash? Please open an issue in the [Issues](../../issues) tab of this repository. Include:

- Your Vita's firmware version and the release you installed.
- What you were doing when the problem happened, and whether it happens again.
- The log file `ux0:data/pes6vita/pes6.log`.
- After a crash, the newest `psp2core-*.psp2dmp` file in `ux0:data/`.

## Troubleshooting

- **The game stops with a message about `libshacccg.suprx`:** the file is not in `ur0:data/`. See [What you need](#what-you-need).
- **The game stops with a message about `pes6.iso`:** check that it is at `ux0:data/pes6vita/pes6.iso`, with that exact name.
- **The game freezes or closes on the first start:** check that your ISO is the European version, ULES00476. Other versions do not work.
- **Something looks or runs worse than in the previous version:** create the text file `ux0:data/pes6vita/env.txt` with the line `PES6_GE_BEHIND=0`, start the game again and tell us in an issue whether that fixes it.
- **Saving or loading goes wrong:** add the line `PES6_SAVEDATA_LIST=0` to `ux0:data/pes6vita/env.txt`. The save list is then skipped and each mode keeps a single save, as in 0.0.1-beta. Please tell us in an issue.

## Legal notice

This project is not affiliated with or endorsed by Konami. *Pro Evolution Soccer* is a trademark of its owner. This project does not distribute game data: you need your own legal copy to use it.

## Credits

- [VitaSDK](https://vitasdk.org) and [vitaGL](https://github.com/Rinnegatamante/vitaGL): toolchain and renderer.
- [FFmpeg](https://ffmpeg.org) (LGPL 2.1): the game's music is decoded with it. `scripts/07-build-ffmpeg-vita.sh` downloads its source and builds the part the port uses.
- To [haveniiii's PES6ANDROIDPORT](https://github.com/haveniiii/PES6ANDROIDPORT), which served as the starting point for this port.
