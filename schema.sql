DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  datum TEXT NOT NULL,
  jahr TEXT NOT NULL,
  zeit TEXT,
  ort TEXT,
  strasse TEXT,
  hausnummer TEXT,
  auftrag TEXT,
  sparte TEXT,
  name TEXT,
  status TEXT,
  lat REAL,
  lng REAL,
  folder_path TEXT,
  created_at TEXT,
  assigned_to TEXT,
  monteur TEXT,
  meister TEXT,
  infos TEXT,
  is_mine INTEGER DEFAULT 0
);
