import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {validateEntry, lineTotalKobo, TotalMismatchError} from '../src/ingest-schema.js';
import {migrate} from '../db/migrate.mjs';
import {seedSimulatedRestaurant, SIMULATED_BUSINESS_ID, SIMULATED_STAFF} from '../db/seed/simulated-restaurant.mjs';

const KEY = '3f1c2a9e-6b7d-4c1e-9a2b-1d2e3f4a5b6c';
const sale = {type: 'sale', item: 'jollof rice', quantity: 3, unit: 'plate', unit_price_kobo: 150000, amount_kobo: 450000,
  payment_method: 'cash', payment_split: null, raw_text: 'Sold 3 jollof, 1500 each, cash', idempotency_key: KEY};

test('server accepts a total equal to quantity × unit price', () => assert.equal(validateEntry(sale).amount_kobo, 450000));

test('server rejects an inflated or deflated total and reports its own figure', () => {
  for (const amount_kobo of [450001, 449999, 0, 4500000]) {
    assert.throws(() => validateEntry({...sale, amount_kobo}), e => e instanceof TotalMismatchError && e.expectedKobo === 450000);
  }
});

test('total check applies to every entry type, not only sales', () => {
  assert.throws(() => validateEntry({...sale, type: 'expense', amount_kobo: 1}), TotalMismatchError);
  assert.throws(() => validateEntry({...sale, type: 'restock', unit: 'bag', amount_kobo: 1}), TotalMismatchError);
});

test('fractional quantities round to the nearest kobo', () => {
  assert.equal(lineTotalKobo(1.5, 120000), 180000);
  assert.equal(lineTotalKobo(0.1, 30), 3);                 // 0.1 × 30 = 3.0000000000000004 in floats
  assert.equal(lineTotalKobo(0.333, 100), 33);
  assert.equal(validateEntry({...sale, quantity: 2.5, unit: 'kg', unit_price_kobo: 99999, amount_kobo: 249998}).amount_kobo, 249998);
});

test('zero price means zero total (e.g. a stock count)', () =>
  assert.equal(validateEntry({...sale, type: 'stock_count', unit_price_kobo: 0, amount_kobo: 0}).amount_kobo, 0));

test('total overflow is rejected, not silently wrapped', () =>
  assert.throws(() => validateEntry({...sale, quantity: 1e6, unit_price_kobo: Number.MAX_SAFE_INTEGER, amount_kobo: 1})));

test('mixed split must still add up to the server-checked total', () => {
  const mixed = {...sale, payment_method: 'mixed', payment_split: {cash_kobo: 150000, transfer_kobo: 300000}};
  assert.equal(validateEntry(mixed).amount_kobo, 450000);
  assert.throws(() => validateEntry({...mixed, payment_split: {cash_kobo: 150000, transfer_kobo: 300001}}));
});

test('idempotency key is required and must be a UUID', () => {
  const {idempotency_key, ...missing} = sale;
  assert.throws(() => validateEntry(missing), /idempotency/);
  assert.throws(() => validateEntry({...sale, idempotency_key: 'tap-1'}), /idempotency/);
  assert.equal(validateEntry({...sale, idempotency_key: KEY.toUpperCase()}).idempotency_key, KEY);
});

// Same INSERT shape as app/api/ingest/route.js, against the real migrations.
test('a double tap with the same idempotency key saves exactly one entry', async () => {
  const pg = new PGlite();
  const db = {exec: s => pg.exec(s), query: (s, p) => pg.query(s, p)};
  await migrate(db);
  await seedSimulatedRestaurant(db, {day: '2026-10-23'});
  const cashier = SIMULATED_STAFF[1].id;
  const e = validateEntry(sale);
  const insert = () => pg.query(`INSERT INTO entries (business_id, type, item, quantity, unit, unit_price_kobo, amount_kobo, payment_method,
      payment_split, recorded_by, raw_text, source, needs_review, idempotency_key)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, 'text', true, $12)
    ON CONFLICT (business_id, idempotency_key) DO NOTHING RETURNING id`,
    [SIMULATED_BUSINESS_ID, e.type, e.item, e.quantity, e.unit, e.unit_price_kobo, e.amount_kobo, e.payment_method,
      JSON.stringify(e.payment_split), cashier, e.raw_text, e.idempotency_key]);
  const [first, second] = await Promise.all([insert(), insert()]);
  assert.equal(first.rows.length + second.rows.length, 1);
  const {rows} = await pg.query('SELECT count(*)::int AS n FROM entries WHERE idempotency_key = $1', [KEY]);
  assert.equal(rows[0].n, 1);
  // A genuinely new sale with identical fields gets a new key and is saved.
  const again = await pg.query(`INSERT INTO entries (business_id, type, item, quantity, unit, payment_method, recorded_by, raw_text, idempotency_key)
    VALUES ($1, 'sale', 'jollof rice', 3, 'plate', 'cash', $2, 'x', gen_random_uuid()) RETURNING id`, [SIMULATED_BUSINESS_ID, cashier]);
  assert.equal(again.rows.length, 1);
});

test('missing unit price skips the total check instead of failing it', () => {
  const count = {...sale, type: 'stock_count', item: 'rice', unit: 'bag', quantity: 4, unit_price_kobo: null, amount_kobo: null};
  assert.equal(validateEntry(count).amount_kobo, null);
  // A stated total with no unit price is kept as stated: there is nothing to recompute it from.
  assert.equal(validateEntry({...sale, unit_price_kobo: null, amount_kobo: 450000}).amount_kobo, 450000);
});

test('a unit price with a missing total is still a mismatch, not silently filled in', () =>
  assert.throws(() => validateEntry({...sale, amount_kobo: null}), e => e instanceof TotalMismatchError && e.expectedKobo === 450000));

test('money fields must be present (null is allowed, absent is not)', () => {
  const {unit_price_kobo, ...noPrice} = sale;
  assert.throws(() => validateEntry(noPrice), /Missing money/);
});
