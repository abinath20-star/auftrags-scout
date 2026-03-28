# AuftragsScout – Deployment

## Cloudflare Pages einrichten

1. **Git-Repository** importieren (oder diesen Ordner hochladen).
2. **Project name**: beliebig (eindeutig innerhalb Cloudflare).
3. **Framework preset**: None
4. **Build command**: *(leer lassen)*
5. **Build output directory**: `/`

## Bindings (Project Settings → Bindings)

| Typ          | Name    | Ressource              |
|--------------|---------|------------------------|
| D1 Database  | `DB`    | `auftrags-scout-db`    |
| R2 Bucket    | `FILES` | dein gewählter Bucket  |

## Datenbank initialisieren

D1 Console (Dashboard) → Query ausführen:

```sql
-- Inhalt von db/schema.sql einfügen und ausführen
```

## R2 Bucket anlegen

1. Dashboard → R2 → Bucket erstellen.
2. Öffentlichen Zugriff **nur aktivieren**, wenn Download-Links gewünscht.
   Andernfalls `publicUrl` in `files.js` auf einen signierten URL umstellen.

## Lokale Entwicklung

```bash
npm install -g wrangler
wrangler pages dev . --d1=DB --r2=FILES
```

## Bekannte Grenzen

- Maximale Dateigröße: **20 MB** (einstellbar in `files.js → MAX_SIZE_MB`)
- Maximale Zeilen pro Tag: **5 000** (einstellbar in `tasks.js`)
- R2-Liste zeigt max. **200** Objekte (paginierung ggf. nachrüsten)
