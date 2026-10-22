// Free-text (or voice-transcript) staff message -> stored message -> AI extraction -> entries -> checks.
// Never blocks the flow: the message is saved before AI runs, and every failure leaves it saved
// with a status the owner can see. AI-extracted entries are never rejected: money is recomputed by
// code, the model's own numbers are kept in `extraction`, and every entry is needs_review.
import {lineTotalKobo} from './ingest-schema.js';
import {GeminiCapReachedError} from './gemini-budget.js';
import {runChecksSafely, lagosDay} from './checks.js';

const UNITS = {
  plate: ['plate', 'plates', 'plt', 'portion', 'portions', 'serving', 'servings', 'wrap', 'wraps'],
  piece: ['piece', 'pieces', 'pc', 'pcs', 'unit', 'units', 'bottle', 'bottles', 'pack', 'packs', 'item', 'items'],
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
  litre: ['l', 'litre', 'litres', 'liter', 'liters', 'ltr'],
  bag: ['bag', 'bags', 'sack', 'sacks'],
};
const UNIT_OF = new Map(Object.entries(UNITS).flatMap(([unit, words]) => words.map(w => [w, unit])));

export function normalizeUnit(raw) {
  return UNIT_OF.get(String(raw ?? '').trim().toLowerCase()) ?? null;
}

// One extracted entry -> an entries row. `e` is validated (kobo), `model` is the model's raw entry (naira).
export function normalizeExtractedEntry(e, model) {
  const reasons = [];
  const unit = normalizeUnit(e.unit);
  if (unit === null) reasons.push(e.unit?.trim() ? 'unit_unrecognised' : 'missing_unit');
  if (e.quantity === null) reasons.push('missing_quantity');
  if (e.unit_price_kobo === null) reasons.push('missing_price');
  let amount = e.amount_kobo;
  // Code calculates: with a quantity and unit price, the total is ours, whatever the model said.
  if (e.quantity !== null && e.unit_price_kobo !== null) {
    let computed = null;
    try { computed = lineTotalKobo(e.quantity, e.unit_price_kobo); } catch { reasons.push('amount_overflow'); }
    if (computed !== null) {
      if (e.amount_kobo === null) reasons.push('amount_computed');
      else if (e.amount_kobo !== computed) reasons.push('total_mismatch');
      amount = computed;
    } else amount = null;
  }
  if (amount === null && !reasons.includes('amount_overflow')) reasons.push('missing_amount');
  if (e.payment_method === 'mixed') reasons.push('split_unknown');
  if (e.payment_method === 'unknown') reasons.push('missing_payment_method');
  return {
    type: e.type, item: e.item, quantity: e.quantity, unit, unit_price_kobo: e.unit_price_kobo, amount_kobo: amount,
    payment_method: e.payment_method, payment_split: null, needs_review: true,
    extraction: {model_entry: model ?? null, model_amount_kobo: e.amount_kobo, server_amount_kobo: amount, review_reasons: reasons},
  };
}

const ENTRY_COLUMNS = 'id, line_no, type, item, quantity, unit, unit_price_kobo, amount_kobo, payment_method, needs_review, extraction';

async function finish(run, messageId, status, {extraction = null, error = null} = {}) {
  await run(`UPDATE messages SET status = $2, extraction = $3::jsonb, error = $4, processed_at = now() WHERE id = $1`,
    [messageId, status, extraction && JSON.stringify(extraction), error]);
}

async function existing(run, businessId, idempotencyKey) {
  const [m] = await run(`SELECT id, status, error, created_at, (now() - created_at) < interval '60 seconds' AS in_flight
    FROM messages WHERE business_id = $1 AND idempotency_key = $2`, [businessId, idempotencyKey]);
  return m;
}

// deps: run(text, params) -> rows; reserve() reserves one AI call (may throw GeminiCapReachedError);
// extract(text) -> { provider, model, entries, notes, raw }.
export async function ingestMessage({run, staff, text, idempotencyKey, source = 'text', reserve, extract, log = console}) {
  const [created] = await run(`INSERT INTO messages (business_id, staff_id, raw_text, source, idempotency_key)
    VALUES ($1, $2, $3, $4, $5) ON CONFLICT (business_id, idempotency_key) DO NOTHING RETURNING id, created_at`,
    [staff.business_id, staff.id, text, source, idempotencyKey]);
  let message = created && {...created, status: 'received'};
  if (!message) {
    message = await existing(run, staff.business_id, idempotencyKey);
    // Already processed: return what was stored, with no second AI call.
    if (message.status !== 'received') {
      const entries = await run(`SELECT ${ENTRY_COLUMNS} FROM entries WHERE message_id = $1 ORDER BY line_no`, [message.id]);
      return {duplicate: true, message_id: message.id, status: message.status, notice: message.error, entries, checks: null};
    }
    // Another request is processing it right now (concurrent double tap): don't spend a second AI call.
    if (message.in_flight) return {duplicate: true, message_id: message.id, status: 'processing', notice: 'This message is already being processed.', entries: [], checks: null};
    // Older and still 'received': an earlier attempt stopped midway; carry on (entry inserts are idempotent).
  }
  const id = message.id;
  try {
    await reserve();
  } catch (error) {
    if (!(error instanceof GeminiCapReachedError)) throw error;
    await finish(run, id, 'capped', {error: error.message});
    return {duplicate: false, message_id: id, status: 'capped', notice: error.message, entries: [], checks: null};
  }
  let result;
  try {
    result = await extract(text);
  } catch (error) {
    log.error(JSON.stringify({event: 'extraction_failed', message_id: id, error: error.message}));
    const notice = 'AI extraction is unavailable right now. Your message is saved for the owner to review.';
    await finish(run, id, 'failed', {error: notice});
    return {duplicate: false, message_id: id, status: 'failed', notice, entries: [], checks: null};
  }
  const extraction = {provider: result.provider, model: result.model, notes: result.notes, raw: result.raw};
  if (!result.entries.length) {
    const notice = 'No sale, expense or restock was found in this message. It is saved for the owner to review.';
    await finish(run, id, 'no_records', {extraction, error: notice});
    return {duplicate: false, message_id: id, status: 'no_records', notice, entries: [], notes: result.notes, checks: null};
  }
  const rows = result.entries.map((e, i) => normalizeExtractedEntry(e, result.raw?.entries?.[i]));
  for (const [i, r] of rows.entries()) {
    await run(`INSERT INTO entries (business_id, type, item, quantity, unit, unit_price_kobo, amount_kobo, payment_method, payment_split,
        recorded_by, raw_text, source, needs_review, message_id, line_no, extraction, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, true, $12, $13, $14::jsonb, $15)
      ON CONFLICT (message_id, line_no) DO NOTHING`,
      [staff.business_id, r.type, r.item, r.quantity, r.unit, r.unit_price_kobo, r.amount_kobo, r.payment_method,
        staff.id, text, source, id, i + 1, JSON.stringify(r.extraction), message.created_at]);
  }
  await finish(run, id, 'extracted', {extraction});
  const entries = await run(`SELECT ${ENTRY_COLUMNS} FROM entries WHERE message_id = $1 ORDER BY line_no`, [id]);
  // Entries take the message's time, so they count on the Lagos day the staff member sent it.
  const checks = await runChecksSafely(run, staff.business_id, lagosDay(new Date(message.created_at)), log);
  return {duplicate: false, message_id: id, status: 'extracted', notice: null, entries, notes: result.notes, checks};
}
