// npm run db:migrate: applies db/migrations/*.sql to DATABASE_URL (from .env.local).
import {connect} from '../db/connect.mjs';
import {migrate} from '../db/migrate.mjs';

const db = await connect();
try {
  console.log(`Migrating database on host ${db.host}`);
  const ran = await migrate(db, {log: console.log});
  console.log(ran.length ? `Done: ${ran.length} migration(s) applied.` : 'Up to date: nothing to apply.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
