import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import {migrate, listMigrations} from '../db/migrate.mjs';
import {seedSimulatedRestaurant, SIMULATED_BUSINESS_ID, paymentReference} from '../db/seed/simulated-restaurant.mjs';
import {checkTransfers} from '../src/rules.js';

// In-memory Postgres; no network, no external database.
async function freshDb() {
  const pg = new PGlite();
  return {pg, exec: sql => pg.exec(sql), query: (sql, params) => pg.query(sql, params)};
}
const DAY = '2026-10-23';

test('migrations apply cleanly and re-running is a no-op', async () => {
  const db = await freshDb();
  const all = (await listMigrations()).map(m => m.version);
  assert.deepEqual(await migrate(db), all);
  assert.deepEqual(await migrate(db), []);
});

test('an applied migration that is later edited is refused', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'opada-mig-'));
  await writeFile(path.join(dir, '0001_t.sql'), 'CREATE TABLE t (id int);');
  const db = await freshDb();
  await migrate(db, {dir});
  await writeFile(path.join(dir, '0001_t.sql'), 'CREATE TABLE t (id bigint);');
  await assert.rejects(migrate(db, {dir}), /modified after it was applied/);
});

test('a failing migration rolls back and records nothing', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'opada-mig-'));
  await writeFile(path.join(dir, '0001_bad.sql'), 'CREATE TABLE ok (id int); SELECT * FROM missing_table;');
  const db = await freshDb();
  await assert.rejects(migrate(db, {dir}), /0001_bad failed/);
  const {rows} = await db.query(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name IN ('ok')`);
  assert.equal(rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n, 0);
});

test('payments.paystack_reference is unique and ON CONFLICT records a payment once', async () => {
  const db = await freshDb();
  await migrate(db);
  await seedSimulatedRestaurant(db, {day: DAY});
  const ref = paymentReference(DAY, 1);
  await assert.rejects(db.query(`INSERT INTO payments (business_id, paystack_reference, amount_kobo, paid_at) VALUES ($1, $2, 100, now())`, [SIMULATED_BUSINESS_ID, ref]), /unique|duplicate/i);
  // Same statement shape as the webhook: a replayed delivery inserts nothing.
  const replay = await db.query(`INSERT INTO payments (business_id, paystack_reference, amount_kobo, channel, paid_at) VALUES ($1, $2, 1440000, 'bank_transfer', now()) ON CONFLICT (paystack_reference) DO NOTHING RETURNING id`, [SIMULATED_BUSINESS_ID, ref]);
  assert.equal(replay.rows.length, 0);
});

test('seed is idempotent per day and rotates tokens', async () => {
  const db = await freshDb();
  await migrate(db);
  const first = await seedSimulatedRestaurant(db, {day: DAY});
  const second = await seedSimulatedRestaurant(db, {day: DAY});
  const count = async t => (await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;
  assert.equal(await count('businesses'), 1);
  assert.equal(await count('entries'), 7);
  assert.equal(await count('payments'), 3);
  assert.notDeepEqual(first.tokens, second.tokens);
  const live = await db.query('SELECT token_hash FROM staff_api_tokens WHERE revoked_at IS NULL');
  const hash = t => createHash('sha256').update(t).digest('hex');
  assert.deepEqual(new Set(live.rows.map(r => r.token_hash)), new Set(Object.values(second.tokens).map(hash)));
  for (const t of Object.values(second.tokens)) assert.match(t, /^[A-Za-z0-9_-]{32,256}$/);
});

test('seeded business is labelled simulated and passes the test-mode name gate', async () => {
  const db = await freshDb();
  await migrate(db);
  await seedSimulatedRestaurant(db, {day: DAY});
  const {rows} = await db.query('SELECT name FROM businesses WHERE id = $1', [SIMULATED_BUSINESS_ID]);
  assert.match(rows[0].name, /^OPADA SYNTHETIC .*SIMULATED/);
});

test('seed timestamps fall inside the Lagos calendar day', async () => {
  const db = await freshDb();
  await migrate(db);
  await seedSimulatedRestaurant(db, {day: DAY});
  const {rows} = await db.query(`SELECT count(*)::int AS n FROM entries WHERE (created_at AT TIME ZONE 'Africa/Lagos')::date <> $1::date`, [DAY]);
  assert.equal(rows[0].n, 0);
  const first = await db.query(`SELECT to_char(created_at AT TIME ZONE 'UTC', 'HH24:MI') AS utc FROM entries ORDER BY created_at LIMIT 1`);
  assert.equal(first.rows[0].utc, '08:10');  // 09:10 WAT = 08:10 UTC
});

test('seeded transfers vs Paystack receipts produce the intended ₦3,500 gap', async () => {
  const db = await freshDb();
  await migrate(db);
  await seedSimulatedRestaurant(db, {day: DAY});
  const recorded = await db.query(`SELECT coalesce(sum(CASE WHEN payment_method = 'transfer' THEN amount_kobo
      WHEN payment_method = 'mixed' THEN (payment_split->>'transfer_kobo')::bigint ELSE 0 END), 0)::bigint AS k
    FROM entries WHERE business_id = $1 AND type = 'sale'`, [SIMULATED_BUSINESS_ID]);
  const verified = await db.query('SELECT sum(amount_kobo)::bigint AS k FROM payments WHERE business_id = $1', [SIMULATED_BUSINESS_ID]);
  const flag = checkTransfers({recordedTransferKobo: Number(recorded.rows[0].k), verifiedPaystackKobo: Number(verified.rows[0].k)});
  assert.equal(flag.signedGapKobo, -350000);
});

test('reset only removes the simulated restaurant', async () => {
  const db = await freshDb();
  await migrate(db);
  await db.query(`INSERT INTO businesses (id, name) VALUES ('b0000000-0000-4000-8000-000000000001', 'Other test business')`);
  await seedSimulatedRestaurant(db, {day: DAY});
  await seedSimulatedRestaurant(db, {day: DAY, reset: true});
  assert.equal((await db.query('SELECT count(*)::int AS n FROM businesses')).rows[0].n, 2);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM entries')).rows[0].n, 7);
});
