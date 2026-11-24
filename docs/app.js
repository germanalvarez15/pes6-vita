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
  loadDefaultOptionFile,
  buildDefaultParamBin,
  convertFaceToPam,
  parseFaceserverMap,
  findPcCrestBankInFile,
  convertPcCrestsToPspBins,
  readPspIso64x64FlgBank,
  SELECT_TEAM_CATEGORIES,
  NATIONAL_TEAMS,
  NATIONS,
  POS_NAMES,
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
    readPspIso64x64FlgBank(pspAfs).then((bank) => {
      studioPspFlgBank = bank;
      renderSelectTeamGrid();
    }).catch(() => {});
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

// --- Tab 4: Interactive Patch Creator (Select Team Screen & Modal Editor) ---
let studioOf = null;
let curCatKey = "club_eng";
let curTeamIsNat = false;
let curTeamId = 0;
let curSquadSlot = 0;
let curPlayerId = 0;
let swapPendingSlot = -1;
const studioFaces = new Map(); // playerId (number) -> { pam: Uint8Array, rgba: Uint8Array }
let studioPcCrestBank = null;  // FlgBank from PC 0_text.afs or loose .flg
let studioPspFlgBank = null;   // FlgBank from PSP pes6.iso slot 2350 (if loaded)
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
  $("btn-clear-faces").style.display = nFaces > 0 ? "inline-block" : "none";

  const parts = [];
  if (hasOf) parts.push("Database / Option File (save/ULES004760013000/DATA.BIN)");
  if (nFaces > 0) parts.push(`${nFaces} player face(s) (faces/*.pam)`);
  if (hasCrests) parts.push("169 PC crests & flags (afs/0_text.afs/{2347,2350}.bin)");
  const id = slugifyId($("mod-id").value);
  $("patch-summary-text").innerHTML = parts.length
    ? `Ready to package <code>mods/${id}/</code> with: <strong>${parts.join(" + ")}</strong>.`
    : "Click any team above to edit or import files, then click Build &amp; Download Patch.";
}

// Draw a 64x64 crest or flag onto a canvas:
// 1. Custom 128-color emblem inside DATA.BIN (emblemId >= 292)
// 2. Uploaded PC crest bank (if present) or PSP ISO crest bank (if present)
// 3. Vector shield / flag using the team's primary & secondary colors and 3-letter abbreviation
async function drawTeamCrestCanvas(canvas, team) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (studioOf && !team.isNational && team.emblemId >= 292) {
    const customRgba = studioOf.getCustomEmblemRgba(team.emblemId);
    if (customRgba) {
      const tmp = document.createElement("canvas");
      tmp.width = 64; tmp.height = 64;
      tmp.getContext("2d").putImageData(new ImageData(customRgba, 64, 64), 0, 0);
      ctx.drawImage(tmp, 0, 0, w, h);
      return;
    }
  }

  const bank = studioPcCrestBank || studioPspFlgBank;
  if (bank) {
    const groupIdx = team.isNational ? 0 : 1;
    const entryId = team.isNational ? team.id : team.emblemId;
    try {
      const rgba = await bank.decodeEntryRgba(groupIdx, entryId);
      if (rgba) {
        const tmp = document.createElement("canvas");
        tmp.width = bank.w; tmp.height = bank.h;
        tmp.getContext("2d").putImageData(new ImageData(rgba, bank.w, bank.h), 0, 0);
        ctx.drawImage(tmp, 0, 0, w, h);
        return;
      }
    } catch (_) {}
  }

  // Stylized vector crest / flag fallback with team colors
  const c1 = team.color1 || "#1d4ed8";
  const c2 = team.color2 || "#ffffff";
  ctx.save();
  if (team.isNational) {
    // Waving flag badge
    const r = 8;
    ctx.beginPath();
    ctx.roundRect(4, 10, w - 8, h - 20, r);
    ctx.clip();
    ctx.fillStyle = c1;
    ctx.fillRect(4, 10, (w - 8) * 0.55, h - 20);
    ctx.fillStyle = c2;
    ctx.fillRect(4 + (w - 8) * 0.55, 10, (w - 8) * 0.45, h - 20);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(5, 11, w - 10, h - 22);
  } else {
    // Classic PES shield
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 4);
    ctx.lineTo(w - 6, 12);
    ctx.lineTo(w - 6, h * 0.56);
    ctx.quadraticCurveTo(w - 6, h * 0.84, w * 0.5, h - 4);
    ctx.quadraticCurveTo(6, h * 0.84, 6, h * 0.56);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, w * 0.5, h);
    ctx.fillStyle = c2;
    ctx.fillRect(w * 0.5, 0, w * 0.5, h);
    // Diagonal sheen
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "rgba(255,255,255,0.28)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.0)");
    grad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // Abbreviation badge in center
  ctx.fillStyle = "rgba(9, 13, 22, 0.78)";
  ctx.beginPath();
  ctx.roundRect(w * 0.16, h * 0.36, w * 0.68, h * 0.28, 5);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(w * 0.22)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((team.abv || "PES").slice(0, 3), w * 0.5, h * 0.51);
  ctx.restore();
}

function getCategoryDisplayTitle(cat) {
  if (!studioOf || !cat.leagueRecord) return cat.title;
  const leagues = studioOf.getLeagues();
  const rec = leagues.find((l) => l.id === cat.leagueRecord);
  return rec && rec.name ? rec.name : cat.title;
}

function renderSelectTeamCategories() {
  const natGrid = $("pes-cat-national");
  const clubGrid = $("pes-cat-club");
  natGrid.innerHTML = "";
  clubGrid.innerHTML = "";

  for (const cat of SELECT_TEAM_CATEGORIES) {
    const tile = document.createElement("div");
    tile.className = `pes-cat-tile${cat.key === curCatKey ? " active" : ""}`;
    const label = getCategoryDisplayTitle(cat);
    tile.innerHTML = `<span class="pes-cat-icon">${cat.icon}</span><span class="pes-cat-lbl">${label}</span>`;
    tile.addEventListener("click", () => {
      curCatKey = cat.key;
      $("pes-team-search").value = "";
      renderSelectTeamCategories();
      renderSelectTeamGrid();
    });
    if (cat.group === "national") natGrid.appendChild(tile);
    else clubGrid.appendChild(tile);
  }

  const activeCat = SELECT_TEAM_CATEGORIES.find((c) => c.key === curCatKey) || SELECT_TEAM_CATEGORIES[4];
  const catTitle = getCategoryDisplayTitle(activeCat);
  $("pes-current-cat-title").textContent = catTitle;
  if (activeCat.group === "national") {
    $("pes-nat-group-title").textContent = `National — ${catTitle}`;
    $("pes-club-group-title").textContent = "Club";
    $("pes-league-edit-box").style.display = "none";
  } else {
    $("pes-nat-group-title").textContent = "National";
    $("pes-club-group-title").textContent = `Club — ${catTitle}`;
    $("pes-league-edit-box").style.display = "block";
    $("of-league-name").value = catTitle;
  }
}

function getTeamsForCurrentView(searchQuery = "") {
  if (!studioOf) return [];
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    const out = [];
    for (let c = 0; c < 140; c++) {
      const club = studioOf.getClub(c);
      if (club.name.toLowerCase().includes(q) || club.abv.toLowerCase().includes(q)) {
        out.push(club);
      }
    }
    for (let n = 0; n < 64; n++) {
      const nat = studioOf.getNationalTeam(n);
      if (nat.name.toLowerCase().includes(q) || nat.abv.toLowerCase().includes(q)) {
        out.push(nat);
      }
    }
    return out;
  }

  const cat = SELECT_TEAM_CATEGORIES.find((c) => c.key === curCatKey) || SELECT_TEAM_CATEGORIES[4];
  if (cat.group === "national") {
    return NATIONAL_TEAMS.filter((t) => t.continent === cat.key).map((t) => studioOf.getNationalTeam(t.id));
  }
  const [start, end] = cat.slots;
  const list = [];
  for (let c = start; c <= end; c++) list.push(studioOf.getClub(c));
  return list;
}

function renderSelectTeamGrid() {
  if (!studioOf) return;
  const grid = $("pes-crest-grid");
  grid.innerHTML = "";
  const q = $("pes-team-search").value;
  const teams = getTeamsForCurrentView(q);

  if (teams.length > 0) {
    const focused = teams.find((t) => t.isNational === curTeamIsNat && t.id === curTeamId) || teams[0];
    $("pes-focused-team-name").textContent = focused.name;
  } else {
    $("pes-focused-team-name").textContent = "No teams match search";
  }

  for (const team of teams) {
    const tile = document.createElement("div");
    const isAct = team.isNational === curTeamIsNat && team.id === curTeamId;
    tile.className = `pes-team-tile${isAct ? " active" : ""}`;
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    drawTeamCrestCanvas(cv, team);

    const nm = document.createElement("div");
    nm.className = "pes-team-tile-name";
    nm.textContent = team.name;

    const ab = document.createElement("div");
    ab.className = "pes-team-tile-abv";
    ab.textContent = team.abv;

    tile.append(cv, nm, ab);
    tile.addEventListener("mouseenter", () => {
      $("pes-focused-team-name").textContent = `${team.name} (${team.abv})`;
    });
    tile.addEventListener("click", () => {
      curTeamIsNat = team.isNational;
      curTeamId = team.id;
      openTeamModal(team.isNational, team.id);
    });
    grid.appendChild(tile);
  }
}

$("pes-team-search").addEventListener("input", () => renderSelectTeamGrid());

$("btn-prev-cat").addEventListener("click", () => {
  const idx = SELECT_TEAM_CATEGORIES.findIndex((c) => c.key === curCatKey);
  const next = (idx - 1 + SELECT_TEAM_CATEGORIES.length) % SELECT_TEAM_CATEGORIES.length;
  curCatKey = SELECT_TEAM_CATEGORIES[next].key;
  renderSelectTeamCategories();
  renderSelectTeamGrid();
});
$("btn-next-cat").addEventListener("click", () => {
  const idx = SELECT_TEAM_CATEGORIES.findIndex((c) => c.key === curCatKey);
  const next = (idx + 1) % SELECT_TEAM_CATEGORIES.length;
  curCatKey = SELECT_TEAM_CATEGORIES[next].key;
  renderSelectTeamCategories();
  renderSelectTeamGrid();
});

$("btn-save-league").addEventListener("click", () => {
  if (!studioOf) return;
  const cat = SELECT_TEAM_CATEGORIES.find((c) => c.key === curCatKey);
  if (!cat || !cat.leagueRecord) return;
  const name = $("of-league-name").value.trim();
  if (!name) return;
  studioOf.setLeagueName(cat.leagueRecord, name);
  renderSelectTeamCategories();
  setStatus($("status-of"), "ok", `✅ Renamed league to <strong>${name}</strong>.`);
});

// --- Modal Sub-tabs & Team Editor ---
function switchModalTab(tabName) {
  document.querySelectorAll(".modal-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mtab === tabName);
  });
  document.querySelectorAll(".modal-tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `mtab-${tabName}`);
  });
}

document.querySelectorAll(".modal-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchModalTab(btn.dataset.mtab));
});

$("btn-close-team-modal").addEventListener("click", () => {
  $("team-modal-backdrop").style.display = "none";
  renderSelectTeamGrid();
});
$("team-modal-backdrop").addEventListener("click", (e) => {
  if (e.target === $("team-modal-backdrop")) {
    $("team-modal-backdrop").style.display = "none";
    renderSelectTeamGrid();
  }
});

function populateModalDropdownsOnce() {
  const stadSel = $("of-club-stadium");
  if (!stadSel.options.length) {
    for (const s of STADIUMS) {
      if (s.id < 36) {
        const opt = document.createElement("option");
        opt.value = String(s.id);
        opt.textContent = `[${s.id}] ${s.name}`;
        stadSel.appendChild(opt);
      }
    }
  }
  const posSel = $("of-p-pos");
  if (!posSel.options.length) {
    POS_NAMES.forEach((p, idx) => {
      if (idx === 1 || idx === 3) return; // skip duplicate CB
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = p;
      posSel.appendChild(opt);
    });
  }
  const natSel = $("of-p-nat");
  if (!natSel.options.length) {
    NATIONS.forEach((n, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = n;
      natSel.appendChild(opt);
    });
  }
}

function openTeamModal(isNational, id) {
  if (!studioOf) return;
  populateModalDropdownsOnce();
  curTeamIsNat = isNational;
  curTeamId = id;
  swapPendingSlot = -1;
  $("transfer-box").style.display = "none";
  $("status-club-edit").className = "status";
  $("status-player-edit").className = "status";

  const team = isNational ? studioOf.getNationalTeam(id) : studioOf.getClub(id);
  $("modal-team-badge").textContent = isNational ? `NATIONAL TEAM #${id}` : `CLUB #${id} · EMBLEM #${team.emblemId}`;
  $("modal-team-title").textContent = `${team.name} (${team.abv})`;
  drawTeamCrestCanvas($("modal-team-crest"), team);

  $("of-club-name").value = team.name;
  $("of-club-name").disabled = isNational;
  $("of-club-abv").value = team.abv;
  $("of-club-abv").disabled = isNational;
  $("of-club-stadium").value = String(team.stadiumId < 36 ? team.stadiumId : 0);
  $("of-club-stadium").disabled = isNational;
  $("of-club-col1").value = team.color1 || "#d62626";
  $("of-club-col2").value = team.color2 || "#ffffff";
  $("lbl-upload-club-crest").style.display = isNational ? "none" : "inline-flex";

  // Kit colors
  const kits = studioOf.getTeamKits(isNational, id);
  $("kit-h-shirt").value = kits.home.shirt;
  $("kit-h-stripe").value = kits.home.stripe;
  $("kit-h-shorts").value = kits.home.shorts;
  $("kit-h-socks").value = kits.home.socks;
  $("kit-a-shirt").value = kits.away.shirt;
  $("kit-a-stripe").value = kits.away.stripe;
  $("kit-a-shorts").value = kits.away.shorts;
  $("kit-a-socks").value = kits.away.socks;
  $("kit-g-shirt").value = kits.gk.shirt;
  $("kit-g-stripe").value = kits.gk.stripe;
  $("kit-g-shorts").value = kits.gk.shorts;
  $("kit-g-socks").value = kits.gk.socks;

  renderModalSquadAndPitch();
  const squad = studioOf.getTeamSquad(isNational, id);
  const firstValid = squad.find((p) => p.id > 0) || squad[0];
  if (firstValid && firstValid.id > 0) {
    curSquadSlot = firstValid.slot;
    curPlayerId = firstValid.id;
    populatePlayerTab(firstValid);
  }

  switchModalTab("club");
  $("team-modal-backdrop").style.display = "flex";
}

function renderModalSquadAndPitch() {
  if (!studioOf) return;
  const squad = studioOf.getTeamSquad(curTeamIsNat, curTeamId);
  const form = studioOf.getTeamFormation(curTeamIsNat, curTeamId);
  const kits = studioOf.getTeamKits(curTeamIsNat, curTeamId);

  // 1. Visual Starting XI Pitch
  const pitch = $("tactics-pitch");
  pitch.innerHTML = "";
  for (let s = 0; s < 11; s++) {
    const p = squad[s];
    const st = form.starters[s];
    const dot = document.createElement("div");
    dot.className = `pitch-dot${s === 0 ? " gk" : ""}${s === curSquadSlot ? " active" : ""}`;
    // Map PES6 formation (x: 0..52 depth from own goal to attack, y: 0..100 left-to-right)
    // to vertical pitch (top = attack, bottom = GK)
    const leftPct = s === 0 ? 50 : Math.max(10, Math.min(90, st.y));
    const topPct = s === 0 ? 89 : Math.max(12, Math.min(82, 86 - (st.x / 52) * 72));
    dot.style.left = `${leftPct}%`;
    dot.style.top = `${topPct}%`;

    const circle = document.createElement("div");
    circle.className = "pitch-dot-circle";
    if (s !== 0) {
      circle.style.background = kits.home.shirt;
      circle.style.borderColor = kits.home.stripe;
    }
    circle.textContent = String(p.number);

    const lbl = document.createElement("div");
    lbl.className = "pitch-dot-name";
    lbl.textContent = `${st.role} · ${p.name}`;

    dot.append(circle, lbl);
    dot.addEventListener("click", () => {
      if (swapPendingSlot >= 0 && swapPendingSlot !== s) {
        studioOf.swapSquadSlots(curTeamIsNat, curTeamId, swapPendingSlot, s);
        swapPendingSlot = -1;
        renderModalSquadAndPitch();
        return;
      }
      curSquadSlot = s;
      if (p.id > 0) {
        curPlayerId = p.id;
        populatePlayerTab(p);
        switchModalTab("player");
      }
    });
    pitch.appendChild(dot);
  }

  // 2. Specialist role dropdowns (Captain, FK, Penalty, Corner)
  const roleSelects = [
    ["role-captain", form.captainSlot],
    ["role-fk", form.fkLongSlot],
    ["role-pen", form.penaltySlot],
    ["role-cor", form.cornerLSlot],
  ];
  for (const [selId, curVal] of roleSelects) {
    const sel = $(selId);
    sel.innerHTML = "";
    for (let s = 0; s < 11; s++) {
      const opt = document.createElement("option");
      opt.value = String(s);
      opt.textContent = `#${squad[s].number} ${squad[s].name} (${squad[s].formRole})`;
      sel.appendChild(opt);
    }
    sel.value = String(curVal < 11 ? curVal : 0);
  }

  // 3. Squad Table (Starting XI + Subs)
  const tbody = $("of-squad-tbody");
  tbody.innerHTML = "";
  for (const p of squad) {
    const tr = document.createElement("tr");
    if (p.slot === curSquadSlot) tr.classList.add("active");
    const hasFace = studioFaces.has(p.id);
    const roleBadge = p.isStarter
      ? `<span class="club-abv" style="background:rgba(34,197,94,0.2); color:#86efac;">${p.formRole}</span>`
      : `<span class="club-abv" style="opacity:0.65;">SUB</span>`;
    const isSwapping = swapPendingSlot === p.slot;

    tr.innerHTML =
      `<td>${roleBadge}</td>` +
      `<td><strong>${p.number}</strong></td>` +
      `<td><strong>${p.name}</strong></td>` +
      `<td><span class="club-abv">${p.pos}</span></td>` +
      `<td style="color:#fde047; font-weight:700;">${p.id ? p.ovr : "-"}</td>` +
      `<td>${p.id ? p.age : "-"}</td>` +
      `<td>${hasFace ? "✅ 32×64" : "-"}</td>` +
      `<td><button class="btn btn-swap-slot" style="padding:2px 8px; font-size:0.74rem;">${isSwapping ? "Cancel" : swapPendingSlot >= 0 ? "⇄ Here" : "⇅ Swap"}</button></td>`;

    tr.querySelector(".btn-swap-slot").addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (swapPendingSlot < 0) {
        swapPendingSlot = p.slot;
      } else if (swapPendingSlot === p.slot) {
        swapPendingSlot = -1;
      } else {
        studioOf.swapSquadSlots(curTeamIsNat, curTeamId, swapPendingSlot, p.slot);
        swapPendingSlot = -1;
      }
      renderModalSquadAndPitch();
    });

    tr.addEventListener("click", () => {
      curSquadSlot = p.slot;
      if (p.id > 0) {
        curPlayerId = p.id;
        populatePlayerTab(p);
        switchModalTab("player");
      } else {
        $("transfer-box").style.display = "block";
        $("transfer-search-input").focus();
      }
    });
    tbody.appendChild(tr);
  }
}

["role-captain", "role-fk", "role-pen", "role-cor"].forEach((id) => {
  $(id).addEventListener("change", () => {
    if (!studioOf) return;
    studioOf.setTeamRoles(curTeamIsNat, curTeamId, {
      captainSlot: parseInt($("role-captain").value, 10),
      fkLongSlot: parseInt($("role-fk").value, 10),
      penaltySlot: parseInt($("role-pen").value, 10),
      cornerLSlot: parseInt($("role-cor").value, 10),
    });
  });
});

// --- Transfers & New Player Creation ---
$("btn-transfer-player").addEventListener("click", () => {
  const box = $("transfer-box");
  box.style.display = box.style.display === "none" ? "block" : "none";
  if (box.style.display === "block") {
    renderTransferResults($("transfer-search-input").value);
    $("transfer-search-input").focus();
  }
});
$("btn-close-transfer").addEventListener("click", () => {
  $("transfer-box").style.display = "none";
});
$("transfer-search-input").addEventListener("input", (e) => {
  renderTransferResults(e.target.value);
});

function renderTransferResults(query) {
  if (!studioOf) return;
  const resEl = $("transfer-results");
  resEl.innerHTML = "";
  const hits = studioOf.searchPlayers(query, 40);
  for (const p of hits) {
    const row = document.createElement("div");
    row.className = "club-item";
    row.innerHTML =
      `<span><strong>${p.name}</strong> <span style="color:var(--muted); font-size:0.78rem;">(#${p.id} · ${p.nationName} · Age ${p.age})</span></span>` +
      `<span class="club-abv">${p.pos} · OVR ${p.ovr}</span>`;
    row.addEventListener("click", () => {
      const slot = curSquadSlot >= 0 ? curSquadSlot : 0;
      const squad = studioOf.getTeamSquad(curTeamIsNat, curTeamId);
      const curNum = squad[slot] ? squad[slot].number : slot + 1;
      studioOf.setTeamSquadSlot(curTeamIsNat, curTeamId, slot, p.id, curNum);
      curPlayerId = p.id;
      $("transfer-box").style.display = "none";
      renderModalSquadAndPitch();
    });
    resEl.appendChild(row);
  }
}

$("btn-create-player").addEventListener("click", () => {
  if (!studioOf) return;
  const slot = curSquadSlot >= 0 ? curSquadSlot : 0;
  const newId = studioOf.allocateNewPlayer({
    name: "New Player",
    shirt: "NEW PLAYER",
    posCode: 12,
    nat: 44,
    age: 21,
  });
  studioOf.setTeamSquadSlot(curTeamIsNat, curTeamId, slot, newId, slot + 1);
  curPlayerId = newId;
  renderModalSquadAndPitch();
  const updated = studioOf.getTeamSquad(curTeamIsNat, curTeamId)[slot];
  populatePlayerTab(updated);
  switchModalTab("player");
});

// --- Save Team Info & Kit Colors ---
$("btn-save-club").addEventListener("click", () => {
  if (!studioOf) return;
  if (!curTeamIsNat) {
    const name = $("of-club-name").value.trim();
    const abv = $("of-club-abv").value.trim().toUpperCase();
    const stadiumId = parseInt($("of-club-stadium").value, 10) || 0;
    const color1 = $("of-club-col1").value;
    const color2 = $("of-club-col2").value;
    studioOf.setClub(curTeamId, name, abv, { color1, color2, stadiumId });
  }
  studioOf.setTeamKitColors(curTeamIsNat, curTeamId, 1, {
    shirt: $("kit-h-shirt").value,
    stripe: $("kit-h-stripe").value,
    shorts: $("kit-h-shorts").value,
    socks: $("kit-h-socks").value,
  });
  studioOf.setTeamKitColors(curTeamIsNat, curTeamId, 3, {
    shirt: $("kit-a-shirt").value,
    stripe: $("kit-a-stripe").value,
    shorts: $("kit-a-shorts").value,
    socks: $("kit-a-socks").value,
  });
  studioOf.setTeamKitColors(curTeamIsNat, curTeamId, 0, {
    shirt: $("kit-g-shirt").value,
    stripe: $("kit-g-stripe").value,
    shorts: $("kit-g-shorts").value,
    socks: $("kit-g-socks").value,
  });

  const team = curTeamIsNat ? studioOf.getNationalTeam(curTeamId) : studioOf.getClub(curTeamId);
  $("modal-team-title").textContent = `${team.name} (${team.abv})`;
  drawTeamCrestCanvas($("modal-team-crest"), team);
  renderModalSquadAndPitch();
  renderSelectTeamGrid();
  setStatus($("status-club-edit"), "ok", `✅ Saved changes for <strong>${team.name}</strong>.`);
});

$("file-club-crest").addEventListener("change", async (e) => {
  if (!studioOf || curTeamIsNat || !e.target.files || !e.target.files[0]) return;
  try {
    const file = e.target.files[0];
    const eid = await studioOf.setClubCustomEmblemFromImage(curTeamId, file);
    const team = studioOf.getClub(curTeamId);
    drawTeamCrestCanvas($("modal-team-crest"), team);
    renderSelectTeamGrid();
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

// --- Player Sub-Tab ---
function drawPlayerFacePreview(pid, skinTone = 0) {
  const cv = $("player-face-preview");
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, 32, 64);
  if (studioFaces.has(pid)) {
    const { rgba } = studioFaces.get(pid);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), 32, 64), 0, 0);
    return;
  }
  const skinColors = ["#f5cba7", "#e0ac69", "#b87a44", "#5c3818"];
  ctx.fillStyle = skinColors[skinTone & 3] || "#e0ac69";
  ctx.fillRect(0, 0, 32, 64);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(7, 17, 4, 3);
  ctx.fillRect(21, 17, 4, 3);
  ctx.fillRect(14, 34, 4, 3);
  ctx.fillRect(10, 45, 12, 3);
}

function populatePlayerTab(p) {
  $("of-player-title").textContent = `${p.name} (#${p.number} · DB ID ${p.id} · OVR ${p.ovr})`;
  $("of-player-sub").textContent = `${p.pos} · ${p.nationName} · Age ${p.age} · ${p.height} cm / ${p.weight} kg`;
  $("of-p-name").value = p.name;
  $("of-p-shirt").value = p.shirt;
  $("of-p-num").value = p.number;
  $("of-p-pos").value = String(p.posCode === 1 || p.posCode === 3 ? 2 : p.posCode);
  $("of-p-nat").value = String(p.nationality < NATIONS.length ? p.nationality : 0);
  $("of-p-age").value = p.age;
  $("of-p-height").value = p.height;
  $("of-p-weight").value = p.weight;
  $("of-p-foot").value = String(p.foot);
  $("of-p-skin").value = String(p.skin);

  $("of-p-atk").value = p.attack;
  $("of-p-def").value = p.defence;
  $("of-p-bal").value = p.balance;
  $("of-p-sta").value = p.stamina;
  $("of-p-spd").value = p.top_speed;
  $("of-p-acc").value = p.acceleration;
  $("of-p-res").value = p.response;
  $("of-p-agi").value = p.agility;
  $("of-p-drb").value = p.dribble_acc;
  $("of-p-drs").value = p.dribble_spd;
  $("of-p-spa").value = p.short_pass_acc;
  $("of-p-lpa").value = p.long_pass_acc;
  $("of-p-sha").value = p.shot_acc;
  $("of-p-shp").value = p.shot_power;
  $("of-p-tec").value = p.technique;
  $("of-p-hdr").value = p.header;
  $("of-p-jmp").value = p.jump;
  $("of-p-gka").value = p.gk_ability;

  drawPlayerFacePreview(p.id, p.skin);
}

const STAT_INPUT_IDS = [
  "of-p-atk", "of-p-def", "of-p-bal", "of-p-sta", "of-p-spd", "of-p-acc",
  "of-p-res", "of-p-agi", "of-p-drb", "of-p-drs", "of-p-spa", "of-p-lpa",
  "of-p-sha", "of-p-shp", "of-p-tec", "of-p-hdr", "of-p-jmp", "of-p-gka"
];

function stepAllPlayerStats(delta) {
  for (const id of STAT_INPUT_IDS) {
    const v = parseInt($(id).value, 10) || 70;
    $(id).value = Math.max(1, Math.min(99, v + delta));
  }
}
$("btn-boost-player").addEventListener("click", () => stepAllPlayerStats(5));
$("btn-nerf-player").addEventListener("click", () => stepAllPlayerStats(-5));

$("btn-save-player").addEventListener("click", () => {
  if (!studioOf || !curPlayerId) return;
  const num = parseInt($("of-p-num").value, 10) || 1;
  studioOf.setPlayer(curPlayerId, {
    name: $("of-p-name").value.trim(),
    shirt: $("of-p-shirt").value.trim(),
    posCode: parseInt($("of-p-pos").value, 10),
    nationality: parseInt($("of-p-nat").value, 10),
    age: parseInt($("of-p-age").value, 10) || 25,
    height: parseInt($("of-p-height").value, 10) || 180,
    weight: parseInt($("of-p-weight").value, 10) || 75,
    foot: parseInt($("of-p-foot").value, 10) || 0,
    skin: parseInt($("of-p-skin").value, 10) || 0,
    attack: parseInt($("of-p-atk").value, 10),
    defence: parseInt($("of-p-def").value, 10),
    balance: parseInt($("of-p-bal").value, 10),
    stamina: parseInt($("of-p-sta").value, 10),
    top_speed: parseInt($("of-p-spd").value, 10),
    acceleration: parseInt($("of-p-acc").value, 10),
    response: parseInt($("of-p-res").value, 10),
    agility: parseInt($("of-p-agi").value, 10),
    dribble_acc: parseInt($("of-p-drb").value, 10),
    dribble_spd: parseInt($("of-p-drs").value, 10),
    short_pass_acc: parseInt($("of-p-spa").value, 10),
    long_pass_acc: parseInt($("of-p-lpa").value, 10),
    shot_acc: parseInt($("of-p-sha").value, 10),
    shot_power: parseInt($("of-p-shp").value, 10),
    technique: parseInt($("of-p-tec").value, 10),
    header: parseInt($("of-p-hdr").value, 10),
    jump: parseInt($("of-p-jmp").value, 10),
    gk_ability: parseInt($("of-p-gka").value, 10),
  });
  if (curSquadSlot >= 0) {
    studioOf.setTeamSquadSlot(curTeamIsNat, curTeamId, curSquadSlot, curPlayerId, num);
  }
  renderModalSquadAndPitch();
  const updated = studioOf.getTeamSquad(curTeamIsNat, curTeamId)[curSquadSlot];
  if (updated) populatePlayerTab(updated);
  setStatus($("status-player-edit"), "ok", `✅ Saved changes for player #${curPlayerId} (<strong>${$("of-p-name").value}</strong>).`);
});

$("file-player-face").addEventListener("change", async (e) => {
  if (!curPlayerId || !e.target.files || !e.target.files[0]) return;
  try {
    const res = await convertFaceToPam(e.target.files[0]);
    studioFaces.set(curPlayerId, res);
    drawPlayerFacePreview(curPlayerId);
    renderFaceGallery();
    renderModalSquadAndPitch();
    updateStudioSummary();
    setStatus($("status-player-edit"), "ok", `✅ Warped &amp; linked 32×64 photo face for player #${curPlayerId} (<code>faces/${curPlayerId}.pam</code>).`);
  } catch (err) {
    setStatus($("status-player-edit"), "err", `❌ ${err.message || err}`);
  } finally {
    e.target.value = "";
  }
});

// --- Load Custom Option File or Reset to Default ---
$("file-of").addEventListener("change", async (e) => {
  if (!e.target.files || !e.target.files[0]) return;
  const file = e.target.files[0];
  try {
    studioOf = await PspOptionFile.fromFile(file);
    renderSelectTeamCategories();
    renderSelectTeamGrid();
    updateStudioSummary();
    $("pes-db-badge").textContent = `Loaded: ${file.name}`;
    setStatus(
      $("status-of"),
      "ok",
      `✅ Loaded <strong>${file.name}</strong> into the interactive Select Team grid below!`
    );
  } catch (err) {
    setStatus(
      $("status-of"),
      "err",
      `❌ Not a valid PES6 PC Option File (KONAMI-WIN32PES6OPT) or PSP DATA.BIN (${err.message || err}).`
    );
  } finally {
    e.target.value = "";
  }
});

$("btn-reset-default-of").addEventListener("click", async () => {
  try {
    studioOf = await loadDefaultOptionFile();
    renderSelectTeamCategories();
    renderSelectTeamGrid();
    updateStudioSummary();
    $("pes-db-badge").textContent = "Default PES6 Database (204 Teams · 5,000 Players)";
    setStatus($("status-of"), "info", "🔄 Reset to the default PES6 teams, leagues, and squads.");
  } catch (err) {
    setStatus($("status-of"), "err", `❌ ${err.message || err}`);
  }
});

// Auto-load the built-in default PES6 database at startup so the user can edit immediately
loadDefaultOptionFile()
  .then((of) => {
    if (!studioOf) {
      studioOf = of;
      renderSelectTeamCategories();
      renderSelectTeamGrid();
      updateStudioSummary();
    }
  })
  .catch(() => {});

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
    renderSelectTeamGrid();
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
