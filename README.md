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
- **Match commentary** (optional): the PSP version has none, so the port plays the commentary of the PS2 version from your own copy. See [Match commentary](#match-commentary).

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

Install the new `pes6vita.vpk` over the old one. Your ISO and your saves in `ux0:data/pes6vita/` stay where they are.

## Match commentary

The PSP version has no commentary. The port can play the commentary of **Pro Evolution Soccer 6 for PS2** during the match, taken from your own copy of the PS2 game. It must be PES6: banks from other PES games (2008, 2009, 2010…) do not work.

1. Open your PES6 PS2 ISO on a computer, for example with 7-Zip.
2. Extract the commentary file from the root of the disc:
   - `S_SOUND.AFS` for Spanish (Juan Carlos Rivero and Iñaki Cano), about 420 MB, from the European (PAL) version;
   - `E_SOUND.AFS` for English (Peter Brackley and Trevor Brooking), from the European (PAL) version.
3. Copy it to the Vita as `ux0:data/pes6vita/audio/s_sound.afs` or `ux0:data/pes6vita/audio/e_sound.afs`, in lower case. Create the `audio` folder if it does not exist.
4. Start the game and play a match with commentary turned on in the game's settings.

If both files are there, the game in Spanish uses `s_sound.afs` and any other language `e_sound.afs`. To turn the commentary off completely, add the line `PES6_COMMENTARY=0` to `ux0:data/pes6vita/env.txt`.

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
