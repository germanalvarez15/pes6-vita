#!/usr/bin/env python3
"""
Convert any of the 38 PS2 PES6 stadiums embedded in PSP PES6 (ULES00476) 0_text.afs
into a PSP/PS Vita Slot 133 preload bundle (.bin) ready for:

  ux0:data/pes6vita/stadiums/<name>.bin   (with PES6_STADIUM=<name> in env.txt)

Usage:
  python3 tools/convert_stadium.py --list
  python3 tools/convert_stadium.py --iso pes6.iso --stadium bernabeu --out bernabeu.bin
  python3 tools/convert_stadium.py --iso pes6.iso --stadium 8 --out bombonera.bin
  python3 tools/convert_stadium.py --iso pes6.iso --all --out out/stadiums/
"""
import argparse
import math
import os
import struct
import sys
import zlib

# (id, slug, official_name, day_member_psp, night_member_psp)
STADIUMS = [
    (0,  "club_house",        "Club House",                  9593,  9626),
    (1,  "san_siro",          "San Siro",                    9659,  9692),
    (2,  "camp_nou",          "Catalonia Stadium (Camp Nou)", 9725, 9762),
    (3,  "highbury",          "Highbury",                    9795,  9828),
    (4,  "orange_arena",      "Orange Arena (Amsterdam)",    9861,  9894),
    (5,  "stade_louis_ii",    "Stade Louis II",              9993,  10026),
    (6,  "old_trafford",      "Old Trafford",                10059, 10092),
    (7,  "nakhon_ratchasima", "Nakhon Ratchasima",           10125, 10158),
    (8,  "bombonera",         "Estadio Gran Chaco (Bombonera)", 10191, 10224),
    (9,  "cuito_cuanavale",   "Cuito Cuanavale",             10257, 10290),
    (10, "amerigo_atlantis",  "Amerigo Atlantis",            10323, 10356),
    (11, "delle_alpi",        "Delle Alpi",                  10389, 10422),
    (12, "olimpico",          "Stadio Olimpico",             10455, 10488),
    (13, "ennio_tardini",     "Stadio Ennio Tardini",        10521, 10554),
    (14, "anfield",           "Red Cauldron (Anfield)",      10653, 10686),
    (15, "parc_des_princes",  "Lutecia Park (Parc des Princes)", 10719, 10752),
    (16, "velodrome",         "Massilia Stadium (Velodrome)", 10785, 10818),
    (17, "bernabeu",          "Santiago Bernabeu",           10851, 10884),
    (18, "westfalenstadion",  "Borussia Stadion",            10917, 10950),
    (19, "stockholm_arena",   "Stockholm Arena (Rasunda)",   10983, 11016),
    (20, "st_james_park",     "Magpie Park (St. James Park)", 11049, 11082),
    (21, "de_kuip",           "Rotterdam Stadion (De Kuip)", 11115, 11148),
    (22, "blautraum",         "Blautraum Stadion (PSP twin)", 11181, 11214),
    (23, "diamond_stadium",   "Diamond Stadium (Munich)",    11247, 11280),
    (24, "berlin_olimpia",    "Hauptstadtstadion (Berlin)",  11313, 11346),
    (25, "riazor",            "Riazor",                      11379, 11412),
    (26, "mestalla",          "Estadio Palo (Mestalla)",     11445, 11478),
    (27, "nangsoh",           "Nangsoh Stadium (Seoul)",     11511, 11544),
    (28, "kanji_dome",        "Kanji Dome (Sapporo)",        9061,  9094),
    (29, "dietro_monte",      "Dietro Monte Stadium",        9127,  9160),
    (30, "porto_folio",       "Porto Folio (Yokohama)",      9193,  9226),
    (31, "queensland_park",   "Queens land Park (Osaka)",    9259,  9292),
    (32, "haze_hills",        "Haze Hills (Tokyo)",          9325,  9358),
    (33, "kusunoki_mihama",   "Kusunoki-Mihama (Saitama)",   9391,  9424),
    (34, "occhio_del_mar",    "Occhio Del Mar (Oita)",       9457,  9490),
    (35, "ayase_nakano",      "Ayase-Nakano (Toyota)",       9523,  9556),
    (36, "hidden_a",          "Hidden Stadium A (Gap 9927)", 9927,  9960),
    (37, "hidden_b",          "Hidden Stadium B (Gap 10587)", 10587, 10620),
]


class PspIsoAfs:
    def __init__(self, iso_path):
        self.f = open(iso_path, "rb")
        files = {}

        def rd(lba, n):
            self.f.seek(lba * 2048)
            return self.f.read(n)

        def walk(rec, path):
            lba = struct.unpack_from("<I", rec, 2)[0]
            size = struct.unpack_from("<I", rec, 10)[0]
            data = rd(lba, size)
            o = 0
            while o < size:
                l = data[o]
                if l == 0:
                    o = (o // 2048 + 1) * 2048
                    continue
                r = data[o : o + l]
                nl = r[32]
                name = r[33 : 33 + nl]
                if name not in (b"\0", b"\1"):
                    n = name.decode(errors="replace").split(";")[0]
                    if r[25] & 2:
                        walk(r, path + n + "/")
                    else:
                        files[path + n] = (
                            struct.unpack_from("<I", r, 2)[0] * 2048,
                            struct.unpack_from("<I", r, 10)[0],
                        )
                o += l

        walk(rd(16, 2048)[156:190], "/")
        if "/PSP_GAME/USRDIR/0_text.afs" not in files:
            raise RuntimeError("Could not find /PSP_GAME/USRDIR/0_text.afs in ISO")
        self.afs_base, _ = files["/PSP_GAME/USRDIR/0_text.afs"]
        self.f.seek(self.afs_base)
        self.afs_dir = self.f.read(32768 * 4)

    def get_member(self, m_idx):
        s, n = struct.unpack_from("<II", self.afs_dir, m_idx * 8)
        if n == 0:
            return b""
        self.f.seek(self.afs_base + s * 2048)
        return self.f.read(n * 2048)

    def close(self):
        self.f.close()


def ps2_alpha(a):
    return min(255, a * 2) if a < 0x80 else 255


def decode_ps2_tex(blob, off):
    magic, ver, tot_sz, tex_id, tex_off, pal_off, w, h = struct.unpack_from("<IIIIHHHH", blob, off)
    assert magic == 0x29857294
    psm = blob[off + 25]
    if psm == 0x14:
        pal_raw = [struct.unpack_from("<BBBB", blob, off + pal_off + i * 4) for i in range(16)]
        pal = [(r, g, b, ps2_alpha(a)) for r, g, b, a in pal_raw]
        tex_data = blob[off + tex_off : off + tex_off + (w * h) // 2]
        indices = bytearray(w * h)
        for i in range(w * h):
            b = tex_data[i >> 1]
            indices[i] = (b >> 4) if (i & 1) else (b & 0xF)
        return tex_id, w, h, 4, pal, bytes(indices)
    elif psm == 0x13:
        pal_raw = [struct.unpack_from("<BBBB", blob, off + pal_off + i * 4) for i in range(256)]
        pal = [None] * 256
        for i in range(256):
            si = i ^ 0x18 if (i & 0x18) in (0x08, 0x10) else i
            r, g, b, a = pal_raw[si]
            pal[i] = (r, g, b, ps2_alpha(a))
        tex_data = blob[off + tex_off : off + tex_off + w * h]
        return tex_id, w, h, 8, pal, bytes(tex_data)
    raise ValueError(f"Unsupported PS2 PSM {psm:#x}")


def downsample_indexed(w, h, indices, target_w, target_h):
    if w == target_w and h == target_h:
        return w, h, indices
    out = bytearray(target_w * target_h)
    sx = w / target_w
    sy = h / target_h
    for ty in range(target_h):
        src_y = min(h - 1, int(ty * sy))
        row_off = src_y * w
        t_row = ty * target_w
        for tx in range(target_w):
            src_x = min(w - 1, int(tx * sx))
            out[t_row + tx] = indices[row_off + src_x]
    return target_w, target_h, bytes(out)


def quantize_8to4(pal256, indices):
    used_counts = {}
    for idx in indices:
        used_counts[idx] = used_counts.get(idx, 0) + 1
    if len(used_counts) <= 16:
        used_list = sorted(used_counts.keys())
        new_pal = [pal256[i] for i in used_list]
        while len(new_pal) < 16:
            new_pal.append((0, 0, 0, 0))
        remap = {old_i: new_i for new_i, old_i in enumerate(used_list)}
        return new_pal, bytes(remap[idx] for idx in indices)

    trans_indices = [i for i in used_counts if pal256[i][3] < 32]
    opaque_sorted = sorted(
        [i for i in used_counts if pal256[i][3] >= 32],
        key=lambda i: used_counts[i],
        reverse=True,
    )
    chosen = []
    if trans_indices:
        t_best = max(trans_indices, key=lambda i: used_counts[i])
        chosen.append(pal256[t_best])
    candidates = [(pal256[i], used_counts[i]) for i in opaque_sorted]
    if candidates and not chosen:
        chosen.append(candidates[0][0])

    while len(chosen) < 16 and len(chosen) < len(used_counts):
        best_c = None
        best_score = -1.0
        for c, cnt in candidates:
            min_d = min(
                (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2 + ((c[3] - p[3]) * 2) ** 2
                for p in chosen
            )
            score = min_d * (cnt ** 0.4)
            if score > best_score:
                best_score = score
                best_c = c
        if best_c is None or best_score == 0:
            break
        chosen.append(best_c)
    while len(chosen) < 16:
        chosen.append((0, 0, 0, 0))

    lut = [0] * 256
    for i in used_counts:
        c = pal256[i]
        if trans_indices and c[3] < 32:
            lut[i] = 0
        else:
            start_k = 1 if trans_indices else 0
            best_k = start_k
            best_d = 1e18
            for k in range(start_k, 16):
                p = chosen[k]
                d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2 + ((c[3] - p[3]) * 2) ** 2
                if d < best_d:
                    best_d = d
                    best_k = k
            lut[i] = best_k
    return chosen, bytes(lut[idx] for idx in indices)


def encode_psp_29857294_4bit(tex_id, w, h, pal16, indices):
    rowbytes = w // 2
    pix_sz = rowbytes * h
    linear = bytearray(pix_sz)
    for y in range(h):
        r_in = y * w
        r_out = y * rowbytes
        for bx in range(rowbytes):
            p0 = indices[r_in + (bx << 1)] & 0xF
            p1 = indices[r_in + (bx << 1) + 1] & 0xF
            linear[r_out + bx] = p0 | (p1 << 4)

    swiz = bytearray(pix_sz)
    for y in range(h):
        for bx in range(rowbytes):
            dst = ((y >> 3) * (rowbytes >> 4) + (bx >> 4)) * 128 + ((y & 7) << 4) + (bx & 15)
            swiz[dst] = linear[y * rowbytes + bx]

    pal_bytes = bytearray(64)
    for i in range(16):
        r, g, b, a = pal16[i] if i < len(pal16) else (0, 0, 0, 0)
        struct.pack_into("<BBBB", pal_bytes, i * 4, r, g, b, a)

    tot_sz = 0x80 + pix_sz
    hdr = bytearray(64)
    struct.pack_into("<IIIIHHHH", hdr, 0, 0x29857294, 1, tot_sz, tex_id, 0x80, 0x40, w, h)
    log2_w = int(round(math.log2(w)))
    log2_h = int(round(math.log2(h)))
    struct.pack_into("<BBBBBBBBII", hdr, 24, w & 0xFF, 4, log2_w, log2_h, 1, 3, 16, 1, pix_sz, 4)
    struct.pack_into("<HHBB", hdr, 40, w, h, w & 0xFF, 4)
    struct.pack_into("<I", hdr, 60, 1)
    return bytes(hdr) + bytes(pal_bytes) + bytes(swiz)


def convert_tex_part(ps2_part_dec, is_part1=False, psp_template_p1_dec=None, compact=0):
    cnt = struct.unpack_from("<I", ps2_part_dec, 0)[0]
    toffs = struct.unpack_from(f"<{cnt}I", ps2_part_dec, 8)
    active_indices = [i for i, o in enumerate(toffs) if o != 0]
    n_active = len(active_indices)

    out_cnt = 59 if is_part1 else 12
    hdr_table_end = ((8 + out_cnt * 4) + 0x3F) & ~0x3F

    entries_blobs = {}
    for rank, i in enumerate(active_indices):
        tid, w, h, bpp, pal, indices = decode_ps2_tex(ps2_part_dec, toffs[i])
        if not is_part1:
            if compact >= 2:
                tw, th = min(w, 32), min(h, 32)
            elif compact == 1 or tid == 0x2710 or rank >= 3:
                tw, th = min(w, 64), min(h, 64)
            else:
                tw, th = min(w, 128), min(h, 128)
        else:
            if compact >= 3:
                tw, th = (min(w, 32), min(h, 16)) if rank < 8 else (min(w, 32), min(h, 8))
            elif compact == 2:
                tw, th = min(w, 32), min(h, 32)
            elif compact == 1:
                if rank < 8:
                    tw, th = min(w, 64), min(h, 64)
                else:
                    tw, th = min(w, 32), min(h, 32)
            else:
                hi_limit = 8 if n_active <= 24 else 3
                if rank < hi_limit or tid == 0x274E:
                    tw, th = min(w, 128), min(h, 128)
                else:
                    tw, th = min(w, 64), min(h, 64)
        tw, th = max(32, tw), max(8, th)
        w, h, indices = downsample_indexed(w, h, indices, tw, th)
        if bpp == 8:
            pal16, indices = quantize_8to4(pal, indices)
        else:
            pal16 = pal
        if i < out_cnt:
            entries_blobs[i] = encode_psp_29857294_4bit(tid, w, h, pal16, indices)

    if is_part1 and psp_template_p1_dec is not None:
        t_cnt = struct.unpack_from("<I", psp_template_p1_dec, 0)[0]
        t_offs = struct.unpack_from(f"<{t_cnt}I", psp_template_p1_dec, 8)
        for i in range(46, min(59, t_cnt)):
            to = t_offs[i]
            if to != 0:
                tsz = struct.unpack_from("<I", psp_template_p1_dec, to + 8)[0]
                entries_blobs[i] = psp_template_p1_dec[to : to + tsz]

    out_offs = [0] * out_cnt
    body = bytearray()
    cur_off = hdr_table_end
    for i in range(out_cnt):
        if i in entries_blobs:
            blob = entries_blobs[i]
            if len(blob) % 0x40 != 0:
                blob += b"\0" * (0x40 - (len(blob) % 0x40))
            out_offs[i] = cur_off
            body.extend(blob)
            cur_off += len(blob)

    hdr = bytearray(hdr_table_end)
    struct.pack_into(f"<II{out_cnt}I", hdr, 0, out_cnt, 8, *out_offs)
    return bytes(hdr) + bytes(body)


def parse_ps2_vif_raw(buf, start, end):
    pos = start
    cl, wl = 1, 1
    vu_pos, vu_uv, vu_col_addr, vu_col_map = {}, {}, {}, {}
    seen_68 = False
    batches = []

    while pos + 4 <= end:
        w = struct.unpack_from("<I", buf, pos)[0]
        cmd = (w >> 24) & 0x7F
        num = (w >> 16) & 0xFF
        imm = w & 0xFFFF
        if cmd == 0x00 or cmd == 0x05 or cmd in (0x14, 0x15, 0x17):
            pos += 4
        elif cmd == 0x01:
            cl = imm & 0xFF
            wl = (imm >> 8) & 0xFF
            pos += 4
        elif cmd == 0x20:
            pos += 8
        elif cmd == 0x30:
            pos += 20
        elif (cmd & 0x60) == 0x60:
            vn = (cmd >> 2) & 3
            vl = cmd & 3
            ncomp = vn + 1
            bits = 32 >> vl
            n = 256 if num == 0 else num
            raw_bytes = (n * ncomp * bits + 7) // 8
            aligned_bytes = (raw_bytes + 3) & ~3
            addr = imm & 0x3FF
            if pos + 4 + aligned_bytes > end:
                break
            data = buf[pos + 4 : pos + 4 + aligned_bytes]

            if cmd == 0x68:
                seen_68 = True
                step = cl if cl >= wl else 1
                for i in range(n):
                    ix, iy, iz = struct.unpack_from("<iii", data, i * 12)
                    vu_pos[addr + i * step] = (ix / 16.0, iy / 16.0, iz / 16.0)
            elif cmd == 0x65:
                step = cl if cl >= wl else 1
                base_a = addr - 3
                for i in range(n):
                    iu, iv = struct.unpack_from("<hh", data, i * 4)
                    vu_uv[base_a + i * step] = (iu, iv)
            elif cmd == 0x71:
                step = cl if cl >= wl else 1
                for i in range(n):
                    vu_col_addr[addr + i * step] = struct.unpack_from("<H", data, i * 2)[0]
            elif cmd == 0x6E:
                for i in range(n):
                    r, g, b, a = struct.unpack_from("<BBBB", data, i * 4)
                    vu_col_map[addr + i] = (min(255, r * 2), min(255, g * 2), min(255, b * 2), ps2_alpha(a))
            elif cmd == 0x6D and seen_68 and addr >= 0x00C:
                entries = struct.unpack_from(f"<{n * 4}H", data, 0)
                sorted_vaddrs = sorted(vu_pos.keys())
                vaddr_to_idx = {va: idx for idx, va in enumerate(sorted_vaddrs)}
                positions = [vu_pos[va] for va in sorted_vaddrs]
                uvs = [vu_uv.get(va, (0, 0)) for va in sorted_vaddrs]
                colors = [vu_col_map.get(vu_col_addr.get(va, -1), (128, 128, 128, 255)) for va in sorted_vaddrs]

                strips = []
                q0 = q1 = None
                cur_strip = None
                for e in entries:
                    if e == 0:
                        continue
                    adc = (e & 0x8000) != 0
                    va = e & 0x7FFF
                    v_idx = vaddr_to_idx.get(va, -1)
                    if v_idx < 0 or v_idx >= len(positions):
                        continue
                    if adc:
                        if cur_strip is not None and len(cur_strip) >= 3:
                            strips.append(cur_strip)
                        cur_strip = None
                        q0, q1 = q1, v_idx
                    else:
                        if cur_strip is None:
                            if q0 is not None and q1 is not None:
                                cur_strip = [q0, q1, v_idx]
                        else:
                            cur_strip.append(v_idx)
                        q0, q1 = q1, v_idx
                if cur_strip is not None and len(cur_strip) >= 3:
                    strips.append(cur_strip)
                if strips:
                    batches.append((positions, uvs, colors, strips))
                vu_pos.clear()
                vu_uv.clear()
                vu_col_addr.clear()
                vu_col_map.clear()
                seen_68 = False
            pos += 4 + aligned_bytes
        else:
            pos += 4
    return batches


def convert_ps2_submodel_to_psp(sub_ps2, valid_tids=None, tid_remap=None):
    assert struct.unpack_from("<I", sub_ps2, 0)[0] == 0xFFFF0003
    nmeshes, mesh0_off = struct.unpack_from("<II", sub_ps2, 0x20)
    tex_off = struct.unpack_from("<I", sub_ps2, 0x18)[0]
    ntex = struct.unpack_from("<I", sub_ps2, 0x38)[0]
    nbones = struct.unpack_from("<I", sub_ps2, 0x0C)[0]

    prefix = bytearray(sub_ps2[:mesh0_off])
    bone_mats = [struct.unpack_from("<16f", prefix, 0x80 + bi * 64) for bi in range(nbones)]
    struct.pack_into("<16f", prefix, 0x80, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)

    tids = list(struct.unpack_from(f"<{ntex}I", prefix, tex_off))
    if tid_remap:
        tids = [tid_remap.get(t, t) for t in tids]
        struct.pack_into(f"<{ntex}I", prefix, tex_off, *tids)

    grouped = {}
    group_order = []
    moff = mesh0_off
    for _ in range(nmeshes):
        if moff + 0xC0 > len(sub_ps2):
            break
        rem_sz, _, vif_rel, _ = struct.unpack_from("<IIII", sub_ps2, moff)
        tex_idx = struct.unpack_from("<I", sub_ps2, moff + 0x34)[0]
        mat_flags = struct.unpack_from("<I", sub_ps2, moff + 0x40)[0]
        tid = tids[tex_idx] if tex_idx < len(tids) else (tids[0] if tids else 0x2710)
        if valid_tids is not None and tid not in valid_tids:
            if rem_sz == 0:
                break
            moff += rem_sz
            continue

        nb_mesh = struct.unpack_from("<I", sub_ps2, moff + 0x1C)[0]
        b0_idx = struct.unpack_from("<H", sub_ps2, moff + 0xB0)[0]
        tx = ty = tz = 0.0
        if nb_mesh == 1 and b0_idx < len(bone_mats):
            bm = bone_mats[b0_idx]
            tx, ty, tz = bm[12], bm[13], bm[14]

        m_end = (moff + rem_sz) if rem_sz > 0 else len(sub_ps2)
        batches = parse_ps2_vif_raw(sub_ps2, moff + vif_rel, m_end)

        prim_cmds = []
        vbuf = bytearray()
        nverts_tot = 0
        minx = miny = minz = 1e30
        maxx = maxy = maxz = -1e30

        for positions, uvs, colors, strips in batches:
            for strip in strips:
                slen = len(strip)
                if slen < 3:
                    continue
                if nverts_tot + slen > 65000:
                    break
                prim_cmds.append(0x04040000 | slen)
                for v_idx in strip:
                    xi, yi, zi = positions[v_idx]
                    ui, vi = uvs[v_idx]
                    r, g, b, a = colors[v_idx]
                    u_psp = (ui + 0x8000) & 0xFFFF
                    v_psp = (vi + 0x8000) & 0xFFFF
                    col_u32 = r | (g << 8) | (b << 16) | (a << 24)
                    xf, yf, zf = xi + tx, yi + ty, zi + tz
                    if xf < minx: minx = xf
                    if yf < miny: miny = yf
                    if zf < minz: minz = zf
                    if xf > maxx: maxx = xf
                    if yf > maxy: maxy = yf
                    if zf > maxz: maxz = zf
                    vbuf.extend(struct.pack("<HHIfff", u_psp, v_psp, col_u32, xf, yf, zf))
                nverts_tot += slen

        if nverts_tot > 0 and prim_cmds:
            key = (tex_idx, mat_flags)
            if key not in grouped:
                grouped[key] = []
                group_order.append(key)
            chunks = grouped[key]
            if chunks and chunks[-1][4] + nverts_tot <= 3500:
                ch = chunks[-1]
                ch[2].extend(prim_cmds)
                ch[3].extend(vbuf)
                ch[4] += nverts_tot
                bb = ch[5]
                ch[5] = (
                    min(bb[0], minx), min(bb[1], miny), min(bb[2], minz),
                    max(bb[3], maxx), max(bb[4], maxy), max(bb[5], maxz),
                )
            else:
                chunks.append([
                    bytearray(sub_ps2[moff : moff + 0xC0]),
                    b0_idx if nb_mesh == 1 else 0,
                    list(prim_cmds),
                    bytearray(vbuf),
                    nverts_tot,
                    (minx, miny, minz, maxx, maxy, maxz),
                ])

        if rem_sz == 0:
            break
        moff += rem_sz

    psp_meshes = []
    for key in group_order:
        tex_idx, _ = key
        for mhdr, _, prim_cmds, vbuf, nverts_tot, bb in grouped[key]:
            dl_words = (
                [0x10000000, 0x55000000, 0x580000FF, 0x56000000, 0x57000000, 0x1200019E, 0x14000000, 0]
                + prim_cmds
                + [0x13000000, 0x0B000000]
            )
            dl_len = len(dl_words) * 4
            vbuf_rel = 0xC0 + dl_len
            dl_words[7] = 0x01000000 | (vbuf_rel - 0xD8)
            dl_bytes = struct.pack(f"<{len(dl_words)}I", *dl_words)

            raw_mesh_len = vbuf_rel + len(vbuf)
            new_rem_sz = (raw_mesh_len + 0x0F) & ~0x0F
            pad_len = new_rem_sz - raw_mesh_len

            struct.pack_into("<IIIIII", mhdr, 0x00, new_rem_sz, 0, vbuf_rel, 0, nverts_tot, 0)
            struct.pack_into("<IIIIIIII", mhdr, 0x18, 0xB0, 1, 0xB0, 0, 0xB2, 0x0000019E, 0xC0, tex_idx)
            struct.pack_into("<II", mhdr, 0x38, 0xB2, 0xB4)
            struct.pack_into("<I", mhdr, 0x54, 0x90)
            struct.pack_into("<I", mhdr, 0x5C, (0x0014 << 16) | (nverts_tot & 0xFFFF))
            struct.pack_into("<ffff", mhdr, 0x90, bb[0], bb[1], bb[2], 0.0)
            struct.pack_into("<ffff", mhdr, 0xA0, bb[3], bb[4], bb[5], 0.0)
            struct.pack_into("<IIII", mhdr, 0xB0, 0, 0x01010000, 0, 0)
            psp_meshes.append(bytes(mhdr) + dl_bytes + bytes(vbuf) + (b"\0" * pad_len))

    if not psp_meshes:
        return None
    meshes_blob = b"".join(psp_meshes)
    tot_sz = len(prefix) + len(meshes_blob)
    struct.pack_into("<I", prefix, 0x20, len(psp_meshes))
    struct.pack_into("<I", prefix, 0x2C, tot_sz)
    struct.pack_into("<I", prefix, 0x34, tot_sz)
    struct.pack_into("<I", prefix, 0x64, 0x60)
    return bytes(prefix) + meshes_blob


CROWD_LEVELS = {
    "full": (-1, 6),  # L3_FULL: packed stands
    "med":  (-2, 5),  # L2_MED:  medium attendance
    "low":  (-4, 3),  # L0_MIN:  sparse/low attendance
}


def _pack_10600(dec_bytes):
    comp = zlib.compress(dec_bytes, 9)
    hdr = struct.pack("<IIIIIIII", 0x10600, len(comp), len(dec_bytes), 0, 0, 0, 0, 0)
    blob = hdr + comp
    if len(blob) % 0x10 != 0:
        blob += b"\0" * (0x10 - (len(blob) % 0x10))
    return blob


def _prepare_stadium_base(afs, ps2_m_idx, is_night=False, compact=0):
    # PSP Slot 133 layout (verified at EBOOT 0x088543E8):
    #   9581 = turf 0 Day, 9582 = turf 0 Night, 9583 = turf 1 Day, 9584 = turf 1 Night.
    b_tmpl = afs.get_member(9582 if is_night else 9581)
    offs_tmpl = struct.unpack_from("<5I", b_tmpl, 0x28)

    def get_part(b, offs, pi):
        po = 0x20 + offs[pi]
        sz = struct.unpack_from("<I", b, 4)[0]
        pend = (0x20 + offs[pi + 1]) if pi < 4 else (0x20 + sz)
        pblob = b[po:pend]
        pk, pcsz, _ = struct.unpack_from("<III", pblob, 0)
        dec = zlib.decompress(pblob[32 : 32 + pcsz]) if (pk & 0x10000) else pblob
        return pblob, dec

    _, tmpl_p1_dec = get_part(b_tmpl, offs_tmpl, 1)
    _, tmpl_p2_dec = get_part(b_tmpl, offs_tmpl, 2)
    tmpl_p3_raw, _ = get_part(b_tmpl, offs_tmpl, 3)
    tmpl_p4_raw, _ = get_part(b_tmpl, offs_tmpl, 4)

    b_ps2 = afs.get_member(ps2_m_idx)
    offs_ps2 = struct.unpack_from("<5I", b_ps2, 0x28)
    _, ps2_p0_dec = get_part(b_ps2, offs_ps2, 0)
    _, ps2_p1_dec = get_part(b_ps2, offs_ps2, 1)
    _, ps2_p2_dec = get_part(b_ps2, offs_ps2, 2)

    new_p0_dec = convert_tex_part(ps2_p0_dec, is_part1=False, compact=compact)
    new_p1_dec = convert_tex_part(ps2_p1_dec, is_part1=True, psp_template_p1_dec=tmpl_p1_dec, compact=compact)

    valid_tids = set(range(0x2774, 0x2779)) | set(range(0x283C, 0x286B)) | {0x28A0, 0x28A1, 0x28A2, 0x28A3, 0x2904}
    for pdec in (new_p0_dec, new_p1_dec):
        c = struct.unpack_from("<I", pdec, 0)[0]
        for o in struct.unpack_from(f"<{c}I", pdec, 8):
            if o:
                valid_tids.add(struct.unpack_from("<I", pdec, o + 12)[0])
    tid_remap = {0x2779: 0x2774, 0x277A: 0x2775}

    cnt2 = 27
    ps2_soffs = struct.unpack_from("<27I", ps2_p2_dec, 8)
    base_subs = [None] * cnt2
    for s_idx in range(1, cnt2):
        if s_idx == 12 or (compact >= 2 and s_idx >= 23):
            continue
        od = ps2_soffs[s_idx]
        if od != 0:
            tsz = struct.unpack_from("<I", ps2_p2_dec, od + 0x2C)[0]
            conv = convert_ps2_submodel_to_psp(ps2_p2_dec[od : od + tsz], valid_tids=valid_tids, tid_remap=tid_remap)
            if conv is not None:
                base_subs[s_idx] = conv

    # Copy PSP's native sub[21] (both 3D goalposts + crossbar + pitch-perimeter adboards ring)
    # from 9581/9582: in PS2 Part 2, sub[21] is always 0 because goals/adboards lived in a
    # separate shared pitch-props file that Konami merged into sub[21] on PSP.
    if base_subs[21] is None:
        tmpl_soffs = struct.unpack_from("<27I", tmpl_p2_dec, 8)
        od21 = tmpl_soffs[21]
        if od21 != 0:
            tsz21 = struct.unpack_from("<I", tmpl_p2_dec, od21 + 0x2C)[0]
            base_subs[21] = tmpl_p2_dec[od21 : od21 + tsz21]

    p0_pack = _pack_10600(new_p0_dec)
    p1_pack = _pack_10600(new_p1_dec)
    p3_pack = tmpl_p3_raw if len(tmpl_p3_raw) % 0x10 == 0 else tmpl_p3_raw + b"\0" * (0x10 - (len(tmpl_p3_raw) % 0x10))
    p4_pack = tmpl_p4_raw if len(tmpl_p4_raw) % 0x10 == 0 else tmpl_p4_raw + b"\0" * (0x10 - (len(tmpl_p4_raw) % 0x10))
    return ps2_m_idx, valid_tids, tid_remap, base_subs, p0_pack, p1_pack, p3_pack, p4_pack


def _load_crowd_subs(afs, ps2_m_idx, rel_main, rel_e, valid_tids, tid_remap):
    cand_subs = {}
    b_cr_main = afs.get_member(ps2_m_idx + rel_main)
    if len(b_cr_main) > 32:
        pk, pcsz = struct.unpack_from("<II", b_cr_main, 0)
        if pk & 0x10000:
            cr_dec = zlib.decompress(b_cr_main[32 : 32 + pcsz])
            if struct.unpack_from("<I", cr_dec, 0)[0] == 3:
                coffs = struct.unpack_from("<3I", cr_dec, 8)
                for ci, target_s in enumerate((15, 16, 17)):
                    co = coffs[ci]
                    if co:
                        ctsz = struct.unpack_from("<I", cr_dec, co + 0x2C)[0]
                        conv = convert_ps2_submodel_to_psp(
                            cr_dec[co : co + ctsz], valid_tids=valid_tids, tid_remap=tid_remap
                        )
                        if conv is not None:
                            cand_subs[target_s] = conv
    rel_east = (rel_e + 4) if ps2_m_idx == 9725 else rel_e
    b_cr_east = afs.get_member(ps2_m_idx + rel_east)
    if len(b_cr_east) > 32:
        pk, pcsz = struct.unpack_from("<II", b_cr_east, 0)
        if pk & 0x10000:
            cr_dec = zlib.decompress(b_cr_east[32 : 32 + pcsz])
            if struct.unpack_from("<I", cr_dec, 0)[0] == 1:
                co = struct.unpack_from("<I", cr_dec, 8)[0]
                if co:
                    ctsz = struct.unpack_from("<I", cr_dec, co + 0x2C)[0]
                    conv = convert_ps2_submodel_to_psp(
                        cr_dec[co : co + ctsz], valid_tids=valid_tids, tid_remap=tid_remap
                    )
                    if conv is not None:
                        cand_subs[14] = conv
    return cand_subs


def _finish_stadium_member(afs, prepared, crowd_level="full", max_p2_size=0xC0000):
    ps2_m_idx, valid_tids, tid_remap, base_subs, p0_pack, p1_pack, p3_pack, p4_pack = prepared
    cnt2 = len(base_subs)
    sub_blobs = list(base_subs)

    base_p2_sz = 0x80 + sum(((len(sb) + 0xF) & ~0xF) for sb in sub_blobs if sb is not None)
    if crowd_level in CROWD_LEVELS:
        # Try requested density first; fall back to sparser levels only if Part 2 exceeds max_p2_size.
        ladder = {
            "full": [(-1, 6), (-2, 5), (-3, 4), (-4, 3)],
            "med":  [(-2, 5), (-3, 4), (-4, 3)],
            "low":  [(-4, 3), (-3, 4)],
        }[crowd_level]
        for rel_main, rel_e in ladder:
            cand_subs = _load_crowd_subs(afs, ps2_m_idx, rel_main, rel_e, valid_tids, tid_remap)
            if not cand_subs:
                continue
            cr_sz = sum(((len(sb) + 0xF) & ~0xF) for sb in cand_subs.values())
            if base_p2_sz + cr_sz <= max_p2_size or (rel_main, rel_e) == ladder[-1]:
                for k_s, v_s in cand_subs.items():
                    if base_p2_sz + ((len(v_s) + 0xF) & ~0xF) <= max_p2_size:
                        sub_blobs[k_s] = v_s
                        base_p2_sz += (len(v_s) + 0xF) & ~0xF
                break

    p2_offs = [0] * cnt2
    p2_body = bytearray()
    cur_p2 = 0x80
    for s_idx in range(cnt2):
        if sub_blobs[s_idx] is not None:
            sb = sub_blobs[s_idx]
            if len(sb) % 0x10 != 0:
                sb += b"\0" * (0x10 - (len(sb) % 0x10))
            p2_offs[s_idx] = cur_p2
            p2_body.extend(sb)
            cur_p2 += len(sb)
    p2_hdr = bytearray(0x80)
    struct.pack_into(f"<II{cnt2}I", p2_hdr, 0, cnt2, 8, *p2_offs)
    new_p2_dec = bytes(p2_hdr) + bytes(p2_body)

    parts_out = [p0_pack, p1_pack, _pack_10600(new_p2_dec), p3_pack, p4_pack]
    new_offs = []
    cur = 0x20
    for p in parts_out:
        new_offs.append(cur)
        cur += len(p)
    body_hdr = struct.pack("<II5I", 5, 8, *new_offs) + b"\0" * 4
    body = body_hdr + b"".join(parts_out)
    top_hdr = struct.pack("<IIIIIIII", 0x600, len(body), 0, 0, 0, 0, 0, 0)
    return top_hdr + body


def convert_ps2_stadium_member(afs, ps2_m_idx, is_night=False, include_crowd=True, compact=0, crowd_level="full"):
    prepared = _prepare_stadium_base(afs, ps2_m_idx, is_night=is_night, compact=compact)
    lvl = crowd_level if include_crowd else None
    return _finish_stadium_member(afs, prepared, crowd_level=lvl)


def build_slot133(afs, day_m, night_m, legacy_slot133=False):
    b55 = afs.get_member(55)
    cnt7, _ = struct.unpack_from("<II", b55, 0)
    vids7 = list(struct.unpack_from(f"<{cnt7}I", b55, 8))
    vsizes7 = list(struct.unpack_from(f"<{cnt7}I", b55, 8 + 4 * cnt7))
    hdr7_len = 8 + 8 * cnt7
    orig_files = []
    cur = hdr7_len
    for i in range(cnt7):
        orig_files.append(b55[cur : cur + vsizes7[i]])
        cur += vsizes7[i]

    day_prep = _prepare_stadium_base(afs, day_m, is_night=False, compact=0)
    night_prep = _prepare_stadium_base(afs, night_m, is_night=True, compact=0)

    if not legacy_slot133:
        # Multi-density v2 bundle (9 members):
        #   [9581=Day L3_FULL, 9582=Night L3_FULL, 9583=Day L2_MED, 9584=Night L2_MED,
        #    9024, 9025, 9051, 9585=Day L0_MIN, 9586=Night L0_MIN]
        # Vita stadiums.c stages only the active (day, night, 9024, 9025, 9051) payloads (~600 KB)
        # into 0x08200000 and aliases 9581/9583 -> day and 9582/9584 -> night in 0x089EA530.
        day_full = _finish_stadium_member(afs, day_prep, crowd_level="full")
        night_full = _finish_stadium_member(afs, night_prep, crowd_level="full")
        day_med = _finish_stadium_member(afs, day_prep, crowd_level="med")
        night_med = _finish_stadium_member(afs, night_prep, crowd_level="med")
        day_low = _finish_stadium_member(afs, day_prep, crowd_level="low")
        night_low = _finish_stadium_member(afs, night_prep, crowd_level="low")

        vids9 = vids7 + [9585, 9586]
        files9 = [
            day_full, night_full, day_med, night_med,
            orig_files[4], orig_files[5], orig_files[6],
            day_low, night_low,
        ]
        vsizes9 = [((len(f) + 0x1F) & ~0x1F) if i not in (4, 5, 6) else len(f) for i, f in enumerate(files9)]
        padded9 = [(f + b"\0" * (vsizes9[i] - len(f))) if i not in (4, 5, 6) else f for i, f in enumerate(files9)]
        tot9 = (8 + 8 * 9) + sum(vsizes9)
        hdr9 = struct.pack("<II9I9I", 9, tot9, *vids9, *vsizes9)
        return hdr9 + b"".join(padded9)

    # Legacy 835 584 B 7-member Slot 133 bundle (for direct disc0: / desktop PES6_MODS).
    # Layout follows EBOOT 0x088543E8: [9581=Day Full, 9582=Night Full, 9583=Day Low, 9584=Night Low].
    day_full = _finish_stadium_member(afs, day_prep, crowd_level="full")
    night_full = _finish_stadium_member(afs, night_prep, crowd_level="full")
    day_low = _finish_stadium_member(afs, day_prep, crowd_level="low")
    night_low = _finish_stadium_member(afs, night_prep, crowd_level="low")

    def try_pack7(d0, n0, d1, n1):
        nf = [d0, n0, d1, n1, orig_files[4], orig_files[5], orig_files[6]]
        nv = [((len(f) + 0x1F) & ~0x1F) if i < 4 else len(f) for i, f in enumerate(nf)]
        return nf, nv, hdr7_len + sum(nv)

    new_files, new_vsizes, new_tot = try_pack7(day_full, night_full, day_low, night_low)
    if new_tot > len(b55):
        # Compact low slots first so full Day/Night slots stay crisp with L3_FULL crowd.
        for c_low in (1, 2, 3):
            dp_l = _prepare_stadium_base(afs, day_m, is_night=False, compact=c_low)
            np_l = _prepare_stadium_base(afs, night_m, is_night=True, compact=c_low)
            d1 = _finish_stadium_member(afs, dp_l, crowd_level="low")
            n1 = _finish_stadium_member(afs, np_l, crowd_level="low")
            new_files, new_vsizes, new_tot = try_pack7(day_full, night_full, d1, n1)
            if new_tot <= len(b55):
                break
    if new_tot > len(b55):
        # Compact all 4 slots while still keeping L3_FULL crowd on 9581/9582.
        for c_all in (1, 2, 3):
            dp_a = _prepare_stadium_base(afs, day_m, is_night=False, compact=c_all)
            np_a = _prepare_stadium_base(afs, night_m, is_night=True, compact=c_all)
            d0 = _finish_stadium_member(afs, dp_a, crowd_level="full")
            n0 = _finish_stadium_member(afs, np_a, crowd_level="full")
            d1 = _finish_stadium_member(afs, dp_a, crowd_level=None)
            n1 = _finish_stadium_member(afs, np_a, crowd_level=None)
            new_files, new_vsizes, new_tot = try_pack7(d0, n0, d1, n1)
            if new_tot <= len(b55):
                break

    if new_tot > len(b55):
        raise RuntimeError(f"Bundle size {new_tot} exceeds Slot 133 capacity ({len(b55)} B)")
    padded_files = [(f + b"\0" * (new_vsizes[i] - len(f))) if i < 4 else f for i, f in enumerate(new_files)]
    new_hdr = struct.pack(f"<II{cnt7}I{cnt7}I", cnt7, new_tot, *vids7, *new_vsizes)
    out = new_hdr + b"".join(padded_files)
    return out + b"\0" * (len(b55) - len(out))


def find_stadium(spec):
    spec_l = spec.strip().lower()
    for row in STADIUMS:
        if spec_l == str(row[0]) or spec_l == row[1] or spec_l in row[2].lower():
            return row
    raise SystemExit(f"Unknown stadium '{spec}'. Run with --list to see all 38 stadiums.")


def main():
    ap = argparse.ArgumentParser(description="Convert PS2 PES6 stadiums from PSP pes6.iso into Vita stadium bundles.")
    ap.add_argument("--list", action="store_true", help="List all 38 available stadiums")
    ap.add_argument("--iso", help="Path to your own PES6 PSP ISO (ULES00476)")
    ap.add_argument("--stadium", help="Stadium ID (0..37), slug (e.g. bernabeu, bombonera, san_siro, camp_nou), or name")
    ap.add_argument("--all", action="store_true", help="Convert all 38 stadiums into --out directory")
    ap.add_argument("--out", help="Output .bin file (for --stadium) or output directory (for --all)")
    ap.add_argument(
        "--legacy-slot133",
        action="store_true",
        help="Emit classic 835 584 B 7-member Slot 133 bundles instead of 9-member multi-density Vita bundles",
    )
    args = ap.parse_args()

    if args.list:
        print(f"{'ID':>2}  {'Slug':<18}  {'Official Name':<34}  {'Day':>5}  {'Night':>5}")
        print("-" * 74)
        for sid, slug, name, dm, nm in STADIUMS:
            print(f"{sid:2d}  {slug:<18}  {name:<34}  {dm:5d}  {nm:5d}")
        return

    if not args.iso or not os.path.isfile(args.iso):
        raise SystemExit("Error: pass --iso <path/to/pes6.iso>")

    afs = PspIsoAfs(args.iso)
    try:
        if args.all:
            out_dir = args.out or "stadiums"
            os.makedirs(out_dir, exist_ok=True)
            for sid, slug, name, dm, nm in STADIUMS:
                out_path = os.path.join(out_dir, f"{slug}.bin")
                blob = build_slot133(afs, dm, nm, legacy_slot133=args.legacy_slot133)
                with open(out_path, "wb") as f:
                    f.write(blob)
                print(f"[{sid:2d}] {slug:<18} -> {out_path} ({len(blob)} B)")
        else:
            if not args.stadium:
                raise SystemExit("Error: pass --stadium <id|slug> or --all")
            sid, slug, name, dm, nm = find_stadium(args.stadium)
            out_path = args.out or f"{slug}.bin"
            parent = os.path.dirname(out_path)
            if parent:
                os.makedirs(parent, exist_ok=True)
            blob = build_slot133(afs, dm, nm, legacy_slot133=args.legacy_slot133)
            with open(out_path, "wb") as f:
                f.write(blob)
            print(f"Converted [{sid}] {name} -> {out_path} ({len(blob)} B)")
    finally:
        afs.close()


if __name__ == "__main__":
    main()
