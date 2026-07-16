// First-run database bootstrap for the packaged VOX desktop app.
//
// The packaged build ships a fresh, empty SQLite file in the user's AppData
// folder. Prisma's client requires the schema (tables/indexes) to already
// exist — there is no PostgreSQL migration server to apply them. This script
// applies the bundled `schema.sql` (generated from the Prisma schema) exactly
// once, on a fresh database, so VOX is 100% plug-and-play: install, launch,
// and the local database is created automatically with real persistence.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..', '..');

function resolveDbPath() {
  const raw = process.env.DATABASE_URL || '';
  const url = raw.startsWith('file:') ? raw.slice('file:'.length) : raw;
  if (!url) {
    console.error('[db-bootstrap] No DATABASE_URL set — cannot initialize database.');
    process.exit(1);
  }
  // Strip a leading slash on Windows drive paths (file:/C:/... → C:/...)
  let p = url.replace(/^\/+/, '');
  if (!path.isAbsolute(p)) p = path.resolve(backendDir, p);
  return p;
}

function main() {
  const dbPath = resolveDbPath();
  const schemaPath = path.join(backendDir, 'prisma', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('[db-bootstrap] schema.sql not found — run the build to generate it.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF');

    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
      .get();

    if (tableExists) {
      console.log('[db-bootstrap] Database already initialized — skipping.');
      return;
    }

    console.log('[db-bootstrap] Fresh database detected — applying schema...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('[db-bootstrap] Schema applied successfully.');
  } finally {
    db.close();
  }
}

try {
  main();
  process.exit(0);
} catch (err) {
  console.error('[db-bootstrap] FAILED:', err?.message || err);
  process.exit(1);
}
