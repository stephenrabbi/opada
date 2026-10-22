import test from 'node:test';
import assert from 'node:assert/strict';
import {extractRecords, isTransient, DEFAULT_FALLBACK_MODEL} from '../src/ai.js';
import {DEFAULT_MODEL} from '../src/gemini-extract.js';

const reply = entries => ({ok: true, status: 200, json: async () => ({candidates: [{content: {parts: [{text: JSON.stringify({entries, notes: ''})}]}}]})});
const sale = {type: 'sale', item: 'fried rice', quantity: 3, unit: 'plate', payment_method: 'transfer', unit_price_naira: 1800, amount_naira: 5400};
const quiet = {warn() {}};
// Records which model each call asked for, and answers from a script of responses.
function fakeGemini(...responses) {
  const models = [];
  const fetcher = async url => { models.push(decodeURIComponent(url.match(/models\/([^:]+):/)[1])); const r = responses.shift(); if (r instanceof Error) throw r; return r; };
  return {fetcher, models};
}
const env = {GEMINI_API_KEY: 'test-key'};

test('defaults: primary model is current, fallback differs', () => {
  assert.equal(DEFAULT_MODEL, 'gemini-3.5-flash');
  assert.notEqual(DEFAULT_FALLBACK_MODEL, DEFAULT_MODEL);
});

test('a 503 from the primary model retries once on the fallback and counts the extra call', async () => {
  const {fetcher, models} = fakeGemini({ok: false, status: 503}, reply([sale]));
  let reserved = 0;
  const r = await extractRecords('3 fried rice', {env, fetcher, log: quiet, beforeRetry: async () => { reserved++; }});
  assert.deepEqual(models, [DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL]);
  assert.equal(r.model, DEFAULT_FALLBACK_MODEL);
  assert.equal(r.entries[0].amount_kobo, 540000);
  assert.equal(reserved, 1);
});

test('timeouts and rate limits are retried; bad requests and bad keys are not', async () => {
  const timeout = Object.assign(Error('The operation was aborted due to timeout'), {name: 'TimeoutError'});
  assert.ok(isTransient(timeout));
  assert.ok(isTransient({status: 429}));
  assert.ok(isTransient({status: 500}));
  for (const status of [400, 401, 403, 404]) {
    const {fetcher, models} = fakeGemini({ok: false, status});
    await assert.rejects(extractRecords('x', {env, fetcher, log: quiet}), new RegExp(`HTTP ${status}`));
    assert.equal(models.length, 1);
  }
});

test('if the fallback also fails, the error surfaces (the message is still saved upstream)', async () => {
  const {fetcher, models} = fakeGemini({ok: false, status: 503}, {ok: false, status: 503});
  await assert.rejects(extractRecords('x', {env, fetcher, log: quiet}), /HTTP 503/);
  assert.equal(models.length, 2);
});

test('the daily cap is respected on retry: if reserving the extra call fails, no fallback call is made', async () => {
  const {fetcher, models} = fakeGemini({ok: false, status: 503}, reply([sale]));
  await assert.rejects(extractRecords('x', {env, fetcher, log: quiet, beforeRetry: async () => { throw Error('cap'); }}), /cap/);
  assert.equal(models.length, 1);
});

test('env can override both models; no retry when they are the same', async () => {
  const {fetcher, models} = fakeGemini({ok: false, status: 503});
  await assert.rejects(extractRecords('x', {env: {...env, GEMINI_MODEL: 'm1', GEMINI_FALLBACK_MODEL: 'm1'}, fetcher, log: quiet}), /HTTP 503/);
  assert.deepEqual(models, ['m1']);
});
