import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {migrate} from '../db/migrate.mjs';
import {reserveGeminiCall, dailyCap, GeminiCapReachedError, GEMINI_DAILY_CALL_CAP_MAX} from '../src/gemini-budget.js';

async function setup() {
  const pg = new PGlite();
  await migrate({exec: s => pg.exec(s), query: (s, p) => pg.query(s, p)});
  const lines = [];
  const log = {info: l => lines.push(JSON.parse(l)), warn: l => lines.push(JSON.parse(l))};
  return {pg, run: async (t, p) => (await pg.query(t, p)).rows, lines, log};
}

test('cap defaults to 200 and env can only lower it', () => {
  assert.equal(GEMINI_DAILY_CALL_CAP_MAX, 200);
  assert.equal(dailyCap({}), 200);
  assert.equal(dailyCap({GEMINI_DAILY_CALL_CAP: '50'}), 50);
  assert.equal(dailyCap({GEMINI_DAILY_CALL_CAP: '5000'}), 200);
  for (const bad of ['0', '-3', 'abc', '1.5', '']) assert.equal(dailyCap({GEMINI_DAILY_CALL_CAP: bad}), 200);
});

test('calls are counted and logged until the cap, then refused with a clear error', async () => {
  const {pg, run, lines, log} = await setup();
  for (let i = 1; i <= 3; i++) assert.equal((await reserveGeminiCall(run, {cap: 3, log})).calls, i);
  await assert.rejects(reserveGeminiCall(run, {cap: 3, log}), e => e instanceof GeminiCapReachedError && /limit reached \(3 calls\)/.test(e.message) && /midnight Lagos/.test(e.message));
  assert.deepEqual(lines.map(l => l.event), ['gemini_call', 'gemini_call', 'gemini_call', 'gemini_daily_cap_reached']);
  assert.equal(lines[2].calls, 3);
  assert.equal(lines[2].cap, 3);
  // Refused calls are not counted.
  assert.equal((await pg.query('SELECT calls FROM gemini_usage')).rows[0].calls, 3);
});

test('concurrent requests never exceed the cap', async () => {
  const {pg, run, log} = await setup();
  const results = await Promise.allSettled(Array.from({length: 12}, () => reserveGeminiCall(run, {cap: 5, log})));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 5);
  assert.equal((await pg.query('SELECT calls FROM gemini_usage')).rows[0].calls, 5);
});

test('the counter is per Africa/Lagos day', async () => {
  const {pg, run, log} = await setup();
  await pg.query(`INSERT INTO gemini_usage (day, calls) VALUES ((now() AT TIME ZONE 'Africa/Lagos')::date - 1, 200)`);
  const r = await reserveGeminiCall(run, {log});
  assert.equal(r.calls, 1);
  const {rows} = await pg.query(`SELECT (now() AT TIME ZONE 'Africa/Lagos')::date::text AS today`);
  assert.equal(r.day, rows[0].today);
});
