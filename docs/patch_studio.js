// PES6 PS Vita — 100% Client-Side Patch Studio (Option File, Squads, Visual Editor, Faces & Crests)
// Runs completely in the browser with zero server uploads.

const PCOF_SIZE = 1191936;
const PCOF_M = 0x7AB3684C;
const PCOF_SHIFT = 336;
const PCOF_BLOCK = [12, 5144, 9544, 14288, 37116, 657956, 751472, 763804, 911144, 1170520];
const PCOF_BLOCK_SIZE = [4844, 1268, 4730, 22816, 620000, 93501, 12320, 147328, 259364, 21032];

const PCOF_KEY_PC = new Uint8Array([
  0x73,0x60,0xE1,0xC6,0x1F,0x3C,0xAD,0x42,0x0B,0x58,0xB9,0xFE,0x37,0xB4,0x05,0xFA,
  0xA3,0x50,0x91,0x36,0x4F,0x2C,0x5D,0xB2,0x3B,0x48,0x69,0x6E,0x67,0xA4,0xB5,0x6A,
  0xD3,0x40,0x41,0xA6,0x7F,0x1C,0x0D,0x22,0x6B,0x38,0x19,0xDE,0x97,0x94,0x65,0xDA,
  0x03,0x30,0xF1,0x16,0xAF,0x0C,0xBD,0x92,0x9B,0x28,0xC9,0x4E,0xC7,0x84,0x15,0x4A,
  0x33,0x20,0xA1,0x86,0xDF,0xFC,0x6D,0x02,0xCB,0x18,0x79,0xBE,0xF7,0x74,0xC5,0xBA,
  0x63,0x10,0x51,0xF6,0x0F,0xEC,0x1D,0x72,0xFB,0x08,0x29,0x2E,0x27,0x64,0x75,0x2A,
  0x93,0x00,0x01,0x66,0x3F,0xDC,0xCD,0xE2,0x2B,0xF8,0xD9,0x9E,0x57,0x54,0x25,0x9A,
  0xC3,0xF0,0xB1,0xD6,0x6F,0xCC,0x7D,0x52,0x5B,0xE8,0x89,0x0E,0x87,0x44,0xD5,0x0A,
  0xF3,0xE0,0x61,0x46,0x9F,0xBC,0x2D,0xC2,0x8B,0xD8,0x39,0x7E,0xB7,0x34,0x85,0x7A,
  0x23,0xD0,0x11,0xB6,0xCF,0xAC,0xDD,0x32,0xBB,0xC8,0xE9,0xEE,0xE7,0x24,0x35,0xEA,
  0x53,0xC0,0xC1,0x26,0xFF,0x9C,0x8D,0xA2,0xEB,0xB8,0x99,0x5E,0x17,0x14,0xE5,0x5A,
  0x83,0xB0,0x71,0x96,0x2F,0x8C,0x3D,0x12,0x1B,0xA8,0x49,0xCE,0x47,0x04,0x95,0xCA,
  0xB3,0xA0,0x21,0x06,0x5F,0x7C,0xED,0x82,0x4B,0x98,0xF9,0x3E,0x77,0xF4,0x45,0x3A,
  0xE3,0x90,0xD1,0x76,0x8F,0x6C,0x9D,0xF2,0x7B,0x88,0xA9,0xAE,0xA7,0xE4,0xF5,0xAA,
  0x13,0x80,0x81,0xE6,0xBF,0x5C,0x4D,0x62,0xAB,0x78,0x59,0x1E,0xD7,0xD4,0xA5,0x1A,
  0x43,0x70,0x31,0x56,0xEF,0x4C,0xFD,0xD2,0xDB,0x68,0x09,0x8E,0x07,0xC4,0x55,0x8A,
]);

const PCOF_KEY = new Uint32Array([
  0x7AB36882,0x7AB3689E,0x7AB368BD,0x7AB3689F,0x7AB368A4,0x7AB368C3,
  0x7AB36899,0x7AB368B9,0x7AB36894,0x7AB368B5,0x7AB368AF,0x7AB3687D,
  0x7AB368B4,0x7AB368BF,0x7AB368B0,0x7AB36894,0x7AB368B5,0x7AB368C5,
  0x7AB368C3,0x7AB36897,0x7AB36890,0x7AB3687D,0x7AB3689E,0x7AB368A5,
  0x7AB3688E,0x7AB368C4,0x7AB368BD,0x7AB3687D,0x7AB368C3,0x7AB3689C,
  0x7AB36881,0x7AB368AD,0x7AB36892,0x7AB36883,0x7AB368A2,0x7AB368C2,
  0x7AB3687D,0x7AB368AD,0x7AB36884,0x7AB368C0,0x7AB36899,0x7AB3688F,
  0x7AB368B4,0x7AB368B6,0x7AB368B7,0x7AB36885,0x7AB368A5,0x7AB3689E,
  0x7AB3689D,0x7AB368C3,0x7AB3689C,0x7AB368A6,0x7AB368C4,0x7AB368BF,
  0x7AB368A3,0x7AB368BD,0x7AB36898,0x7AB3687F,0x7AB368A1,0x7AB36881,
  0x7AB3689A,0x7AB36880,0x7AB368A6,0x7AB368BE,0x7AB368B2,0x7AB368B6,
  0x7AB368B9,0x7AB36882,0x7AB3687E,0x7AB368A6,0x7AB368AF,0x7AB368A3,
  0x7AB36891,0x7AB3688E,0x7AB3687F,0x7AB368C4,0x7AB368BD,0x7AB368B4,
  0x7AB36894,0x7AB368B4,0x7AB368BD,0x7AB368B8,0x7AB3689F,0x7AB368A4,
  0x7AB368A4,0x7AB368A3,0x7AB368A4,0x7AB368B2,0x7AB368B0,0x7AB36896,
  0x7AB36894,0x7AB368BE,0x7AB368AE,0x7AB3687D,0x7AB368C2,0x7AB368A2,
  0x7AB368C4,0x7AB36894,0x7AB368C2,0x7AB368B1,0x7AB368A5,0x7AB368C3,
  0x7AB36898,0x7AB36894,0x7AB3687F,0x7AB368B3,0x7AB3689C,0x7AB368B5,
  0x7AB368A6,0x7AB368C5,0x7AB36884,0x7AB368BD,0x7AB36896,0x7AB36882,
  0x7AB368C6,0x7AB3687E,0x7AB368BD,0x7AB368B2,0x7AB368B3,0x7AB36890,
  0x7AB36880,0x7AB368B7,0x7AB36895,0x7AB3689B,0x7AB36894,0x7AB368A5,
  0x7AB368BE,0x7AB368BF,0x7AB368C2,0x7AB368BE,0x7AB368A1,0x7AB368A4,
  0x7AB3689D,0x7AB36899,0x7AB368A4,0x7AB368B4,0x7AB368B8,0x7AB3688F,
  0x7AB368A3,0x7AB36881,0x7AB36891,0x7AB368BD,0x7AB368B9,0x7AB368B3,
  0x7AB368B9,0x7AB3688E,0x7AB36895,0x7AB36896,0x7AB36891,0x7AB36892,
  0x7AB3687F,0x7AB368B4,0x7AB368BB,0x7AB3689D,0x7AB3688E,0x7AB36882,
  0x7AB368C1,0x7AB368A0,0x7AB36891,0x7AB368A3,0x7AB368AF,0x7AB368BF,
  0x7AB368B0,0x7AB3687C,0x7AB368C4,0x7AB36885,0x7AB368A4,0x7AB3689D,
  0x7AB368C6,0x7AB368B4,0x7AB36898,0x7AB3687C,0x7AB36899,0x7AB368B8,
  0x7AB368C5,0x7AB3689A,0x7AB36895,0x7AB368BE,0x7AB36882,0x7AB3687D,
  0x7AB3687D,0x7AB3687F,0x7AB3687F,0x7AB368BA,0x7AB36890,0x7AB368B3,
  0x7AB368AF,0x7AB3688F,0x7AB36893,0x7AB36894,0x7AB36881,0x7AB368BC,
  0x7AB368B2,0x7AB368C3,0x7AB368B3,0x7AB368B1,0x7AB368BA,0x7AB368B1,
  0x7AB368C4,0x7AB368C4,0x7AB368BE,0x7AB368C6,0x7AB368B3,0x7AB368BF,
  0x7AB368BA,0x7AB368BD,0x7AB368B5,0x7AB368AD,0x7AB3689D,0x7AB36885,
  0x7AB3688D,0x7AB368B2,0x7AB36882,0x7AB368A6,0x7AB368B8,0x7AB368B2,
  0x7AB368C1,0x7AB368B6,0x7AB36891,0x7AB3689D,0x7AB368A2,0x7AB3687C,
  0x7AB36882,0x7AB368A5,0x7AB368C5,0x7AB3687D,0x7AB368C5,0x7AB368C1,
  0x7AB368A2,0x7AB36883,0x7AB368BE,0x7AB368B7,0x7AB368B0,0x7AB36895,
  0x7AB36884,0x7AB368C2,0x7AB3687E,0x7AB3687C,0x7AB3687F,0x7AB368BC,
  0x7AB368A3,0x7AB3689B,0x7AB3689D,0x7AB36895,0x7AB36882,0x7AB368B5,
  0x7AB3688F,0x7AB368A2,0x7AB36884,0x7AB368BC,0x7AB368BA,0x7AB368BD,
  0x7AB368C0,0x7AB3688E,0x7AB36897,0x7AB36883,0x7AB3687F,0x7AB368B1,
  0x7AB3688E,0x7AB368B4,0x7AB36880,0x7AB368A0,0x7AB368A0,0x7AB3689D,
  0x7AB3687F,0x7AB36880,0x7AB368B0,0x7AB368B4,0x7AB368C6,0x7AB368B9,
  0x7AB368B0,0x7AB36898,0x7AB368A5,0x7AB368A4,0x7AB3688D,0x7AB368C2,
  0x7AB3687C,0x7AB36881,0x7AB36885,0x7AB368AD,0x7AB36890,0x7AB36881,
  0x7AB368A3,0x7AB36895,0x7AB36899,0x7AB368B8,0x7AB368A0,0x7AB368B2,
  0x7AB368B7,0x7AB368AD,0x7AB36881,0x7AB3687C,0x7AB368B3,0x7AB368AE,
  0x7AB36896,0x7AB368B7,0x7AB36896,0x7AB3688E,0x7AB3689E,0x7AB368B6,
  0x7AB368B8,0x7AB368BD,0x7AB36894,0x7AB36893,0x7AB368BC,0x7AB368BC,
  0x7AB3689C,0x7AB368A6,0x7AB36885,0x7AB368B8,0x7AB368AD,0x7AB36896,
  0x7AB368B9,0x7AB368BE,0x7AB368AE,0x7AB368C0,0x7AB368A6,0x7AB36881,
  0x7AB368B5,0x7AB368A6,0x7AB368BC,0x7AB36897,0x7AB368AF,0x7AB3689F,
  0x7AB368B1,0x7AB368C4,0x7AB368BF,0x7AB3687E,0x7AB368B7,0x7AB36897,
  0x7AB36893,0x7AB3688F,0x7AB368B0,0x7AB36880,0x7AB3689F,0x7AB368B7,
  0x7AB36894,0x7AB368C2,0x7AB3689F,0x7AB36898,0x7AB368B6,0x7AB368C3,
  0x7AB36885,0x7AB3687F,0x7AB368A4,0x7AB3687E,0x7AB368BE,0x7AB3687C,
  0x7AB368BC,0x7AB368B5,0x7AB3689E,0x7AB36899,0x7AB368A6,0x7AB36881,
  0x7AB368BB,0x7AB36895,0x7AB3689D,0x7AB368A6,0x7AB3689F,0x7AB368BE,
  0x7AB36880,0x7AB368C4,0x7AB368B5,0x7AB368BC,0x7AB368A1,0x7AB368AD,
  0x7AB368C1,0x7AB36891,0x7AB3687D,0x7AB368A0,0x7AB368BD,0x7AB3689B,
  0x7AB368B1,0x7AB36897,0x7AB36881,0x7AB36885,0x7AB3689E,0x7AB36882,
  0x7AB3689B,0x7AB36893,0x7AB368A3,0x7AB3688D,0x7AB368C4,0x7AB368C4,
  0x7AB3689B,0x7AB368AD,0x7AB368C4,0x7AB368B4,0x7AB368AD,0x7AB36884,
  0x7AB368A5,0x7AB3687F,0x7AB368AF,0x7AB368A1,0x7AB3687D,0x7AB3687C,
  0x7AB368B5,0x7AB368B1,0x7AB368BE,0x7AB368C3,0x7AB368B0,0x7AB36895,
  0x7AB36885,0x7AB36882,0x7AB368C0,0x7AB368A5,0x7AB368B8,0x7AB368A2,
  0x7AB36899,0x7AB368B3,0x7AB368A1,0x7AB3687D,0x7AB3689F,0x7AB36897,
  0x7AB368A0,0x7AB3687F,0x7AB368C1,0x7AB3689C,0x7AB368A2,0x7AB368C5,
  0x7AB368A6,0x7AB3687E,0x7AB368B3,0x7AB36894,0x7AB3689A,0x7AB368BC,
  0x7AB36890,0x7AB3689D,0x7AB368C3,0x7AB36892,0x7AB3689A,0x7AB368B8,
  0x7AB368A2,0x7AB368C3,0x7AB368C5,0x7AB368A2,0x7AB368C5,0x7AB36880,
  0x7AB36885,0x7AB368BB,0x7AB3689F,0x7AB368C4,0x7AB368A1,0x7AB368A6,
  0x7AB36890,0x7AB3684C,
]);

// Pristine PSP system save header (blocks 0-2: settings, stadium names, default league names)
const PSP_HEADER_RUNS = [[44,"01"],[296,"0c14"],[300,"1814"],[304,"0818"],[308,"0c19"],[312,"3c25"],[316,"4825"],[320,"3e2e"],[324,"7436"],[328,"8036"],[332,"8c050a"],[336,"a08f"],[340,"ac8f"],[344,"c8080a"],[348,"d4080a"],[352,"630f0a"],[356,"e4210a"],[360,"022f0a"],[364,"02540a"],[368,"14760b"],[372,"20760b"],[376,"40a60b"],[380,"4ca60b"],[384,"4cfe0b"],[388,"cc270d"],[392,"cce50d"],[396,"d8e50d"],[400,"fcda11"],[404,"08db11"],[408,"2d"],[410,"2d"],[412,"2d"],[414,"2d"],[418,"323260458c08"],[425,"0801"],[436,"f81f8c08"],[5212,"01"],[5216,"01"],[5236,"01"],[5251,"08090a0b0c0d0e0f08090a0b10111213"],[5290,"01"],[5305,"08090a0b0c0d0e0f08090a0b10111213"],[5344,"01"],[5359,"08090a0b0c0d0e0f08090a0b10111213"],[5398,"01"],[5413,"08090a0b0c0d0e0f08090a0b10111213"],[5452,"01"],[5467,"08090a0b0c0d0e0f08090a0b10111213"],[5506,"01"],[5521,"08090a0b0c0d0e0f08090a0b10111213"],[5560,"01"],[5575,"08090a0b0c0d0e0f08090a0b10111213"],[5614,"01"],[5629,"08090a0b0c0d0e0f08090a0b10111213"],[5668,"06"],[5671,"0a"],[5692,"06"],[5695,"09"],[5716,"06"],[5719,"08"],[5740,"06"],[5743,"07"],[5764,"06"],[5767,"06"],[5788,"06"],[5791,"05"],[5812,"06"],[5815,"04"],[5836,"06"],[5839,"03"],[5860,"010201"],[5865,"0301010202"],[5873,"24"],[5902,"030f0f0f"],[5916,"01"],[5921,"02"],[5923,"083d0103"],[5936,"01"],[5948,"0101"],[6040,"621601"],[6105,"03"],[6107,"12"],[6109,"1310060222"],[6116,"2d"],[6118,"2d"],[6120,"2d"],[6122,"2d"],[6126,"323260458c08"],[6133,"0801"],[6144,"f81f8c08"],[6164,"0a"],[6172,"02"],[6176,"02"],[6180,"02"],[6184,"03"],[6204,"01"],[6208,"01"],[6212,"01"],[6216,"01"],[9544,"436c756220486f757365"],[9605,"53616e205369726f"],[9666,"436174616c6f6e6961205374616469756d"],[9727,"4869676862757279"],[9788,"4f72616e6765204172656e61"],[9849,"5374616465204c6f756973204949"],[9910,"4f6c642054726166666f7264"],[9971,"4e616b686f6e2052617463686173696d61"],[10032,"4573746164696f204772616e20436861636f"],[10093,"437569746f204375616e6176616c65"],[10154,"416d657269676f2041746c616e746973"],[10215,"44656c6c6520416c7069"],[10276,"53746164696f204f6c696d7069636f"],[10337,"53746164696f20456e6e696f2054617264696e69"],[10398,"526564204361756c64726f6e"],[10459,"4c757465636961205061726b"],[10520,"4d617373696c6961205374616469756d"],[10581,"53616e746961676f204265726e61626575"],[10642,"426f7275737369612053746164696f6e"],[10703,"53746f636b686f6c6d204172656e61"],[10764,"4d6167706965205061726b"],[10825,"526f7474657264616d2053746164696f6e"],[10886,"426c6175747261756d2053746164696f6e"],[10947,"4469616d6f6e64205374616469756d"],[11008,"4861757074737461647473746164696f6e"],[11069,"5269617a6f72"],[11130,"4573746164696f2050616c6f"],[11191,"4e616e67736f68205374616469756d"],[11252,"4b616e6a6920446f6d65"],[11313,"44696574726f204d6f6e7465205374616469756d"],[11374,"506f72746f20466f6c696f"],[11435,"517565656e73206c616e64205061726b"],[11496,"48617a652048696c6c73"],[11557,"4b7573756e6f6b692d4d6968616d61205374616469756d"],[11618,"4f636368696f2044656c204d6172"],[11679,"41796173652d4e616b616e6f205374616469756d"],[11838,"496e7465726e6174696f6e616c204c6561677565"],[11859,"496e7465726e6174696f6e616c204c6561677565"],[11922,"4c6561677565202d456e676c616e642d"],[11943,"4c6561677565202d456e676c616e642d"],[12006,"4c6561677565202d4672616e63652d"],[12027,"4c6561677565202d4672616e63652d"],[12090,"4c6561677565202d4765726d616e792d"],[12111,"4c6561677565202d4765726d616e792d"],[12174,"53657269652041"],[12195,"53657269652041"],[12258,"45726564697669736965"],[12279,"45726564697669736965"],[12342,"4c6967612045737061c3b16f6c61"],[12363,"4c6967612045737061c3b16f6c61"],[12426,"4c65616775652041"],[12447,"4c65616775652041"],[12510,"4c65616775652042"],[12531,"4c65616775652042"],[12594,"4c65616775652043"],[12615,"4c65616775652043"],[12678,"4c65616775652044"],[12699,"4c65616775652044"]];

function rd32(d, off) {
  return (d[off] | (d[off + 1] << 8) | (d[off + 2] << 16) | (d[off + 3] << 24)) >>> 0;
}
function wr32(d, off, v) {
  d[off] = v & 0xFF;
  d[off + 1] = (v >>> 8) & 0xFF;
  d[off + 2] = (v >>> 16) & 0xFF;
  d[off + 3] = (v >>> 24) & 0xFF;
}

export function buildDefaultParamBin(patchName = "PES6 Vita Patch") {
  const b = new Uint8Array(0x504);
  const te = new TextEncoder();
  const writeStr = (off, max, s) => {
    const bytes = te.encode(s).slice(0, max - 1);
    b.set(bytes, off);
  };
  writeStr(0x00, 0x80, "PRO EVOLUTION SOCCER 6");
  writeStr(0x80, 0x80, "Option File");
  writeStr(
    0x100,
    0x400,
    `${patchName} : 0 PES\nAuto Save : On\nPlayer Data : Edited\nEdit team : Edited\nTime / Date Saved :\n  2026/11/23  12:00:00`
  );
  b[0x500] = 2;
  return b;
}

function makePristinePspBase() {
  const out = new Uint8Array(PCOF_SIZE);
  for (const [off, hex] of PSP_HEADER_RUNS) {
    for (let i = 0; i < hex.length; i += 2) {
      out[off + (i >> 1)] = parseInt(hex.slice(i, i + 2), 16);
    }
  }
  return out;
}

export function probeOptionFile(d) {
  if (d.byteLength !== PCOF_SIZE) return { ok: false, reason: "WRONG_SIZE" };
  // Check if encrypted PC option file via block checksums
  let checksumsMatch = true;
  for (let b = 0; b < PCOF_BLOCK.length; b++) {
    let s = 0;
    const count = Math.floor(PCOF_BLOCK_SIZE[b] / 4);
    for (let k = 0; k < count; k++) {
      const at = PCOF_BLOCK[b] + 4 * k;
      const w0 = d[at] ^ PCOF_KEY_PC[at & 0xFF];
      const w1 = d[at + 1] ^ PCOF_KEY_PC[(at + 1) & 0xFF];
      const w2 = d[at + 2] ^ PCOF_KEY_PC[(at + 2) & 0xFF];
      const w3 = d[at + 3] ^ PCOF_KEY_PC[(at + 3) & 0xFF];
      s = (s + ((w0 | (w1 << 8) | (w2 << 16) | (w3 << 24)) >>> 0)) >>> 0;
    }
    const cat = PCOF_BLOCK[b] - 8;
    const c0 = d[cat] ^ PCOF_KEY_PC[cat & 0xFF];
    const c1 = d[cat + 1] ^ PCOF_KEY_PC[(cat + 1) & 0xFF];
    const c2 = d[cat + 2] ^ PCOF_KEY_PC[(cat + 2) & 0xFF];
    const c3 = d[cat + 3] ^ PCOF_KEY_PC[(cat + 3) & 0xFF];
    const expected = (c0 | (c1 << 8) | (c2 << 16) | (c3 << 24)) >>> 0;
    if (s !== expected) {
      checksumsMatch = false;
      break;
    }
  }
  if (checksumsMatch) return { ok: true, kind: "pc_encrypted" };

  // Unencrypted file (either PSP DATA.BIN or decrypted PC option file):
  // Distinguish by checking club 0 ("Arsenal" by default, or an ASCII club name):
  // On PSP, CLUB_ADR = 751472 - 336 = 751136. On decrypted PC, CLUB_ADR = 751472.
  const isPrintableText = (at) => {
    let len = 0;
    for (let i = 0; i < 48; i++) {
      const c = d[at + i];
      if (c === 0) break;
      if (c < 0x20) return false;
      len++;
    }
    return len >= 2 && d[at + 49] >= 0x20 && d[at + 50] >= 0x20 && d[at + 51] >= 0x20;
  };
  const pspLooksClub = isPrintableText(751472 - PCOF_SHIFT);
  const pcLooksClub = isPrintableText(751472);
  if (pspLooksClub && !pcLooksClub) return { ok: true, kind: "psp_plain" };
  if (pcLooksClub && !pspLooksClub) return { ok: true, kind: "pc_plain" };
  return { ok: true, kind: pspLooksClub ? "psp_plain" : "pc_plain" };
}

export function decryptPcOptionFile(src) {
  const d = new Uint8Array(src);
  for (let i = 0; i < PCOF_SIZE; i++) d[i] ^= PCOF_KEY_PC[i & 0xFF];
  for (let b = 1; b < PCOF_BLOCK.length; b++) {
    const count = Math.floor(PCOF_BLOCK_SIZE[b] / 4);
    for (let k = 0; k < count; k++) {
      const at = PCOF_BLOCK[b] + 4 * k;
      const enc = rd32(d, at);
      const key = PCOF_KEY[k % PCOF_KEY.length];
      const plain = (((enc - key) + PCOF_M) ^ PCOF_M) >>> 0;
      wr32(d, at, plain);
    }
  }
  return d;
}

export function convertPcToPspDataBin(pcPlain) {
  const psp = makePristinePspBase();
  for (let b = 3; b <= 8; b++) {
    const start = PCOF_BLOCK[b];
    const size = PCOF_BLOCK_SIZE[b];
    psp.set(pcPlain.subarray(start, start + size), start - PCOF_SHIFT);
  }
  const LEAGUE_ADR = 0x2E92 - 5 * 84;
  const LEAGUE_SIZE = 84;
  for (let i = 4; i < 14; i++) {
    const j = i < 7 ? i : i + 1;
    const dst = LEAGUE_ADR + i * LEAGUE_SIZE + 21;
    const src = LEAGUE_ADR + j * LEAGUE_SIZE + 21;
    psp.set(pcPlain.subarray(src, src + (LEAGUE_SIZE - 21)), dst);
  }
  return psp;
}

// --- PSP DATA.BIN Editor (Clubs, National Teams, Leagues, Squads, Formations, Kits, Players, Custom Emblems) ---
const PLAYER_ADR = 37116 - PCOF_SHIFT;
const PLAYER_SIZE = 124;
export const PLAYER_TOTAL = 5000;
const CLUB_ADR = 751472 - PCOF_SHIFT;
const CLUB_SIZE = 88;
export const CLUB_TOTAL = 140;
const SLOT23 = 664372 - PCOF_SHIFT;
const NUM23 = 657956 - PCOF_SHIFT;
const NAT_SQUAD_SIZE = 23;
export const NAT_TOTAL = 64;
const SLOT32 = 667730 - PCOF_SHIFT;
const NUM32 = 659635 - PCOF_SHIFT;
const SQUAD_SIZE = 32;
const FORM_ADR = 677202 - PCOF_SHIFT;
const FORM_SIZE = 364;
const KIT_ADR = 786332 - PCOF_SHIFT;
const KIT_SIZE = 544;
const NAT_KIT_SIZE = 352;
const NAT_KIT_ADR = KIT_ADR - NAT_TOTAL * NAT_KIT_SIZE;
const LEAGUE_ADR = 0x2E92 - 5 * 84;
const LEAGUE_SIZE = 84;
const EMBLEM_ADR = 911308 - PCOF_SHIFT;
const EMBLEM_SIZE = 5184;
const EMBLEM_FIRST = 292;

export const POS_NAMES = ["GK", "CWP", "CB", "CB", "SB", "DMF", "WB", "CMF", "SMF", "AMF", "WF", "SS", "CF"];

export const NATIONS = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Czech Republic", "Denmark", "England",
  "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia",
  "Netherlands", "Northern Ireland", "Norway", "Poland", "Portugal", "Romania", "Russia",
  "Scotland", "Serbia & Montenegro", "Slovakia", "Slovenia", "Spain", "Sweden",
  "Switzerland", "Turkey", "Ukraine", "Wales", "Angola", "Cameroon", "Cote d'Ivoire",
  "Ghana", "Nigeria", "South Africa", "Togo", "Tunisia", "Costa Rica", "Mexico",
  "Trinidad & Tobago", "United States", "Argentina", "Brazil", "Chile", "Colombia",
  "Ecuador", "Paraguay", "Peru", "Uruguay", "Iran", "Japan", "Saudi Arabia",
  "South Korea", "Australia", "Bosnia & Herzegovina", "Estonia", "Israel", "Honduras",
  "Jamaica", "Panama", "Bolivia", "Venezuela", "China", "Uzbekistan", "Albania",
  "Cyprus", "Iceland", "Macedonia", "Armenia", "Belarus", "Georgia", "Liechtenstein",
  "Lithuania", "Algeria", "Benin", "Burkina Faso", "Cape Verde", "Congo", "DR Congo",
  "Egypt", "Equatorial Guinea", "Gabon", "Gambia", "Guinea", "Guinea-Bissau", "Kenya",
  "Liberia", "Libya", "Mali", "Morocco", "Mozambique", "Senegal", "Sierra Leone",
  "Zambia", "Zimbabwe", "Canada", "Grenada", "Guadeloupe", "Martinique",
  "Netherlands Antilles", "Oman", "New Zealand", "Free Nationality"
];

export const NATIONAL_TEAMS = [
  { id: 0, name: "Austria", abv: "AUT", continent: "nat_europe", color1: "#d62626", color2: "#ffffff" },
  { id: 1, name: "Belgium", abv: "BEL", continent: "nat_europe", color1: "#d62626", color2: "#f5c518" },
  { id: 2, name: "Bulgaria", abv: "BUL", continent: "nat_europe", color1: "#ffffff", color2: "#169b62" },
  { id: 3, name: "Croatia", abv: "CRO", continent: "nat_europe", color1: "#e11d48", color2: "#ffffff" },
  { id: 4, name: "Czech Republic", abv: "CZE", continent: "nat_europe", color1: "#dc2626", color2: "#1d4ed8" },
  { id: 5, name: "Denmark", abv: "DEN", continent: "nat_europe", color1: "#c8102e", color2: "#ffffff" },
  { id: 6, name: "England", abv: "ENG", continent: "nat_europe", color1: "#ffffff", color2: "#1e3a8a" },
  { id: 7, name: "Finland", abv: "FIN", continent: "nat_europe", color1: "#ffffff", color2: "#003580" },
  { id: 8, name: "France", abv: "FRA", continent: "nat_europe", color1: "#1e3a8a", color2: "#ef4444" },
  { id: 9, name: "Germany", abv: "GER", continent: "nat_europe", color1: "#ffffff", color2: "#111827" },
  { id: 10, name: "Greece", abv: "GRE", continent: "nat_europe", color1: "#0d5eaf", color2: "#ffffff" },
  { id: 11, name: "Hungary", abv: "HUN", continent: "nat_europe", color1: "#ce2939", color2: "#477050" },
  { id: 12, name: "Ireland", abv: "IRL", continent: "nat_europe", color1: "#169b62", color2: "#ffffff" },
  { id: 13, name: "Italy", abv: "ITA", continent: "nat_europe", color1: "#0066cc", color2: "#ffffff" },
  { id: 14, name: "Latvia", abv: "LVA", continent: "nat_europe", color1: "#9e3039", color2: "#ffffff" },
  { id: 15, name: "Netherlands", abv: "NED", continent: "nat_europe", color1: "#f97316", color2: "#111827" },
  { id: 16, name: "Northern Ireland", abv: "NIR", continent: "nat_europe", color1: "#15803d", color2: "#ffffff" },
  { id: 17, name: "Norway", abv: "NOR", continent: "nat_europe", color1: "#ba0c2f", color2: "#00205b" },
  { id: 18, name: "Poland", abv: "POL", continent: "nat_europe", color1: "#ffffff", color2: "#dc143c" },
  { id: 19, name: "Portugal", abv: "POR", continent: "nat_europe", color1: "#991b1b", color2: "#046a38" },
  { id: 20, name: "Romania", abv: "ROU", continent: "nat_europe", color1: "#fcd116", color2: "#002b7f" },
  { id: 21, name: "Russia", abv: "RUS", continent: "nat_europe", color1: "#d52b1e", color2: "#0039a6" },
  { id: 22, name: "Scotland", abv: "SCO", continent: "nat_europe", color1: "#002b5c", color2: "#ffffff" },
  { id: 23, name: "Serbia & Montenegro", abv: "SCG", continent: "nat_europe", color1: "#1e40af", color2: "#ffffff" },
  { id: 24, name: "Slovakia", abv: "SVK", continent: "nat_europe", color1: "#ffffff", color2: "#0b4ea2" },
  { id: 25, name: "Slovenia", abv: "SVN", continent: "nat_europe", color1: "#ffffff", color2: "#15803d" },
  { id: 26, name: "Spain", abv: "ESP", continent: "nat_europe", color1: "#c60b1e", color2: "#ffc400" },
  { id: 27, name: "Sweden", abv: "SWE", continent: "nat_europe", color1: "#fecc02", color2: "#006aa7" },
  { id: 28, name: "Switzerland", abv: "SUI", continent: "nat_europe", color1: "#da291c", color2: "#ffffff" },
  { id: 29, name: "Turkey", abv: "TUR", continent: "nat_europe", color1: "#e30a17", color2: "#ffffff" },
  { id: 30, name: "Ukraine", abv: "UKR", continent: "nat_europe", color1: "#ffd700", color2: "#0057b7" },
  { id: 31, name: "Wales", abv: "WAL", continent: "nat_europe", color1: "#d30731", color2: "#ffffff" },
  { id: 32, name: "Angola", abv: "ANG", continent: "nat_africa", color1: "#cc092f", color2: "#111827" },
  { id: 33, name: "Cameroon", abv: "CMR", continent: "nat_africa", color1: "#007a5e", color2: "#ce1126" },
  { id: 34, name: "Cote d'Ivoire", abv: "CIV", continent: "nat_africa", color1: "#f77f00", color2: "#009e60" },
  { id: 35, name: "Ghana", abv: "GHA", continent: "nat_africa", color1: "#ffffff", color2: "#fcd116" },
  { id: 36, name: "Nigeria", abv: "NGA", continent: "nat_africa", color1: "#008751", color2: "#ffffff" },
  { id: 37, name: "South Africa", abv: "RSA", continent: "nat_africa", color1: "#ffb81c", color2: "#007749" },
  { id: 38, name: "Togo", abv: "TOG", continent: "nat_africa", color1: "#ffce00", color2: "#006a4e" },
  { id: 39, name: "Tunisia", abv: "TUN", continent: "nat_africa", color1: "#e70013", color2: "#ffffff" },
  { id: 40, name: "Costa Rica", abv: "CRC", continent: "nat_americas", color1: "#ce1126", color2: "#002b7f" },
  { id: 41, name: "Mexico", abv: "MEX", continent: "nat_americas", color1: "#006847", color2: "#ce1126" },
  { id: 42, name: "Trinidad & Tobago", abv: "TRI", continent: "nat_americas", color1: "#da1a35", color2: "#111827" },
  { id: 43, name: "United States", abv: "USA", continent: "nat_americas", color1: "#ffffff", color2: "#002868" },
  { id: 44, name: "Argentina", abv: "ARG", continent: "nat_americas", color1: "#74acdf", color2: "#ffffff" },
  { id: 45, name: "Brazil", abv: "BRA", continent: "nat_americas", color1: "#ffdf00", color2: "#002776" },
  { id: 46, name: "Chile", abv: "CHI", continent: "nat_americas", color1: "#d52b1e", color2: "#0039a6" },
  { id: 47, name: "Colombia", abv: "COL", continent: "nat_americas", color1: "#fcd116", color2: "#003893" },
  { id: 48, name: "Ecuador", abv: "ECU", continent: "nat_americas", color1: "#ffd100", color2: "#0033a0" },
  { id: 49, name: "Paraguay", abv: "PAR", continent: "nat_americas", color1: "#d52b1e", color2: "#ffffff" },
  { id: 50, name: "Peru", abv: "PER", continent: "nat_americas", color1: "#ffffff", color2: "#d91023" },
  { id: 51, name: "Uruguay", abv: "URU", continent: "nat_americas", color1: "#5bc2e7", color2: "#111827" },
  { id: 52, name: "Iran", abv: "IRN", continent: "nat_asia", color1: "#ffffff", color2: "#239f40" },
  { id: 53, name: "Japan", abv: "JPN", continent: "nat_asia", color1: "#00205b", color2: "#ffffff" },
  { id: 54, name: "Saudi Arabia", abv: "KSA", continent: "nat_asia", color1: "#006c35", color2: "#ffffff" },
  { id: 55, name: "South Korea", abv: "KOR", continent: "nat_asia", color1: "#ec0f32", color2: "#003478" },
  { id: 56, name: "Australia", abv: "AUS", continent: "nat_asia", color1: "#ffcd00", color2: "#00843d" },
  { id: 57, name: "Classic England", abv: "CEN", continent: "nat_asia", color1: "#ffffff", color2: "#c8102e" },
  { id: 58, name: "Classic France", abv: "CFR", continent: "nat_asia", color1: "#002654", color2: "#ffffff" },
  { id: 59, name: "Classic Germany", abv: "CGE", continent: "nat_asia", color1: "#ffffff", color2: "#000000" },
  { id: 60, name: "Classic Italy", abv: "CIT", continent: "nat_asia", color1: "#0066cc", color2: "#ffffff" },
  { id: 61, name: "Classic Netherlands", abv: "CNE", continent: "nat_asia", color1: "#f97316", color2: "#000000" },
  { id: 62, name: "Classic Argentina", abv: "CAR", continent: "nat_asia", color1: "#74acdf", color2: "#000000" },
  { id: 63, name: "Classic Brazil", abv: "CBR", continent: "nat_asia", color1: "#ffdf00", color2: "#009c3b" },
];

export const SELECT_TEAM_CATEGORIES = [
  { key: "nat_europe", group: "national", title: "Europe", icon: "🌍", leagueRecord: null },
  { key: "nat_africa", group: "national", title: "Africa", icon: "🌍", leagueRecord: null },
  { key: "nat_americas", group: "national", title: "The Americas", icon: "🌎", leagueRecord: null },
  { key: "nat_asia", group: "national", title: "Asia / Oceania & Classics", icon: "🌏", leagueRecord: null },
  { key: "club_eng", group: "club", title: "English League", icon: "🦁", leagueRecord: 5, slots: [0, 19] },
  { key: "club_fra", group: "club", title: "Ligue 1", icon: "⚜️", leagueRecord: 6, slots: [20, 39] },
  { key: "club_ita", group: "club", title: "Serie A", icon: "🇮🇹", leagueRecord: 7, slots: [40, 59] },
  { key: "club_ned", group: "club", title: "Eredivisie", icon: "🌷", leagueRecord: 8, slots: [60, 77] },
  { key: "club_esp", group: "club", title: "Liga Española", icon: "🇪🇸", leagueRecord: 9, slots: [78, 97] },
  { key: "club_oth_a", group: "club", title: "Other Leagues A", icon: "⭐", leagueRecord: 10, slots: [98, 119] },
  { key: "club_oth_b", group: "club", title: "Other Leagues B & C", icon: "🛡️", leagueRecord: 11, slots: [120, 139] },
];

export function roleCodeToLabel(code) {
  if (code === 0) return "GK";
  if (code <= 3) return "CB";
  if (code <= 7) return "CB";
  if (code === 8) return "LB";
  if (code === 9) return "RB";
  if (code <= 14) return "DMF";
  if (code === 15) return "LWB";
  if (code === 16) return "RWB";
  if (code <= 21) return "CMF";
  if (code === 22) return "LMF";
  if (code === 23) return "RMF";
  if (code <= 28) return "AMF";
  if (code === 29) return "LWF";
  if (code === 30) return "RWF";
  if (code <= 35) return "SS";
  return "CF";
}

function rgb555ToHex(w) {
  const r = ((w & 0x1F) << 3) | ((w & 0x1F) >> 2);
  const g = (((w >> 5) & 0x1F) << 3) | (((w >> 5) & 0x1F) >> 2);
  const b = (((w >> 10) & 0x1F) << 3) | (((w >> 10) & 0x1F) >> 2);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb555(hex) {
  const h = (hex || "#ffffff").replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return 0x8000 | ((b >> 3) << 10) | ((g >> 3) << 5) | (r >> 3);
}

const STATS = {
  name_edited: { off: 3, shift: 0, mask: 1 },
  shirt_edited: { off: 3, shift: 1, mask: 1 },
  ability_edited: { off: 40, shift: 4, mask: 1 },
  reg_pos: { off: 6, shift: 4, mask: 0xF },
  height: { off: 41, shift: 0, mask: 0x3F }, // cm - 148
  weight: { off: 42, shift: 0, mask: 0x7F }, // kg
  age: { off: 65, shift: 9, mask: 0x1F },    // years - 15
  nationality: { off: 65, shift: 0, mask: 0x7F },
  foot: { off: 5, shift: 0, mask: 1 },
  attack: { off: 7, shift: 0, mask: 0x7F },
  defence: { off: 8, shift: 0, mask: 0x7F },
  balance: { off: 9, shift: 0, mask: 0x7F },
  stamina: { off: 10, shift: 0, mask: 0x7F },
  top_speed: { off: 11, shift: 0, mask: 0x7F },
  acceleration: { off: 12, shift: 0, mask: 0x7F },
  response: { off: 13, shift: 0, mask: 0x7F },
  agility: { off: 14, shift: 0, mask: 0x7F },
  dribble_acc: { off: 15, shift: 0, mask: 0x7F },
  dribble_spd: { off: 16, shift: 0, mask: 0x7F },
  short_pass_acc: { off: 17, shift: 0, mask: 0x7F },
  short_pass_spd: { off: 18, shift: 0, mask: 0x7F },
  long_pass_acc: { off: 19, shift: 0, mask: 0x7F },
  long_pass_spd: { off: 20, shift: 0, mask: 0x7F },
  shot_acc: { off: 21, shift: 0, mask: 0x7F },
  shot_power: { off: 22, shift: 0, mask: 0x7F },
  shot_tech: { off: 23, shift: 0, mask: 0x7F },
  free_kick: { off: 24, shift: 0, mask: 0x7F },
  curling: { off: 25, shift: 0, mask: 0x7F },
  header: { off: 26, shift: 0, mask: 0x7F },
  jump: { off: 27, shift: 0, mask: 0x7F },
  teamwork: { off: 28, shift: 0, mask: 0x7F },
  technique: { off: 29, shift: 0, mask: 0x7F },
  aggression: { off: 30, shift: 0, mask: 0x7F },
  mentality: { off: 31, shift: 0, mask: 0x7F },
  gk_ability: { off: 32, shift: 0, mask: 0x7F },
};

const LOOK_FIELDS = {
  skin: { off: 87, shift: 14, width: 2 },
  hair_lo: { off: 91, shift: 8, width: 8 },
  hair_hi: { off: 92, shift: 8, width: 3 },
  hair_colour: { off: 93, shift: 8, width: 6 },
  beard: { off: 94, shift: 8, width: 8 },
};

export async function loadDefaultOptionFile() {
  const resp = await fetch("./default_data.bin.zz");
  if (!resp.ok) throw new Error("Could not load default PES6 database.");
  const compressed = new Uint8Array(await resp.arrayBuffer());
  const raw = await zlibInflate(compressed);
  const of = new PspOptionFile(raw);
  of.sourceKind = "default_built_in";
  return of;
}

export class PspOptionFile {
  constructor(bytes) {
    this.d = new Uint8Array(bytes);
    this.tdUtf8 = new TextDecoder("utf-8");
    this.tdUtf16 = new TextDecoder("utf-16le");
    this.teUtf8 = new TextEncoder();
  }

  static async fromFile(file) {
    const raw = new Uint8Array(await file.arrayBuffer());
    const info = probeOptionFile(raw);
    if (!info.ok) throw new Error(info.reason);
    let pspBytes;
    if (info.kind === "pc_encrypted") {
      const plain = decryptPcOptionFile(raw);
      pspBytes = convertPcToPspDataBin(plain);
    } else if (info.kind === "pc_plain") {
      pspBytes = convertPcToPspDataBin(raw);
    } else {
      pspBytes = raw;
    }
    const of = new PspOptionFile(pspBytes);
    of.sourceKind = info.kind;
    return of;
  }

  // --- Leagues (records 4..13) ---
  getLeagues() {
    const list = [];
    for (let ln = 4; ln < 14; ln++) {
      const a = LEAGUE_ADR + ln * LEAGUE_SIZE;
      const slice = this.d.subarray(a + 21, a + 83);
      const zero = slice.indexOf(0);
      const name = this.tdUtf8.decode(zero >= 0 ? slice.subarray(0, zero) : slice);
      list.push({ id: ln, name });
    }
    return list;
  }

  setLeagueName(ln, name) {
    const a = LEAGUE_ADR + ln * LEAGUE_SIZE;
    const b = this.teUtf8.encode(name);
    this.d.fill(0, a, a + 83);
    this.d.set(b.subarray(0, 20), a);
    this.d.set(b.subarray(0, 61), a + 21);
    this.d[a + 83] = 1;
  }

  // --- Clubs (0..139) & National Teams (0..63) ---
  getClub(c) {
    const a = CLUB_ADR + c * CLUB_SIZE;
    const nameSlice = this.d.subarray(a, a + 49);
    const z = nameSlice.indexOf(0);
    const name = this.tdUtf8.decode(z >= 0 ? nameSlice.subarray(0, z) : nameSlice);
    const abvSlice = this.d.subarray(a + 49, a + 52);
    const az = abvSlice.indexOf(0);
    const abv = this.tdUtf8.decode(az >= 0 ? abvSlice.subarray(0, az) : abvSlice).trim();
    const emblemId = this.d[a + 60] | (this.d[a + 61] << 8);
    const r1 = this.d[a + 72], g1 = this.d[a + 73], b1 = this.d[a + 74];
    const r2 = this.d[a + 76], g2 = this.d[a + 77], b2 = this.d[a + 78];
    const color1 = `#${[r1, g1, b1].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    const color2 = `#${[r2, g2, b2].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
    const stadiumId = this.d[a + 81];
    return { isNational: false, id: c, name, abv, emblemId, color1, color2, stadiumId };
  }

  getNationalTeam(n) {
    const meta = NATIONAL_TEAMS[n] || { id: n, name: `National #${n}`, abv: "NAT", color1: "#1e3a8a", color2: "#ffffff" };
    return {
      isNational: true,
      id: n,
      name: meta.name,
      abv: meta.abv,
      continent: meta.continent,
      emblemId: n,
      color1: meta.color1,
      color2: meta.color2,
      stadiumId: 0,
    };
  }

  getAllClubs() {
    const out = [];
    for (let c = 0; c < CLUB_TOTAL; c++) out.push(this.getClub(c));
    return out;
  }

  setClub(c, name, abv, { color1, color2, stadiumId } = {}) {
    const a = CLUB_ADR + c * CLUB_SIZE;
    if (typeof name === "string") {
      const nb = this.teUtf8.encode(name).subarray(0, 48);
      this.d.fill(0, a, a + 49);
      this.d.set(nb, a);
      this.d[a + 56] = 1;
    }
    if (typeof abv === "string") {
      const ab = this.teUtf8.encode((abv || "").toUpperCase()).subarray(0, 3);
      this.d.fill(0x20, a + 49, a + 52);
      this.d.set(ab, a + 49);
      // Also update formation header abbreviation
      const fa = FORM_ADR + (64 + c) * FORM_SIZE;
      this.d.fill(0, fa + 2, fa + 5);
      this.d.set(ab, fa + 2);
    }
    if (typeof color1 === "string" && color1.startsWith("#") && color1.length === 7) {
      this.d[a + 72] = parseInt(color1.slice(1, 3), 16) || 0;
      this.d[a + 73] = parseInt(color1.slice(3, 5), 16) || 0;
      this.d[a + 74] = parseInt(color1.slice(5, 7), 16) || 0;
      this.d[a + 75] = 255;
    }
    if (typeof color2 === "string" && color2.startsWith("#") && color2.length === 7) {
      this.d[a + 76] = parseInt(color2.slice(1, 3), 16) || 0;
      this.d[a + 77] = parseInt(color2.slice(3, 5), 16) || 0;
      this.d[a + 78] = parseInt(color2.slice(5, 7), 16) || 0;
      this.d[a + 79] = 255;
    }
    if (typeof stadiumId === "number" && stadiumId >= 0 && stadiumId < 38) {
      this.d[a + 81] = stadiumId;
      this.d[a + 83] = 1;
    }
  }

  // --- Custom Emblems Reader (returns 64x64 Uint8ClampedArray RGBA if slot has custom emblem >= 292) ---
  getCustomEmblemRgba(emblemId) {
    const loc = emblemId - EMBLEM_FIRST;
    if (loc < 0 || loc >= 50) return null;
    const n = this.d[EMBLEM_ADR - 158 + loc];
    if (n === 0x99 || n >= 50) return null;
    const a = EMBLEM_ADR + n * EMBLEM_SIZE;
    if (this.d[a] !== 1) return null;
    const pal = [];
    for (let k = 0; k < 128; k++) {
      pal.push([
        this.d[a + 64 + 4 * k],
        this.d[a + 64 + 4 * k + 1],
        this.d[a + 64 + 4 * k + 2],
        this.d[a + 64 + 4 * k + 3],
      ]);
    }
    const rgba = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < 4096; i++) {
      const idx = this.d[a + 1088 + i] & 0x7F;
      if (idx > 0) {
        rgba[i * 4] = pal[idx][0];
        rgba[i * 4 + 1] = pal[idx][1];
        rgba[i * 4 + 2] = pal[idx][2];
        rgba[i * 4 + 3] = pal[idx][3];
      }
    }
    return rgba;
  }

  // --- Kit Colors (Home, Away, GK Home, GK Away) ---
  // kitBlock: 1 = Home (1st), 3 = Away (2nd), 0 = GK 1st, 2 = GK 2nd
  kitRecordBase(isNational, id) {
    return isNational ? NAT_KIT_ADR + id * NAT_KIT_SIZE : KIT_ADR + id * KIT_SIZE;
  }

  getTeamKits(isNational, id) {
    const base = this.kitRecordBase(isNational, id);
    const readBlock = (unit) => {
      const a = base + 62 * unit;
      const w = (idx) => this.d[a + 2 * idx] | (this.d[a + 2 * idx + 1] << 8);
      return {
        shirt: rgb555ToHex(w(0)),
        stripe: rgb555ToHex(w(4)),
        shorts: rgb555ToHex(w(5)),
        socks: rgb555ToHex(w(9)),
      };
    };
    return {
      home: readBlock(1),
      away: readBlock(3),
      gk: readBlock(0),
    };
  }

  setTeamKitColors(isNational, id, unit, { shirt, stripe, shorts, socks }) {
    const base = this.kitRecordBase(isNational, id);
    const a = base + 62 * unit;
    const writeCol = (idx, hex) => {
      if (!hex) return;
      const v = hexToRgb555(hex);
      this.d[a + 2 * idx] = v & 0xFF;
      this.d[a + 2 * idx + 1] = (v >>> 8) & 0xFF;
    };
    writeCol(0, shirt);  // KIT_SHIRT
    writeCol(3, shirt);  // KIT_EDGE
    writeCol(4, stripe || shirt); // KIT_STRIPE
    writeCol(5, shorts); // KIT_SHORTS
    writeCol(9, socks);  // KIT_SOCKS
  }

  // --- Formations & Starting 11 Tactics ---
  getTeamFormation(isNational, id) {
    const fIdx = isNational ? id : 64 + id;
    const fa = FORM_ADR + fIdx * FORM_SIZE;
    const starters = [];
    // Slot 0 is GK (fixed at center-bottom of pitch)
    const gkRole = this.d[fa + 138];
    starters.push({ slot: 0, x: 8, y: 50, roleCode: gkRole, role: roleCodeToLabel(gkRole) });
    // Slots 1..10 have (x, y) coordinates at fa + 118 + (i-1)*2 and role at fa + 138 + i
    for (let i = 1; i < 11; i++) {
      const x = this.d[fa + 118 + (i - 1) * 2];
      const y = this.d[fa + 118 + (i - 1) * 2 + 1];
      const roleCode = this.d[fa + 138 + i];
      starters.push({ slot: i, x, y, roleCode, role: roleCodeToLabel(roleCode) });
    }
    const captainSlot = this.d[fa + 157];
    const fkLongSlot = this.d[fa + 152];
    const fkShortSlot = this.d[fa + 153];
    const cornerLSlot = this.d[fa + 154];
    const cornerRSlot = this.d[fa + 155];
    const penaltySlot = this.d[fa + 156];
    return { starters, captainSlot, fkLongSlot, fkShortSlot, cornerLSlot, cornerRSlot, penaltySlot };
  }

  setTeamRoles(isNational, id, { captainSlot, fkLongSlot, penaltySlot, cornerLSlot }) {
    const fIdx = isNational ? id : 64 + id;
    const fa = FORM_ADR + fIdx * FORM_SIZE;
    if (typeof captainSlot === "number") this.d[fa + 157] = captainSlot & 0x1F;
    if (typeof fkLongSlot === "number") { this.d[fa + 152] = fkLongSlot & 0x1F; this.d[fa + 153] = fkLongSlot & 0x1F; }
    if (typeof cornerLSlot === "number") { this.d[fa + 154] = cornerLSlot & 0x1F; this.d[fa + 155] = cornerLSlot & 0x1F; }
    if (typeof penaltySlot === "number") this.d[fa + 156] = penaltySlot & 0x1F;
  }

  swapSquadSlots(isNational, id, slotA, slotB) {
    const maxSlots = isNational ? NAT_SQUAD_SIZE : SQUAD_SIZE;
    if (slotA < 0 || slotA >= maxSlots || slotB < 0 || slotB >= maxSlots || slotA === slotB) return;
    const pBase = isNational ? SLOT23 + id * NAT_SQUAD_SIZE * 2 : SLOT32 + id * SQUAD_SIZE * 2;
    const nBase = isNational ? NUM23 + id * NAT_SQUAD_SIZE : NUM32 + id * SQUAD_SIZE;

    const pA0 = this.d[pBase + slotA * 2], pA1 = this.d[pBase + slotA * 2 + 1];
    const pB0 = this.d[pBase + slotB * 2], pB1 = this.d[pBase + slotB * 2 + 1];
    this.d[pBase + slotA * 2] = pB0;
    this.d[pBase + slotA * 2 + 1] = pB1;
    this.d[pBase + slotB * 2] = pA0;
    this.d[pBase + slotB * 2 + 1] = pA1;

    const numA = this.d[nBase + slotA];
    this.d[nBase + slotA] = this.d[nBase + slotB];
    this.d[nBase + slotB] = numA;
  }

  // --- Squads (Clubs: 32 players, National teams: 23 players) ---
  getTeamSquad(isNational, id) {
    const maxSlots = isNational ? NAT_SQUAD_SIZE : SQUAD_SIZE;
    const pBase = isNational ? SLOT23 + id * NAT_SQUAD_SIZE * 2 : SLOT32 + id * SQUAD_SIZE * 2;
    const nBase = isNational ? NUM23 + id * NAT_SQUAD_SIZE : NUM32 + id * SQUAD_SIZE;
    const form = this.getTeamFormation(isNational, id);
    const players = [];
    for (let s = 0; s < maxSlots; s++) {
      const pOff = pBase + s * 2;
      const pid = this.d[pOff] | (this.d[pOff + 1] << 8);
      const num = this.d[nBase + s] + 1;
      const roleInfo = s < 11 ? form.starters[s] : null;
      if (pid > 0 && pid < PLAYER_TOTAL) {
        const p = this.getPlayer(pid);
        players.push({
          slot: s,
          isStarter: s < 11,
          formRole: roleInfo ? roleInfo.role : "SUB",
          formX: roleInfo ? roleInfo.x : 0,
          formY: roleInfo ? roleInfo.y : 0,
          number: num <= 99 ? num : s + 1,
          ...p,
        });
      } else {
        players.push({
          slot: s,
          isStarter: s < 11,
          formRole: roleInfo ? roleInfo.role : "SUB",
          formX: roleInfo ? roleInfo.x : 0,
          formY: roleInfo ? roleInfo.y : 0,
          number: num <= 99 ? num : s + 1,
          id: 0,
          name: "(Empty)",
          shirt: "",
          pos: "GK",
          posCode: 0,
          age: 20,
          height: 180,
          weight: 75,
          nationality: 0,
          ovr: 50,
        });
      }
    }
    return players;
  }

  getSquad(c) {
    return this.getTeamSquad(false, c);
  }

  setTeamSquadSlot(isNational, id, slot, pid, shirtNumber) {
    const maxSlots = isNational ? NAT_SQUAD_SIZE : SQUAD_SIZE;
    if (slot < 0 || slot >= maxSlots) return;
    const pBase = isNational ? SLOT23 + id * NAT_SQUAD_SIZE * 2 : SLOT32 + id * SQUAD_SIZE * 2;
    const nBase = isNational ? NUM23 + id * NAT_SQUAD_SIZE : NUM32 + id * SQUAD_SIZE;
    this.d[pBase + slot * 2] = pid & 0xFF;
    this.d[pBase + slot * 2 + 1] = (pid >>> 8) & 0xFF;
    if (shirtNumber >= 1 && shirtNumber <= 99) {
      this.d[nBase + slot] = shirtNumber - 1;
    }
  }

  setSquadSlot(c, slot, pid, shirtNumber) {
    this.setTeamSquadSlot(false, c, slot, pid, shirtNumber);
  }

  // Search players across the database for transfers / adding to squad
  searchPlayers(query = "", limit = 50) {
    const q = query.trim().toLowerCase();
    const results = [];
    for (let i = 1; i < PLAYER_TOTAL; i++) {
      const a = this.padr(i);
      if (this.d[a] === 0 && this.d[a + 1] === 0) continue;
      const p = this.getPlayer(i);
      if (!p.name || p.name.startsWith("Unknown") || p.name.startsWith("(Empty")) continue;
      if (!q || p.name.toLowerCase().includes(q) || p.shirt.toLowerCase().includes(q) || String(i) === q) {
        results.push(p);
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  // Find an unused player record (4784..4999) to create a brand new player
  allocateNewPlayer({ name = "New Player", shirt = "NEW PLAYER", posCode = 7, nat = 44, age = 22 } = {}) {
    let targetId = -1;
    for (let i = 4784; i < PLAYER_TOTAL; i++) {
      const a = this.padr(i);
      if (this.d[a] === 0 && this.d[a + 1] === 0) {
        targetId = i;
        break;
      }
    }
    if (targetId < 0) targetId = 4999;
    // Copy donor attribute block from player #1013 or #185
    const donorA = this.padr(posCode === 0 ? 300 : 1020) + 48;
    const dstA = this.padr(targetId) + 48;
    this.d.set(this.d.subarray(donorA, donorA + 76), dstA);
    this.setPlayer(targetId, { name, shirt, posCode, nationality: nat, age, height: 178, weight: 74 });
    return targetId;
  }

  // --- Players ---
  padr(i) {
    return PLAYER_ADR + i * PLAYER_SIZE;
  }

  getStat(i, key) {
    const st = STATS[key];
    const a = this.padr(i) + 48 + st.off;
    const w = (this.d[a] << 8) | this.d[a - 1];
    return (w >>> st.shift) & st.mask;
  }

  setStat(i, key, v) {
    const st = STATS[key];
    const a = this.padr(i) + 48 + st.off;
    const old = ((this.d[a] << 8) | this.d[a - 1]) & (0xFFFF & ~(st.mask << st.shift));
    const nw = old | ((v & st.mask) << st.shift);
    this.d[a - 1] = nw & 0xFF;
    this.d[a] = (nw >>> 8) & 0xFF;
  }

  getLook(i, key) {
    const f = LOOK_FIELDS[key];
    const a = this.padr(i) + f.off;
    const w = this.d[a] | (this.d[a + 1] << 8);
    return (w >>> f.shift) & ((1 << f.width) - 1);
  }

  setLook(i, key, v) {
    const f = LOOK_FIELDS[key];
    const a = this.padr(i) + f.off;
    const mask = ((1 << f.width) - 1) << f.shift;
    const w = (this.d[a] | (this.d[a + 1] << 8)) & ~mask | ((v << f.shift) & mask);
    this.d[a] = w & 0xFF;
    this.d[a + 1] = (w >>> 8) & 0xFF;
  }

  getPlayer(i) {
    const a = this.padr(i);
    let u16End = 32;
    for (let k = 0; k < 32; k += 2) {
      if (this.d[a + k] === 0 && this.d[a + k + 1] === 0) {
        u16End = k;
        break;
      }
    }
    const name = this.tdUtf16.decode(this.d.subarray(a, a + u16End));
    const shSlice = this.d.subarray(a + 32, a + 48);
    const sz = shSlice.indexOf(0);
    const shirt = this.tdUtf8.decode(sz >= 0 ? shSlice.subarray(0, sz) : shSlice);
    const posCode = this.getStat(i, "reg_pos");
    const attack = this.getStat(i, "attack");
    const defence = this.getStat(i, "defence");
    const balance = this.getStat(i, "balance");
    const stamina = this.getStat(i, "stamina");
    const top_speed = this.getStat(i, "top_speed");
    const acceleration = this.getStat(i, "acceleration");
    const response = this.getStat(i, "response");
    const agility = this.getStat(i, "agility");
    const dribble_acc = this.getStat(i, "dribble_acc");
    const dribble_spd = this.getStat(i, "dribble_spd");
    const short_pass_acc = this.getStat(i, "short_pass_acc");
    const long_pass_acc = this.getStat(i, "long_pass_acc");
    const shot_acc = this.getStat(i, "shot_acc");
    const shot_power = this.getStat(i, "shot_power");
    const technique = this.getStat(i, "technique");
    const header = this.getStat(i, "header");
    const jump = this.getStat(i, "jump");
    const gk_ability = this.getStat(i, "gk_ability");
    const mentality = this.getStat(i, "mentality");

    const ovr =
      posCode === 0
        ? Math.round((gk_ability + response + balance + mentality + jump) / 5)
        : Math.round(
            (attack + defence + balance + stamina + top_speed + acceleration + dribble_acc + short_pass_acc + shot_acc + technique) /
              10
          );

    const nationality = this.getStat(i, "nationality");
    return {
      id: i,
      name,
      shirt,
      posCode,
      pos: POS_NAMES[posCode] || "CMF",
      age: this.getStat(i, "age") + 15,
      height: this.getStat(i, "height") + 148,
      weight: this.getStat(i, "weight"),
      nationality,
      nationName: NATIONS[nationality] || "Unknown",
      foot: this.getStat(i, "foot"),
      skin: this.getLook(i, "skin"),
      hairstyle: this.getLook(i, "hair_lo") | (this.getLook(i, "hair_hi") << 8),
      hair_colour: this.getLook(i, "hair_colour"),
      beard: this.getLook(i, "beard"),
      ovr,
      attack,
      defence,
      balance,
      stamina,
      top_speed,
      acceleration,
      response,
      agility,
      dribble_acc,
      dribble_spd,
      short_pass_acc,
      long_pass_acc,
      shot_acc,
      shot_power,
      technique,
      header,
      jump,
      gk_ability,
      mentality,
    };
  }

  setPlayer(i, fields) {
    const a = this.padr(i);
    if (typeof fields.name === "string") {
      this.d.fill(0, a, a + 32);
      const maxChars = Math.min(15, fields.name.length);
      for (let k = 0; k < maxChars; k++) {
        const code = fields.name.charCodeAt(k);
        this.d[a + k * 2] = code & 0xFF;
        this.d[a + k * 2 + 1] = (code >>> 8) & 0xFF;
      }
      this.setStat(i, "name_edited", 1);
    }
    if (typeof fields.shirt === "string") {
      const clean = fields.shirt.toUpperCase().replace(/[^A-Z0-9 ._-]/g, "");
      this.d.fill(0, a + 32, a + 48);
      for (let k = 0; k < Math.min(15, clean.length); k++) {
        this.d[a + 32 + k] = clean.charCodeAt(k);
      }
      this.setStat(i, "shirt_edited", 1);
    }
    if (typeof fields.posCode === "number") this.setStat(i, "reg_pos", Math.max(0, Math.min(12, fields.posCode)));
    if (typeof fields.nationality === "number") this.setStat(i, "nationality", Math.max(0, Math.min(127, fields.nationality)));
    if (typeof fields.age === "number") this.setStat(i, "age", Math.max(0, Math.min(31, fields.age - 15)));
    if (typeof fields.height === "number") this.setStat(i, "height", Math.max(0, Math.min(63, fields.height - 148)));
    if (typeof fields.weight === "number") this.setStat(i, "weight", Math.max(40, Math.min(127, fields.weight)));
    if (typeof fields.foot === "number") this.setStat(i, "foot", fields.foot ? 1 : 0);
    if (typeof fields.skin === "number") this.setLook(i, "skin", Math.max(0, Math.min(3, fields.skin)));
    if (typeof fields.hairstyle === "number") {
      const h = Math.max(0, Math.min(2047, fields.hairstyle));
      this.setLook(i, "hair_lo", h & 0xFF);
      this.setLook(i, "hair_hi", (h >>> 8) & 7);
    }
    if (typeof fields.hair_colour === "number") this.setLook(i, "hair_colour", Math.max(0, Math.min(63, fields.hair_colour)));
    if (typeof fields.beard === "number") this.setLook(i, "beard", Math.max(0, Math.min(255, fields.beard)));

    const statKeys = [
      "attack", "defence", "balance", "stamina", "top_speed", "acceleration",
      "response", "agility", "dribble_acc", "dribble_spd", "short_pass_acc",
      "long_pass_acc", "shot_acc", "shot_power", "technique", "header", "jump",
      "gk_ability", "mentality"
    ];
    let statEdited = false;
    for (const k of statKeys) {
      if (typeof fields[k] === "number" && !Number.isNaN(fields[k])) {
        this.setStat(i, k, Math.max(1, Math.min(99, fields[k])));
        statEdited = true;
      }
    }
    if (statEdited) this.setStat(i, "ability_edited", 1);
  }

  // --- Custom Club Emblem (64x64 128-color indexed inside Option File, up to 50 slots) ---
  async setClubCustomEmblemFromImage(c, imageFile) {
    const rgba64 = await loadAndClearBackdrop64(imageFile);
    const { palette, indices } = quantizeRgbaToPalette(rgba64, 128);
    const curEmblem = this.getClub(c).emblemId;
    let loc = curEmblem - EMBLEM_FIRST;
    let n;
    if (loc >= 0 && loc < 50 && this.d[EMBLEM_ADR - 158 + loc] !== 0x99) {
      n = this.d[EMBLEM_ADR - 158 + loc];
    } else {
      n = this.d[EMBLEM_ADR - 160];
      if (n >= 50) throw new Error("All 50 custom emblem slots in this Option File are full (use the 169-crest .flg bank importer for full league packs).");
      loc = -1;
      for (let i = 0; i < 50; i++) {
        if (this.d[EMBLEM_ADR - 158 + i] === 0x99) { loc = i; break; }
      }
      if (loc < 0) throw new Error("No free custom emblem location found.");
      this.d[EMBLEM_ADR - 160] = n + 1;
    }
    const a = EMBLEM_ADR + n * EMBLEM_SIZE;
    this.d.fill(0, a, a + EMBLEM_SIZE);
    this.d[a] = 1;
    const eid = EMBLEM_FIRST + loc;
    this.d[a + 4] = eid & 0xFF;
    this.d[a + 5] = (eid >>> 8) & 0xFF;
    for (let k = 0; k < 128; k++) {
      const [r, g, b, al] = palette[k] || [0, 0, 0, 0];
      this.d[a + 64 + 4 * k] = r;
      this.d[a + 64 + 4 * k + 1] = g;
      this.d[a + 64 + 4 * k + 2] = b;
      this.d[a + 64 + 4 * k + 3] = al;
    }
    this.d.set(indices, a + 1088);
    this.d[EMBLEM_ADR - 158 + loc] = n;

    const ca = CLUB_ADR + c * CLUB_SIZE;
    this.d[ca + 60] = eid & 0xFF;
    this.d[ca + 61] = (eid >>> 8) & 0xFF;
    this.d[ca + 64] = eid & 0xFF;
    this.d[ca + 65] = (eid >>> 8) & 0xFF;
    this.d[ca + 68] = 1;
    this.d[ca + 69] = 1;
    return eid;
  }
}

// --- Image helpers: Clear solid backdrop & quantize ---
async function decodeImageToCanvas(blobOrFile) {
  const bmp = await createImageBitmap(blobOrFile);
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return { canvas, ctx, width: canvas.width, height: canvas.height };
}

async function loadAndClearBackdrop64(file) {
  const { ctx, width: w, height: h } = await decodeImageToCanvas(file);
  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;
  const bgR = px[0], bgG = px[1], bgB = px[2], bgA = px[3];
  if (bgA >= 128) {
    const tol = 24;
    const near = (i) =>
      px[i + 3] >= 128 &&
      Math.abs(px[i] - bgR) <= tol &&
      Math.abs(px[i + 1] - bgG) <= tol &&
      Math.abs(px[i + 2] - bgB) <= tol;
    const seen = new Uint8Array(w * h);
    const todo = [];
    for (let x = 0; x < w; x++) { todo.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { todo.push(y * w, y * w + (w - 1)); }
    while (todo.length > 0) {
      const idx = todo.pop();
      if (seen[idx]) continue;
      seen[idx] = 1;
      const bi = idx * 4;
      if (!near(bi)) continue;
      px[bi] = px[bi + 1] = px[bi + 2] = px[bi + 3] = 0;
      const x = idx % w, y = (idx / w) | 0;
      if (x > 0) todo.push(idx - 1);
      if (x + 1 < w) todo.push(idx + 1);
      if (y > 0) todo.push(idx - w);
      if (y + 1 < h) todo.push(idx + w);
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const outCanvas = document.createElement("canvas");
  outCanvas.width = 64;
  outCanvas.height = 64;
  const octx = outCanvas.getContext("2d");
  const scale = Math.min(64 / w, 64 / h);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  octx.drawImage(ctx.canvas, (64 - dw) >> 1, (64 - dh) >> 1, dw, dh);
  return octx.getImageData(0, 0, 64, 64).data;
}

function quantizeRgbaToPalette(rgba, maxColors = 128) {
  // Index 0 is transparent; collect opaque colors up to maxColors - 1
  const counts = new Map();
  const nPixels = rgba.byteLength >> 2;
  for (let i = 0; i < nPixels; i++) {
    const a = rgba[i * 4 + 3];
    if (a < 128) continue;
    const r = rgba[i * 4] & 0xF8;
    const g = rgba[i * 4 + 1] & 0xF8;
    const b = rgba[i * 4 + 2] & 0xF8;
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const palette = [[0, 0, 0, 0]];
  for (let i = 0; i < Math.min(maxColors - 1, sorted.length); i++) {
    const key = sorted[i][0];
    palette.push([((key >>> 16) & 0xFF) | 4, ((key >>> 8) & 0xFF) | 4, (key & 0xFF) | 4, 255]);
  }
  while (palette.length < maxColors) palette.push([0, 0, 0, 0]);

  const indices = new Uint8Array(nPixels);
  const usedColors = Math.min(maxColors, sorted.length + 1);
  for (let i = 0; i < nPixels; i++) {
    if (rgba[i * 4 + 3] < 128) {
      indices[i] = 0;
      continue;
    }
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    let bestIdx = 1, bestDist = 1e9;
    for (let k = 1; k < usedColors; k++) {
      const pr = palette[k][0] - r, pg = palette[k][1] - g, pb = palette[k][2] - b;
      const dist = pr * pr + pg * pg + pb * pb;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = k;
        if (dist === 0) break;
      }
    }
    indices[i] = bestIdx;
  }
  return { palette, indices };
}

// --- Player Faces Converter (tools/pech_faces.py ported to JS) ---
// Output: 32x64 RGBA PAM (P7 header + 32*64*4 bytes) for mods/<id>/faces/<player_id>.pam
const FACE_W = 32;
const FACE_H = 64;
const SQUARE_X = [[0, 0.239], [9, 0.388], [15.75, 0.5], [22.5, 0.612], [FACE_W, 0.761]];
const SQUARE_Y = [[0, 0.147], [19, 0.287], [36, 0.412], [46, 0.53], [58, 0.662], [FACE_H, 0.70]];
const BAND_X   = [[0, 0.197], [9, 0.37],  [15.75, 0.5], [22.5, 0.63],  [FACE_W, 0.803]];
const BAND_Y   = [[0, 0.32],  [19, 0.5],  [36, 0.66],   [46, 0.74],    [58, 0.87],    [FACE_H, 0.93]];
const TALL_X   = [[0, 0.103], [9, 0.33],  [15.75, 0.5], [22.5, 0.67],  [FACE_W, 0.897]];
const TALL_Y   = [[0, 0.274], [19, 0.47], [36, 0.645],  [46, 0.75],    [58, 0.86],    [FACE_H, 0.92]];

function interpPts(pts, v) {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [a, fa] = pts[i];
    const [b, fb] = pts[i + 1];
    if (v <= b) return fa + ((fb - fa) * (v - a)) / (b - a);
  }
  return pts[pts.length - 1][1];
}

async function zlibInflate(u8) {
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  const wp = writer.write(u8).then(() => writer.close());
  const chunks = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await wp;
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

async function zlibDeflate(u8) {
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  const wp = writer.write(u8).then(() => writer.close());
  const chunks = [];
  const reader = cs.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await wp;
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

async function decodePcFaceBin(file) {
  const raw = new Uint8Array(await file.arrayBuffer());
  if (raw.byteLength < 32 || raw[0] !== 0x00 || raw[1] !== 0x06 || raw[2] !== 0x01 || raw[3] !== 0x00) {
    return null;
  }
  const clen = rd32(raw, 4);
  const d = await zlibInflate(raw.subarray(32, 32 + clen));
  const n = rd32(d, 0);
  if (n < 1) return null;
  const tOff = rd32(d, 8 + 4 * (n - 1));
  const t = d.subarray(tOff);
  const rawPal = [];
  for (let i = 0; i < 256; i++) {
    rawPal.push([t[0x80 + 4 * i], t[0x80 + 4 * i + 1], t[0x80 + 4 * i + 2], t[0x80 + 4 * i + 3]]);
  }
  const pal = [];
  for (let i = 0; i < 256; i++) {
    const sw = (i & ~0x18) | ((i & 8) << 1) | ((i & 16) >> 1);
    const [r, g, b, a] = rawPal[sw];
    pal.push([r, g, b, Math.min(255, a * 2)]);
  }
  const rgba = new Uint8Array(64 * 128 * 4);
  for (let i = 0; i < 64 * 128; i++) {
    const idx = t[0x480 + i];
    const [r, g, b, a] = pal[idx];
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }
  return { width: 64, height: 128, rgba };
}

function isBandedFace(rgba, w, h) {
  let dark = 0, total = 0;
  for (let y = 2; y < 12; y++) {
    const sy = Math.min(h - 1, Math.floor((y * h) / 64));
    for (let x = 36; x < 60; x++) {
      const sx = Math.min(w - 1, Math.floor((x * w) / 64));
      const i = (sy * w + sx) * 4;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
      if (a < 60 || r + g + b < 120) dark++;
      total++;
    }
  }
  return dark > 0.3 * total;
}

export function buildPamBytes(w, h, rgba) {
  const hdr = new TextEncoder().encode(
    `P7\nWIDTH ${w}\nHEIGHT ${h}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n`
  );
  const out = new Uint8Array(hdr.byteLength + rgba.byteLength);
  out.set(hdr, 0);
  out.set(rgba, hdr.byteLength);
  return out;
}

export async function convertFaceToPam(file) {
  let srcW, srcH, srcRgba;
  const lower = (file.name || "").toLowerCase();
  if (lower.endsWith(".bin")) {
    const dec = await decodePcFaceBin(file);
    if (!dec) throw new Error(`Invalid PC face .bin (${file.name})`);
    srcW = dec.width;
    srcH = dec.height;
    srcRgba = dec.rgba;
  } else {
    const { ctx, width, height } = await decodeImageToCanvas(file);
    srcW = width;
    srcH = height;
    srcRgba = ctx.getImageData(0, 0, width, height).data;
  }

  const tall = srcH >= 2 * srcW * 0.9;
  const [mx, my] = tall ? [TALL_X, TALL_Y] : isBandedFace(srcRgba, srcW, srcH) ? [BAND_X, BAND_Y] : [SQUARE_X, SQUARE_Y];

  const outRgba = new Uint8Array(FACE_W * FACE_H * 4);
  const S = 4; // 4x4 supersampling per texel
  for (let y = 0; y < FACE_H; y++) {
    for (let x = 0; x < FACE_W; x++) {
      let accR = 0, accG = 0, accB = 0;
      for (let sy = 0; sy < S; sy++) {
        const fy = interpPts(my, y + (sy + 0.5) / S);
        const py = Math.min(srcH - 1, Math.max(0, Math.floor(fy * srcH)));
        for (let sx = 0; sx < S; sx++) {
          const fx = interpPts(mx, x + (sx + 0.5) / S);
          const px = Math.min(srcW - 1, Math.max(0, Math.floor(fx * srcW)));
          const idx = (py * srcW + px) * 4;
          accR += srcRgba[idx];
          accG += srcRgba[idx + 1];
          accB += srcRgba[idx + 2];
        }
      }
      const oi = (y * FACE_W + x) * 4;
      outRgba[oi]     = (accR / (S * S)) | 0;
      outRgba[oi + 1] = (accG / (S * S)) | 0;
      outRgba[oi + 2] = (accB / (S * S)) | 0;
      outRgba[oi + 3] = 255;
    }
  }
  return { pam: buildPamBytes(FACE_W, FACE_H, outRgba), rgba: outRgba };
}

export function parseFaceserverMap(mapText) {
  // kitserver/GDB/faces/map.txt:  1340, "Chile\Vargas.bin"
  const map = new Map();
  for (const line of mapText.split(/\r?\n/)) {
    const clean = line.split("#")[0];
    const m = clean.match(/^\s*(\d+)\s*,\s*"([^"]+)"/);
    if (m) {
      const id = parseInt(m[1], 10);
      const rel = m[2].replace(/\\/g, "/").replace(/^\/+/, "");
      map.set(id, rel);
    }
  }
  return map;
}

// --- PC Crest Bank Converter (tools/pes6_flg.py + tools/pech_crests.py ported to JS) ---
// Reads PC dat/0_text.afs (or loose .flg) + PSP pes6.iso -> builds afs/0_text.afs/{2347,2350}.bin
const FLG_BASE = 0x20;

export class FlgBank {
  constructor(bytes) {
    this.raw = new Uint8Array(bytes);
    this.imgBytes = rd32(this.raw, FLG_BASE);
    this.w = this.raw[FLG_BASE + 4];
    this.h = this.raw[FLG_BASE + 5];
    this.k = rd32(this.raw, FLG_BASE + 8);
    const total = rd32(this.raw, 4);
    const heads = [];
    for (let g = 0; g < 3; g++) {
      const base = FLG_BASE + 0x0C + 12 * g;
      heads.push([rd32(this.raw, base), rd32(this.raw, base + 4), rd32(this.raw, base + 8)]);
    }
    const ends = [heads[1][1], heads[2][1], total];
    this.groups = [];
    let p = FLG_BASE + 0x30;
    for (let g = 0; g < 3; g++) {
      const [count, poff, psize] = heads[g];
      const ents = [];
      for (let i = 0; i < count; i++) {
        const id = this.raw[p] | (this.raw[p + 1] << 8);
        const ln = this.raw[p + 2] | (this.raw[p + 3] << 8);
        const off = rd32(this.raw, p + 4);
        ents.push([id, this.raw.subarray(FLG_BASE + off, FLG_BASE + off + ln)]);
        p += 8;
      }
      this.groups.push({
        ents,
        pal: this.raw.subarray(FLG_BASE + poff, FLG_BASE + ends[g]),
        pal_off: poff,
        pal_size: psize,
      });
    }
    this.tablesEnd = p;
  }

  palette(g) {
    const rawPal = new Uint8Array(1024);
    const src = this.raw.subarray(FLG_BASE + this.groups[g].pal_off, FLG_BASE + this.groups[g].pal_off + 1024);
    rawPal.set(src);
    const out = [];
    for (let c = 0; c < 256; c++) {
      const sw = (c & ~0x18) | ((c & 8) << 1) | ((c & 16) >> 1);
      out.push([
        rawPal[4 * sw],
        rawPal[4 * sw + 1],
        rawPal[4 * sw + 2],
        Math.min(255, rawPal[4 * sw + 3] * 2),
      ]);
    }
    return out;
  }

  async decodeEntryRgba(groupIndex, entryId) {
    const g = this.groups[groupIndex];
    if (!g) return null;
    const ent = g.ents.find((e) => e[0] === entryId);
    if (!ent) return null;
    const idx = await zlibInflate(ent[1]);
    const pal = this.palette(groupIndex);
    const rgba = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.w * this.h; i++) {
      const c = idx[i];
      if (c > 0) {
        rgba[i * 4] = pal[c][0];
        rgba[i * 4 + 1] = pal[c][1];
        rgba[i * 4 + 2] = pal[c][2];
        rgba[i * 4 + 3] = pal[c][3];
      }
    }
    return rgba;
  }

  build() {
    const chunks = [];
    const header = new Uint8Array(this.tablesEnd);
    header.set(this.raw.subarray(0, FLG_BASE + 0x0C), 0);
    chunks.push(header);
    let pos = this.tablesEnd - FLG_BASE;
    const offs = [];
    for (const g of this.groups) {
      for (const e of g.ents) {
        offs.push(pos);
        chunks.push(e[1]);
        const nextPos = (pos + e[1].byteLength + 15) & ~15;
        if (nextPos > pos + e[1].byteLength) {
          chunks.push(new Uint8Array(nextPos - (pos + e[1].byteLength)));
        }
        pos = nextPos;
      }
    }
    let palPos = pos;
    let p = FLG_BASE + 0x30;
    let k = 0;
    for (let gi = 0; gi < this.groups.length; gi++) {
      const g = this.groups[gi];
      wr32(header, FLG_BASE + 0x0C + 12 * gi, g.ents.length);
      wr32(header, FLG_BASE + 0x0C + 12 * gi + 4, palPos);
      wr32(header, FLG_BASE + 0x0C + 12 * gi + 8, g.pal_size);
      for (const e of g.ents) {
        header[p] = e[0] & 0xFF;
        header[p + 1] = (e[0] >>> 8) & 0xFF;
        header[p + 2] = e[1].byteLength & 0xFF;
        header[p + 3] = (e[1].byteLength >>> 8) & 0xFF;
        wr32(header, p + 4, offs[k++]);
        p += 8;
      }
      chunks.push(g.pal);
      palPos += g.pal.byteLength;
    }
    let totalLen = 0;
    for (const c of chunks) totalLen += c.byteLength;
    const out = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.byteLength; }
    wr32(out, 4, out.byteLength - FLG_BASE);
    return out;
  }
}

function scaleRgbaBox(srcRgba, sw, sh, dw, dh) {
  const out = new Uint8Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.floor((y * sh) / dh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.floor((x * sw) / dw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * sw) / dw));
      let r = 0, g = 0, b = 0, a = 0, n = 0, opaque = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * sw + sx) * 4;
          const al = srcRgba[i + 3];
          a += al;
          n++;
          if (al >= 128) {
            r += srcRgba[i];
            g += srcRgba[i + 1];
            b += srcRgba[i + 2];
            opaque++;
          }
        }
      }
      const oi = (y * dw + x) * 4;
      if (opaque > 0 && a / n >= 128) {
        out[oi] = (r / opaque) | 0;
        out[oi + 1] = (g / opaque) | 0;
        out[oi + 2] = (b / opaque) | 0;
        out[oi + 3] = 255;
      }
    }
  }
  return out;
}

function quantizeToTargetPalette(rgba, w, h, pal) {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] < 128) {
      out[i] = 0;
      continue;
    }
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    let best = 1, bestDist = 1e9;
    for (let c = 1; c < 256; c++) {
      const dr = pal[c][0] - r, dg = pal[c][1] - g, db = pal[c][2] - b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) {
        bestDist = d;
        best = c;
        if (d === 0) break;
      }
    }
    out[i] = best;
  }
  return out;
}

export async function findPcCrestBankInFile(file) {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  // Loose .flg bank starts with 0x00000500
  if (head.byteLength >= 8 && rd32(head, 0) === 0x500) {
    const raw = new Uint8Array(await file.arrayBuffer());
    const b = new FlgBank(raw);
    if (b.w === 64 && b.h === 64 && b.groups[1].ents.length === 169) return b;
    throw new Error("Loose .flg file does not match PES6 64x64 crest bank (169 crests).");
  }
  // PC 0_text.afs ("AFS\0")
  if (head[0] !== 0x41 || head[1] !== 0x46 || head[2] !== 0x53 || head[3] !== 0x00) {
    throw new Error("Not a PC 0_text.afs or .flg crest bank.");
  }
  const n = rd32(head, 4);
  const tableBytes = new Uint8Array(await file.slice(8, 8 + n * 8).arrayBuffer());
  // In PES6 PC 0_text.afs, member 536 is the 64x64 169-crest bank. Check 536 first, then scan near it.
  const candidates = [536, 535, 534, 537, 538];
  for (let i = 0; i < n; i++) if (i >= 500 && i <= 600 && !candidates.includes(i)) candidates.push(i);
  for (const idx of candidates) {
    if (idx >= n) continue;
    const off = rd32(tableBytes, idx * 8);
    const sz = rd32(tableBytes, idx * 8 + 4);
    if (sz < 0x1000 || sz >= 0x31800) continue;
    const mHead = new Uint8Array(await file.slice(off, off + 0x50).arrayBuffer());
    if (rd32(mHead, 0) !== 0x500) continue;
    const w = mHead[FLG_BASE + 4], h = mHead[FLG_BASE + 5];
    const g1Count = rd32(mHead, FLG_BASE + 0x0C + 12);
    if (w === 64 && h === 64 && g1Count === 169) {
      const full = new Uint8Array(await file.slice(off, off + sz).arrayBuffer());
      return new FlgBank(full);
    }
  }
  throw new Error("Could not find the 169-crest 64x64 bank (member 536) in this PC 0_text.afs.");
}

export async function convertPcCrestsToPspBins(pcBank, pspAfs) {
  const pcPal = pcBank.palette(1);
  const pcById = new Map(pcBank.groups[1].ents.map((e) => [e[0], e[1]]));
  const out = {};

  // PSP 0_text.afs 32KB slots 2347 (32x32) and 2350 (64x64)
  for (const slot of [2347, 2350]) {
    const startByte = slot * 0x8000;
    const h8 = await pspAfs.readBytes(startByte, 8);
    const size = rd32(h8, 4) + FLG_BASE;
    const rawPsp = await pspAfs.readBytes(startByte, size);
    const psp = new FlgBank(rawPsp);
    const pspPal = psp.palette(1);

    for (const e of psp.groups[1].ents) {
      if (pcById.has(e[0])) {
        if (pcBank.w === psp.w && pcBank.h === psp.h) {
          e[1] = pcById.get(e[0]);
          continue;
        }
        const idx = await zlibInflate(pcById.get(e[0]));
        const rgba64 = new Uint8Array(64 * 64 * 4);
        for (let i = 0; i < 64 * 64; i++) {
          const c = idx[i];
          if (c) {
            rgba64[i * 4] = pcPal[c][0];
            rgba64[i * 4 + 1] = pcPal[c][1];
            rgba64[i * 4 + 2] = pcPal[c][2];
            rgba64[i * 4 + 3] = pcPal[c][3];
          }
        }
        const small = scaleRgbaBox(rgba64, pcBank.w, pcBank.h, psp.w, psp.h);
        const q = quantizeToTargetPalette(small, psp.w, psp.h, pcPal);
        e[1] = await zlibDeflate(q);
      } else {
        const idx = await zlibInflate(e[1]);
        const rgba = new Uint8Array(psp.w * psp.h * 4);
        for (let i = 0; i < psp.w * psp.h; i++) {
          const c = idx[i];
          if (c) {
            rgba[i * 4] = pspPal[c][0];
            rgba[i * 4 + 1] = pspPal[c][1];
            rgba[i * 4 + 2] = pspPal[c][2];
            rgba[i * 4 + 3] = pspPal[c][3];
          }
        }
        const q = quantizeToTargetPalette(rgba, psp.w, psp.h, pcPal);
        e[1] = await zlibDeflate(q);
      }
    }

    // Requantize PSP flags (group 0) to share the new crest palette
    const pspFlagPal = psp.palette(0);
    for (const e of psp.groups[0].ents) {
      const idx = await zlibInflate(e[1]);
      const rgba = new Uint8Array(psp.w * psp.h * 4);
      for (let i = 0; i < psp.w * psp.h; i++) {
        const c = idx[i];
        if (c) {
          rgba[i * 4] = pspFlagPal[c][0];
          rgba[i * 4 + 1] = pspFlagPal[c][1];
          rgba[i * 4 + 2] = pspFlagPal[c][2];
          rgba[i * 4 + 3] = pspFlagPal[c][3];
        }
      }
      const q = quantizeToTargetPalette(rgba, psp.w, psp.h, pcPal);
      e[1] = await zlibDeflate(q);
    }
    psp.groups[0].pal = pcBank.groups[1].pal;
    psp.groups[1].pal = pcBank.groups[1].pal;
    out[slot] = psp.build();
  }
  return out;
}

export async function readPspIso64x64FlgBank(pspAfs) {
  const startByte = 2350 * 0x8000;
  const h8 = await pspAfs.readBytes(startByte, 8);
  const size = rd32(h8, 4) + FLG_BASE;
  const rawPsp = await pspAfs.readBytes(startByte, size);
  return new FlgBank(rawPsp);
}
