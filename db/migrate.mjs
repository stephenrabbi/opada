// Minimal forward-only migration runner.
// `db` is an adapter: { exec(sql) for multi-statement SQL, query(sql, params) -> { rows } }.
// Works with node-postgres (Neon or any Postgres) and with PGlite in tests.
import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function listMigrations(dir = MIGRATIONS_DIR) {
  const files = (await readdir(dir)).filter(f => /^\d{4}_[a-z0-9_]+\.sql$/.test(f)).sort();
  return Promise.all(files.map(async name => {
    // Normalise line endings: Windows checkouts get CRLF, CI/Vercel get LF; the checksum must match on both.
    const sql = (await readFile(path.join(dir, name), 'utf8')).replace(/\r\n/g, '\n');
    return {version: name.replace(/\.sql$/, ''), sql, checksum: createHash('sha256').update(sql).digest('hex')};
  }));
}

export async function migrate(db, {dir = MIGRATIONS_DIR, log = () => {}} = {}) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Map((await db.query('SELECT version, checksum FROM schema_migrations')).rows.map(r => [r.version, r.checksum]));
  const ran = [];
  for (const m of await listMigrations(dir)) {
    if (applied.has(m.version)) {
      // An applied migration must never be edited; add a new one instead.
      if (applied.get(m.version) !== m.checksum) throw Error(`Migration ${m.version} was modified after it was applied`);
      continue;
    }
    await db.exec('BEGIN');
    try {
      await db.exec(m.sql);
      await db.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [m.version, m.checksum]);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw Error(`Migration ${m.version} failed: ${error.message}`);
    }
    log(`applied ${m.version}`);
    ran.push(m.version);
  }
  return ran;
}
