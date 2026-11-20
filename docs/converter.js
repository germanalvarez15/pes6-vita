// PES6 PS Vita — 100% Client-Side PS2 Stadium Converter, Validator & Commentary Checker
// Runs entirely in the browser (or Node.js 18+) using File.slice() and native Web Streams zlib.
// Zero files are ever uploaded to any server.

export const STADIUMS = [
  { id: 0,  slug: "club_house",        name: "Club House",                       clubs: "Master League / Training",          pspDay: 9593,  pspNight: 9626 },
  { id: 1,  slug: "san_siro",          name: "San Siro",                         clubs: "Inter / A.C. Milan / Italy",        pspDay: 9659,  pspNight: 9692 },
  { id: 2,  slug: "camp_nou",          name: "Catalonia Stadium (Camp Nou)",     clubs: "FC Barcelona / Spain / Brazil",     pspDay: 9725,  pspNight: 9762 },
  { id: 3,  slug: "highbury",          name: "Highbury",                         clubs: "Arsenal",                           pspDay: 9795,  pspNight: 9828 },
  { id: 4,  slug: "orange_arena",      name: "Orange Arena (Amsterdam ArenA)",   clubs: "Ajax / Netherlands",                pspDay: 9861,  pspNight: 9894 },
  { id: 5,  slug: "stade_louis_ii",    name: "Stade Louis II",                   clubs: "AS Monaco",                         pspDay: 9993,  pspNight: 10026 },
  { id: 6,  slug: "old_trafford",      name: "Old Trafford",                     clubs: "Manchester United / England",       pspDay: 10059, pspNight: 10092 },
  { id: 7,  slug: "nakhon_ratchasima", name: "Nakhon Ratchasima",                clubs: "South Korea / Man City",            pspDay: 10125, pspNight: 10158 },
  { id: 8,  slug: "bombonera",         name: "La Bombonera (Gran Chaco)",        clubs: "Argentina / Boca / River",          pspDay: 10191, pspNight: 10224 },
  { id: 9,  slug: "cuito_cuanavale",   name: "Cuito Cuanavale",                  clubs: "Everton / Saint-Etienne",           pspDay: 10257, pspNight: 10290 },
  { id: 10, slug: "amerigo_atlantis",  name: "Amerigo Atlantis",                 clubs: "USA / Greece / Zaragoza",           pspDay: 10323, pspNight: 10356 },
  { id: 11, slug: "delle_alpi",        name: "Stadio Delle Alpi",                clubs: "Juventus / Torino",                 pspDay: 10389, pspNight: 10422 },
  { id: 12, slug: "olimpico",          name: "Stadio Olimpico",                  clubs: "A.S. Roma / Lazio",                 pspDay: 10455, pspNight: 10488 },
  { id: 13, slug: "ennio_tardini",     name: "Stadio Ennio Tardini",             clubs: "Parma / FC Porto",                  pspDay: 10521, pspNight: 10554 },
  { id: 14, slug: "anfield",           name: "Anfield (Red Cauldron)",           clubs: "Liverpool / Athletic Club",         pspDay: 10653, pspNight: 10686 },
  { id: 15, slug: "parc_des_princes",  name: "Parc des Princes (Lutecia)",       clubs: "PSG / France",                      pspDay: 10719, pspNight: 10752 },
  { id: 16, slug: "velodrome",         name: "Stade Velodrome (Massilia)",       clubs: "Olympique Marseille",               pspDay: 10785, pspNight: 10818 },
  { id: 17, slug: "bernabeu",          name: "Santiago Bernabeu",                clubs: "Real Madrid",                       pspDay: 10851, pspNight: 10884 },
  { id: 18, slug: "westfalenstadion",  name: "Signal Iduna Park (Borussia)",     clubs: "Borussia Dortmund / Germany",       pspDay: 10917, pspNight: 10950 },
  { id: 19, slug: "stockholm_arena",   name: "Stockholm Arena (Rasunda)",        clubs: "Sweden / Mexico",                   pspDay: 10983, pspNight: 11016 },
  { id: 20, slug: "st_james_park",     name: "St. James' Park (Magpie Park)",    clubs: "Newcastle / Uruguay",               pspDay: 11049, pspNight: 11082 },
  { id: 21, slug: "de_kuip",           name: "De Kuip (Rotterdam Stadion)",      clubs: "Feyenoord",                         pspDay: 11115, pspNight: 11148 },
  { id: 22, slug: "blautraum",         name: "Blautraum Stadion",                clubs: "SchucoArena (PSP twin)",            pspDay: 11181, pspNight: 11214 },
  { id: 23, slug: "diamond_stadium",   name: "Diamond Stadium (Munich)",         clubs: "Bayern Munich / Chelsea",           pspDay: 11247, pspNight: 11280 },
  { id: 24, slug: "berlin_olimpia",    name: "Hauptstadtstadion (Berlin)",       clubs: "Germany / Fulham",                  pspDay: 11313, pspNight: 11346 },
  { id: 25, slug: "riazor",            name: "Estadio de Riazor",                clubs: "Deportivo / Tottenham",             pspDay: 11379, pspNight: 11412 },
  { id: 26, slug: "mestalla",          name: "Mestalla (Estadio Palo)",          clubs: "Valencia C.F. / Peru",              pspDay: 11445, pspNight: 11478 },
  { id: 27, slug: "nangsoh",           name: "Nangsoh Stadium (Seoul)",          clubs: "South Korea",                       pspDay: 11511, pspNight: 11544 },
  { id: 28, slug: "kanji_dome",        name: "Kanji Dome (Sapporo)",             clubs: "WE10 / Japan",                      pspDay: 9061,  pspNight: 9094 },
  { id: 29, slug: "dietro_monte",      name: "Dietro Monte (Kashima)",           clubs: "WE10 / Japan",                      pspDay: 9127,  pspNight: 9160 },
  { id: 30, slug: "porto_folio",       name: "Porto Folio (Yokohama)",           clubs: "WE10 / Japan",                      pspDay: 9193,  pspNight: 9226 },
  { id: 31, slug: "queensland_park",   name: "Queens land Park (Osaka)",         clubs: "WE10 / Japan",                      pspDay: 9259,  pspNight: 9292 },
  { id: 32, slug: "haze_hills",        name: "Haze Hills (Tokyo)",               clubs: "WE10 / Japan",                      pspDay: 9325,  pspNight: 9358 },
  { id: 33, slug: "kusunoki_mihama",   name: "Kusunoki-Mihama (Saitama)",        clubs: "WE10 / Japan",                      pspDay: 9391,  pspNight: 9424 },
  { id: 34, slug: "occhio_del_mar",    name: "Occhio Del Mar (Oita)",            clubs: "WE10 / Japan",                      pspDay: 9457,  pspNight: 9490 },
  { id: 35, slug: "ayase_nakano",      name: "Ayase-Nakano (Toyota)",            clubs: "WE10 / Japan",                      pspDay: 9523,  pspNight: 9556 },
  { id: 36, slug: "hidden_a",          name: "Hidden Stadium A",                 clubs: "Bonus PS2 stadium",                 pspDay: 9927,  pspNight: 9960 },
  { id: 37, slug: "hidden_b",          name: "Hidden Stadium B",                 clubs: "Bonus PS2 stadium",                 pspDay: 10587, pspNight: 10620 },
].map((s) => ({
  ...s,
  ps2Day: s.pspDay < 9581 ? s.pspDay - 2116 : s.pspDay - 2120,
  ps2Night: s.pspNight < 9581 ? s.pspNight - 2116 : s.pspNight - 2120,
}));

export const POPULAR_SLUGS = new Set([
  "bernabeu", "camp_nou", "bombonera", "san_siro", "old_trafford",
  "anfield", "highbury", "olimpico", "delle_alpi", "westfalenstadion",
  "parc_des_princes", "orange_arena", "mestalla", "diamond_stadium",
]);

const STADIUM_CACHE_CAP = 0x000FF000; // 1020 KB active guest RAM budget at 0x08200000
const MAX_P2_UNCOMP = 0x000C0000;     // 768 KB safe Part 2 ceiling inside 2.4 MB match heap

// --- Binary helpers ---
function dvOf(u8) {
  return new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
}
function rdU32(u8, off) { return dvOf(u8).getUint32(off, true); }
function rdI32(u8, off) { return dvOf(u8).getInt32(off, true); }
function rdU16(u8, off) { return dvOf(u8).getUint16(off, true); }
function rdI16(u8, off) { return dvOf(u8).getInt16(off, true); }
function rdF32(u8, off) { return dvOf(u8).getFloat32(off, true); }
function wrU32(u8, off, v) { dvOf(u8).setUint32(off, v >>> 0, true); }
function wrU16(u8, off, v) { dvOf(u8).setUint16(off, v & 0xFFFF, true); }
function wrF32(u8, off, v) { dvOf(u8).setFloat32(off, v, true); }

function concatBytes(parts) {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.byteLength;
  }
  return out;
}

function padAlign(u8, align) {
  const rem = u8.byteLength % align;
  if (rem === 0) return u8;
  const out = new Uint8Array(u8.byteLength + (align - rem));
  out.set(u8, 0);
  return out;
}

async function runStream(u8, stream) {
  const writer = stream.writable.getWriter();
  const writePromise = writer.write(u8).then(() => writer.close());
  const chunks = [];
  const reader = stream.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await writePromise;
  return concatBytes(chunks);
}

export async function zlibDecompress(u8) {
  return runStream(u8, new DecompressionStream("deflate"));
}

export async function zlibCompress(u8) {
  return runStream(u8, new CompressionStream("deflate"));
}

// --- ISO 9660 reader over Blob/File (only reads small slices, never loads 1.3 GB in RAM) ---
async function readSlice(file, offset, length) {
  const end = Math.min(file.size, offset + length);
  if (offset < 0 || offset >= file.size || end <= offset) return new Uint8Array(0);
  const ab = await file.slice(offset, end).arrayBuffer();
  return new Uint8Array(ab);
}

export async function scanIsoFiles(file) {
  const pvd = await readSlice(file, 16 * 2048, 2048);
  if (pvd.byteLength < 2048 || pvd[0] !== 1 ||
      pvd[1] !== 0x43 || pvd[2] !== 0x44 || pvd[3] !== 0x30 || pvd[4] !== 0x30 || pvd[5] !== 0x31) {
    throw new Error("NOT_ISO");
  }
  const files = new Map();
  const td = new TextDecoder("latin1");

  async function walk(lba, size, path) {
    const data = await readSlice(file, lba * 2048, size);
    let o = 0;
    while (o < data.byteLength) {
      const rlen = data[o];
      if (rlen === 0) {
        o = (Math.floor(o / 2048) + 1) * 2048;
        continue;
      }
      const flba = rdU32(data, o + 2);
      const fsize = rdU32(data, o + 10);
      const flags = data[o + 25];
      const nlen = data[o + 32];
      const rawName = data.subarray(o + 33, o + 33 + nlen);
      if (!(nlen === 1 && (rawName[0] === 0 || rawName[0] === 1))) {
        const name = td.decode(rawName).split(";")[0];
        const full = path + name;
        if (flags & 2) {
          await walk(flba, fsize, full + "/");
        } else {
          files.set(full.toUpperCase(), { name, path: full, offset: flba * 2048, size: fsize });
        }
      }
      o += rlen;
    }
  }

  const rootLba = rdU32(pvd, 156 + 2);
  const rootSize = rdU32(pvd, 156 + 10);
  await walk(rootLba, rootSize, "/");
  return files;
}

// --- PSP 0_text.afs reader (sector-based TOC) ---
export class PspIsoAfs {
  constructor(file, afsBase, afsDir) {
    this.file = file;
    this.afsBase = afsBase;
    this.afsDir = afsDir;
    this.cache = new Map();
  }

  static async open(file) {
    const files = await scanIsoFiles(file);
    const entry = files.get("/PSP_GAME/USRDIR/0_TEXT.AFS");
    if (!entry) {
      if (files.has("/0_TEXT.AFS")) throw new Error("IS_PS2_ISO");
      throw new Error("NOT_PSP_PES6_ISO");
    }
    // Check PARAM.SFO / UMD_DATA.BIN for ULES00476 if present
    const umd = files.get("/UMD_DATA.BIN");
    let discId = "";
    if (umd) {
      const umdBytes = await readSlice(file, umd.offset, Math.min(64, umd.size));
      discId = new TextDecoder("latin1").decode(umdBytes).replace(/\0.*/, "").trim();
      if (discId && !discId.includes("ULES-00476") && !discId.includes("ULES00476")) {
        throw new Error(`WRONG_PSP_REGION:${discId}`);
      }
    }
    const afsDir = await readSlice(file, entry.offset, 32768 * 4);
    const inst = new PspIsoAfs(file, entry.offset, afsDir);
    // Sanity check Slot 133 (member 55) and PSP stadium template (9581)
    const b55 = await inst.getMember(55);
    if (b55.byteLength < 64 || rdU32(b55, 0) !== 7) {
      throw new Error("INVALID_PSP_SLOT133");
    }
    inst.discId = discId || "ULES-00476";
    return inst;
  }

  async getMember(mIdx) {
    if (this.cache.has(mIdx)) return this.cache.get(mIdx);
    const off = mIdx * 8;
    if (off + 8 > this.afsDir.byteLength) return new Uint8Array(0);
    const sec = rdU32(this.afsDir, off);
    const nsec = rdU32(this.afsDir, off + 4);
    if (nsec === 0) return new Uint8Array(0);
    const data = await readSlice(this.file, this.afsBase + sec * 2048, nsec * 2048);
    if (mIdx === 55 || mIdx === 9581 || mIdx === 9582) {
      this.cache.set(mIdx, data);
    }
    return data;
  }
}

// --- PS2 0_TEXT.AFS reader (standard "AFS\0" format, inside a PS2 ISO or loose file) ---
export class Ps2Afs {
  constructor(file, baseOffset, count, toc) {
    this.file = file;
    this.baseOffset = baseOffset;
    this.count = count;
    this.toc = toc;
  }

  static async open(file) {
    let baseOffset = 0;
    const head4 = await readSlice(file, 0, 4);
    if (head4.byteLength === 4 &&
        head4[0] === 0x41 && head4[1] === 0x46 && head4[2] === 0x53 && head4[3] === 0x00) {
      baseOffset = 0;
    } else {
      const files = await scanIsoFiles(file);
      const entry = files.get("/0_TEXT.AFS");
      if (!entry) throw new Error("NO_PS2_0TEXT");
      baseOffset = entry.offset;
    }
    const hdr = await readSlice(file, baseOffset, 8);
    if (hdr.byteLength < 8 || hdr[0] !== 0x41 || hdr[1] !== 0x46 || hdr[2] !== 0x53 || hdr[3] !== 0x00) {
      throw new Error("NOT_PS2_AFS");
    }
    const count = rdU32(hdr, 4);
    if (count < 9500 || count > 30000) throw new Error("NOT_PES6_PS2_0TEXT");
    const toc = await readSlice(file, baseOffset + 8, count * 8);
    return new Ps2Afs(file, baseOffset, count, toc);
  }

  async getMember(mIdx) {
    if (mIdx < 0 || mIdx >= this.count) return new Uint8Array(0);
    const off = rdU32(this.toc, mIdx * 8);
    const sz = rdU32(this.toc, mIdx * 8 + 4);
    if (sz === 0) return new Uint8Array(0);
    return readSlice(this.file, this.baseOffset + off, sz);
  }
}

// --- Texture conversion (PS2 GS_PSMT4/PSMT8 -> PSP GU_PSM_T4 swizzled) ---
function ps2Alpha(a) {
  return a < 0x80 ? Math.min(255, a * 2) : 255;
}

function decodePs2Tex(blob, off) {
  const magic = rdU32(blob, off);
  if (magic !== 0x29857294) throw new Error(`Bad texture magic 0x${magic.toString(16)}`);
  const texId = rdU32(blob, off + 12);
  const texOff = rdU16(blob, off + 16);
  const palOff = rdU16(blob, off + 18);
  const w = rdU16(blob, off + 20);
  const h = rdU16(blob, off + 22);
  const psm = blob[off + 25];

  if (psm === 0x14) {
    const pal = new Array(16);
    for (let i = 0; i < 16; i++) {
      const p = off + palOff + i * 4;
      pal[i] = [blob[p], blob[p + 1], blob[p + 2], ps2Alpha(blob[p + 3])];
    }
    const n = w * h;
    const indices = new Uint8Array(n);
    const base = off + texOff;
    for (let i = 0; i < n; i++) {
      const b = blob[base + (i >> 1)];
      indices[i] = (i & 1) ? (b >> 4) : (b & 0xF);
    }
    return { texId, w, h, bpp: 4, pal, indices };
  }
  if (psm === 0x13) {
    const pal = new Array(256);
    for (let i = 0; i < 256; i++) {
      const si = ((i & 0x18) === 0x08 || (i & 0x18) === 0x10) ? (i ^ 0x18) : i;
      const p = off + palOff + si * 4;
      pal[i] = [blob[p], blob[p + 1], blob[p + 2], ps2Alpha(blob[p + 3])];
    }
    const indices = blob.slice(off + texOff, off + texOff + w * h);
    return { texId, w, h, bpp: 8, pal, indices };
  }
  throw new Error(`Unsupported PS2 texture PSM 0x${psm.toString(16)}`);
}

function downsampleIndexed(w, h, indices, tw, th) {
  if (w === tw && h === th) return { w, h, indices };
  const out = new Uint8Array(tw * th);
  const sx = w / tw;
  const sy = h / th;
  for (let ty = 0; ty < th; ty++) {
    const srcY = Math.min(h - 1, Math.floor(ty * sy));
    const rowOff = srcY * w;
    const tRow = ty * tw;
    for (let tx = 0; tx < tw; tx++) {
      const srcX = Math.min(w - 1, Math.floor(tx * sx));
      out[tRow + tx] = indices[rowOff + srcX];
    }
  }
  return { w: tw, h: th, indices: out };
}

function quantize8to4(pal256, indices) {
  const counts = new Int32Array(256);
  for (let i = 0; i < indices.length; i++) counts[indices[i]]++;
  const used = [];
  for (let i = 0; i < 256; i++) if (counts[i] > 0) used.push(i);

  if (used.length <= 16) {
    const newPal = used.map((i) => pal256[i]);
    while (newPal.length < 16) newPal.push([0, 0, 0, 0]);
    const lut = new Uint8Array(256);
    for (let k = 0; k < used.length; k++) lut[used[k]] = k;
    const out = new Uint8Array(indices.length);
    for (let i = 0; i < indices.length; i++) out[i] = lut[indices[i]];
    return { pal16: newPal, indices: out };
  }

  const transIndices = used.filter((i) => pal256[i][3] < 32);
  const opaqueSorted = used.filter((i) => pal256[i][3] >= 32).sort((a, b) => counts[b] - counts[a]);

  const chosen = [];
  if (transIndices.length > 0) {
    let tBest = transIndices[0];
    for (const i of transIndices) if (counts[i] > counts[tBest]) tBest = i;
    chosen.push(pal256[tBest]);
  }
  const candidates = opaqueSorted.map((i) => ({ c: pal256[i], cnt: counts[i], pow: Math.pow(counts[i], 0.4) }));
  if (candidates.length > 0 && chosen.length === 0) {
    chosen.push(candidates[0].c);
  }

  while (chosen.length < 16 && chosen.length < used.length) {
    let bestC = null;
    let bestScore = -1;
    for (let j = 0; j < candidates.length; j++) {
      const { c, pow } = candidates[j];
      let minD = 1e18;
      for (let k = 0; k < chosen.length; k++) {
        const p = chosen[k];
        const dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2], da = (c[3] - p[3]) * 2;
        const d = dr * dr + dg * dg + db * db + da * da;
        if (d < minD) minD = d;
      }
      const score = minD * pow;
      if (score > bestScore) {
        bestScore = score;
        bestC = c;
      }
    }
    if (!bestC || bestScore === 0) break;
    chosen.push(bestC);
  }
  while (chosen.length < 16) chosen.push([0, 0, 0, 0]);

  const lut = new Uint8Array(256);
  const hasTrans = transIndices.length > 0;
  const startK = hasTrans ? 1 : 0;
  for (const i of used) {
    const c = pal256[i];
    if (hasTrans && c[3] < 32) {
      lut[i] = 0;
    } else {
      let bestK = startK;
      let bestD = 1e18;
      for (let k = startK; k < 16; k++) {
        const p = chosen[k];
        const dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2], da = (c[3] - p[3]) * 2;
        const d = dr * dr + dg * dg + db * db + da * da;
        if (d < bestD) { bestD = d; bestK = k; }
      }
      lut[i] = bestK;
    }
  }
  const out = new Uint8Array(indices.length);
  for (let i = 0; i < indices.length; i++) out[i] = lut[indices[i]];
  return { pal16: chosen, indices: out };
}

function encodePsp4BitTex(texId, w, h, pal16, indices) {
  const rowbytes = w >> 1;
  const pixSz = rowbytes * h;
  const linear = new Uint8Array(pixSz);
  for (let y = 0; y < h; y++) {
    const rIn = y * w;
    const rOut = y * rowbytes;
    for (let bx = 0; bx < rowbytes; bx++) {
      const p0 = indices[rIn + (bx << 1)] & 0xF;
      const p1 = indices[rIn + (bx << 1) + 1] & 0xF;
      linear[rOut + bx] = p0 | (p1 << 4);
    }
  }
  const swiz = new Uint8Array(pixSz);
  const blocksX = rowbytes >> 4;
  for (let y = 0; y < h; y++) {
    const yBlk = (y >> 3) * blocksX;
    const yRow = (y & 7) << 4;
    const linRow = y * rowbytes;
    for (let bx = 0; bx < rowbytes; bx++) {
      const dst = (yBlk + (bx >> 4)) * 128 + yRow + (bx & 15);
      swiz[dst] = linear[linRow + bx];
    }
  }
  const totSz = 0x80 + pixSz;
  const out = new Uint8Array(totSz);
  const dv = dvOf(out);
  dv.setUint32(0, 0x29857294, true);
  dv.setUint32(4, 1, true);
  dv.setUint32(8, totSz, true);
  dv.setUint32(12, texId, true);
  dv.setUint16(16, 0x80, true);
  dv.setUint16(18, 0x40, true);
  dv.setUint16(20, w, true);
  dv.setUint16(22, h, true);
  const log2W = Math.round(Math.log2(w));
  const log2H = Math.round(Math.log2(h));
  out[24] = w & 0xFF; out[25] = 4; out[26] = log2W; out[27] = log2H;
  out[28] = 1; out[29] = 3; out[30] = 16; out[31] = 1;
  dv.setUint32(32, pixSz, true);
  dv.setUint32(36, 4, true);
  dv.setUint16(40, w, true);
  dv.setUint16(42, h, true);
  out[44] = w & 0xFF; out[45] = 4;
  dv.setUint32(60, 1, true);

  for (let i = 0; i < 16; i++) {
    const c = i < pal16.length ? pal16[i] : [0, 0, 0, 0];
    const p = 0x40 + i * 4;
    out[p] = c[0]; out[p + 1] = c[1]; out[p + 2] = c[2]; out[p + 3] = c[3];
  }
  out.set(swiz, 0x80);
  return out;
}

function convertTexPart(ps2PartDec, isPart1, pspTemplateP1Dec, compact) {
  const cnt = rdU32(ps2PartDec, 0);
  const activeIndices = [];
  for (let i = 0; i < cnt; i++) {
    if (rdU32(ps2PartDec, 8 + i * 4) !== 0) activeIndices.push(i);
  }
  const nActive = activeIndices.length;
  const outCnt = isPart1 ? 59 : 12;
  const hdrTableEnd = ((8 + outCnt * 4) + 0x3F) & ~0x3F;
  const entries = new Map();

  for (let rank = 0; rank < activeIndices.length; rank++) {
    const i = activeIndices[rank];
    const off = rdU32(ps2PartDec, 8 + i * 4);
    let { texId, w, h, bpp, pal, indices } = decodePs2Tex(ps2PartDec, off);
    let tw, th;
    if (!isPart1) {
      if (compact >= 2) { tw = Math.min(w, 32); th = Math.min(h, 32); }
      else if (compact === 1 || texId === 0x2710 || rank >= 3) { tw = Math.min(w, 64); th = Math.min(h, 64); }
      else { tw = Math.min(w, 128); th = Math.min(h, 128); }
    } else {
      if (compact >= 3) {
        tw = Math.min(w, 32); th = rank < 8 ? Math.min(h, 16) : Math.min(h, 8);
      } else if (compact === 2) {
        tw = Math.min(w, 32); th = Math.min(h, 32);
      } else if (compact === 1) {
        if (rank < 8) { tw = Math.min(w, 64); th = Math.min(h, 64); }
        else { tw = Math.min(w, 32); th = Math.min(h, 32); }
      } else {
        const hiLimit = nActive <= 24 ? 8 : 3;
        if (rank < hiLimit || texId === 0x274E) { tw = Math.min(w, 128); th = Math.min(h, 128); }
        else { tw = Math.min(w, 64); th = Math.min(h, 64); }
      }
    }
    tw = Math.max(32, tw);
    th = Math.max(8, th);
    const ds = downsampleIndexed(w, h, indices, tw, th);
    w = ds.w; h = ds.h; indices = ds.indices;
    const pal16 = bpp === 8 ? quantize8to4(pal, indices) : { pal16: pal, indices };
    if (i < outCnt) {
      entries.set(i, encodePsp4BitTex(texId, w, h, pal16.pal16, pal16.indices));
    }
  }

  if (isPart1 && pspTemplateP1Dec) {
    const tCnt = rdU32(pspTemplateP1Dec, 0);
    for (let i = 46; i < Math.min(59, tCnt); i++) {
      const to = rdU32(pspTemplateP1Dec, 8 + i * 4);
      if (to !== 0) {
        const tsz = rdU32(pspTemplateP1Dec, to + 8);
        entries.set(i, pspTemplateP1Dec.subarray(to, to + tsz));
      }
    }
  }

  const hdr = new Uint8Array(hdrTableEnd);
  wrU32(hdr, 0, outCnt);
  wrU32(hdr, 4, 8);
  const bodyParts = [];
  let curOff = hdrTableEnd;
  for (let i = 0; i < outCnt; i++) {
    const blob = entries.get(i);
    if (blob) {
      const padded = padAlign(blob, 0x40);
      wrU32(hdr, 8 + i * 4, curOff);
      bodyParts.push(padded);
      curOff += padded.byteLength;
    }
  }
  return concatBytes([hdr, ...bodyParts]);
}

// --- VIF1/VU1 geometry unpacking & PSP GE Display List conversion ---
function parsePs2VifRaw(buf, start, end) {
  let pos = start;
  let cl = 1, wl = 1;
  const vuPos = new Map();
  const vuUv = new Map();
  const vuColAddr = new Map();
  const vuColMap = new Map();
  let seen68 = false;
  const batches = [];

  while (pos + 4 <= end) {
    const w = rdU32(buf, pos);
    const cmd = (w >>> 24) & 0x7F;
    const num = (w >>> 16) & 0xFF;
    const imm = w & 0xFFFF;
    if (cmd === 0x00 || cmd === 0x05 || cmd === 0x14 || cmd === 0x15 || cmd === 0x17) {
      pos += 4;
    } else if (cmd === 0x01) {
      cl = imm & 0xFF;
      wl = (imm >>> 8) & 0xFF;
      pos += 4;
    } else if (cmd === 0x20) {
      pos += 8;
    } else if (cmd === 0x30) {
      pos += 20;
    } else if ((cmd & 0x60) === 0x60) {
      const vn = (cmd >>> 2) & 3;
      const vl = cmd & 3;
      const ncomp = vn + 1;
      const bits = 32 >>> vl;
      const n = num === 0 ? 256 : num;
      const rawBytes = Math.floor((n * ncomp * bits + 7) / 8);
      const alignedBytes = (rawBytes + 3) & ~3;
      const addr = imm & 0x3FF;
      if (pos + 4 + alignedBytes > end) break;
      const dataOff = pos + 4;

      if (cmd === 0x68) {
        seen68 = true;
        const step = cl >= wl ? cl : 1;
        for (let i = 0; i < n; i++) {
          const o = dataOff + i * 12;
          vuPos.set(addr + i * step, [rdI32(buf, o) / 16.0, rdI32(buf, o + 4) / 16.0, rdI32(buf, o + 8) / 16.0]);
        }
      } else if (cmd === 0x65) {
        const step = cl >= wl ? cl : 1;
        const baseA = addr - 3;
        for (let i = 0; i < n; i++) {
          const o = dataOff + i * 4;
          vuUv.set(baseA + i * step, [rdI16(buf, o), rdI16(buf, o + 2)]);
        }
      } else if (cmd === 0x71) {
        const step = cl >= wl ? cl : 1;
        for (let i = 0; i < n; i++) {
          vuColAddr.set(addr + i * step, rdU16(buf, dataOff + i * 2));
        }
      } else if (cmd === 0x6E) {
        for (let i = 0; i < n; i++) {
          const o = dataOff + i * 4;
          vuColMap.set(addr + i, [
            Math.min(255, buf[o] * 2),
            Math.min(255, buf[o + 1] * 2),
            Math.min(255, buf[o + 2] * 2),
            ps2Alpha(buf[o + 3]),
          ]);
        }
      } else if (cmd === 0x6D && seen68 && addr >= 0x00C) {
        const sortedVaddrs = Array.from(vuPos.keys()).sort((a, b) => a - b);
        const vaddrToIdx = new Map();
        const positions = new Array(sortedVaddrs.length);
        const uvs = new Array(sortedVaddrs.length);
        const colors = new Array(sortedVaddrs.length);
        for (let i = 0; i < sortedVaddrs.length; i++) {
          const va = sortedVaddrs[i];
          vaddrToIdx.set(va, i);
          positions[i] = vuPos.get(va);
          uvs[i] = vuUv.get(va) || [0, 0];
          const ca = vuColAddr.has(va) ? vuColAddr.get(va) : -1;
          colors[i] = vuColMap.get(ca) || [128, 128, 128, 255];
        }
        const strips = [];
        let q0 = null, q1 = null, curStrip = null;
        const nEnt = n * 4;
        for (let i = 0; i < nEnt; i++) {
          const e = rdU16(buf, dataOff + i * 2);
          if (e === 0) continue;
          const adc = (e & 0x8000) !== 0;
          const va = e & 0x7FFF;
          const vIdx = vaddrToIdx.get(va);
          if (vIdx === undefined) continue;
          if (adc) {
            if (curStrip && curStrip.length >= 3) strips.push(curStrip);
            curStrip = null;
            q0 = q1; q1 = vIdx;
          } else {
            if (!curStrip) {
              if (q0 !== null && q1 !== null) curStrip = [q0, q1, vIdx];
            } else {
              curStrip.push(vIdx);
            }
            q0 = q1; q1 = vIdx;
          }
        }
        if (curStrip && curStrip.length >= 3) strips.push(curStrip);
        if (strips.length > 0) batches.push({ positions, uvs, colors, strips });
        vuPos.clear(); vuUv.clear(); vuColAddr.clear(); vuColMap.clear();
        seen68 = false;
      }
      pos += 4 + alignedBytes;
    } else {
      pos += 4;
    }
  }
  return batches;
}

function convertPs2SubmodelToPsp(subPs2, validTids, tidRemap) {
  if (subPs2.byteLength < 0x80 || rdU32(subPs2, 0) !== 0xFFFF0003) return null;
  const nmeshes = rdU32(subPs2, 0x20);
  const mesh0Off = rdU32(subPs2, 0x24);
  const texOff = rdU32(subPs2, 0x18);
  const ntex = rdU32(subPs2, 0x38);
  const nbones = rdU32(subPs2, 0x0C);

  const prefix = subPs2.slice(0, mesh0Off);
  const boneMats = [];
  for (let bi = 0; bi < nbones; bi++) {
    const m = new Float32Array(16);
    for (let k = 0; k < 16; k++) m[k] = rdF32(prefix, 0x80 + bi * 64 + k * 4);
    boneMats.push(m);
  }
  if (nbones > 0) {
    const idMat = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
    for (let k = 0; k < 16; k++) wrF32(prefix, 0x80 + k * 4, idMat[k]);
  }
  const tids = new Array(ntex);
  for (let i = 0; i < ntex; i++) {
    let t = rdU32(prefix, texOff + i * 4);
    if (tidRemap && tidRemap.has(t)) t = tidRemap.get(t);
    tids[i] = t;
    wrU32(prefix, texOff + i * 4, t);
  }

  const grouped = new Map();
  const groupOrder = [];
  let moff = mesh0Off;
  for (let mi = 0; mi < nmeshes; mi++) {
    if (moff + 0xC0 > subPs2.byteLength) break;
    const remSz = rdU32(subPs2, moff);
    const vifRel = rdU32(subPs2, moff + 8);
    const texIdx = rdU32(subPs2, moff + 0x34);
    const matFlags = rdU32(subPs2, moff + 0x40);
    const tid = texIdx < tids.length ? tids[texIdx] : (tids.length ? tids[0] : 0x2710);
    if (validTids && !validTids.has(tid)) {
      if (remSz === 0) break;
      moff += remSz;
      continue;
    }

    const nbMesh = rdU32(subPs2, moff + 0x1C);
    const b0Idx = rdU16(subPs2, moff + 0xB0);
    let tx = 0, ty = 0, tz = 0;
    if (nbMesh === 1 && b0Idx < boneMats.length) {
      tx = boneMats[b0Idx][12]; ty = boneMats[b0Idx][13]; tz = boneMats[b0Idx][14];
    }

    const mEnd = remSz > 0 ? Math.min(subPs2.byteLength, moff + remSz) : subPs2.byteLength;
    const batches = parsePs2VifRaw(subPs2, moff + vifRel, mEnd);

    const primCmds = [];
    let nvertsTot = 0;
    // Count total verts first to allocate exact vbuf
    for (const b of batches) {
      for (const s of b.strips) {
        if (s.length < 3) continue;
        if (nvertsTot + s.length > 65000) break;
        nvertsTot += s.length;
      }
    }
    if (nvertsTot === 0) {
      if (remSz === 0) break;
      moff += remSz;
      continue;
    }

    const vbuf = new Uint8Array(nvertsTot * 20);
    const vdv = dvOf(vbuf);
    let voff = 0, curVerts = 0;
    let minx = 1e30, miny = 1e30, minz = 1e30, maxx = -1e30, maxy = -1e30, maxz = -1e30;

    for (const { positions, uvs, colors, strips } of batches) {
      for (const strip of strips) {
        const slen = strip.length;
        if (slen < 3) continue;
        if (curVerts + slen > 65000) break;
        primCmds.push((0x04040000 | slen) >>> 0);
        for (let k = 0; k < slen; k++) {
          const vi = strip[k];
          const p = positions[vi], uv = uvs[vi], c = colors[vi];
          const xf = p[0] + tx, yf = p[1] + ty, zf = p[2] + tz;
          if (xf < minx) minx = xf; if (yf < miny) miny = yf; if (zf < minz) minz = zf;
          if (xf > maxx) maxx = xf; if (yf > maxy) maxy = yf; if (zf > maxz) maxz = zf;
          vdv.setUint16(voff, (uv[0] + 0x8000) & 0xFFFF, true);
          vdv.setUint16(voff + 2, (uv[1] + 0x8000) & 0xFFFF, true);
          vdv.setUint32(voff + 4, (c[0] | (c[1] << 8) | (c[2] << 16) | (c[3] << 24)) >>> 0, true);
          vdv.setFloat32(voff + 8, xf, true);
          vdv.setFloat32(voff + 12, yf, true);
          vdv.setFloat32(voff + 16, zf, true);
          voff += 20;
        }
        curVerts += slen;
      }
    }

    if (curVerts > 0 && primCmds.length > 0) {
      const key = `${texIdx}_${matFlags}`;
      if (!grouped.has(key)) {
        grouped.set(key, { texIdx, chunks: [] });
        groupOrder.push(key);
      }
      const chunks = grouped.get(key).chunks;
      const last = chunks.length > 0 ? chunks[chunks.length - 1] : null;
      if (last && last.nverts + curVerts <= 3500) {
        for (const pc of primCmds) last.primCmds.push(pc);
        last.vbufParts.push(vbuf);
        last.nverts += curVerts;
        if (minx < last.bb[0]) last.bb[0] = minx;
        if (miny < last.bb[1]) last.bb[1] = miny;
        if (minz < last.bb[2]) last.bb[2] = minz;
        if (maxx > last.bb[3]) last.bb[3] = maxx;
        if (maxy > last.bb[4]) last.bb[4] = maxy;
        if (maxz > last.bb[5]) last.bb[5] = maxz;
      } else {
        chunks.push({
          mhdr: subPs2.slice(moff, moff + 0xC0),
          primCmds,
          vbufParts: [vbuf],
          nverts: curVerts,
          bb: [minx, miny, minz, maxx, maxy, maxz],
        });
      }
    }

    if (remSz === 0) break;
    moff += remSz;
  }

  const pspMeshes = [];
  for (const key of groupOrder) {
    const { texIdx, chunks } = grouped.get(key);
    for (const ch of chunks) {
      const dlWords = [
        0x10000000, 0x55000000, 0x580000FF, 0x56000000, 0x57000000, 0x1200019E, 0x14000000, 0,
        ...ch.primCmds,
        0x13000000, 0x0B000000,
      ];
      const dlLen = dlWords.length * 4;
      const vbufRel = 0xC0 + dlLen;
      dlWords[7] = (0x01000000 | (vbufRel - 0xD8)) >>> 0;
      const dlBytes = new Uint8Array(dlLen);
      for (let i = 0; i < dlWords.length; i++) wrU32(dlBytes, i * 4, dlWords[i]);

      const vbuf = concatBytes(ch.vbufParts);
      const rawLen = vbufRel + vbuf.byteLength;
      const newRemSz = (rawLen + 0x0F) & ~0x0F;
      const pad = new Uint8Array(newRemSz - rawLen);

      const mhdr = ch.mhdr;
      wrU32(mhdr, 0x00, newRemSz); wrU32(mhdr, 0x04, 0); wrU32(mhdr, 0x08, vbufRel);
      wrU32(mhdr, 0x0C, 0); wrU32(mhdr, 0x10, ch.nverts); wrU32(mhdr, 0x14, 0);
      wrU32(mhdr, 0x18, 0xB0); wrU32(mhdr, 0x1C, 1); wrU32(mhdr, 0x20, 0xB0); wrU32(mhdr, 0x24, 0);
      wrU32(mhdr, 0x28, 0xB2); wrU32(mhdr, 0x2C, 0x0000019E); wrU32(mhdr, 0x30, 0xC0); wrU32(mhdr, 0x34, texIdx);
      wrU32(mhdr, 0x38, 0xB2); wrU32(mhdr, 0x3C, 0xB4);
      wrU32(mhdr, 0x54, 0x90);
      wrU32(mhdr, 0x5C, ((0x0014 << 16) | (ch.nverts & 0xFFFF)) >>> 0);
      wrF32(mhdr, 0x90, ch.bb[0]); wrF32(mhdr, 0x94, ch.bb[1]); wrF32(mhdr, 0x98, ch.bb[2]); wrF32(mhdr, 0x9C, 0);
      wrF32(mhdr, 0xA0, ch.bb[3]); wrF32(mhdr, 0xA4, ch.bb[4]); wrF32(mhdr, 0xA8, ch.bb[5]); wrF32(mhdr, 0xAC, 0);
      wrU32(mhdr, 0xB0, 0); wrU32(mhdr, 0xB4, 0x01010000); wrU32(mhdr, 0xB8, 0); wrU32(mhdr, 0xBC, 0);

      pspMeshes.push(concatBytes([mhdr, dlBytes, vbuf, pad]));
    }
  }
  if (pspMeshes.length === 0) return null;
  const meshesBlob = concatBytes(pspMeshes);
  const totSz = prefix.byteLength + meshesBlob.byteLength;
  wrU32(prefix, 0x20, pspMeshes.length);
  wrU32(prefix, 0x2C, totSz);
  wrU32(prefix, 0x34, totSz);
  wrU32(prefix, 0x64, 0x60);
  return concatBytes([prefix, meshesBlob]);
}

// --- Container 0x600 / 0x10600 helpers ---
async function pack10600(decBytes) {
  const comp = await zlibCompress(decBytes);
  const hdr = new Uint8Array(32);
  wrU32(hdr, 0, 0x10600);
  wrU32(hdr, 4, comp.byteLength);
  wrU32(hdr, 8, decBytes.byteLength);
  return padAlign(concatBytes([hdr, comp]), 0x10);
}

async function getPartFrom600(blob, pi) {
  if (blob.byteLength < 0x40 || rdU32(blob, 0) !== 0x600) {
    throw new Error("NOT_PS2_STADIUM_600");
  }
  const cnt = rdU32(blob, 0x20);
  if (cnt < 5) throw new Error("NOT_5PART_STADIUM");
  const sz = rdU32(blob, 4);
  const po = 0x20 + rdU32(blob, 0x28 + pi * 4);
  const pend = pi < 4 ? (0x20 + rdU32(blob, 0x28 + (pi + 1) * 4)) : (0x20 + sz);
  const pblob = blob.subarray(po, Math.min(blob.byteLength, pend));
  const pk = rdU32(pblob, 0);
  const pcsz = rdU32(pblob, 4);
  const dec = (pk & 0x10000) ? await zlibDecompress(pblob.subarray(32, 32 + pcsz)) : pblob;
  return { raw: pblob, dec };
}

async function prepareStadiumBase(pspAfs, ps2Blob, isNight, compact) {
  const bTmpl = await pspAfs.getMember(isNight ? 9582 : 9581);
  const { dec: tmplP1 } = await getPartFrom600(bTmpl, 1);
  const { dec: tmplP2 } = await getPartFrom600(bTmpl, 2);
  const { raw: tmplP3Raw } = await getPartFrom600(bTmpl, 3);
  const { raw: tmplP4Raw } = await getPartFrom600(bTmpl, 4);

  const { dec: ps2P0 } = await getPartFrom600(ps2Blob, 0);
  const { dec: ps2P1 } = await getPartFrom600(ps2Blob, 1);
  const { dec: ps2P2 } = await getPartFrom600(ps2Blob, 2);

  const newP0 = convertTexPart(ps2P0, false, null, compact);
  const newP1 = convertTexPart(ps2P1, true, tmplP1, compact);

  const validTids = new Set([0x28A0, 0x28A1, 0x28A2, 0x28A3, 0x2904]);
  for (let t = 0x2774; t < 0x2779; t++) validTids.add(t);
  for (let t = 0x283C; t < 0x286B; t++) validTids.add(t);
  for (const pd of [newP0, newP1]) {
    const c = rdU32(pd, 0);
    for (let i = 0; i < c; i++) {
      const o = rdU32(pd, 8 + i * 4);
      if (o !== 0) validTids.add(rdU32(pd, o + 12));
    }
  }
  const tidRemap = new Map([[0x2779, 0x2774], [0x277A, 0x2775]]);

  const cnt2 = 27;
  const baseSubs = new Array(cnt2).fill(null);
  for (let si = 1; si < cnt2; si++) {
    if (si === 12 || (compact >= 2 && si >= 23)) continue;
    const od = rdU32(ps2P2, 8 + si * 4);
    if (od !== 0 && od + 0x30 <= ps2P2.byteLength) {
      const tsz = rdU32(ps2P2, od + 0x2C);
      const conv = convertPs2SubmodelToPsp(ps2P2.subarray(od, od + tsz), validTids, tidRemap);
      if (conv) baseSubs[si] = conv;
    }
  }

  // Always inject PSP native sub[21] (3D goalposts + crossbar + 49 pitch adboards) if absent in PS2
  if (!baseSubs[21]) {
    const od21 = rdU32(tmplP2, 8 + 21 * 4);
    if (od21 !== 0) {
      const tsz21 = rdU32(tmplP2, od21 + 0x2C);
      baseSubs[21] = tmplP2.subarray(od21, od21 + tsz21);
    }
  }

  const p0Pack = await pack10600(newP0);
  const p1Pack = await pack10600(newP1);
  const p3Pack = padAlign(tmplP3Raw, 0x10);
  const p4Pack = padAlign(tmplP4Raw, 0x10);
  return { validTids, tidRemap, baseSubs, p0Pack, p1Pack, p3Pack, p4Pack };
}

async function loadCrowdSubsFromBlobs(mainBlob, eastBlob, validTids, tidRemap) {
  const cand = new Map();
  if (mainBlob && mainBlob.byteLength > 32) {
    const pk = rdU32(mainBlob, 0), pcsz = rdU32(mainBlob, 4);
    if (pk & 0x10000) {
      const crDec = await zlibDecompress(mainBlob.subarray(32, 32 + pcsz));
      if (rdU32(crDec, 0) === 3) {
        const targets = [15, 16, 17];
        for (let ci = 0; ci < 3; ci++) {
          const co = rdU32(crDec, 8 + ci * 4);
          if (co !== 0) {
            const ctsz = rdU32(crDec, co + 0x2C);
            const conv = convertPs2SubmodelToPsp(crDec.subarray(co, co + ctsz), validTids, tidRemap);
            if (conv) cand.set(targets[ci], conv);
          }
        }
      }
    }
  }
  if (eastBlob && eastBlob.byteLength > 32) {
    const pk = rdU32(eastBlob, 0), pcsz = rdU32(eastBlob, 4);
    if (pk & 0x10000) {
      const crDec = await zlibDecompress(eastBlob.subarray(32, 32 + pcsz));
      if (rdU32(crDec, 0) === 1) {
        const co = rdU32(crDec, 8);
        if (co !== 0) {
          const ctsz = rdU32(crDec, co + 0x2C);
          const conv = convertPs2SubmodelToPsp(crDec.subarray(co, co + ctsz), validTids, tidRemap);
          if (conv) cand.set(14, conv);
        }
      }
    }
  }
  return cand;
}

async function finishStadiumMember(sourceAfs, ps2MIdx, prepared, crowdLevel, isCampNouDay) {
  const { validTids, tidRemap, baseSubs, p0Pack, p1Pack, p3Pack, p4Pack } = prepared;
  const subBlobs = baseSubs.slice();
  let baseP2Sz = 0x80;
  for (const sb of subBlobs) if (sb) baseP2Sz += (sb.byteLength + 0xF) & ~0xF;

  let crowdCount = 0;
  if (sourceAfs && ps2MIdx !== null && crowdLevel) {
    const ladders = {
      full: [[-1, 6], [-2, 5], [-3, 4], [-4, 3]],
      med:  [[-2, 5], [-3, 4], [-4, 3]],
      low:  [[-4, 3], [-3, 4]],
    };
    const ladder = ladders[crowdLevel] || [];
    for (let li = 0; li < ladder.length; li++) {
      const [relMain, relE] = ladder[li];
      const relEast = isCampNouDay ? relE + 4 : relE;
      const bMain = await sourceAfs.getMember(ps2MIdx + relMain);
      const bEast = await sourceAfs.getMember(ps2MIdx + relEast);
      const cand = await loadCrowdSubsFromBlobs(bMain, bEast, validTids, tidRemap);
      if (cand.size === 0) continue;
      let crSz = 0;
      for (const sb of cand.values()) crSz += (sb.byteLength + 0xF) & ~0xF;
      if (baseP2Sz + crSz <= MAX_P2_UNCOMP || li === ladder.length - 1) {
        for (const [ks, vs] of cand.entries()) {
          const asz = (vs.byteLength + 0xF) & ~0xF;
          if (baseP2Sz + asz <= MAX_P2_UNCOMP) {
            subBlobs[ks] = vs;
            baseP2Sz += asz;
            crowdCount++;
          }
        }
        break;
      }
    }
  }

  const p2Hdr = new Uint8Array(0x80);
  wrU32(p2Hdr, 0, 27);
  wrU32(p2Hdr, 4, 8);
  const p2Parts = [];
  let curP2 = 0x80;
  for (let si = 0; si < 27; si++) {
    if (subBlobs[si]) {
      const sb = padAlign(subBlobs[si], 0x10);
      wrU32(p2Hdr, 8 + si * 4, curP2);
      p2Parts.push(sb);
      curP2 += sb.byteLength;
    }
  }
  const newP2Dec = concatBytes([p2Hdr, ...p2Parts]);
  const p2Pack = await pack10600(newP2Dec);

  const partsOut = [p0Pack, p1Pack, p2Pack, p3Pack, p4Pack];
  const bodyHdr = new Uint8Array(0x20);
  wrU32(bodyHdr, 0, 5);
  wrU32(bodyHdr, 4, 8);
  let cur = 0x20;
  for (let i = 0; i < 5; i++) {
    wrU32(bodyHdr, 8 + i * 4, cur);
    cur += partsOut[i].byteLength;
  }
  const body = concatBytes([bodyHdr, ...partsOut]);
  const topHdr = new Uint8Array(32);
  wrU32(topHdr, 0, 0x600);
  wrU32(topHdr, 4, body.byteLength);
  return { blob: concatBytes([topHdr, body]), p2Uncomp: newP2Dec.byteLength, crowdCount };
}

async function extractSlot133Extras(pspAfs) {
  const b55 = await pspAfs.getMember(55);
  const cnt7 = rdU32(b55, 0);
  const vids7 = [], vsizes7 = [], origFiles = [];
  let cur = 8 + 8 * cnt7;
  for (let i = 0; i < cnt7; i++) {
    vids7.push(rdU32(b55, 8 + i * 4));
    const sz = rdU32(b55, 8 + (cnt7 + i) * 4);
    vsizes7.push(sz);
    origFiles.push(b55.subarray(cur, cur + sz));
    cur += sz;
  }
  return { vids7, extras: [origFiles[4], origFiles[5], origFiles[6]] };
}

function packV2Bundle(vids7, extras, dFull, nFull, dMed, nMed, dLow, nLow) {
  const vids9 = [...vids7, 9585, 9586];
  const raw9 = [dFull, nFull, dMed, nMed, extras[0], extras[1], extras[2], dLow, nLow];
  const files9 = raw9.map((f, i) => (i === 4 || i === 5 || i === 6) ? f : padAlign(f, 0x20));
  const vsizes9 = files9.map((f) => f.byteLength);
  const hdrLen = 8 + 8 * 9;
  const tot9 = hdrLen + vsizes9.reduce((a, b) => a + b, 0);
  const hdr = new Uint8Array(hdrLen);
  wrU32(hdr, 0, 9);
  wrU32(hdr, 4, tot9);
  for (let i = 0; i < 9; i++) {
    wrU32(hdr, 8 + i * 4, vids9[i]);
    wrU32(hdr, 8 + (9 + i) * 4, vsizes9[i]);
  }
  return concatBytes([hdr, ...files9]);
}

// --- Build a guaranteed-valid 9-member Vita stadium .bin (with automatic RAM-safety fallback) ---
export async function buildVitaStadiumFromAfs(pspAfs, sourceAfs, dayIdx, nightIdx, isCampNouDay = false) {
  const { vids7, extras } = await extractSlot133Extras(pspAfs);
  const daySrc = await sourceAfs.getMember(dayIdx);
  const nightSrc = await sourceAfs.getMember(nightIdx);
  if (daySrc.byteLength < 64 || rdU32(daySrc, 0) !== 0x600) throw new Error("INVALID_DAY_STADIUM");
  if (nightSrc.byteLength < 64 || rdU32(nightSrc, 0) !== 0x600) throw new Error("INVALID_NIGHT_STADIUM");

  const extrasAligned = extras.reduce((a, f) => a + ((f.byteLength + 2047) & ~2047), 0);

  // Automatic RAM safety ladder: try compact=0 first, step down only if a huge custom patch exceeds 1020 KB active cache
  let lastErr = null;
  for (const compact of [0, 1, 2]) {
    const dayPrep = await prepareStadiumBase(pspAfs, daySrc, false, compact);
    const nightPrep = await prepareStadiumBase(pspAfs, nightSrc, true, compact);
    const dFull = await finishStadiumMember(sourceAfs, dayIdx, dayPrep, "full", isCampNouDay);
    const nFull = await finishStadiumMember(sourceAfs, nightIdx, nightPrep, "full", false);
    const activeFull = ((dFull.blob.byteLength + 2047) & ~2047) + ((nFull.blob.byteLength + 2047) & ~2047) + extrasAligned;

    if (activeFull <= STADIUM_CACHE_CAP) {
      const dMed = await finishStadiumMember(sourceAfs, dayIdx, dayPrep, "med", isCampNouDay);
      const nMed = await finishStadiumMember(sourceAfs, nightIdx, nightPrep, "med", false);
      const dLow = await finishStadiumMember(sourceAfs, dayIdx, dayPrep, "low", isCampNouDay);
      const nLow = await finishStadiumMember(sourceAfs, nightIdx, nightPrep, "low", false);
      const blob = packV2Bundle(vids7, extras, dFull.blob, nFull.blob, dMed.blob, nMed.blob, dLow.blob, nLow.blob);
      const report = await validateVitaStadiumBin(blob);
      report.compactUsed = compact;
      if (report.ok) return { blob, report };
      lastErr = report.errors.join("; ");
    } else {
      lastErr = `Active RAM ${Math.round(activeFull / 1024)} KB exceeds 1020 KB at compact=${compact}`;
    }
  }
  throw new Error(lastErr || "STADIUM_EXCEEDS_VITA_RAM");
}

// Build from standalone loose PS2 stadium .bin file(s) (Day + optional Night)
export async function buildVitaStadiumFromLooseBins(pspAfs, dayBytes, nightBytes) {
  const { vids7, extras } = await extractSlot133Extras(pspAfs);
  const nightSrc = nightBytes && nightBytes.byteLength >= 64 ? nightBytes : dayBytes;
  if (dayBytes.byteLength < 64 || rdU32(dayBytes, 0) !== 0x600) throw new Error("NOT_PS2_STADIUM_600");
  if (nightSrc.byteLength < 64 || rdU32(nightSrc, 0) !== 0x600) throw new Error("NOT_PS2_STADIUM_600");
  const extrasAligned = extras.reduce((a, f) => a + ((f.byteLength + 2047) & ~2047), 0);

  for (const compact of [0, 1, 2]) {
    const dayPrep = await prepareStadiumBase(pspAfs, dayBytes, false, compact);
    const nightPrep = await prepareStadiumBase(pspAfs, nightSrc, true, compact);
    const d0 = await finishStadiumMember(null, null, dayPrep, null, false);
    const n0 = await finishStadiumMember(null, null, nightPrep, null, false);
    const active = ((d0.blob.byteLength + 2047) & ~2047) + ((n0.blob.byteLength + 2047) & ~2047) + extrasAligned;
    if (active <= STADIUM_CACHE_CAP) {
      const blob = packV2Bundle(vids7, extras, d0.blob, n0.blob, d0.blob, n0.blob, d0.blob, n0.blob);
      const report = await validateVitaStadiumBin(blob);
      report.compactUsed = compact;
      if (report.ok) return { blob, report };
    }
  }
  throw new Error("STADIUM_EXCEEDS_VITA_RAM");
}

// --- Strict Vita .bin validator ---
export async function validateVitaStadiumBin(bytes) {
  const errors = [];
  const warnings = [];
  if (bytes.byteLength < 80) return { ok: false, errors: ["File too small"], warnings };
  const cnt = rdU32(bytes, 0);
  if (cnt !== 9) return { ok: false, errors: [`Expected 9 members, got ${cnt}`], warnings };
  const vsizes = [];
  const offs = [];
  let cur = 80;
  for (let i = 0; i < 9; i++) {
    const sz = rdU32(bytes, 8 + (9 + i) * 4);
    vsizes.push(sz);
    offs.push(cur);
    cur += sz;
  }
  if (cur !== bytes.byteLength) errors.push(`Size mismatch: header=${cur}, file=${bytes.byteLength}`);

  let maxStagedBytes = 0;
  let maxP2Bytes = 0;
  let minCrowdStands = 4;
  let hasGoalposts = true;
  let goalpostTex128 = true;

  const tiers = [["L3_FULL", 0, 1], ["L2_MED", 2, 3], ["L0_MIN", 7, 8]];
  for (const [tier, di, ni] of tiers) {
    let staged = 0;
    for (const m of [di, ni, 4, 5, 6]) staged += (vsizes[m] + 2047) & ~2047;
    if (staged > maxStagedBytes) maxStagedBytes = staged;
    if (staged > STADIUM_CACHE_CAP) errors.push(`${tier} staged RAM ${Math.round(staged / 1024)} KB > 1020 KB`);

    for (const m of [di, ni]) {
      const mb = bytes.subarray(offs[m], offs[m] + vsizes[m]);
      const { dec: p1 } = await getPartFrom600(mb, 1);
      const { dec: p2 } = await getPartFrom600(mb, 2);
      if (p2.byteLength > maxP2Bytes) maxP2Bytes = p2.byteLength;
      if (p2.byteLength > MAX_P2_UNCOMP) errors.push(`${tier} m=${m} Part 2 ${Math.round(p2.byteLength / 1024)} KB > 768 KB`);
      const o42 = rdU32(p1, 8 + 42 * 4);
      if (o42 === 0) {
        goalpostTex128 = false;
        warnings.push(`${tier} missing 0x274E goalpost texture`);
      } else {
        const w42 = rdU16(p1, o42 + 20), h42 = rdU16(p1, o42 + 22);
        if (w42 < 128 || h42 < 128) goalpostTex128 = false;
      }
      if (rdU32(p2, 8 + 21 * 4) === 0) {
        hasGoalposts = false;
        errors.push(`${tier} missing sub[21] (goalposts/adboards)`);
      }
      let cr = 0;
      for (const si of [14, 15, 16, 17]) if (rdU32(p2, 8 + si * 4) !== 0) cr++;
      if (cr < minCrowdStands) minCrowdStands = cr;
    }
  }
  if (minCrowdStands === 0) warnings.push("No PS2 crowd files found for this stadium");

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    fileBytes: bytes.byteLength,
    maxStagedKB: Math.round(maxStagedBytes / 1024),
    maxP2KB: Math.round(maxP2Bytes / 1024),
    hasGoalposts,
    goalpostTex128,
    minCrowdStands,
  };
}

// --- Commentary Validator + PS2 ISO Sound Extractor ---
export async function inspectCommentaryFile(file) {
  const head = await readSlice(file, 0, 16);
  // Check if it's a PS2 ISO containing S_SOUND.AFS / E_SOUND.AFS
  if (!(head[0] === 0x41 && head[1] === 0x46 && head[2] === 0x53 && head[3] === 0x00)) {
    try {
      const files = await scanIsoFiles(file);
      const found = [];
      for (const [k, info] of files.entries()) {
        if (/^\/[EFGISJ]_SOUND\.AFS$/i.test(k)) {
          found.push({
            name: info.name.toLowerCase(),
            offset: info.offset,
            size: info.size,
            lang: k[1],
          });
        }
      }
      if (found.length > 0) {
        return { kind: "ps2_iso", ok: true, soundFiles: found };
      }
      if (files.has("/PSP_GAME/USRDIR/0_TEXT.AFS")) {
        return { kind: "psp_iso", ok: false, reason: "PSP_ISO_NO_COMMENTARY" };
      }
    } catch {
      // Not an ISO either
    }
    return { kind: "invalid", ok: false, reason: "NOT_AFS" };
  }

  const count = rdU32(head, 4);
  if (count < 100 || count > 60000) {
    return { kind: "afs", ok: false, reason: "INVALID_CLIP_COUNT", count };
  }
  const toc = await readSlice(file, 8, count * 8);
  // Sample up to 24 non-empty clips across the AFS
  const nonEmpty = [];
  for (let i = 0; i < count; i++) {
    const off = rdU32(toc, i * 8);
    const sz = rdU32(toc, i * 8 + 4);
    if (sz >= 0x20 && off + sz <= file.size) nonEmpty.push({ i, off, sz });
  }
  if (nonEmpty.length === 0) {
    return { kind: "afs", ok: false, reason: "EMPTY_AFS", count };
  }

  const step = Math.max(1, Math.floor(nonEmpty.length / 24));
  let validAdx = 0, tested = 0;
  let sampleRate = 0, channels = 0;
  for (let k = 0; k < nonEmpty.length && tested < 24; k += step) {
    const { off, sz } = nonEmpty[k];
    const h = await readSlice(file, off, 20);
    tested++;
    if (h.byteLength >= 20 && h[0] === 0x80 && h[1] === 0x00) {
      const dataOff = ((h[2] << 8) | h[3]) + 4;
      const enc = h[4], blk = h[5], bits = h[6], ch = h[7];
      const sr = ((h[8] << 24) | (h[9] << 16) | (h[10] << 8) | h[11]) >>> 0;
      const total = ((h[12] << 24) | (h[13] << 16) | (h[14] << 8) | h[15]) >>> 0;
      if (enc === 3 && blk === 18 && bits === 4 && (ch === 1 || ch === 2) && sr > 0 && total > 0 && dataOff < sz) {
        validAdx++;
        if (!sampleRate) { sampleRate = sr; channels = ch; }
      }
    }
  }

  if (validAdx === 0) {
    return { kind: "afs", ok: false, reason: "NOT_CRI_ADX", count, tested };
  }

  // Suggest target filename based on filename or clip count
  const lower = (file.name || "").toLowerCase();
  let suggestedName = "s_sound.afs";
  if (lower.includes("e_sound") || lower.includes("eng") || lower.includes("ingles")) {
    suggestedName = "e_sound.afs";
  } else if (lower.includes("names")) {
    suggestedName = "names.afs";
  }

  // PES6 PS2 commentary banks typically have ~4000-14000 clips (s_sound ~7800, e_sound ~7700)
  const countLooksPes6 = count >= 2500 && count <= 16000;
  return {
    kind: "afs",
    ok: true,
    count,
    nonEmptyCount: nonEmpty.length,
    validAdx,
    tested,
    sampleRate,
    channels,
    sizeMB: Math.round((file.size / (1024 * 1024)) * 10) / 10,
    suggestedName,
    countLooksPes6,
  };
}

// --- Zero-dependency STORE ZIP builder (already-compressed .bin files -> instant, 0% overhead) ---
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.byteLength; i++) c = CRC32_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export function createStoreZip(entries) {
  // entries: [{ name: "stadiums/bernabeu.bin", data: Uint8Array }]
  const te = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const ent of entries) {
    const nameBytes = te.encode(ent.name);
    const data = ent.data;
    const crc = crc32(data);
    const sz = data.byteLength;

    const lh = new Uint8Array(30 + nameBytes.byteLength);
    const ldv = dvOf(lh);
    ldv.setUint32(0, 0x04034B50, true);
    ldv.setUint16(4, 20, true);
    ldv.setUint16(6, 0x0800, true); // UTF-8
    ldv.setUint16(8, 0, true);      // STORE
    ldv.setUint32(14, crc, true);
    ldv.setUint32(18, sz, true);
    ldv.setUint32(22, sz, true);
    ldv.setUint16(26, nameBytes.byteLength, true);
    lh.set(nameBytes, 30);
    localParts.push(lh, data);

    const ch = new Uint8Array(46 + nameBytes.byteLength);
    const cdv = dvOf(ch);
    cdv.setUint32(0, 0x02014B50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, sz, true);
    cdv.setUint32(24, sz, true);
    cdv.setUint16(28, nameBytes.byteLength, true);
    cdv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    centralParts.push(ch);

    offset += lh.byteLength + sz;
  }

  const centralSize = centralParts.reduce((a, p) => a + p.byteLength, 0);
  const eocd = new Uint8Array(22);
  const edv = dvOf(eocd);
  edv.setUint32(0, 0x06054B50, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, offset, true);

  return new Blob([...localParts, ...centralParts, eocd], { type: "application/zip" });
}
