const state = {
  tasks: [],
  filtered: [],
  sortKey: null,
  sortDir: 1
};

const els = {
  myCode:          document.getElementById('myCode'),
  myName:          document.getElementById('myName'),
  workDate:        document.getElementById('workDate'),
  searchInput:     document.getElementById('searchInput'),
  fileInput:       document.getElementById('fileInput'),
  delimiterSelect: document.getElementById('delimiterSelect'),
  tasksBody:       document.getElementById('tasksBody'),
  countInfo:       document.getElementById('countInfo'),
  statusBadge:     document.getElementById('statusBadge'),
  rowTemplate:     document.getElementById('rowTemplate'),
  r2FileInput:     document.getElementById('r2FileInput'),
  r2Path:          document.getElementById('r2Path'),
  r2List:          document.getElementById('r2List'),
  exportBtn:       document.getElementById('exportBtn')
};

// ── Status ────────────────────────────────────────────────────────────────────

function setStatus(text, ok = true) {
  els.statusBadge.textContent = text;
  els.statusBadge.className = 'badge ' + (ok ? 'badge-ok' : 'badge-err');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(v) {
  return String(v ?? '').toLowerCase().trim();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Einstellungen ─────────────────────────────────────────────────────────────

function saveSettings() {
  localStorage.setItem('auftragsScout.myCode', els.myCode.value.trim());
  localStorage.setItem('auftragsScout.myName', els.myName.value.trim());
  localStorage.setItem('auftragsScout.workDate', els.workDate.value || todayIso());
  setStatus('Einstellungen gespeichert');
}

function loadSettings() {
  els.myCode.value  = localStorage.getItem('auftragsScout.myCode')  || '';
  els.myName.value  = localStorage.getItem('auftragsScout.myName')  || '';
  els.workDate.value = localStorage.getItem('auftragsScout.workDate') || todayIso();
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCsvLine(line, delimiter) {
  const out = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else { quoted = !quoted; }
      continue;
    }
    if (ch === delimiter && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function detectHeaderIndex(headers, variants) {
  return headers.findIndex(h => variants.includes(normalize(h)));
}

function detectDelimiter(firstLine) {
  const counts = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of firstLine) { if (ch in counts) counts[ch]++; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function mapRowsToTasks(rows, delimiter) {
  const lines = rows.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delim = delimiter === 'auto' ? detectDelimiter(lines[0]) : delimiter;
  const headers = parseCsvLine(lines[0], delim);

  const idx = {
    zeit:       detectHeaderIndex(headers, ['zeit', 'time', 'uhrzeit']),
    ort:        detectHeaderIndex(headers, ['ort', 'stadt', 'gemeinde', 'location']),
    strasse:    detectHeaderIndex(headers, ['strasse', 'straße', 'adresse', 'address']),
    sparte:     detectHeaderIndex(headers, ['sparte', 'gewerk', 'kategorie']),
    auftrag:    detectHeaderIndex(headers, ['auftrag', 'auftrags-nr.', 'auftragsnr', 'auftragsnummer', 'nr', 'nummer']),
    zustaendig: detectHeaderIndex(headers, ['zustaendig', 'zuständig', 'name', 'vermesser', 'monteur', 'techniker'])
  };

  const tasks = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delim);
    if (!cols.some(Boolean)) continue;
    const task = {
      datum:      els.workDate.value || todayIso(),
      zeit:       idx.zeit >= 0       ? cols[idx.zeit]       || '' : '',
      ort:        idx.ort >= 0        ? cols[idx.ort]        || '' : '',
      strasse:    idx.strasse >= 0    ? cols[idx.strasse]    || '' : '',
      sparte:     idx.sparte >= 0     ? cols[idx.sparte]     || '' : '',
      auftrag:    idx.auftrag >= 0    ? cols[idx.auftrag]    || '' : '',
      zustaendig: idx.zustaendig >= 0 ? cols[idx.zustaendig] || '' : ''
    };
    if (Object.values(task).some(Boolean)) tasks.push(task);
  }
  return tasks;
}

// ── Tabelle ───────────────────────────────────────────────────────────────────

function renderTable() {
  const myCode = normalize(els.myCode.value);
  const q = normalize(els.searchInput.value);

  state.filtered = state.tasks.filter(t => {
    if (!q) return true;
    return normalize([t.zeit, t.ort, t.strasse, t.sparte, t.auftrag, t.zustaendig].join(' ')).includes(q);
  });

  if (state.sortKey) {
    state.filtered.sort((a, b) => {
      const av = normalize(a[state.sortKey]);
      const bv = normalize(b[state.sortKey]);
      return av < bv ? -state.sortDir : av > bv ? state.sortDir : 0;
    });
  }

  const fragment = document.createDocumentFragment();
  for (const task of state.filtered) {
    const row = els.rowTemplate.content.firstElementChild.cloneNode(true);
    for (const k of ['zeit', 'ort', 'strasse', 'sparte', 'auftrag', 'zustaendig']) {
      const td = row.querySelector(`[data-k="${k}"]`);
      td.textContent = task[k];
      td.title = task[k]; // Tooltip für abgeschnittene Texte
    }
    if (myCode && normalize(task.zustaendig).includes(myCode)) {
      row.classList.add('row-highlight');
    }
    fragment.appendChild(row);
  }

  els.tasksBody.innerHTML = '';
  els.tasksBody.appendChild(fragment);
  els.countInfo.textContent = `${state.filtered.length} von ${state.tasks.length} Einträgen`;
}

// Sortierbare Spaltenköpfe
document.querySelectorAll('thead th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    state.sortDir = state.sortKey === col ? state.sortDir * -1 : 1;
    state.sortKey = col;
    document.querySelectorAll('thead th[data-col]').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
    th.classList.add(state.sortDir === 1 ? 'sort-asc' : 'sort-desc');
    renderTable();
  });
});

// ── CSV Import ────────────────────────────────────────────────────────────────

async function importCsv() {
  const file = els.fileInput.files[0];
  if (!file) { setStatus('Bitte CSV wählen', false); return; }

  let text = await file.text();
  // Fallback auf Windows-1252 bei deutschen CSVs mit Umlauten
  if (text.includes('\uFFFD')) {
    const buf = await file.arrayBuffer();
    text = new TextDecoder('windows-1252').decode(buf);
  }

  state.tasks = mapRowsToTasks(text, els.delimiterSelect.value);
  if (!state.tasks.length) {
    setStatus('Keine Daten gefunden – Trennzeichen prüfen', false);
    return;
  }
  renderTable();
  setStatus(`CSV geladen – ${state.tasks.length} Zeilen`);
}

// ── Cloud D1 ──────────────────────────────────────────────────────────────────

async function saveDayToCloud() {
  if (!state.tasks.length) { setStatus('Keine Daten zum Speichern', false); return; }
  const datum = els.workDate.value || todayIso();
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ datum, tasks: state.tasks })
  });
  if (!res.ok) throw new Error((await res.text()) || 'D1 speichern fehlgeschlagen');
  const data = await res.json();
  setStatus(`${data.count} Einträge für ${datum} gespeichert`);
}

async function loadDayFromCloud() {
  const datum = els.workDate.value || todayIso();
  const res = await fetch(`/api/tasks?datum=${encodeURIComponent(datum)}`);
  if (!res.ok) throw new Error((await res.text()) || 'D1 laden fehlgeschlagen');
  state.tasks = await res.json();
  renderTable();
  setStatus(state.tasks.length
    ? `${state.tasks.length} Einträge für ${datum} geladen`
    : `Keine Daten für ${datum}`
  );
}

// ── R2 ────────────────────────────────────────────────────────────────────────

async function uploadToR2() {
  const file = els.r2FileInput.files[0];
  const path = els.r2Path.value.trim();
  if (!file) { setStatus('Bitte Datei wählen', false); return; }
  if (!path) { setStatus('Bitte R2-Pfad angeben', false); return; }

  const form = new FormData();
  form.append('file', file);
  form.append('path', path);
  const res = await fetch('/api/files', { method: 'POST', body: form });
  if (!res.ok) throw new Error((await res.text()) || 'R2 Upload fehlgeschlagen');
  const data = await res.json();
  setStatus(`"${data.key}" hochgeladen (${data.sizeFormatted})`);
  await loadR2List();
}

async function deleteFromR2(key) {
  if (!confirm(`Datei löschen?\n${key}`)) return;
  const res = await fetch(`/api/files?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await res.text()) || 'R2 Löschen fehlgeschlagen');
  setStatus(`"${key}" gelöscht`);
  await loadR2List();
}

async function loadR2List() {
  const res = await fetch('/api/files');
  if (!res.ok) throw new Error((await res.text()) || 'R2 Liste fehlgeschlagen');
  const data = await res.json();
  els.r2List.innerHTML = '';

  if (!data.files?.length) {
    els.r2List.textContent = 'Keine Dateien vorhanden.';
    return;
  }

  const fragment = document.createDocumentFragment();
  data.files.forEach(item => {
    const div = document.createElement('div');
    div.className = 'list-item';

    const nameEl = document.createElement('span');
    nameEl.className = 'list-item-name';
    if (item.publicUrl) {
      const a = document.createElement('a');
      a.href = item.publicUrl;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = item.key;
      a.title = item.key;
      nameEl.appendChild(a);
    } else {
      nameEl.textContent = item.key;
      nameEl.title = item.key;
    }

    const metaEl = document.createElement('span');
    metaEl.className = 'list-item-meta';
    metaEl.textContent = `${item.sizeFormatted || ''} ${item.uploaded || ''}`.trim();

    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.title = 'Löschen';
    delBtn.addEventListener('click', () => guarded(() => deleteFromR2(item.key)));

    div.appendChild(nameEl);
    div.appendChild(metaEl);
    div.appendChild(delBtn);
    fragment.appendChild(div);
  });

  if (data.truncated) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Liste zeigt max. 200 Dateien.';
    fragment.appendChild(hint);
  }

  els.r2List.appendChild(fragment);
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCsv() {
  if (!state.filtered.length) { setStatus('Keine Daten zum Exportieren', false); return; }
  const header = ['Datum', 'Zeit', 'Ort', 'Straße', 'Sparte', 'Auftrag', 'Zuständig'];
  const keys   = ['datum', 'zeit', 'ort', 'strasse', 'sparte', 'auftrag', 'zustaendig'];
  const esc    = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv    = [header.join(';'), ...state.filtered.map(t => keys.map(k => esc(t[k])).join(';'))];
  const blob   = new Blob(['\uFEFF' + csv.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href     = url;
  a.download = `auftragsscout_${els.workDate.value || todayIso()}.csv`;
  // Ans DOM hängen für Firefox-Kompatibilität
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus(`${state.filtered.length} Einträge exportiert`);
}

// ── Guarded Calls ─────────────────────────────────────────────────────────────

async function guarded(fn) {
  try {
    setStatus('Lädt …');
    await fn();
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Unbekannter Fehler', false);
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
document.getElementById('importBtn').addEventListener('click', () => guarded(importCsv));
document.getElementById('saveCloudBtn').addEventListener('click', () => guarded(saveDayToCloud));
document.getElementById('loadDayBtn').addEventListener('click', () => guarded(loadDayFromCloud));
document.getElementById('uploadR2Btn').addEventListener('click', () => guarded(uploadToR2));
document.getElementById('listR2Btn').addEventListener('click', () => guarded(loadR2List));
els.exportBtn.addEventListener('click', exportCsv);
els.searchInput.addEventListener('input', renderTable);
els.myCode.addEventListener('change', saveSettings);
els.myName.addEventListener('change', saveSettings);
els.workDate.addEventListener('change', saveSettings);

// ── Init ──────────────────────────────────────────────────────────────────────

loadSettings();
renderTable();
