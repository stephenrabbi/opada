import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {computeDayFlags, runChecks, lagosDay, naira} from '../src/checks.js';
import {thresholds} from '../src/rules.js';
import {migrate} from '../db/migrate.mjs';
import {seedSimulatedRestaurant, SIMULATED_BUSINESS_ID as BIZ, SIMULATED_STAFF} from '../db/seed/simulated-restaurant.mjs';

const DAY = '2026-10-23';
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const sale = (payment_method, amount_kobo, extra = {}) => ({id: id(), type: 'sale', item: 'jollof rice', amount_kobo, payment_method, payment_split: null, ...extra});
const pay = amount_kobo => ({id: id(), amount_kobo});
const MENU = [
  {id: id(), item: 'jollof rice', price_kobo: 150000, ingredient_costs_kobo: [80000, 25000, 15000]},
  {id: id(), item: 'fried rice', price_kobo: 180000, ingredient_costs_kobo: ['70000', '20000']},  // drivers return bigint as strings
];
const transfer = r => r.flags.find(f => f.rule === 'transfer_paystack');
const skip = (r, rule) => r.skipped.filter(s => s.rule === rule);

// ---- Pure rule fixtures ----

test('transfers recorded above Paystack receipts flag the gap with all evidence', () => {
  const entries = [sale('transfer', 1440000), sale('transfer', 480000), sale('mixed', 1200000, {payment_split: {cash_kobo: 400000, transfer_kobo: 800000}}), sale('cash', 1500000)];
  const payments = [pay(1440000), pay(480000), pay(450000)];
  const f = transfer(computeDayFlags({day: DAY, entries, payments}));
  assert.equal(f.amount_gap_kobo, 350000);
  assert.equal(f.details.signed_gap_kobo, -350000);
  assert.equal(f.details.recorded_transfer_kobo, 2720000);
  assert.equal(f.details.verified_paystack_kobo, 2370000);
  assert.deepEqual(f.evidence_ids, [...entries.slice(0, 3).map(e => e.id), ...payments.map(p => p.id)]);  // cash sale is not evidence
  assert.match(f.suggested_action, /₦3,500 recorded as transfer has no matching Paystack payment yet/);
  assert.doesNotMatch(f.suggested_action, /steal|fraud|theft/i);
});

test('Paystack receiving more than recorded is flagged the other way', () => {
  const f = transfer(computeDayFlags({day: DAY, entries: [sale('transfer', 100000)], payments: [pay(400000)]}));
  assert.equal(f.details.signed_gap_kobo, 300000);
  assert.match(f.suggested_action, /Paystack received ₦3,000 more than the transfers recorded/);
});

test('a gap of exactly the threshold is not flagged; one kobo over is', () => {
  assert.equal(transfer(computeDayFlags({day: DAY, entries: [sale('transfer', 200000)], payments: []})), undefined);
  assert.equal(transfer(computeDayFlags({day: DAY, entries: [sale('transfer', 200001)], payments: []})).amount_gap_kobo, 200001);
});

test('no transfer sales and no payments: rule skipped, not treated as zero', () => {
  const r = computeDayFlags({day: DAY, entries: [sale('cash', 500000)], payments: []});
  assert.equal(transfer(r), undefined);
  assert.equal(skip(r, 'transfer_paystack')[0].reason, 'no_transfer_activity');
});

test('unpriced transfer entries block a "Paystack received more" flag (they may explain it)', () => {
  const unpriced = sale('transfer', null);
  const r = computeDayFlags({day: DAY, entries: [sale('transfer', 100000), unpriced], payments: [pay(900000)]});
  assert.equal(transfer(r), undefined);
  assert.deepEqual(skip(r, 'transfer_paystack')[0], {rule: 'transfer_paystack', reason: 'unpriced_transfer_entries', entry_ids: [unpriced.id]});
});

test('unpriced transfer entries cannot shrink a shortfall, so that flag stands and says so', () => {
  const unpriced = sale('mixed', 300000);  // mixed with no split: transfer part unknown
  const f = transfer(computeDayFlags({day: DAY, entries: [sale('transfer', 900000), unpriced], payments: [pay(100000)]}));
  assert.equal(f.amount_gap_kobo, 800000);
  assert.deepEqual(f.details.unpriced_entry_ids, [unpriced.id]);
  assert.ok(f.evidence_ids.includes(unpriced.id));
  assert.match(f.suggested_action, /1 transfer entry has no amount yet and is not included/);
});

test('expenses and restocks paid by transfer are not counted as transfer sales', () => {
  const r = computeDayFlags({day: DAY, entries: [{...sale('transfer', 6200000), type: 'restock'}, {...sale('transfer', 800000), type: 'expense'}], payments: []});
  assert.equal(transfer(r), undefined);
});

test('margin below target is flagged per sold item with a ₦50-rounded price', () => {
  const sold = [sale('cash', 150000), sale('cash', 180000, {item: 'Fried Rice'})];
  const r = computeDayFlags({day: DAY, entries: sold, payments: [], menu: MENU});
  const m = r.flags.filter(f => f.rule === 'margin_squeeze');
  assert.equal(m.length, 1);
  assert.equal(m[0].item, 'jollof rice');
  assert.equal(m[0].details.proposed_price_kobo, 185000);
  assert.equal(m[0].details.cost_kobo, 120000);
  assert.deepEqual(m[0].evidence_ids, [MENU[0].id, sold[0].id]);
  assert.equal(m[0].suggested_action, 'jollof rice: ingredients cost ₦1,200 per plate and the menu price is ₦1,500, a 20% margin (target 35%). A price of ₦1,850 meets the target.');
  assert.ok(r.evaluated.includes('margin_squeeze|fried rice'));  // healthy, case-insensitive match
});

test('sold items with no menu cost are skipped, not guessed', () => {
  const r = computeDayFlags({day: DAY, entries: [sale('cash', 100000, {item: 'suya'})], payments: [], menu: MENU});
  assert.deepEqual(skip(r, 'margin_squeeze'), [{rule: 'margin_squeeze', item: 'suya', reason: 'no_menu_cost'}]);
});

test('thresholds are per business: stricter or looser settings change the outcome', () => {
  const input = {day: DAY, entries: [sale('transfer', 1200000), sale('cash', 150000)], payments: [pay(850000)], menu: MENU};
  assert.equal(computeDayFlags(input).flags.length, 2);
  const loose = {...thresholds, transferGapKobo: 500000, minGrossMargin: 0.15};
  assert.equal(computeDayFlags({...input, thresholds: loose}).flags.length, 0);
  const coarse = {...thresholds, priceRoundingKobo: 10000};  // round to ₦100 instead of ₦50
  assert.equal(computeDayFlags({...input, thresholds: coarse}).flags.find(f => f.rule === 'margin_squeeze').details.proposed_price_kobo, 190000);
});

test('stock rule is reported as skipped until stock counts exist', () =>
  assert.equal(skip(computeDayFlags({day: DAY, entries: [], payments: []}), 'stock_sales')[0].reason, 'no_stock_counts'));

test('same inputs always give the same flags', () => {
  const input = {day: DAY, entries: [sale('transfer', 1200000), sale('cash', 150000)], payments: [pay(850000)], menu: MENU};
  assert.deepEqual(computeDayFlags(input), computeDayFlags(structuredClone(input)));
});

test('naira formatting from integer kobo', () => {
  assert.equal(naira(350000), '₦3,500');
  assert.equal(naira(12345), '₦123.45');
  assert.equal(naira(0), '₦0');
});

test('lagosDay switches at midnight WAT (UTC+1), not UTC midnight', () => {
  assert.equal(lagosDay(new Date('2026-10-22T22:59:59Z')), '2026-10-22');  // 23:59:59 WAT
  assert.equal(lagosDay(new Date('2026-10-22T23:00:00Z')), '2026-10-23');  // 00:00:00 WAT
  assert.equal(lagosDay(new Date('2026-10-23T00:30:00Z')), '2026-10-23');
});

// ---- Against the real migrations (in-memory Postgres) ----

async function seeded() {
  const pg = await newPglite();
  const db = {exec: s => pg.exec(s), query: (s, p) => pg.query(s, p)};
  await migrate(db);
  const seed = await seedSimulatedRestaurant(db, {day: DAY});
  return {pg, run: async (t, p) => (await pg.query(t, p)).rows, seed};
}
const flagRows = async pg => (await pg.query(`SELECT rule, item, status, amount_gap_kobo::text AS gap, evidence_ids FROM flags ORDER BY rule`)).rows;
const addTransferSale = (pg, amount, lagosTime, day = DAY) => pg.query(`INSERT INTO entries (business_id, type, item, quantity, unit, unit_price_kobo, amount_kobo, payment_method, recorded_by, raw_text, created_at)
  VALUES ($1, 'sale', 'fried rice', 1, 'plate', $2, $2, 'transfer', $3, 'fixture', (($4::date + $5::time) AT TIME ZONE 'Africa/Lagos'))`, [BIZ, amount, SIMULATED_STAFF[1].id, day, lagosTime]);

test('seeded day produces exactly the transfer and jollof margin flags, with real evidence ids', async () => {
  const {pg, seed} = await seeded();
  const flags = await flagRows(pg);
  assert.deepEqual(flags.map(f => [f.rule, f.item, f.status, f.gap]), [['margin_squeeze', 'jollof rice', 'open', null], ['transfer_paystack', null, 'open', '350000']]);
  const ids = flags.flatMap(f => f.evidence_ids);
  const {rows} = await pg.query(`SELECT count(*)::int AS n FROM (SELECT id FROM entries UNION ALL SELECT id FROM payments UNION ALL SELECT id FROM menu_items) x WHERE id = ANY($1::uuid[])`, [ids]);
  assert.equal(rows[0].n, ids.length);
  assert.equal(seed.checks.written.length, 2);
});

test('re-running checks does not duplicate or rewrite unchanged flags', async () => {
  const {pg, run} = await seeded();
  const again = await runChecks(run, BIZ, DAY);
  assert.equal(again.written.length, 0);
  assert.equal((await flagRows(pg)).length, 2);
});

test('Lagos day boundary: 23:59 WAT counts today, 00:00 WAT counts tomorrow', async () => {
  const {pg, run} = await seeded();
  await addTransferSale(pg, 300000, '23:59:59');               // today: gap grows to ₦6,500
  await addTransferSale(pg, 999900, '00:00:00', '2026-10-24');  // tomorrow: must not count
  await runChecks(run, BIZ, DAY);
  assert.equal((await flagRows(pg)).find(f => f.rule === 'transfer_paystack').gap, '650000');
  const tomorrow = await runChecks(run, BIZ, '2026-10-24');
  assert.equal(tomorrow.written.find(w => w.rule === 'transfer_paystack').inserted, true);
  assert.equal((await pg.query(`SELECT amount_gap_kobo::text AS gap FROM flags WHERE day = '2026-10-24'`)).rows[0].gap, '999900');
});

test('a late Paystack payment that closes the gap resolves the open flag', async () => {
  const {pg, run} = await seeded();
  await pg.query(`INSERT INTO payments (business_id, paystack_reference, amount_kobo, channel, paid_at) VALUES ($1, 'opada_test_late00000000000000000001', 350000, 'bank_transfer', (($2::date + time '20:00') AT TIME ZONE 'Africa/Lagos'))`, [BIZ, DAY]);
  const r = await runChecks(run, BIZ, DAY);
  assert.deepEqual(r.resolved.map(x => x.rule), ['transfer_paystack']);
  assert.equal((await flagRows(pg)).find(f => f.rule === 'transfer_paystack').status, 'resolved');
});

test('a flag the owner checked stays checked unless new evidence changes the amount', async () => {
  const {pg, run} = await seeded();
  await pg.query(`UPDATE flags SET status = 'checked', checked_by = $1, checked_at = now() WHERE rule = 'transfer_paystack'`, [SIMULATED_STAFF[0].id]);
  await runChecks(run, BIZ, DAY);
  assert.equal((await flagRows(pg)).find(f => f.rule === 'transfer_paystack').status, 'checked');
  await addTransferSale(pg, 100000, '18:00');
  await runChecks(run, BIZ, DAY);
  const f = (await flagRows(pg)).find(f => f.rule === 'transfer_paystack');
  assert.deepEqual([f.status, f.gap], ['open', '450000']);
});
