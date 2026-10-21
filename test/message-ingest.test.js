import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {seedSimulatedRestaurant, SIMULATED_BUSINESS_ID as BIZ, SIMULATED_STAFF} from '../db/seed/simulated-restaurant.mjs';
import {ingestMessage, normalizeExtractedEntry, normalizeUnit} from '../src/message-ingest.js';
import {validateExtraction} from '../src/gemini-extract.js';
import {GeminiCapReachedError} from '../src/gemini-budget.js';

// Model output in its own shape (whole naira), run through the real validator like a live Gemini reply.
const modelEntry = over => ({type: 'sale', item: 'fried rice', quantity: 3, unit: 'plates', payment_method: 'transfer', unit_price_naira: 1800, amount_naira: 5400, ...over});
const extraction = (...entries) => { const raw = {entries, notes: 'fixture'}; return {provider: 'fake', model: 'fixture-model', ...validateExtraction(raw), raw}; };
const quiet = {info() {}, warn() {}, error() {}};
const KEY = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// ---- Normalising one extracted entry ----
const norm = over => { const raw = modelEntry(over); return normalizeExtractedEntry(validateExtraction({entries: [raw], notes: ''}).entries[0], raw); };

test('model total that disagrees with quantity × price is saved with the server amount, never rejected', () => {
  const r = norm({amount_naira: 6000});
  assert.equal(r.amount_kobo, 540000);
  assert.equal(r.needs_review, true);
  assert.ok(r.extraction.review_reasons.includes('total_mismatch'));
  assert.equal(r.extraction.model_amount_kobo, 600000);
  assert.equal(r.extraction.model_entry.amount_naira, 6000);  // the model's original numbers are kept
});

test('missing unit price skips the check and keeps the stated amount', () => {
  const r = norm({unit_price_naira: null, amount_naira: 5000});
  assert.equal(r.amount_kobo, 500000);
  assert.ok(r.extraction.review_reasons.includes('missing_price'));
  assert.ok(!r.extraction.review_reasons.includes('total_mismatch'));
});

test('stock count with no price and no amount is saved as-is for review', () => {
  const r = norm({type: 'stock_count', item: 'rice', quantity: 4, unit: 'bags', unit_price_naira: null, amount_naira: null, payment_method: 'unknown'});
  assert.deepEqual([r.amount_kobo, r.unit, r.quantity], [null, 'bag', 4]);
  assert.ok(r.extraction.review_reasons.includes('missing_price'));
});

test('a missing total is computed by code when quantity and price are known', () => {
  const r = norm({amount_naira: null});
  assert.equal(r.amount_kobo, 540000);
  assert.ok(r.extraction.review_reasons.includes('amount_computed'));
});

test('missing quantity keeps the model amount and says so', () => {
  const r = norm({quantity: null, amount_naira: 3600});
  assert.equal(r.amount_kobo, 360000);
  assert.ok(r.extraction.review_reasons.includes('missing_quantity'));
});

test('units are mapped conservatively; unknown units are kept for review, not guessed', () => {
  assert.equal(normalizeUnit('Plates'), 'plate');
  assert.equal(normalizeUnit(' kg '), 'kg');
  assert.equal(normalizeUnit('litres'), 'litre');
  assert.equal(normalizeUnit('basket'), null);
  const r = norm({unit: 'basket'});
  assert.equal(r.unit, null);
  assert.ok(r.extraction.review_reasons.includes('unit_unrecognised'));
  assert.equal(r.extraction.model_entry.unit, 'basket');
});

test('mixed payment without a split is never guessed', () => {
  const r = norm({payment_method: 'mixed'});
  assert.equal(r.payment_split, null);
  assert.ok(r.extraction.review_reasons.includes('split_unknown'));
});

// ---- Whole message flow, on the real migrations ----

async function setup() {
  const pg = await newPglite();
  const db = {exec: s => pg.exec(s), query: (s, p) => pg.query(s, p)};
  await migrate(db);
  await seedSimulatedRestaurant(db, {day: '2026-10-23'});
  const calls = {reserve: 0, extract: 0};
  const run = async (t, p) => (await pg.query(t, p)).rows;
  const send = (text, key, {reply = extraction(modelEntry()), reserve, extract} = {}) => ingestMessage({
    run, staff: {id: SIMULATED_STAFF[1].id, business_id: BIZ}, text, idempotencyKey: key, log: quiet,
    reserve: reserve ?? (async () => { calls.reserve++; }),
    extract: extract ?? (async () => { calls.extract++; return reply; }),
  });
  return {pg, run, send, calls};
}
const count = async (pg, sql, p = []) => (await pg.query(sql, p)).rows[0].n;

test('message becomes stored entries with the original text, author and review flag', async () => {
  const {pg, send} = await setup();
  const text = '3 plate fried rice don comot, 1800 each, dem transfer am';
  const r = await send(text, KEY(1));
  assert.equal(r.status, 'extracted');
  assert.equal(r.entries.length, 1);
  const {rows: [e]} = await pg.query('SELECT e.raw_text, e.recorded_by, e.needs_review, e.amount_kobo::text AS amount, e.unit, m.raw_text AS message FROM entries e JOIN messages m ON m.id = e.message_id');
  assert.deepEqual([e.raw_text, e.message, e.recorded_by, e.needs_review, e.amount, e.unit], [text, text, SIMULATED_STAFF[1].id, true, '540000', 'plate']);
});

test('a new transfer entry re-runs the checks for that Lagos day', async () => {
  const {pg, send} = await setup();
  const r = await send('3 fried rice transfer', KEY(1));
  assert.equal(r.checks.flags_written, 1);
  const {rows} = await pg.query(`SELECT amount_gap_kobo::text AS gap FROM flags WHERE rule = 'transfer_paystack' AND day = (now() AT TIME ZONE 'Africa/Lagos')::date`);
  assert.equal(rows[0].gap, '540000');  // today's only transfer, no Paystack payment yet today
});

test('Gemini total mismatch is saved (server amount) with the model numbers in the raw data', async () => {
  const {pg, send} = await setup();
  await send('3 fried rice 1800 each, 6000 total', KEY(1), {reply: extraction(modelEntry({amount_naira: 6000}))});
  const {rows: [e]} = await pg.query('SELECT amount_kobo::text AS amount, extraction FROM entries WHERE message_id IS NOT NULL');
  assert.equal(e.amount, '540000');
  assert.equal(e.extraction.model_entry.amount_naira, 6000);
  assert.deepEqual(e.extraction.review_reasons, ['total_mismatch']);
  const {rows: [m]} = await pg.query('SELECT extraction FROM messages');
  assert.equal(m.extraction.raw.entries[0].amount_naira, 6000);
});

test('a double tap is processed once and costs one AI call', async () => {
  const {pg, send, calls} = await setup();
  const first = await send('3 fried rice', KEY(7));
  const second = await send('3 fried rice', KEY(7));
  assert.equal(second.duplicate, true);
  assert.deepEqual(second.entries.map(e => e.id), first.entries.map(e => e.id));
  assert.deepEqual(calls, {reserve: 1, extract: 1});
  assert.equal(await count(pg, 'SELECT count(*)::int AS n FROM messages'), 1);
});

test('a concurrent duplicate while the first is still processing does not call the AI again', async () => {
  const {send, calls} = await setup();
  let release;
  const slow = new Promise(r => { release = r; });
  const first = send('3 fried rice', KEY(8), {extract: async () => { calls.extract++; await slow; return extraction(modelEntry()); }});
  await new Promise(r => setTimeout(r, 50));
  const second = await send('3 fried rice', KEY(8));
  release();
  await first;
  assert.equal(second.status, 'processing');
  assert.equal(calls.extract, 1);
});

test('daily AI cap: the message is saved as capped and the AI is not called', async () => {
  const {pg, send, calls} = await setup();
  const r = await send('3 fried rice', KEY(2), {reserve: async () => { throw new GeminiCapReachedError(200); }});
  assert.equal(r.status, 'capped');
  assert.match(r.notice, /limit reached \(200 calls\)/);
  assert.equal(calls.extract, 0);
  const {rows: [m]} = await pg.query('SELECT status, raw_text FROM messages');
  assert.deepEqual([m.status, m.raw_text], ['capped', '3 fried rice']);
});

test('AI failure never loses the message', async () => {
  const {pg, send} = await setup();
  const r = await send('abeg record am', KEY(3), {extract: async () => { throw Error('timeout'); }});
  assert.equal(r.status, 'failed');
  assert.match(r.notice, /saved for the owner to review/);
  assert.equal(await count(pg, `SELECT count(*)::int AS n FROM messages WHERE status = 'failed' AND raw_text = 'abeg record am'`), 1);
});

test('nothing recognisable: saved as no_records, no entries invented', async () => {
  const {pg, send} = await setup();
  const r = await send('good morning everyone', KEY(4), {reply: extraction()});
  assert.equal(r.status, 'no_records');
  assert.equal(await count(pg, 'SELECT count(*)::int AS n FROM entries WHERE message_id IS NOT NULL'), 0);
});

test('a message interrupted midway is finished on retry without duplicate entries', async () => {
  const {pg, send} = await setup();
  await pg.query(`INSERT INTO messages (business_id, staff_id, raw_text, idempotency_key, created_at) VALUES ($1, $2, '3 fried rice', $3, now() - interval '5 minutes')`, [BIZ, SIMULATED_STAFF[1].id, KEY(9)]);
  const r = await send('3 fried rice', KEY(9), {reply: extraction(modelEntry(), modelEntry({item: 'jollof rice', unit_price_naira: 1500, amount_naira: 4500}))});
  assert.equal(r.status, 'extracted');
  assert.equal(r.entries.length, 2);
  assert.equal(await count(pg, 'SELECT count(*)::int AS n FROM entries WHERE message_id IS NOT NULL'), 2);
});

test('multi-item message keeps line order and one message row', async () => {
  const {pg, send} = await setup();
  const r = await send('3 fried rice transfer, 2 jollof cash', KEY(5), {reply: extraction(modelEntry(), modelEntry({item: 'jollof rice', quantity: 2, payment_method: 'cash', unit_price_naira: 1500, amount_naira: 3000}))});
  assert.deepEqual(r.entries.map(e => [e.line_no, e.item]), [[1, 'fried rice'], [2, 'jollof rice']]);
  assert.equal(await count(pg, 'SELECT count(*)::int AS n FROM messages'), 1);
});
