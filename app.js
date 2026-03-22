// AuftragsScout — Finale Version
// Quelldatei-Ordner (lesen) + Ablage-Ordner (schreiben)

const SK='as_tasks', HK='as_history', PK='as_profile', SET_K='as_settings';
const FK_SOURCE='as_folder_source', FK_TARGET='as_folder_target';

// ── Personen ──────────────────────────────────────────────────────────────────
const PERSONS = {
  'DB': { name:'Dane Beckers',    color:'#ffff00' },
  'IB': { name:'Isabel Bock',     color:'#95b3d7' },
  'JB': { name:'Jens Buchkremer', color:'#00b050' },
  'AT': { name:'Albert Tisch',    color:'#c4d79b' },
  'PT': { name:'Pascal Thelen',   color:'#ffcc99' },
  'CB': { name:'Christoph Beuel', color:'#e26b0a' },
  'FK': { name:'Fabian Kunz',     color:'#00b0f0' },
  'HL': { name:'Hans Lyhme',      color:'#c0c0c0' },
  'LO': { name:'Löffler',         color:'#a6a6a6' },
  'LÖ': { name:'Löffler',         color:'#a6a6a6' },
  'TT': { name:'Thangarajah',     color:'#948a54' },
  'BD': { name:'Beckers Dane',    color:'#ffff00' },
  'BC': { name:'Beuel Christoph', color:'#e26b0a' },
  'BI': { name:'Bock Isabel',     color:'#95b3d7' },
  'BJ': { name:'Buchkremer Jens', color:'#00b050' },
  'KF': { name:'Kunz Fabian',     color:'#00b0f0' },
  'LH': { name:'Lyhme Hans',      color:'#c0c0c0' },
  'TP': { name:'Thelen Pascal',   color:'#ffcc99' },
  'TA': { name:'Tisch Albert',    color:'#c4d79b' },
};
const KUERZEL_LIST=Object.keys(PERSONS);
function personColor(c){return PERSONS[c]?.color||'#64748b';}
function personName(c){return PERSONS[c]?.name||c;}
function chipFg(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)/255>0.55?'#1a1a1a':'#ffffff';
}

const CITIES=[
  {c:'Aachen',          k:['aachen','ac','aach','achen']},
  {c:'Würselen',        k:['würselen','wurselen','wu','wursel']},
  {c:'Stolberg',        k:['stolberg','sto']},
  {c:'Eschweiler',      k:['eschweiler','esch']},
  {c:'Alsdorf',         k:['alsdorf','als']},
  {c:'Baesweiler',      k:['baesweiler','bae']},
  {c:'Herzogenrath',    k:['herzogenrath','herz','hz']},
  {c:'Linnich',         k:['linnich','lin']},
  {c:'Aldenhoven',      k:['aldenhoven','ald']},
  {c:'Jülich',          k:['jülich','julich','jul']},
  {c:'Kohlscheid',      k:['kohlscheid','kohl']},
  {c:'Monschau',        k:['monschau','mon']},
  {c:'Simmerath',       k:['simmerath','sim']},
  {c:'Roetgen',         k:['roetgen','roe']},
  {c:'Übach-Palenberg', k:['übach','ubach']},
  {c:'Geilenkirchen',   k:['geilenkirchen','geil']},
  {c:'Heinsberg',       k:['heinsberg','hein']},
  {c:'Wassenberg',      k:['wassenberg','was']},
  {c:'Niederzier',      k:['niederzier','nieder']},
  {c:'Titz',            k:['titz']},
];
const SKIP_RE=/mittag|vormittag|teamsitzung|gestern|kataster|nachmessung|einstellungstest|einführung|carsten|jens frei/i;

// ── State ─────────────────────────────────────────────────────────────────────
const state={
  tasks:[], history:lp(HK,[]), profile:lp(PK,{code:'TT',name:'Thangarajah'}),
  settings:lp(SET_K,{firstRun:true}),
  sourceHandle:null,  // Ordner für CSV/ODS (lesen)
  targetHandle:null,  // Ablage-Ordner (schreiben)
};

const $=id=>document.getElementById(id);
const tableBody=$('tableBody');
const loadStatus=$('loadStatus');
const modal=$('modal'), modalContent=$('modalContent');

$('myCode').value=state.profile.code;
$('myName').value=state.profile.name;

const dl=$('cityDL');
CITIES.forEach(e=>{const o=document.createElement('option');o.value=e.c;dl.appendChild(o);});

// ── Events ────────────────────────────────────────────────────────────────────
$('settingsBtn').addEventListener('click',openSettings);
$('settingsClose').addEventListener('click',closeSettings);
$('settingsCancel').addEventListener('click',closeSettings);
$('settingsSave').addEventListener('click',saveSettings);
$('settingsModal').addEventListener('click',e=>{if(e.target===$('settingsModal'))closeSettings();});

$('pickSourceBtn').addEventListener('click',pickSourceFolder);
$('reloadSourceBtn').addEventListener('click',loadFromSourceFolder);
$('forgetSourceBtn').addEventListener('click',()=>forgetFolder('source'));

$('pickTargetBtn').addEventListener('click',pickTargetFolder);
$('forgetTargetBtn').addEventListener('click',()=>forgetFolder('target'));

$('xlsxInput').addEventListener('change',onFileLoad);
$('xlsxInput2').addEventListener('change',onFileLoad);
$('imgInput').addEventListener('change',onImageLoad);
$('quickReloadBtn').addEventListener('click',loadFromSourceFolder);

$('saveHistoryBtn').addEventListener('click',saveToHistory);
$('createFoldersBtn').addEventListener('click',createFoldersOnDisk);
$('zipBtn').addEventListener('click',exportZip);
$('exportJsonBtn').addEventListener('click',exportJson);
$('loadJsonBtn').addEventListener('click',()=>$('loadJsonInput').click());
$('loadJsonInput').addEventListener('change',importJson);
$('copyFolderBtn').addEventListener('click',copyFolderText);

$('searchInput').addEventListener('input',renderTable);
$('personFilter').addEventListener('change',renderTable);
$('sparteFilter').addEventListener('change',renderTable);
$('histSearch').addEventListener('input',renderHistory);
$('histPerson').addEventListener('change',renderHistory);
$('histFrom').addEventListener('change',renderHistory);
$('histTo').addEventListener('change',renderHistory);
$('modalClose').addEventListener('click',closeModal);
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeSettings();}});

// ── Topbar-Profil ─────────────────────────────────────────────────────────────
function updateTopbarProfile(){
  const c=state.profile.code, col=personColor(c), fg=chipFg(col);
  $('topbarProfile').innerHTML=
    `<span style="background:${col};color:${fg};padding:3px 10px;border-radius:6px;font-weight:700;font-size:13px">${esc(c)}</span>
     <span style="font-size:13px;color:var(--muted)">${esc(state.profile.name)}</span>`;
}
updateTopbarProfile();

// ── Einstellungen ─────────────────────────────────────────────────────────────
function openSettings(){
  $('myCode').value=state.profile.code;
  $('myName').value=state.profile.name;
  $('settingsModal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeSettings(){
  $('settingsModal').classList.add('hidden');
  document.body.style.overflow='';
}
function saveSettings(){
  state.profile={
    code:($('myCode').value||'TT').trim().toUpperCase(),
    name:($('myName').value||'').trim()||'Thangarajah',
  };
  state.settings={...state.settings, firstRun:false};
  sp(PK,state.profile); sp(SET_K,state.settings);
  updateTopbarProfile();
  renderTable();
  closeSettings();
}

// ── IndexedDB für Ordner-Handles ──────────────────────────────────────────────
function openDB(){return new Promise((r,j)=>{const q=indexedDB.open('as1',1);q.onupgradeneeded=e=>e.target.result.createObjectStore('h');q.onsuccess=e=>r(e.target.result);q.onerror=e=>j(e.target.error);});}
async function dbPut(k,v){try{const db=await openDB();db.transaction('h','readwrite').objectStore('h').put(v,k);}catch{}}
async function dbGet(k){try{const db=await openDB();return await new Promise((r,j)=>{const q=db.transaction('h','readonly').objectStore('h').get(k);q.onsuccess=e=>r(e.target.result||null);q.onerror=j;});}catch{return null;}}
async function dbDel(k){try{const db=await openDB();db.transaction('h','readwrite').objectStore('h').delete(k);}catch{}}

// ── Quell-Ordner (CSV/ODS lesen) ──────────────────────────────────────────────
async function initFolders(){
  if(!window.showDirectoryPicker) return;
  const sh=await dbGet(FK_SOURCE);
  if(sh){state.sourceHandle=sh;try{const p=await sh.queryPermission({mode:'read'});setSourceUI(sh.name);if(p==='granted')loadFromSourceFolder();}catch{setSourceUI(sh.name);}}
  const th=await dbGet(FK_TARGET);
  if(th){state.targetHandle=th;try{await th.queryPermission({mode:'readwrite'});setTargetUI(th.name);}catch{setTargetUI(th.name);}}
}
function setSourceUI(name){
  $('sourceStatus').textContent=`✓ "${name}"`;
  $('sourceStatus').style.color='#4ade80';
  $('pickSourceBtn').textContent='📁 Anderen wählen';
  $('reloadSourceBtn').classList.remove('hidden');
  $('forgetSourceBtn').classList.remove('hidden');
  $('quickReloadBtn').classList.remove('hidden');
}
function setTargetUI(name){
  $('targetStatus').textContent=`✓ Ablage: "${name}"`;
  $('targetStatus').style.color='#4ade80';
  $('pickTargetBtn').textContent='📂 Anderen wählen';
  $('forgetTargetBtn').classList.remove('hidden');
  updateCreateBtn();
}
async function pickSourceFolder(){
  if(!window.showDirectoryPicker){alert('Nur Edge/Chrome.');return;}
  try{const h=await window.showDirectoryPicker({mode:'read'});state.sourceHandle=h;await dbPut(FK_SOURCE,h);setSourceUI(h.name);loadFromSourceFolder();}
  catch(e){if(e.name!=='AbortError')console.error(e);}
}
async function pickTargetFolder(){
  if(!window.showDirectoryPicker){alert('Nur Edge/Chrome.');return;}
  try{
    const h=await window.showDirectoryPicker({mode:'readwrite'});
    state.targetHandle=h;
    await dbPut(FK_TARGET,h);
    setTargetUI(h.name);
  }catch(e){if(e.name!=='AbortError')console.error(e);}
}
async function forgetFolder(type){
  if(type==='source'){
    state.sourceHandle=null; await dbDel(FK_SOURCE);
    $('sourceStatus').textContent=''; $('pickSourceBtn').textContent='📁 Ordner wählen';
    $('reloadSourceBtn').classList.add('hidden'); $('forgetSourceBtn').classList.add('hidden');
    $('quickReloadBtn').classList.add('hidden');
  } else {
    state.targetHandle=null; await dbDel(FK_TARGET);
    $('targetStatus').textContent=''; $('pickTargetBtn').textContent='📂 Ablage-Ordner wählen';
    $('forgetTargetBtn').classList.add('hidden');
    updateCreateBtn();
  }
}
async function loadFromSourceFolder(){
  if(!state.sourceHandle){loadStatus.textContent='⚠ Kein Quell-Ordner gewählt.';return;}
  try{
    if(await state.sourceHandle.requestPermission({mode:'read'})!=='granted'){loadStatus.textContent='⚠ Berechtigung nötig.';return;}
    const files=[];
    for await(const [name,entry] of state.sourceHandle.entries())
      if(entry.kind==='file'&&/\.(csv|ods|xlsx|xls)$/i.test(name)) files.push({name,entry});
    if(!files.length){loadStatus.textContent='⚠ Keine CSV/ODS im Ordner.';return;}
    const meta=await Promise.all(files.map(async f=>{const file=await f.entry.getFile();return{name:f.name,file,t:file.lastModified};}));
    meta.sort((a,b)=>b.t-a.t);
    loadStatus.textContent=`⏳ Lade ${meta[0].name} …`;
    await processFile(await meta[0].file.arrayBuffer(),meta[0].name);
  }catch(e){loadStatus.textContent='⚠ '+e.message;console.error(e);}
}

// ── Foto/Screenshot OCR ───────────────────────────────────────────────────────
async function onImageLoad(evt){
  const file=evt.target.files?.[0]; if(!file) return;
  loadStatus.style.color='';
  loadStatus.textContent=`⏳ Bild wird vorbereitet …`;
  try{
    // Bild hochskalieren + leichten Kontrast (kein harter S/W-Filter)
    const dataUrl = await prepareImage(file);
    loadStatus.textContent='⏳ OCR läuft … (kann 30–60 Sek. dauern)';
    const result = await Tesseract.recognize(dataUrl,'deu',{
      logger: m=>{
        if(m.status&&m.progress)
          loadStatus.textContent=`⏳ OCR: ${Math.round(m.progress*100)}%`;
      }
    });
    const raw=result.data.text||'';
    // Pipes normieren: | oft als l/I erkannt
    const cleaned=raw.split('\n').map(l=>
      l.replace(/\|{2,}/g,'|').replace(/\s*\|\s*/g,' | ').replace(/\s+/g,' ').trim()
    ).filter(l=>l.length>3).join('\n');

    if(!cleaned){ loadStatus.textContent='⚠ Kein Text erkannt. Besseres Bild versuchen.'; return; }

    // Versuchen als strukturierte Tabelle zu parsen
    loadStatus.textContent='⏳ Verarbeite OCR-Text …';
    const rows=cleaned.split('\n').map(l=>l.split('|').map(c=>c.trim()));
    const buf=null; // kein Buffer, direkt rows übergeben
    await processRows(rows, `OCR: ${file.name}`);
  }catch(e){
    loadStatus.style.color='#f87171';
    loadStatus.textContent='⚠ OCR Fehler: '+e.message;
    console.error(e);
  }
  evt.target.value='';
}

function prepareImage(file){
  return new Promise((res,rej)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const scale=img.width<2000?Math.min(3,2000/img.width):1;
        const w=Math.round(img.width*scale),h=Math.round(img.height*scale);
        const cv=document.createElement('canvas');cv.width=w;cv.height=h;
        const ctx=cv.getContext('2d');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
        ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,w,h);
        // Leichter Kontrast — kein harter S/W-Filter
        const id=ctx.getImageData(0,0,w,h);const d=id.data;
        for(let i=0;i<d.length;i+=4){
          d[i]  =Math.min(255,Math.max(0,(d[i]  -128)*1.4+138));
          d[i+1]=Math.min(255,Math.max(0,(d[i+1]-128)*1.4+138));
          d[i+2]=Math.min(255,Math.max(0,(d[i+2]-128)*1.4+138));
          d[i+3]=255;
        }
        ctx.putImageData(id,0,0);
        res(cv.toDataURL('image/png'));
      };
      img.onerror=rej;
      img.src=String(e.target.result);
    };
    reader.onerror=rej;
    reader.readAsDataURL(file);
  });
}

// Rows direkt verarbeiten (für OCR-Output)
async function processRows(rows, sourceName){
  if(!rows.length) throw new Error('Keine Zeilen erkannt');
  const strRows=rows.map(r=>r.map(c=>String(c||'').trim()));

  let hIdx=-1,colMap=null;
  for(let ri=0;ri<Math.min(strRows.length,20);ri++){
    if(KUERZEL_LIST.filter(k=>strRows[ri].some(c=>c.toUpperCase()===k)).length>=2){
      hIdx=ri; colMap=buildColMap(strRows[ri]); break;
    }
  }
  if(!colMap){
    loadStatus.textContent='⚠ Kopfzeile nicht gefunden. OCR-Qualität zu schlecht — bitte CSV verwenden.';
    return;
  }
  // Weiter mit normaler processFile-Logik aber ohne buf
  await processFromRows(strRows, hIdx, colMap, sourceName);
}

async function processFromRows(rows, hIdx, colMap, sourceName){
  const myC=state.profile.code.toUpperCase();
  const tasks=[];
  for(let ri=hIdx+1;ri<rows.length;ri++){
    const row=rows[ri];
    if(row.every(c=>!c)||SKIP_RE.test(row.join(' '))) continue;
    const cityRaw=row[colMap.ort]||'',stRaw=row[colMap.strasse]||'';
    if(!cityRaw&&!stRaw) continue;
    const city=canonCity(cityRaw);
    const {street,number}=splitSN(stRaw);
    if(!city&&!street) continue;
    const time=parseTime(row[colMap.zeit]||'');
    const orderNo=(row[colMap.auftrag]||'').replace(/[^\d]/g,'');
    const monteur=(row[colMap.monteur]||'').trim();
    const meister=(row[colMap.meister]||'').trim();
    const infos  =(row[colMap.infos]  ||'').trim();
    let sparte='';
    for(const [sp,idx] of Object.entries(colMap.sparten))
      if((row[idx]||'').toUpperCase()==='X'){sparte=sp;break;}
    const assignedTo=[];
    for(const [code,idx] of Object.entries(colMap.kuerzel))
      if((row[idx]||'').toUpperCase()==='X') assignedTo.push(code);
    if(!assignedTo.length) continue;
    tasks.push({id:`r${ri}`,city,street,number,time,sparte,orderNo,monteur,meister,infos,assignedTo,isMine:assignedTo.includes(myC)});
  }
  state.tasks=tasks;
  const allCodes=[...new Set(tasks.flatMap(t=>t.assignedTo))].sort();
  const allSpartes=[...new Set(tasks.map(t=>t.sparte).filter(Boolean))].sort();
  updateSelect('personFilter','Alle Personen',allCodes.map(c=>({v:c,l:`${c} – ${personName(c)}`})));
  updateSelect('sparteFilter','Alle Sparten',allSpartes.map(s=>({v:s,l:s})));
  renderStatBar(tasks);renderTable();renderFolderPreview();updateCreateBtn();
  const arbeitsdatum = askImportDate(sourceName);
  try{ await saveDayToDB(tasks, arbeitsdatum); loadStatus.textContent=`✓ ${tasks.length} Aufträge aus ${sourceName} · Cloud gespeichert (${arbeitsdatum})`; }
  catch(e){ console.error(e); loadStatus.textContent=`✓ ${tasks.length} Aufträge aus ${sourceName} · lokal geladen (Cloud-Fehler)`; }
  if(!colMap.kuerzel[myC]) loadStatus.textContent+=` ⚠ Kürzel "${myC}" nicht gefunden`;
}
async function onFileLoad(evt){
  const file=evt.target.files?.[0];if(!file)return;
  loadStatus.textContent=`⏳ Lese ${file.name} …`;
  try{await processFile(await file.arrayBuffer(),file.name);}
  catch(e){loadStatus.style.color='#f87171';loadStatus.textContent='⚠ '+e.message;}
  evt.target.value='';
}

// ── CSV ───────────────────────────────────────────────────────────────────────
function parseCSV(text){
  const first=text.split('\n')[0]||'';
  const sep=first.includes(';')?';':first.includes('\t')?'\t':',';
  return text.split(/\r?\n/).map(line=>{
    const cells=[];let cur='',inQ=false;
    for(const ch of line){if(ch==='"'){inQ=!inQ;}else if(ch===sep&&!inQ){cells.push(cur.trim());cur='';}else{cur+=ch;}}
    cells.push(cur.trim());return cells;
  }).filter(r=>r.some(c=>c));
}

// ── Datei verarbeiten ─────────────────────────────────────────────────────────
async function processFile(buf,name){
  loadStatus.style.color='';
  const ext=name.split('.').pop().toLowerCase();
  let rows=[];
  if(ext==='csv'){
    let text='';
    try{text=new TextDecoder('utf-8').decode(buf);if(text.includes('\ufffd'))throw 0;}
    catch{text=new TextDecoder('windows-1252').decode(buf);}
    rows=parseCSV(text);
  }else{
    const wb=XLSX.read(buf,{type:'array',cellDates:true});
    rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:true});
  }
  if(!rows.length) throw new Error('Datei ist leer');
  rows=rows.map(r=>r.map(c=>String(c||'').trim()));

  // Kopfzeile
  let hIdx=-1,colMap=null;
  for(let ri=0;ri<Math.min(rows.length,20);ri++){
    if(KUERZEL_LIST.filter(k=>rows[ri].some(c=>c.toUpperCase()===k)).length>=2){
      hIdx=ri; colMap=buildColMap(rows[ri]); break;
    }
  }
  if(!colMap) throw new Error('Kürzel-Spalten nicht gefunden (TT, DB, IB …). Richtige Datei?');

  const myC=state.profile.code.toUpperCase();
  const myIdx=colMap.kuerzel[myC];

  const tasks=[];
  for(let ri=hIdx+1;ri<rows.length;ri++){
    const row=rows[ri];
    if(row.every(c=>!c)||SKIP_RE.test(row.join(' '))) continue;
    const cityRaw=row[colMap.ort]||'', stRaw=row[colMap.strasse]||'';
    if(!cityRaw&&!stRaw) continue;
    const city=canonCity(cityRaw);
    const {street,number}=splitSN(stRaw);
    if(!city&&!street) continue;

    const time=parseTime(row[colMap.zeit]||'');
    const orderNo=(row[colMap.auftrag]||'').replace(/[^\d]/g,'');
    const monteur=(row[colMap.monteur]||'').trim();
    const meister=(row[colMap.meister]||'').trim();
    const infos  =(row[colMap.infos]  ||'').trim();
    let sparte='';
    for(const [sp,idx] of Object.entries(colMap.sparten))
      if((row[idx]||'').toUpperCase()==='X'){sparte=sp;break;}
    const assignedTo=[];
    for(const [code,idx] of Object.entries(colMap.kuerzel))
      if((row[idx]||'').toUpperCase()==='X') assignedTo.push(code);
    if(!assignedTo.length) continue;

    tasks.push({
      id:`r${ri}`,city,street,number,time,sparte,orderNo,
      monteur,meister,infos,assignedTo,
      isMine:assignedTo.includes(myC),
    });
  }

  state.tasks=tasks;
  const allCodes=[...new Set(tasks.flatMap(t=>t.assignedTo))].sort();
  const allSpartes=[...new Set(tasks.map(t=>t.sparte).filter(Boolean))].sort();
  updateSelect('personFilter','Alle Personen',allCodes.map(c=>({v:c,l:`${c} – ${personName(c)}`})));
  updateSelect('sparteFilter','Alle Sparten',allSpartes.map(s=>({v:s,l:s})));
  updateSelect('histPerson','Alle',allCodes.map(c=>({v:c,l:`${c} – ${personName(c)}`})));
  renderStatBar(tasks);
  renderTable();
  renderFolderPreview();
  updateCreateBtn();
  const arbeitsdatum = askImportDate(name);
  try{ await saveDayToDB(tasks, arbeitsdatum); loadStatus.textContent=`✓ ${tasks.length} Aufträge · Cloud gespeichert (${arbeitsdatum})`; }
  catch(e){ console.error(e); loadStatus.textContent=`✓ ${tasks.length} Aufträge · lokal geladen (Cloud-Fehler)`; }
  if(myIdx===undefined) loadStatus.textContent+=` ⚠ Kürzel "${myC}" nicht gefunden!`;
}

function buildColMap(row){
  const m={kuerzel:{},sparten:{},zeit:0,ort:1,strasse:2,monteur:3,auftrag:4,meister:11,infos:20};
  row.forEach((cell,idx)=>{
    const cu=cell.toUpperCase().trim(),cn=norm(cell);
    if(KUERZEL_LIST.includes(cu))         m.kuerzel[cu]=idx;
    if(/^(G|W|S|B|FM|FW)$/.test(cu))     m.sparten[cu]=idx;
    if(cn==='zeit')                        m.zeit=idx;
    if((cn.includes('gemeinde')||cn==='ort'||cn.includes('ortsteil'))&&!m._o){m.ort=idx;m._o=1;}
    if((cn.includes('stra')||cn.includes('verleg'))&&!cn.includes('meister')&&!m._s){m.strasse=idx;m._s=1;}
    if((cn.includes('monteur')||cn.includes('firma'))&&!m._m){m.monteur=idx;m._m=1;}
    if((cn.includes('auftrag')||cn.includes('auftr'))&&!m._a){m.auftrag=idx;m._a=1;}
    if((cn.includes('meister')||cn.includes('vorarbeiter'))&&!m._me){m.meister=idx;m._me=1;}
    if(cn.includes('info')&&!m._i){m.infos=idx;m._i=1;}
  });
  return m;
}

// ── Ordnerstruktur ────────────────────────────────────────────────────────────
function myTasks(){ return state.tasks.filter(t=>t.isMine); }

function buildFolderName(t){
  // Root ist bereits der Jahresordner (z. B. 2026).
  // Deshalb baut die App darunter nur noch: Stadt / Straße Hausnummer
  return [t.street,t.number].filter(Boolean).join(' ').trim()||'Ohne Adresse';
}

function renderFolderPreview(){
  const mine=myTasks();
  const sec=$('folderSection');
  if(!mine.length){sec.style.display='none';return;}
  sec.style.display='';
  const lines=mine.map(t=>{
    const name=buildFolderName(t);
    const exists = state.history.some(h=>
      h.person===state.profile.code.toUpperCase()&&
      sameN(h.city,t.city)&&sameN(h.street,t.street)
    );
    const marker = exists ? ' ← Ordner existiert bereits' : ' ← NEU';
    return `${t.city||'?'} / ${name} / ${marker}\n`+
           `  ├── Abgabe/\n`+
           `  ├── Dokument/\n`+
           `  ├── Foto/\n`+
           `  ├── Scan/\n`+
           `  └── Pythagoras/\n`+
           `      └── ${name}.pyt`;
  });
  $('folderPreview').textContent=lines.join('\n\n');
  updateCreateBtn();
}

function updateCreateBtn(){
  const btn=$('createFoldersBtn');
  if(!btn) return;
  const mine=myTasks();
  if(state.targetHandle && mine.length){
    btn.classList.remove('hidden');
    const neu=mine.filter(t=>!state.history.some(h=>h.person===state.profile.code.toUpperCase()&&sameN(h.city,t.city)&&sameN(h.street,t.street))).length;
    const exists=mine.length-neu;
    btn.textContent=`📁 Ordner erstellen (${neu} neu${exists>0?', '+exists+' bereits vorhanden':''})`;
  } else {
    btn.classList.add('hidden');
  }
}

function copyFolderText(){
  const text=$('folderPreview').textContent;
  navigator.clipboard.writeText(text).then(()=>{
    const btn=$('copyFolderBtn');
    btn.textContent='✓ Kopiert!';
    setTimeout(()=>btn.textContent='📋 Kopieren',2000);
  });
}

// ── ORDNER ERSTELLEN — pro Auftrag einzeln bestätigen ─────────────────────────
async function createFoldersOnDisk(){
  const mine=myTasks();
  if(!mine.length){alert('Keine eigenen Aufträge.');return;}
  if(!state.targetHandle){alert('Bitte zuerst den Ablage-Ordner in den Einstellungen auswählen.');openSettings();return;}

  const btn=$('createFoldersBtn');
  btn.disabled=true;

  try{
    const perm=await state.targetHandle.requestPermission({mode:'readwrite'});
    if(perm!=='granted') throw new Error('Berechtigung verweigert.');

    // targetHandle zeigt bereits auf den Jahresordner (z. B. 2026)
    let tpl=null;
    try{tpl=await fetch('assets/Muster.pyt').then(r=>r.arrayBuffer());}catch{}

    let created=0, skipped=0, cancelled=false;

    for(const t of mine){
      if(cancelled) break;

      const name=buildFolderName(t);
      const city=t.city||'Unbekannt';
      const label=`${t.city||'?'} – ${t.street||'?'}${t.number?' '+t.number:''}`;

      // Prüfen ob Ordner schon existiert
      const cityDir = await state.targetHandle.getDirectoryHandle(city, {create:true});
      let exists=false;
      try{await cityDir.getDirectoryHandle(name,{create:false}); exists=true;}catch{}

      // Dialog anzeigen
      let doCreate=false;
      if(exists){
        // Ordner existiert — nachfragen
        const answer=await showConfirmDialog(
          label,
          `Der Ordner <strong>${esc(name)}</strong> existiert bereits.\nTrotzdem neu erstellen?`,
          ['Ja, neu erstellen','Nein, überspringen','Abbrechen']
        );
        if(answer==='Abbrechen'){cancelled=true;break;}
        doCreate=(answer==='Ja, neu erstellen');
      } else {
        // Neuer Ordner — kurz bestätigen
        const answer=await showConfirmDialog(
          label,
          `Neuen Ordner <strong>${esc(name)}</strong> erstellen?`,
          ['Ja erstellen','Nein, überspringen','Abbrechen']
        );
        if(answer==='Abbrechen'){cancelled=true;break;}
        doCreate=(answer==='Ja erstellen');
      }

      if(!doCreate){skipped++;continue;}

      // Ordner erstellen
      const auftrDir=await cityDir.getDirectoryHandle(name,{create:true});
      await auftrDir.getDirectoryHandle('Abgabe',   {create:true});
      await auftrDir.getDirectoryHandle('Dokument', {create:true});
      await auftrDir.getDirectoryHandle('Foto',     {create:true});
      await auftrDir.getDirectoryHandle('Scan',     {create:true});
      const pytDir=await auftrDir.getDirectoryHandle('Pythagoras',{create:true});
      try{await pytDir.getFileHandle(`${name}.pyt`,{create:false});}
      catch{
        const f=await pytDir.getFileHandle(`${name}.pyt`,{create:true});
        const w=await f.createWritable();
        if(tpl)await w.write(tpl);
        await w.close();
      }
      created++;
    }

    const msg = cancelled
      ? `Abgebrochen — ${created} erstellt, ${skipped} übersprungen`
      : `✓ ${created} erstellt, ${skipped} übersprungen`;
    btn.textContent=msg;
    btn.style.background='#22c55e';
    btn.style.color='#000';
    setTimeout(()=>{updateCreateBtn();btn.disabled=false;btn.style.background='';btn.style.color='';},3000);

  }catch(e){
    console.error(e);
    btn.textContent=`⚠ ${e.message}`;
    btn.disabled=false;
    setTimeout(()=>updateCreateBtn(),3000);
  }
}

// Kleiner Dialog mit mehreren Buttons — gibt gewählten Button-Text zurück
function showConfirmDialog(title, message, buttons){
  return new Promise(resolve=>{
    // Overlay
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';

    const box=document.createElement('div');
    box.style.cssText='background:#121b2e;border:1px solid #1e2d45;border-radius:18px;padding:24px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5)';

    box.innerHTML=`
      <div style="font-size:16px;font-weight:800;margin-bottom:8px;color:#e8eefc">${esc(title)}</div>
      <div style="font-size:14px;color:#9aa7bd;margin-bottom:20px;white-space:pre-wrap">${message}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"></div>`;

    const btnRow=box.querySelector('div:last-child');
    buttons.forEach((label,i)=>{
      const b=document.createElement('button');
      b.textContent=label;
      b.style.cssText=`padding:9px 16px;border-radius:10px;cursor:pointer;font:inherit;font-size:14px;border:1px solid #1e2d45;`;
      if(i===0){
        // Erste Button = Ja = primary
        b.style.background='#4f9cff';
        b.style.color='#05111e';
        b.style.fontWeight='700';
        b.style.borderColor='transparent';
      } else if(label==='Abbrechen'){
        b.style.background='transparent';
        b.style.color='#9aa7bd';
      } else {
        b.style.background='#1a2840';
        b.style.color='#e8eefc';
      }
      b.addEventListener('click',()=>{
        document.body.removeChild(overlay);
        resolve(label);
      });
      btnRow.appendChild(b);
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

// ── Statistik ─────────────────────────────────────────────────────────────────
function renderStatBar(tasks){
  const bar=$('statBar');if(!bar)return;
  const counts={};tasks.forEach(t=>t.assignedTo.forEach(c=>{counts[c]=(counts[c]||0)+1;}));
  const myC=state.profile.code.toUpperCase();
  bar.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n])=>{
    const col=personColor(c),fg=chipFg(col),isMe=c===myC;
    return`<span class="stat-chip${isMe?' me':''}" style="background:${col};color:${fg};border-color:${col}"
      title="${personName(c)}" onclick="filterByPerson('${c}')">${c} <strong>${n}</strong></span>`;
  }).join('');
  bar.classList.remove('hidden');
}
window.filterByPerson=function(code){
  const s=$('personFilter');s.value=s.value===code?'all':code;renderTable();
};

// ── Tabelle ───────────────────────────────────────────────────────────────────
function filtered(){
  const q=norm($('searchInput').value),person=$('personFilter').value,sparte=$('sparteFilter').value;
  return state.tasks.filter(t=>{
    if(person!=='all'&&!t.assignedTo.includes(person))return false;
    if(sparte!=='all'&&t.sparte!==sparte)return false;
    if(q&&!norm(`${t.city} ${t.street} ${t.number} ${t.sparte} ${t.orderNo} ${t.monteur} ${t.meister} ${t.assignedTo.join(' ')}`).includes(q))return false;
    return true;
  });
}

function renderTable(){
  const rows=filtered(),myC=state.profile.code.toUpperCase();
  if(!rows.length){
    tableBody.innerHTML=`<tr><td colspan="7" class="empty-row">${state.tasks.length?'Kein Treffer':'Datei laden'}</td></tr>`;
    return;
  }
  const sorted=[...rows].sort((a,b)=>{
    const aMe=a.assignedTo.includes(myC)?0:1,bMe=b.assignedTo.includes(myC)?0:1;
    if(aMe!==bMe)return aMe-bMe;
    const aP=a.assignedTo[0]||'ZZ',bP=b.assignedTo[0]||'ZZ';
    if(aP!==bP)return aP.localeCompare(bP);
    return(a.city+a.street).localeCompare(b.city+b.street);
  });
  let lastAddr='';
  tableBody.innerHTML=sorted.map(t=>{
    const addr=norm(t.city+t.street+t.number),isCont=(addr===lastAddr&&addr!=='');
    lastAddr=addr;
    const mainCode=t.assignedTo.includes(myC)?myC:(t.assignedTo[0]||'XX');
    const col=personColor(mainCode);
    const chips=t.assignedTo.map(c=>{
      const cc=personColor(c),fg=chipFg(cc),isMe=c===myC;
      return`<span class="chip${isMe?' is-me':''}" style="background:${cc};color:${fg};border-color:${cc}"
        title="${personName(c)}" onclick="event.stopPropagation();openPersonModal('${c}')">${c}</span>`;
    }).join('');
    let histDot='';
    if(t.isMine){
      const eH=state.history.filter(h=>h.person===myC&&sameN(h.city,t.city)&&sameN(h.street,t.street)&&sameN(h.number,t.number));
      const sH=state.history.filter(h=>h.person===myC&&sameN(h.city,t.city)&&sameN(h.street,t.street));
      histDot=eH.length?`<span class="hist-dot" style="background:#22c55e" title="Bekannt – ${eH[0].date}"></span>`:
               sH.length?`<span class="hist-dot" style="background:#f59e0b" title="Straße bekannt"></span>`:
               `<span class="hist-dot" style="background:#475569" title="Neu"></span>`;
    }
    const cityTd=isCont?`<td class="td-city" style="opacity:.35;font-size:11px">${esc(t.city||'?')}</td>`:`<td class="td-city">${esc(t.city||'?')}</td>`;
    const stTd=isCont?`<td class="td-street" style="opacity:.5;padding-left:18px">↳ ${esc(t.street||'?')}${t.number?` <span class="nr">${esc(t.number)}</span>`:''}</td>`:`<td class="td-street">${esc(t.street||'?')}${t.number?` <span class="nr">${esc(t.number)}</span>`:''}</td>`;
    return`<tr style="background:${col}${t.isMine?'30':'15'};border-left:3px solid ${col}" onclick="openRowModal('${esc(t.id)}')">
      <td class="td-time">${esc(t.time||'–')}</td>${cityTd}${stTd}
      <td class="td-sparte"><span class="sparte-badge">${esc(t.sparte||'–')}</span></td>
      <td class="td-order">${esc(t.orderNo||'–')}</td>
      <td><div class="td-persons">${chips}</div></td>
      <td class="td-hist">${histDot}</td></tr>`;
  }).join('');
}

// ── Modals ────────────────────────────────────────────────────────────────────
window.openRowModal=function(id){
  const t=state.tasks.find(x=>x.id===id);if(!t)return;
  const myC=state.profile.code.toUpperCase();
  const addrHist=state.history.filter(h=>sameN(h.city,t.city)&&sameN(h.street,t.street)).sort((a,b)=>b.date.localeCompare(a.date));
  const byPerson={};addrHist.forEach(h=>{byPerson[h.person]=byPerson[h.person]||[];byPerson[h.person].push(h);});
  const chips=t.assignedTo.map(c=>{const col=personColor(c),fg=chipFg(col);return`<span class="chip is-me" style="background:${col};color:${fg};border-color:${col};cursor:pointer;font-size:14px;padding:4px 10px" onclick="closeModal();setTimeout(()=>openPersonModal('${c}'),100)">${c} – ${esc(personName(c))}</span>`;}).join(' ');
  const histHtml=Object.keys(byPerson).length
    ?Object.entries(byPerson).map(([p,e])=>{const col=personColor(p),fg=chipFg(col);return`<div style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="background:${col};color:${fg};padding:2px 8px;border-radius:5px;font-size:12px">${p}</span><span style="font-size:13px;color:var(--muted)">${personName(p)}</span></div>${e.slice(0,5).map(h=>`<div class="modal-hist-row exact">📅 ${h.date}${h.sparte?' · '+h.sparte:''}</div>`).join('')}</div>`;}).join('')
    :`<div class="modal-hist-row none">Noch niemand war hier</div>`;
  const details=[t.monteur?`Monteur: ${esc(t.monteur)}`:'',t.meister?`Meister: ${esc(t.meister)}`:'',t.infos?`Info: ${esc(t.infos)}`:''].filter(Boolean).join(' · ');
  const folderHtml=t.isMine?`<div class="modal-section"><h4>Ordner-Pfad</h4><div class="modal-folder">${esc(buildFolderName(t))}</div></div>`:'';
  modalContent.innerHTML=`<div class="modal-title">${esc(t.city||'?')} – ${esc(t.street||'?')}${t.number?' '+esc(t.number):''}</div><div class="modal-sub">${[t.time,t.sparte?'Sparte '+t.sparte:'',t.orderNo?'Nr. '+t.orderNo:''].filter(Boolean).join(' · ')||'–'}</div>${details?`<div style="font-size:13px;color:var(--muted);margin:8px 0">${details}</div>`:''}<div class="modal-section"><h4>Heute zuständig</h4><div style="display:flex;flex-wrap:wrap;gap:6px">${chips}</div></div><div class="modal-section"><h4>Wer war schon mal hier?</h4>${histHtml}</div>${folderHtml}`;
  openModal();
};
window.openPersonModal=function(code){
  const col=personColor(code),fg=chipFg(col),myC=state.profile.code.toUpperCase();
  const today=state.tasks.filter(t=>t.assignedTo.includes(code));
  const hist=state.history.filter(h=>h.person===code).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60);
  const byDate={};hist.forEach(h=>{byDate[h.date]=byDate[h.date]||[];byDate[h.date].push(h);});
  const todayHtml=today.length?today.map(t=>`<div class="modal-hist-row exact" style="cursor:pointer" onclick="closeModal();setTimeout(()=>openRowModal('${esc(t.id)}'),100)"><span style="font-weight:600">${esc(t.city||'?')} – ${esc(t.street||'?')}${t.number?' '+t.number:''}</span>${t.sparte?`<span class="sparte-badge">${t.sparte}</span>`:''} ${t.time?`<span style="color:var(--muted);font-size:12px">${t.time}</span>`:''}</div>`).join(''):`<div class="modal-hist-row none">Heute keine Aufträge</div>`;
  const histHtml=Object.keys(byDate).length?Object.entries(byDate).map(([date,e])=>`<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:4px">📅 ${new Date(date+'T12:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}</div>${e.map(h=>`<div class="modal-hist-row street">${esc(h.city||'?')} – ${esc(h.street||'?')}${h.number?' '+h.number:''}${h.sparte?` <span class="sparte-badge">${h.sparte}</span>`:''}</div>`).join('')}</div>`).join(''):`<div class="modal-hist-row none">Noch keine Einträge</div>`;
  modalContent.innerHTML=`<div class="modal-person-header" style="background:${col}18;border-color:${col}50"><span class="modal-person-chip" style="background:${col};color:${fg}">${esc(code)}</span><div><div style="font-size:20px;font-weight:800">${esc(personName(code))}</div>${code===myC?'<div style="font-size:12px;color:var(--primary)">← das bist du</div>':''}<div style="font-size:12px;color:var(--muted)">${hist.length} Einträge in der Historie</div></div></div><div class="modal-section"><h4>Heute (${today.length})</h4>${todayHtml}</div><div class="modal-section"><h4>Bisherige Einsätze</h4>${histHtml}</div>`;
  openModal();
};
function openModal(){modal.classList.remove('hidden');document.body.style.overflow='hidden';}
function closeModal(){modal.classList.add('hidden');document.body.style.overflow='';}

// ── Historie speichern ────────────────────────────────────────────────────────
function saveToHistory(){
  if(!state.tasks.length){alert('Keine Aufträge geladen.');return;}
  const today=new Date().toISOString().slice(0,10);
  let added=0;
  state.tasks.forEach(t=>{t.assignedTo.forEach(code=>{
    if(!state.history.some(h=>h.date===today&&h.person===code&&sameN(h.city,t.city)&&sameN(h.street,t.street))){
      state.history.push({city:t.city,street:t.street,number:t.number||'',sparte:t.sparte||'',person:code,date:today});added++;
    }
  });});
  sp(HK,state.history);
  const persons=[...new Set(state.history.map(h=>h.person))].sort();
  updateSelect('histPerson','Alle',persons.map(c=>({v:c,l:`${c} – ${personName(c)}`})));
  renderTable();renderFolderPreview();renderHistory();
  alert(`${added} Einträge für ${[...new Set(state.tasks.flatMap(t=>t.assignedTo))].length} Kollegen gespeichert.`);
}

// ── Team-Historie ─────────────────────────────────────────────────────────────
let histSortCol='date',histSortDir=-1;
window.sortHistory=function(col){histSortCol===col?histSortDir*=-1:(histSortCol=col,histSortDir=col==='date'?-1:1);renderHistory();};
function renderHistory(){
  const q=norm($('histSearch').value),person=$('histPerson').value,from=$('histFrom').value,to=$('histTo').value;
  let entries=state.history.filter(h=>{
    if(person!=='all'&&h.person!==person)return false;
    if(from&&h.date<from)return false;if(to&&h.date>to)return false;
    if(q&&!norm(`${h.city} ${h.street} ${h.number} ${h.person} ${personName(h.person)}`).includes(q))return false;
    return true;
  });
  if(!entries.length){$('histTable').innerHTML='<div class="muted" style="padding:16px">Keine Einträge.</div>';return;}
  entries=[...entries].sort((a,b)=>{
    const av=histSortCol==='date'?a.date:histSortCol==='person'?a.person:histSortCol==='name'?personName(a.person):histSortCol==='city'?(a.city||''):histSortCol==='street'?(a.street||''):(a.sparte||'');
    const bv=histSortCol==='date'?b.date:histSortCol==='person'?b.person:histSortCol==='name'?personName(b.person):histSortCol==='city'?(b.city||''):histSortCol==='street'?(b.street||''):(b.sparte||'');
    return av.localeCompare(bv)*histSortDir;
  });
  function th(col,label){const a=histSortCol===col;return`<th onclick="sortHistory('${col}')" style="cursor:pointer;user-select:none${a?';color:#4f9cff':''}">${label}${a?(histSortDir===1?' ↑':' ↓'):''}</th>`;}
  $('histTable').innerHTML=`<table class="hist-table"><thead><tr>${th('date','Datum')}${th('person','Kürzel')}${th('name','Name')}${th('city','Ort')}${th('street','Straße')}${th('sparte','Sparte')}</tr></thead><tbody>${
    entries.slice(0,200).map(h=>{const col=personColor(h.person),fg=chipFg(col);return`<tr><td style="font-size:12px;color:var(--muted);white-space:nowrap">${h.date}</td><td><span class="chip" style="background:${col};color:${fg};border-color:${col}">${esc(h.person)}</span></td><td style="font-size:13px">${esc(personName(h.person))}</td><td>${esc(h.city||'?')}</td><td>${esc(h.street||'?')}${h.number?' '+h.number:''}</td><td><span class="sparte-badge">${esc(h.sparte||'–')}</span></td></tr>`;}).join('')
  }${entries.length>200?`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:10px">... ${entries.length-200} weitere</td></tr>`:''}</tbody></table>`;
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function lp(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v!=null?v:d;}catch{return d;}}
function sp(k,v){localStorage.setItem(k,JSON.stringify(v));}
function norm(s=''){return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/ö/gi,c=>c<'a'?'O':'o').replace(/ü/gi,c=>c<'a'?'U':'u').replace(/ä/gi,c=>c<'a'?'A':'a').replace(/[^\w\s\-\/.,&]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();}
function sameN(a,b){return norm(a)===norm(b);}
function tc(s=''){return String(s).split(' ').filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1).toLowerCase()).join(' ');}
function canonCity(raw=''){const t=norm(raw);if(!t)return'';for(const e of CITIES){if(e.k.includes(t))return e.c;for(const k of e.k)if(k.startsWith(t)&&t.length>=2)return e.c;}return tc(raw.trim());}
function normStreet(raw=''){return tc(String(raw).replace(/straße/gi,'strasse').replace(/str\.\s*/gi,'strasse ').trim());}
function splitSN(raw=''){const s=String(raw).replace(/straße/gi,'strasse').trim();const m=s.match(/^(.+?)\s+(\d+\s*[a-zA-Z]?(?:\s*[-\/]\s*\d+[a-zA-Z]?)?)$/);if(m&&m[1].trim().length>2&&/[a-zA-ZäöüÄÖÜß]/.test(m[1]))return{street:normStreet(m[1]),number:m[2].replace(/\s+/g,'')};return{street:normStreet(s),number:''};}
function parseTime(raw){if(!raw)return'';if(typeof raw==='number'){const tm=Math.round(raw*1440),h=Math.floor(tm/60),m=tm%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}const m=String(raw).match(/(\d{1,2})[:.h](\d{2})/);return m?`${m[1].padStart(2,'0')}:${m[2]}`:String(raw).trim();}
function updateSelect(id,all,opts){const s=$(id);if(!s)return;const cur=s.value;s.innerHTML=`<option value="all">${all}</option>`+opts.map(o=>`<option value="${esc(o.v)}">${esc(o.l)}</option>`).join('');if(opts.some(o=>o.v===cur))s.value=cur;}
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function blob(data,name,type){const b=data instanceof Blob?data:new Blob([data],{type});const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000);}
function exportJson(){blob(JSON.stringify({profile:state.profile,history:state.history,tasks:state.tasks,settings:state.settings,at:new Date().toISOString()},null,2),`AS_Backup_${new Date().toISOString().slice(0,10)}.json`,'application/json');}
function importJson(evt){const file=evt.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(Array.isArray(d.history)){state.history=d.history;sp(HK,d.history);}if(Array.isArray(d.tasks))state.tasks=d.tasks;if(d.profile){state.profile=d.profile;sp(PK,d.profile);$('myCode').value=d.profile.code||'TT';$('myName').value=d.profile.name||'';}if(d.settings){state.settings={...state.settings,...d.settings};sp(SET_K,state.settings);}updateTopbarProfile();if(state.tasks.length){const codes=[...new Set(state.tasks.flatMap(t=>t.assignedTo))].sort();updateSelect('personFilter','Alle Personen',codes.map(c=>({v:c,l:`${c} – ${personName(c)}`})));renderStatBar(state.tasks);renderTable();renderFolderPreview();}renderHistory();alert('Backup geladen.');}catch{alert('JSON ungültig.');}};r.readAsText(file);}
async function exportZip(){const mine=myTasks();if(!mine.length){alert('Keine eigenen Aufträge.');return;}const zip=new JSZip();let tpl=null;try{tpl=await fetch('assets/Muster.pyt').then(r=>r.arrayBuffer());}catch{}for(const t of mine){const name=buildFolderName(t);const root=zip.folder(`${t.city||'?'}${'/' }${name}`);['Abgabe','Dokument','Foto','Scan'].forEach(f=>root.folder(f));const pyt=root.folder('Pythagoras');if(tpl)pyt.file(`${name}.pyt`,tpl.slice(0));else pyt.file(`${name}.pyt`,'');}blob(await zip.generateAsync({type:'blob'}),`AS_${new Date().toISOString().slice(0,10)}_meine.zip`,'application/zip');}



// ── Cloud D1 speichern/laden ─────────────────────────────────────────────────
function todayISO(){ return new Date().toISOString().slice(0,10); }
function askImportDate(sourceName='Import'){
  const d = prompt(`Arbeitsdatum für ${sourceName}? (YYYY-MM-DD)`, todayISO());
  const v = String(d || todayISO()).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : todayISO();
}
function toCloudTask(t, datum){
  return {
    datum,
    zeit: t.time || '',
    ort: t.city || '',
    strasse: t.street || '',
    hausnummer: t.number || '',
    auftrag: t.orderNo || '',
    sparte: t.sparte || '',
    name: (t.assignedTo || []).map(c => personName(c)).join(', '),
    statusTyp: t.isMine ? 'mein' : '',
    lat: t.lat ?? null,
    lng: t.lng ?? null,
    assignedTo: t.assignedTo || [],
    monteur: t.monteur || '',
    meister: t.meister || '',
    infos: t.infos || '',
    isMine: !!t.isMine,
  };
}
async function saveDayToDB(tasks, datum){
  const payload = tasks.map(t => toCloudTask(t, datum));
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ datum, tasks: payload })
  });
  if(!res.ok){
    const txt = await res.text();
    throw new Error(txt || 'Cloud-Speichern fehlgeschlagen');
  }
  return res.json();
}
async function loadDayFromDB(datum=todayISO()){
  const res = await fetch(`/api/tasks?datum=${encodeURIComponent(datum)}`);
  if(!res.ok) throw new Error('Cloud-Laden fehlgeschlagen');
  const rows = await res.json();
  if(!Array.isArray(rows) || !rows.length) return false;
  state.tasks = rows.map((r, i) => ({
    id: r.id || `db${i}`,
    city: r.ort || '',
    street: r.strasse || '',
    number: r.hausnummer || '',
    time: r.zeit || '',
    sparte: r.sparte || '',
    orderNo: r.auftrag || '',
    monteur: r.monteur || '',
    meister: r.meister || '',
    infos: r.infos || '',
    assignedTo: Array.isArray(r.assignedTo) ? r.assignedTo : (()=>{ try{return JSON.parse(r.assigned_to||'[]')}catch{return []} })(),
    isMine: Number(r.is_mine || 0) === 1 || (Array.isArray(r.assignedTo) ? r.assignedTo.includes(state.profile.code.toUpperCase()) : false),
  }));
  const allCodes=[...new Set(state.tasks.flatMap(t=>t.assignedTo))].sort();
  const allSpartes=[...new Set(state.tasks.map(t=>t.sparte).filter(Boolean))].sort();
  updateSelect('personFilter','Alle Personen',allCodes.map(c=>({v:c,l:`${c} – ${personName(c)}`})));
  updateSelect('sparteFilter','Alle Sparten',allSpartes.map(s=>({v:s,l:s})));
  updateSelect('histPerson','Alle',allCodes.map(c=>({v:c,l:`${c} – ${personName(c)}`})));
  renderStatBar(state.tasks); renderTable(); renderFolderPreview(); updateCreateBtn();
  loadStatus.textContent = `✓ ${state.tasks.length} Aufträge aus Cloud geladen (${datum})`;
  return true;
}

// ── Start ─────────────────────────────────────────────────────────────────────
renderHistory();
renderTable();
renderFolderPreview();
updateCreateBtn();
initFolders();
loadDayFromDB().catch(()=>{});
if(state.settings.firstRun){ openSettings(); }
