// Opens a node-postgres connection for CLI scripts (migrate, seed) from DATABASE_URL.
// Never logs the connection string. Only the host is shown, so you can confirm the target.
import pg from 'pg';

export function databaseHost(url) {
  try { return new URL(url).hostname; } catch { return 'unparseable DATABASE_URL'; }
}

export async function connect(url = process.env.DATABASE_URL) {
  if (!url) throw Error('DATABASE_URL is not set. Put it in .env.local (see docs/engineering/STAGING_SETUP.md).');
  const client = new pg.Client({connectionString: url});
  await client.connect();
  return {
    host: databaseHost(url),
    exec: sql => client.query(sql),
    query: (sql, params) => client.query(sql, params),
    end: () => client.end(),
  };
}
