import {
  STADIUMS,
  POPULAR_SLUGS,
  PspIsoAfs,
  Ps2Afs,
  buildVitaStadiumFromAfs,
  buildVitaStadiumFromLooseBins,
  inspectCommentaryFile,
  createStoreZip,
} from "./converter.js";

import {
  PspOptionFile,
  buildDefaultParamBin,
  convertFaceToPam,
  parseFaceserverMap,
  findPcCrestBankInFile,
  convertPcCrestsToPspBins,
} from "./patch_studio.js";

const LANG_NAME = { S: "Spanish", E: "English", F: "French", G: "German", I: "Italian", J: "Japanese" };

let pspAfs = null;
let ps2Afs = null;
let ps2LooseBytes = null;
const selectedSlugs = new Set(STADIUMS.map((s) => s.slug));

const $ = (id) => document.getElementById(id);

function setStatus(el, cls, html) {
  el.className = `status show ${cls}`;
  el.innerHTML = html;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// --- Tabs ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// --- Drag & drop wiring ---
function wireDropzone(dzEl, inputEl, onFile) {
  dzEl.addEventListener("dragover", (e) => { e.preventDefault(); dzEl.classList.add("drag"); });
  dzEl.addEventListener("dragleave", () => dzEl.classList.remove("drag"));
  dzEl.addEventListener("drop", (e) => {
    e.preventDefault();
    dzEl.classList.remove("drag");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  });
  inputEl.addEventListener("change", () => {
    if (inputEl.files && inputEl.files[0]) onFile(inputEl.files[0]);
  });
}

// --- Tab 1: Official 38 Stadiums ---
function renderStadiumGrid(filter = "") {
  const q = filter.trim().toLowerCase();
  const grid = $("stadium-grid");
  grid.innerHTML = "";
  for (const s of STADIUMS) {
    if (q && !s.name.toLowerCase().includes(q) && !s.clubs.toLowerCase().includes(q) && !s.slug.includes(q)) {
      continue;
    }
    const checked = selectedSlugs.has(s.slug);
    const lbl = document.createElement("label");
    lbl.className = `st-item${checked ? " checked" : ""}`;
    lbl.innerHTML = `<input type="checkbox" ${checked ? "checked" : ""}><span><span class="st-name">${s.name}</span><span class="st-clubs">${s.clubs}</span></span>`;
    lbl.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) selectedSlugs.add(s.slug); else selectedSlugs.delete(s.slug);
      lbl.classList.toggle("checked", e.target.checked);
      updateSelCount();
    });
    grid.appendChild(lbl);
  }
}

function updateSelCount() {
  $("sel-count").textContent = `${selectedSlugs.size} stadium(s) selected`;
  $("btn-convert-official").disabled = !pspAfs || selectedSlugs.size === 0;
}

function updatePatchPspBanner() {
  const el = $("patch-psp-note");
  if (pspAfs) {
    setStatus(el, "ok", "✅ PSP template loaded (<code>pes6.iso</code>). You can now drop your PS2 patch below.");
  } else {
    setStatus(el, "info", "ℹ️ First load your PSP <code>pes6.iso</code> in the <strong>38 Official Stadiums</strong> tab (used only as a template for 3D goalposts and pitch adboards).");
  }
}

$("search-stadium").addEventListener("input", (e) => renderStadiumGrid(e.target.value));
$("btn-all").addEventListener("click", () => { STADIUMS.forEach((s) => selectedSlugs.add(s.slug)); renderStadiumGrid($("search-stadium").value); updateSelCount(); });
$("btn-pop").addEventListener("click", () => { selectedSlugs.clear(); POPULAR_SLUGS.forEach((s) => selectedSlugs.add(s)); renderStadiumGrid($("search-stadium").value); updateSelCount(); });
$("btn-none").addEventListener("click", () => { selectedSlugs.clear(); renderStadiumGrid($("search-stadium").value); updateSelCount(); });

wireDropzone($("dz-psp"), $("file-psp"), async (file) => {
  try {
    pspAfs = await PspIsoAfs.open(file);
    setStatus($("status-psp"), "ok", `✅ European PES6 PSP ISO detected (${pspAfs.discId}). Ready to convert all 38 stadiums!`);
  } catch (err) {
    pspAfs = null;
    const msg = String(err.message || err);
    if (msg === "IS_PS2_ISO") {
      setStatus($("status-psp"), "err", "❌ That looks like a PS2 ISO, not a PSP ISO. For the 38 official stadiums you only need your PSP <code>pes6.iso</code> (ULES00476). To import from a PS2 patch, use the second tab.");
    } else if (msg === "NOT_ISO") {
      setStatus($("status-psp"), "err", "❌ Not a valid ISO file. Make sure it is an uncompressed <code>.iso</code> (not .zip, .rar, or .cso).");
    } else if (msg.startsWith("WRONG_PSP_REGION:")) {
      setStatus($("status-psp"), "err", `❌ Wrong region (${msg.split(":")[1]}). Only the European PSP version <strong>ULES00476</strong> is supported.`);
    } else {
      setStatus($("status-psp"), "err", "❌ Could not find PSP PES6 inside this ISO. Make sure it is Pro Evolution Soccer 6 (Europe, ULES00476).");
    }
  }
  updateSelCount();
  updatePatchPspBanner();
});

$("btn-convert-official").addEventListener("click", async () => {
  if (!pspAfs || selectedSlugs.size === 0) return;
  const list = STADIUMS.filter((s) => selectedSlugs.has(s.slug));
  const btn = $("btn-convert-official");
  btn.disabled = true;
  $("prog-official").classList.add("show");
  $("status-official").className = "status";

  try {
    const entries = [];
    let maxKB = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      $("prog-official-fill").style.width = `${Math.round((i / list.length) * 100)}%`;
      $("prog-official-text").textContent = `Converting ${i + 1} / ${list.length}: ${s.name}...`;
      await new Promise((r) => setTimeout(r, 0));
      const { blob, report } = await buildVitaStadiumFromAfs(pspAfs, pspAfs, s.pspDay, s.pspNight, s.pspDay === 9725);
      if (report.maxStagedKB > maxKB) maxKB = report.maxStagedKB;
      entries.push({ name: `stadiums/${s.slug}.bin`, data: blob, slug: s.slug });
    }
    $("prog-official-fill").style.width = "100%";
    $("prog-official-text").textContent = `Finished ${list.length} / ${list.length}.`;
    if (entries.length === 1) {
      triggerDownload(new Blob([entries[0].data], { type: "application/octet-stream" }), `${entries[0].slug}.bin`);
    } else {
      triggerDownload(createStoreZip(entries), "stadiums.zip");
    }
    setStatus(
      $("status-official"),
      "ok",
      `✅ Done! ${entries.length} stadium(s) converted &amp; validated (max RAM: ${maxKB} KB / 1020 KB · 3D goalposts &amp; full crowd OK). Unzip and copy the <code>.bin</code> files into <code>ux0:data/pes6vita/stadiums/</code>.`
    );
  } catch (err) {
    setStatus($("status-official"), "err", `❌ ${err.message || err}`);
  } finally {
    btn.disabled = false;
  }
});

// --- Tab 2: Community PS2 Patch Stadiums ---
function populatePatchSelects() {
  const srcSel = $("patch-src-slot");
  const dstSel = $("patch-out-slot");
  srcSel.innerHTML = "";
  dstSel.innerHTML = "";
  for (const s of STADIUMS) {
    const o1 = document.createElement("option");
    o1.value = s.slug;
    o1.textContent = `[${String(s.id).padStart(2, "0")}] ${s.name} (PS2 #${s.ps2Day})`;
    srcSel.appendChild(o1);
    if (s.id < 36) {
      const o2 = document.createElement("option");
      o2.value = s.slug;
      o2.textContent = `${s.name} (${s.slug}.bin)`;
      dstSel.appendChild(o2);
    }
  }
  const cust = document.createElement("option");
  cust.value = "__custom__";
  cust.textContent = "✨ Custom filename (selectable via L + R + Triangle)";
  dstSel.appendChild(cust);
}

$("patch-src-slot").addEventListener("change", () => {
  if ($("patch-out-slot").value !== "__custom__") {
    const s = STADIUMS.find((x) => x.slug === $("patch-src-slot").value);
    if (s && s.id < 36) $("patch-out-slot").value = s.slug;
  }
});
$("patch-out-slot").addEventListener("change", () => {
  $("patch-custom-name-wrap").style.display = $("patch-out-slot").value === "__custom__" ? "block" : "none";
});

wireDropzone($("dz-ps2"), $("file-ps2"), async (file) => {
  ps2Afs = null;
  ps2LooseBytes = null;
  $("patch-controls").style.display = "none";
  $("status-patch-result").className = "status";
  try {
    const head = new Uint8Array(await file.slice(0, 36).arrayBuffer());
    const dv = new DataView(head.buffer);
    if (head.byteLength >= 36 && dv.getUint32(0, true) === 0x600 && dv.getUint32(32, true) === 5) {
      ps2LooseBytes = new Uint8Array(await file.arrayBuffer());
      $("patch-slot-wrap").style.display = "none";
      $("patch-controls").style.display = "block";
      setStatus($("status-ps2"), "ok", `✅ Standalone PS2 stadium detected (<code>${file.name}</code>). Choose which Vita slot to save it as.`);
      return;
    }
    ps2Afs = await Ps2Afs.open(file);
    $("patch-slot-wrap").style.display = "block";
    $("patch-controls").style.display = "block";
    setStatus($("status-ps2"), "ok", `✅ PES6 PS2 archive detected (${ps2Afs.count} entries). Pick which stadium slot to convert.`);
  } catch (err) {
    setStatus($("status-ps2"), "err", `❌ Could not read as a PES6 PS2 stadium or patch (${err.message || err}). Remember PES6 PC (Kitserver) stadiums are not supported.`);
  }
});

$("btn-convert-patch").addEventListener("click", async () => {
  if (!pspAfs) {
    setStatus($("status-patch-result"), "err", "ℹ️ First load your PSP <code>pes6.iso</code> in the <strong>38 Official Stadiums</strong> tab.");
    return;
  }
  const btn = $("btn-convert-patch");
  btn.disabled = true;
  try {
    let fname;
    if ($("patch-out-slot").value === "__custom__") {
      const raw = ($("patch-custom-name").value || "custom_stadium").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      fname = `${raw || "custom_stadium"}.bin`;
    } else {
      fname = `${$("patch-out-slot").value}.bin`;
    }
    let result;
    if (ps2LooseBytes) {
      result = await buildVitaStadiumFromLooseBins(pspAfs, ps2LooseBytes, null);
    } else if (ps2Afs) {
      const st = STADIUMS.find((x) => x.slug === $("patch-src-slot").value);
      result = await buildVitaStadiumFromAfs(pspAfs, ps2Afs, st.ps2Day, st.ps2Night, st.id === 2);
    } else {
      return;
    }
    triggerDownload(new Blob([result.blob], { type: "application/octet-stream" }), fname);
    const r = result.report;
    setStatus(
      $("status-patch-result"),
      "ok",
      `✅ <strong>Stadium validated &amp; ready for PS Vita!</strong> Downloaded as <code>${fname}</code>.<br>` +
      `Active RAM: <strong>${r.maxStagedKB} KB / 1020 KB</strong> · Part 2 geometry: <strong>${r.maxP2KB} KB / 768 KB</strong> · ` +
      `3D Goalposts: <strong>${r.hasGoalposts ? "OK" : "No"}</strong> · Crowd stands: <strong>${r.minCrowdStands}/4</strong>` +
      `${r.compactUsed ? ` · Textures auto-compacted (level ${r.compactUsed}) to fit Vita RAM` : ""}.<br>` +
      `Copy to <code>ux0:data/pes6vita/stadiums/${fname}</code>.`
    );
  } catch (err) {
    setStatus($("status-patch-result"), "err", `❌ ${err.message || err}`);
  } finally {
    btn.disabled = false;
  }
});

// --- Tab 3: Commentary Validator & Extractor ---
wireDropzone($("dz-comm"), $("file-comm"), async (file) => {
  const listEl = $("comm-iso-list");
  listEl.innerHTML = "";
  const res = await inspectCommentaryFile(file);
  if (res.kind === "ps2_iso") {
    setStatus($("status-comm"), "ok", `✅ PES6 PS2 ISO detected with ${res.soundFiles.length} commentary bank(s) inside. Extract with one click (no 7-Zip needed):`);
    for (const sf of res.soundFiles) {
      const row = document.createElement("div");
      row.className = "sound-row";
      const mb = Math.round((sf.size / (1024 * 1024)) * 10) / 10;
      const ln = LANG_NAME[sf.lang] || sf.lang;
      row.innerHTML = `<div><strong>${sf.name}</strong> <span style="color:var(--muted)">(${ln} · ${mb} MB)</span></div>`;
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.style.padding = "7px 14px";
      btn.style.fontSize = "0.85rem";
      btn.textContent = "Extract .afs file";
      btn.addEventListener("click", () => {
        const sliceBlob = file.slice(sf.offset, sf.offset + sf.size, "application/octet-stream");
        triggerDownload(sliceBlob, sf.name);
      });
      row.appendChild(btn);
      listEl.appendChild(row);
    }
    return;
  }
  if (!res.ok) {
    if (res.reason === "PSP_ISO_NO_COMMENTARY") {
      setStatus($("status-comm"), "err", "❌ That is the PSP ISO, which has no commentary. You need <code>S_SOUND.AFS</code> / <code>E_SOUND.AFS</code> (or an ISO) from <strong>PES6 PS2</strong> or a PES6 commentary patch.");
    } else if (res.reason === "NOT_CRI_ADX") {
      setStatus($("status-comm"), "err", "❌ Valid AFS archive, but its clips are not PES6 CRI ADX audio (likely from another PES game or an incompatible format).");
    } else {
      setStatus($("status-comm"), "err", "❌ Not a valid <code>.afs</code> bank or PES6 PS2 ISO. Extract it first if it is inside a .zip or .rar.");
    }
    return;
  }
  setStatus(
    $("status-comm"),
    "ok",
    `✅ <strong>Commentary bank compatible with PES6 PS Vita!</strong><br>` +
    `Clips found: <strong>${res.nonEmptyCount}</strong> (${res.validAdx}/${res.tested} verified CRI ADX · ${res.sampleRate} Hz · ${res.channels === 1 ? "Mono" : "Stereo"} · ${res.sizeMB} MB).` +
    `${res.countLooksPes6 ? "" : "<br>⚠️ <em>Note: clip count is unusual for PES6; if this bank is from another PES game, lines may play out of order.</em>"}` +
    `<br>👉 Copy to your PS Vita as <code>ux0:data/pes6vita/audio/${res.suggestedName}</code> (all lowercase).`
  );
});

// --- Tab 4: Patch Creator (Option File, Visual Editor, Faces & Crests) ---
let studioOf = null;
let curClubId = 0;
let curSquadSlot = -1;
let curPlayerId = 0;
const studioFaces = new Map(); // playerId (number) -> { pam: Uint8Array, rgba: Uint8Array }
let studioPcCrestBank = null;  // FlgBank from PC 0_text.afs or loose .flg
let studioConvertedCrests = null; // { 2347: Uint8Array, 2350: Uint8Array }

function slugifyId(s) {
  const clean = (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!clean || clean === "original") return "custom-patch";
  return clean;
}

$("mod-name").addEventListener("input", () => {
  $("mod-id").value = slugifyId($("mod-name").value);
  updateStudioSummary();
});
$("mod-id").addEventListener("change", () => {
  $("mod-id").value = slugifyId($("mod-id").value);
  updateStudioSummary();
});

function updateStudioSummary() {
  const hasOf = !!studioOf;
  const nFaces = studioFaces.size;
  const hasCrests = !!studioPcCrestBank;
  $("btn-build-patch").disabled = !hasOf && nFaces === 0 && !hasCrests;
  $("btn-download-databin").style.display = hasOf ? "inline-block" : "none";
  $("btn-clear-faces").style.display = nFaces > 0 ? "inline-block" : "none";

  const parts = [];
  if (hasOf) parts.push("Option File (save/ULES004760013000/DATA.BIN)");
  if (nFaces > 0) parts.push(`${nFaces} player face(s) (faces/*.pam)`);
  if (hasCrests) parts.push("169 PC crests & flags (afs/0_text.afs/{2347,2350}.bin)");
  const id = slugifyId($("mod-id").value);
  $("patch-summary-text").innerHTML = parts.length
    ? `Ready to package <code>mods/${id}/</code> with: <strong>${parts.join(" + ")}</strong>.`
    : "Add an Option File, player faces, or a crest bank above, then click below to download the ready-to-install PS Vita patch ZIP.";
}

function renderLeagues() {
  if (!studioOf) return;
  const sel = $("of-league-sel");
  const prev = sel.value;
  sel.innerHTML = "";
  const leagues = studioOf.getLeagues();
  for (const l of leagues) {
    const opt = document.createElement("option");
    opt.value = String(l.id);
    opt.textContent = `[League ${l.id - 3}] ${l.name || "(Unnamed)"}`;
    sel.appendChild(opt);
  }
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  const active = leagues.find((l) => String(l.id) === sel.value) || leagues[0];
  if (active) $("of-league-name").value = active.name;
}

$("of-league-sel").addEventListener("change", () => {
  if (!studioOf) return;
  const leagues = studioOf.getLeagues();
  const active = leagues.find((l) => String(l.id) === $("of-league-sel").value);
  if (active) $("of-league-name").value = active.name;
});

$("btn-save-league").addEventListener("click", () => {
  if (!studioOf) return;
  const ln = parseInt($("of-league-sel").value, 10);
  const name = $("of-league-name").value.trim();
  if (!name) return;
  studioOf.setLeagueName(ln, name);
  renderLeagues();
  setStatus($("status-of"), "ok", `✅ Updated League #${ln - 3} to <strong>${name}</strong>.`);
});

function renderClubList(filter = "") {
  if (!studioOf) return;
  const q = filter.trim().toLowerCase();
  const listEl = $("of-club-list");
  listEl.innerHTML = "";
  const clubs = studioOf.getAllClubs();
  for (const c of clubs) {
    if (q && !c.name.toLowerCase().includes(q) && !c.abv.toLowerCase().includes(q) && !String(c.id).includes(q)) {
      continue;
    }
    const item = document.createElement("div");
    item.className = `club-item${c.id === curClubId ? " active" : ""}`;
    const customBadge = c.emblemId >= 292 ? " 🛡️" : "";
    item.innerHTML = `<span><span style="color:var(--muted); font-size:0.78rem;">#${c.id}</span> ${c.name || "(Unnamed)"}${customBadge}</span><span class="club-abv">${c.abv || "---"}</span>`;
    item.addEventListener("click", () => {
      curClubId = c.id;
      curSquadSlot = -1;
      $("of-player-box").style.display = "none";
      renderClubList($("of-club-search").value);
      renderSelectedClub();
    });
    listEl.appendChild(item);
  }
}

function renderSelectedClub() {
  if (!studioOf) return;
  const club = studioOf.getClub(curClubId);
  $("of-club-name").value = club.name;
  $("of-club-abv").value = club.abv;
  $("status-club-edit").className = "status";

  const tbody = $("of-squad-tbody");
  tbody.innerHTML = "";
  const squad = studioOf.getSquad(curClubId);
  for (const p of squad) {
    const tr = document.createElement("tr");
    if (p.slot === curSquadSlot) tr.classList.add("active");
    const hasFace = studioFaces.has(p.id);
    tr.innerHTML =
      `<td><strong>${p.number}</strong></td>` +
      `<td style="color:var(--muted)">${p.id || "-"}</td>` +
      `<td>${p.name}</td>` +
      `<td style="font-family:monospace">${p.shirt}</td>` +
      `<td><span class="club-abv">${p.pos}</span></td>` +
      `<td>${p.id ? p.age : "-"}</td>` +
      `<td>${p.id ? `${p.attack} / ${p.defence} / ${p.top_speed}` : "-"}</td>` +
      `<td>${hasFace ? "✅ Face" : "-"}</td>`;
    tr.addEventListener("click", () => {
      if (!p.id) return;
      curSquadSlot = p.slot;
      curPlayerId = p.id;
      renderSelectedClub();
      openPlayerEditor(p);
    });
    tbody.appendChild(tr);
  }
}

function openPlayerEditor(p) {
  $("of-player-box").style.display = "block";
  $("of-player-title").textContent = `Edit Player #${p.id} — ${p.name} (${p.pos}, Slot ${p.slot + 1})`;
  $("of-p-name").value = p.name;
  $("of-p-shirt").value = p.shirt;
  $("of-p-num").value = p.number;
  $("of-p-age").value = p.age;
  $("of-p-height").value = p.height;
  $("of-p-atk").value = p.attack;
  $("of-p-def").value = p.defence;
  $("of-p-spd").value = p.top_speed;
}

$("of-club-search").addEventListener("input", (e) => renderClubList(e.target.value));

$("btn-save-club").addEventListener("click", () => {
  if (!studioOf) return;
  const name = $("of-club-name").value.trim();
  const abv = $("of-club-abv").value.trim().toUpperCase();
  if (!name) return;
  studioOf.setClub(curClubId, name, abv);
  renderClubList($("of-club-search").value);
  setStatus($("status-club-edit"), "ok", `✅ Saved club #${curClubId}: <strong>${name} (${abv})</strong>.`);
});

$("file-club-crest").addEventListener("change", async (e) => {
  if (!studioOf || !e.target.files || !e.target.files[0]) return;
  try {
    const file = e.target.files[0];
    const eid = await studioOf.setClubCustomEmblemFromImage(curClubId, file);
    renderClubList($("of-club-search").value);
    setStatus(
      $("status-club-edit"),
      "ok",
      `✅ Embedded custom 64×64 128-color crest into Option File (Emblem ID ${eid}, transparent backdrop cleaned).`
    );
  } catch (err) {
    setStatus($("status-club-edit"), "err", `❌ ${err.message || err}`);
  } finally {
    e.target.value = "";
  }
});

$("btn-save-player").addEventListener("click", () => {
  if (!studioOf || !curPlayerId) return;
  const name = $("of-p-name").value.trim();
  const shirt = $("of-p-shirt").value.trim();
  const num = parseInt($("of-p-num").value, 10) || 1;
  const age = parseInt($("of-p-age").value, 10) || 25;
  const height = parseInt($("of-p-height").value, 10) || 180;
  const attack = parseInt($("of-p-atk").value, 10) || 70;
  const defence = parseInt($("of-p-def").value, 10) || 70;
  const top_speed = parseInt($("of-p-spd").value, 10) || 70;

  studioOf.setPlayer(curPlayerId, { name, shirt, age, height, attack, defence, top_speed });
  if (curSquadSlot >= 0) studioOf.setSquadSlot(curClubId, curSquadSlot, curPlayerId, num);
  renderSelectedClub();
  setStatus($("status-club-edit"), "ok", `✅ Updated player #${curPlayerId} (<strong>${name}</strong>, #${num}).`);
});

$("file-player-face").addEventListener("change", async (e) => {
  if (!curPlayerId || !e.target.files || !e.target.files[0]) return;
  try {
    const res = await convertFaceToPam(e.target.files[0]);
    studioFaces.set(curPlayerId, res);
    renderFaceGallery();
    renderSelectedClub();
    updateStudioSummary();
    setStatus($("status-club-edit"), "ok", `✅ Converted &amp; linked 32×64 face for player #${curPlayerId} (<code>faces/${curPlayerId}.pam</code>).`);
  } catch (err) {
    setStatus($("status-club-edit"), "err", `❌ ${err.message || err}`);
  } finally {
    e.target.value = "";
  }
});

wireDropzone($("dz-of"), $("file-of"), async (file) => {
  try {
    studioOf = await PspOptionFile.fromFile(file);
    curClubId = 0;
    curSquadSlot = -1;
    $("of-editor").style.display = "block";
    $("of-player-box").style.display = "none";
    renderLeagues();
    renderClubList();
    renderSelectedClub();
    updateStudioSummary();
    const kindLabel =
      studioOf.sourceKind === "pc_encrypted"
        ? "Encrypted PES6 PC Option File (decrypted &amp; converted to PSP layout)"
        : studioOf.sourceKind === "pc_plain"
        ? "Decrypted PES6 PC Option File (converted to PSP layout)"
        : "Unencrypted PES6 PSP System Save (DATA.BIN)";
    setStatus(
      $("status-of"),
      "ok",
      `✅ Loaded <strong>${file.name}</strong> — ${kindLabel}. Use the editor below to customize leagues, clubs, emblems, or squads.`
    );
  } catch (err) {
    studioOf = null;
    $("of-editor").style.display = "none";
    updateStudioSummary();
    setStatus(
      $("status-of"),
      "err",
      `❌ Not a valid PES6 PC Option File (KONAMI-WIN32PES6OPT) or PSP DATA.BIN (${err.message || err}). Must be 1,191,936 bytes.`
    );
  }
});

// --- Faces Batch & Individual ---
function renderFaceGallery() {
  const gal = $("face-gallery");
  gal.innerHTML = "";
  if (studioFaces.size === 0) {
    gal.style.display = "none";
    return;
  }
  gal.style.display = "flex";
  const sortedIds = [...studioFaces.keys()].sort((a, b) => a - b);
  for (const pid of sortedIds.slice(0, 120)) {
    const { rgba } = studioFaces.get(pid);
    const chip = document.createElement("div");
    chip.className = "face-chip";
    const cv = document.createElement("canvas");
    cv.width = 32;
    cv.height = 64;
    cv.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(rgba), 32, 64), 0, 0);
    const pName = studioOf ? studioOf.getPlayer(pid).name : "";
    const txt = document.createElement("span");
    txt.textContent = pName ? `#${pid} ${pName}` : `#${pid}`;
    chip.append(cv, txt);
    gal.appendChild(chip);
  }
  if (sortedIds.length > 120) {
    const more = document.createElement("div");
    more.className = "face-chip";
    more.textContent = `+${sortedIds.length - 120} more faces...`;
    gal.appendChild(more);
  }
}

async function handleBatchFaces(fileList) {
  const files = [...fileList];
  if (files.length === 0) return;
  $("prog-faces").classList.add("show");
  $("prog-faces-fill").style.width = "0%";
  $("prog-faces-text").textContent = "Scanning face files...";

  // Check if map.txt is present
  let mapFile = files.find((f) => f.name.toLowerCase() === "map.txt");
  const byRelPath = new Map();
  for (const f of files) {
    const rel = (f.webkitRelativePath || f.name).replace(/\\/g, "/");
    byRelPath.set(rel.toLowerCase(), f);
    byRelPath.set(f.name.toLowerCase(), f);
    // Also index relative to "/faces/" if selected from a parent folder
    const fi = rel.toLowerCase().indexOf("/faces/");
    if (fi >= 0) byRelPath.set(rel.slice(fi + 7).toLowerCase(), f);
  }

  const tasks = []; // [{ id, file }]
  if (mapFile) {
    const mapText = await mapFile.text();
    const idMap = parseFaceserverMap(mapText);
    for (const [id, rel] of idMap.entries()) {
      const lowerRel = rel.toLowerCase();
      const pngRel = lowerRel.replace(/\.bin$/, ".png");
      const basePng = pngRel.split("/").pop();
      const baseBin = lowerRel.split("/").pop();
      const chosen =
        byRelPath.get(pngRel) ||
        byRelPath.get(lowerRel) ||
        byRelPath.get(basePng) ||
        byRelPath.get(baseBin);
      if (chosen) tasks.push({ id, file: chosen });
    }
  }

  // Also check loose files named directly by player ID (e.g. 1340.png or 1340.bin)
  const seenIds = new Set(tasks.map((t) => t.id));
  for (const f of files) {
    const m = f.name.match(/^(\d+)\.(png|jpg|jpeg|webp|bin)$/i);
    if (m) {
      const id = parseInt(m[1], 10);
      if (!seenIds.has(id) || !f.name.toLowerCase().endsWith(".bin")) {
        seenIds.add(id);
        tasks.push({ id, file: f });
      }
    }
  }

  if (tasks.length === 0) {
    $("prog-faces").classList.remove("show");
    setStatus(
      $("status-faces"),
      "err",
      "❌ No matching player faces found. Select a folder containing <code>map.txt</code> + face files, or files named <code>&lt;player_id&gt;.png</code> / <code>.bin</code>."
    );
    return;
  }

  let okCount = 0;
  for (let i = 0; i < tasks.length; i++) {
    const { id, file } = tasks[i];
    if (i % 8 === 0) {
      $("prog-faces-fill").style.width = `${Math.round((i / tasks.length) * 100)}%`;
      $("prog-faces-text").textContent = `Warping face ${i + 1} / ${tasks.length} (Player #${id})...`;
      await new Promise((r) => setTimeout(r, 0));
    }
    try {
      const res = await convertFaceToPam(file);
      studioFaces.set(id, res);
      okCount++;
    } catch (_) {
      // skip unreadable face file
    }
  }
  $("prog-faces-fill").style.width = "100%";
  $("prog-faces-text").textContent = `Converted ${okCount} face(s).`;
  renderFaceGallery();
  if (studioOf) renderSelectedClub();
  updateStudioSummary();
  setStatus(
    $("status-faces"),
    "ok",
    `✅ <strong>${studioFaces.size} player face(s) ready!</strong> (${okCount} newly converted to 32×64 PAM + <code>faces/index.txt</code>).`
  );
}

$("file-faces-dir").addEventListener("change", (e) => {
  if (e.target.files) handleBatchFaces(e.target.files);
  e.target.value = "";
});
$("file-faces-multi").addEventListener("change", (e) => {
  if (e.target.files) handleBatchFaces(e.target.files);
  e.target.value = "";
});
$("file-face-by-id").addEventListener("change", async (e) => {
  if (!e.target.files || !e.target.files[0]) return;
  const pid = parseInt($("single-face-id").value, 10);
  if (!pid || pid < 1 || pid >= 32768) {
    setStatus($("status-faces"), "err", "❌ Enter a valid Player Database ID first (1 – 32767).");
    e.target.value = "";
    return;
  }
  try {
    const res = await convertFaceToPam(e.target.files[0]);
    studioFaces.set(pid, res);
    renderFaceGallery();
    if (studioOf) renderSelectedClub();
    updateStudioSummary();
    setStatus($("status-faces"), "ok", `✅ Added face for Player #${pid} (<code>faces/${pid}.pam</code>). Total faces: ${studioFaces.size}.`);
  } catch (err) {
    setStatus($("status-faces"), "err", `❌ ${err.message || err}`);
  } finally {
    e.target.value = "";
  }
});

$("btn-clear-faces").addEventListener("click", () => {
  studioFaces.clear();
  renderFaceGallery();
  if (studioOf) renderSelectedClub();
  updateStudioSummary();
  $("status-faces").className = "status";
});

// --- Full PC Crest Bank (0_text.afs / .flg) ---
wireDropzone($("dz-crests"), $("file-crests"), async (file) => {
  studioPcCrestBank = null;
  studioConvertedCrests = null;
  try {
    const bank = await findPcCrestBankInFile(file);
    studioPcCrestBank = bank;
    updateStudioSummary();
    setStatus(
      $("status-crests"),
      "ok",
      `✅ Found 64×64 PC Crest Bank (${bank.groups[1].ents.length} crests, ${bank.groups[0].ents.length} flags) in <strong>${file.name}</strong>.` +
        (pspAfs
          ? " Ready to build PSP slots <code>2347.bin</code> (32×32) and <code>2350.bin</code> (64×64)!"
          : "<br>⚠️ <em>Load your PSP <code>pes6.iso</code> in Tab 1 before clicking Build Patch so the PSP flag/crest banks can be merged.</em>")
    );
  } catch (err) {
    updateStudioSummary();
    setStatus($("status-crests"), "err", `❌ ${err.message || err}`);
  }
});

// --- Build & Download Patch ZIP ---
$("btn-download-databin").addEventListener("click", () => {
  if (!studioOf) return;
  triggerDownload(new Blob([studioOf.d], { type: "application/octet-stream" }), "DATA.BIN");
});

$("btn-build-patch").addEventListener("click", async () => {
  const btn = $("btn-build-patch");
  btn.disabled = true;
  try {
    const id = slugifyId($("mod-id").value);
    const name = ($("mod-name").value || id).trim();
    const authorVer = ($("mod-author").value || "").split("·").map((s) => s.trim());
    const author = authorVer[0] || "Community";
    const version = authorVer[1] || "1.0";

    const entries = [];
    const replaces = [];
    const te = new TextEncoder();

    if (studioOf) {
      replaces.push("save");
      entries.push({
        name: `${id}/save/ULES004760013000/DATA.BIN`,
        data: studioOf.d,
      });
      entries.push({
        name: `${id}/save/ULES004760013000/PARAM.BIN`,
        data: buildDefaultParamBin(name),
      });
    }

    if (studioFaces.size > 0) {
      replaces.push("faces");
      const sortedIds = [...studioFaces.keys()].sort((a, b) => a - b);
      for (const pid of sortedIds) {
        entries.push({
          name: `${id}/faces/${pid}.pam`,
          data: studioFaces.get(pid).pam,
        });
      }
      const indexTxt = sortedIds.map((i) => `${i}\n`).join("");
      entries.push({
        name: `${id}/faces/index.txt`,
        data: te.encode(indexTxt),
      });
    }

    if (studioPcCrestBank) {
      if (!pspAfs) {
        throw new Error("Please load your PSP pes6.iso in Tab 1 first so the PC crest bank can be merged with the PSP flag banks (slots 2347 & 2350).");
      }
      setStatus($("status-build-patch"), "info", "⏳ Converting 169 PC crests &amp; requantizing PSP flag banks (slots 2347 &amp; 2350)...");
      await new Promise((r) => setTimeout(r, 10));
      studioConvertedCrests = await convertPcCrestsToPspBins(studioPcCrestBank, pspAfs);
      replaces.push("afs");
      entries.push({
        name: `${id}/afs/0_text.afs/2347.bin`,
        data: studioConvertedCrests[2347],
      });
      entries.push({
        name: `${id}/afs/0_text.afs/2350.bin`,
        data: studioConvertedCrests[2350],
      });
    }

    const modJson = {
      format: 1,
      id,
      name,
      author,
      version,
      description: `Built with PES6 Vita Web Patch Creator (${replaces.join(", ")})`,
      base: "ULES00476",
      replaces,
      commentary: "base",
    };
    entries.unshift({
      name: `${id}/mod.json`,
      data: te.encode(JSON.stringify(modJson, null, 2) + "\n"),
    });

    const zipBlob = createStoreZip(entries);
    triggerDownload(zipBlob, `${id}.zip`);
    setStatus(
      $("status-build-patch"),
      "ok",
      `✅ <strong>Patch <code>${id}.zip</code> downloaded!</strong><br>` +
        `1. Extract <code>${id}/</code> into <code>ux0:data/pes6vita/mods/${id}/</code> on your PS Vita.<br>` +
        `2. On the PS Vita LiveArea screen, tap <strong>SETTINGS</strong> and select <strong>${name}</strong> under <em>Game Patch / Mod</em>.`
    );
  } catch (err) {
    setStatus($("status-build-patch"), "err", `❌ ${err.message || err}`);
  } finally {
    btn.disabled = false;
  }
});

// Init
renderStadiumGrid();
populatePatchSelects();
updateSelCount();
updatePatchPspBanner();
updateStudioSummary();
