import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {seedSimulatedRestaurant, SIMULATED_BUSINESS_ID as BIZ, SIMULATED_STAFF} from '../db/seed/simulated-restaurant.mjs';
import {loadFlagEvidence} from '../src/evidence.js';

const OTHER = 'b0000000-0000-4000-8000-000000000001';
async function setup() {
  const pg = await newPglite();
  await migrate({exec: s => pg.exec(s), query: (s, p) => pg.query(s, p)});
  await seedSimulatedRestaurant({exec: s => pg.exec(s), query: (s, p) => pg.query(s, p)}, {day: '2026-10-23'});
  const run = async (t, p) => (await pg.query(t, p)).rows;
  const flag = async rule => (await run('SELECT id FROM flags WHERE rule = $1', [rule]))[0].id;
  return {pg, run, flag};
}

test('transfer flag evidence: each staff record with author, time and original words, plus the Paystack payments', async () => {
  const {run, flag} = await setup();
  const ev = await loadFlagEvidence(run, BIZ, await flag('transfer_paystack'));
  assert.equal(ev.flag.rule, 'transfer_paystack');
  assert.deepEqual(ev.entries.map(e => e.item), ['fried rice', 'amala and ewedu', 'pounded yam and egusi']);
  assert.ok(ev.entries.every(e => e.recorded_by === 'Tunde (simulated cashier)' && e.raw_text && e.created_at));
  assert.equal(ev.entries[0].raw_text, '8 plate fried rice don comot, 1800 each, dem transfer am');
  assert.equal(ev.payments.length, 3);
  assert.equal(ev.menu.length, 0);
  assert.equal(ev.checked_by, null);
});

test('margin flag evidence: the menu cost used and the sales of that item', async () => {
  const {run, flag} = await setup();
  const ev = await loadFlagEvidence(run, BIZ, await flag('margin_squeeze'));
  assert.equal(ev.menu[0].item, 'jollof rice');
  assert.deepEqual(ev.menu[0].ingredient_costs_kobo.map(Number), [80000, 25000, 15000]);
  assert.deepEqual(ev.entries.map(e => e.item), ['jollof rice', 'jollof rice']);
  assert.equal(ev.flag.details.proposed_price_kobo, 185000);
});

test('another business cannot load the flag, and gets the same answer as for a missing one', async () => {
  const {run, flag} = await setup();
  assert.equal(await loadFlagEvidence(run, OTHER, await flag('transfer_paystack')), null);
  assert.equal(await loadFlagEvidence(run, BIZ, '00000000-0000-4000-8000-0000000000ff'), null);
});

test('evidence ids pointing at another business are never returned', async () => {
  const {pg, run} = await setup();
  await pg.query(`INSERT INTO businesses (id, name) VALUES ($1, 'Other test business')`, [OTHER]);
  // A flag in OTHER that (wrongly) lists BIZ's entries and payments as evidence.
  const {rows: [f]} = await pg.query(`INSERT INTO flags (business_id, rule, day, evidence_ids)
    SELECT $1, 'transfer_paystack', '2026-10-23', array_agg(id) FROM (SELECT id FROM entries UNION ALL SELECT id FROM payments) x RETURNING id`, [OTHER]);
  const ev = await loadFlagEvidence(run, OTHER, f.id);
  assert.deepEqual([ev.entries.length, ev.payments.length, ev.menu.length], [0, 0, 0]);
});

test('a checked flag says who checked it and when', async () => {
  const {pg, run, flag} = await setup();
  const id = await flag('transfer_paystack');
  await pg.query(`UPDATE flags SET status = 'checked', checked_by = $1, checked_at = now() WHERE id = $2`, [SIMULATED_STAFF[0].id, id]);
  await pg.query(`INSERT INTO action_audit (business_id, flag_id, actor_id, action) VALUES ($1, $2, $3, 'mark_checked')`, [BIZ, id, SIMULATED_STAFF[0].id]);
  const ev = await loadFlagEvidence(run, BIZ, id);
  assert.equal(ev.checked_by.display_name, 'Simi (simulated owner)');
});
