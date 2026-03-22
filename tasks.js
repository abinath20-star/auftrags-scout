function normalizeFolderPart(value) {
  return String(value || '')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitStreetAndHouseNo(task) {
  const rawStreet = String(task.strasse || '').trim();
  const rawNo = String(task.hausnummer || '').trim();
  if (rawNo) {
    return {
      street: normalizeFolderPart(rawStreet),
      houseNo: normalizeFolderPart(rawNo),
    };
  }
  const m = rawStreet.match(/^(.*?)(\d+\s*[a-zA-Z]?)$/);
  if (m) {
    return {
      street: normalizeFolderPart(m[1]),
      houseNo: normalizeFolderPart(m[2]),
    };
  }
  return {
    street: normalizeFolderPart(rawStreet),
    houseNo: '',
  };
}

function buildFolderPath(task) {
  const city = normalizeFolderPart(task.ort || task.city || '');
  const parts = splitStreetAndHouseNo({
    strasse: task.strasse || task.street || '',
    hausnummer: task.hausnummer || task.number || '',
  });
  const streetFolder = [parts.street, parts.houseNo].filter(Boolean).join(' ');
  return [city, streetFolder].filter(Boolean).join('/');
}

function getTaskYear(task) {
  const raw = task.datum || task.date || '';
  if (!raw) return String(new Date().getFullYear());
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return String(d.getFullYear());
  const m = String(raw).match(/\b(20\d{2})\b/);
  return m ? m[1] : String(new Date().getFullYear());
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const datum = url.searchParams.get('datum');
    const sql = datum
      ? 'SELECT * FROM tasks WHERE datum = ? ORDER BY ort, strasse, zeit'
      : 'SELECT * FROM tasks ORDER BY datum DESC, ort, strasse, zeit';
    const stmt = env.DB.prepare(sql);
    const res = datum ? await stmt.bind(datum).all() : await stmt.all();
    return new Response(JSON.stringify(res.results || []), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const { datum, tasks } = body || {};
    if (!datum || !Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: 'datum oder tasks fehlt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    await env.DB.prepare('DELETE FROM tasks WHERE datum = ?').bind(datum).run();

    for (const t of tasks) {
      const folderPath = buildFolderPath(t);
      const jahr = getTaskYear({ ...t, datum });
      await env.DB.prepare(`
        INSERT INTO tasks (
          id, datum, jahr, zeit, ort, strasse, hausnummer, auftrag,
          sparte, name, status, lat, lng, folder_path, created_at,
          assigned_to, monteur, meister, infos, is_mine
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        datum,
        jahr,
        t.zeit || t.time || '',
        t.ort || t.city || '',
        t.strasse || t.street || '',
        t.hausnummer || t.number || '',
        t.auftrag || t.orderNo || '',
        t.sparte || '',
        t.name || '',
        t.status || t.statusTyp || '',
        t.lat ?? null,
        t.lng ?? null,
        folderPath,
        new Date().toISOString(),
        JSON.stringify(t.assignedTo || t.assigned_to || []),
        t.monteur || '',
        t.meister || '',
        t.infos || '',
        t.isMine ? 1 : 0,
      ).run();
    }

    return new Response(JSON.stringify({ success: true, datum, count: tasks.length }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
