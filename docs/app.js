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

// Init
renderStadiumGrid();
populatePatchSelects();
updateSelCount();
updatePatchPspBanner();
