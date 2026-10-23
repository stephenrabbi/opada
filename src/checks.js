// Turns one Africa/Lagos day of stored entries and Paystack payments into flags with evidence.
// All arithmetic is here, in code; suggested_action text is a plain template over computed numbers.
// `run(text, params)` returns result rows (neon: sql.query, pg/PGlite: wrap .query().rows).
import {checkTransfers, checkMargin, thresholds as defaultThresholds} from './rules.js';

export const TIMEZONE = 'Africa/Lagos';

export function lagosDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'}).format(date);
}

export function naira(kobo) {
  const opts = kobo % 100 === 0 ? {maximumFractionDigits: 0} : {minimumFractionDigits: 2, maximumFractionDigits: 2};
  return '₦' + (kobo / 100).toLocaleString('en-NG', opts);
}

// Drivers return bigint/numeric as strings; null stays null.
const num = v => (v === null || v === undefined ? null : Number(v));
const key = (rule, item) => `${rule}|${item ?? ''}`;

// Amount of a sale that the staff member says arrived by transfer, or null if it isn't known.
function reportedTransferKobo(e) {
  if (e.payment_method === 'transfer') return num(e.amount_kobo);
  if (e.payment_method === 'mixed') return num(e.payment_split?.transfer_kobo);
  return 0;
}

function transferCheck({day, entries, payments, thresholds}) {
  const rule = 'transfer_paystack';
  const sales = entries.filter(e => e.type === 'sale' && (e.payment_method === 'transfer' || e.payment_method === 'mixed'));
  if (!sales.length && !payments.length) return {skipped: {rule, reason: 'no_transfer_activity'}};
  let recorded = 0;
  const priced = [], unpriced = [];
  for (const e of sales) {
    const amount = reportedTransferKobo(e);
    if (Number.isSafeInteger(amount)) { recorded += amount; priced.push(e.id); } else unpriced.push(e.id);
  }
  const verified = payments.reduce((sum, p) => sum + num(p.amount_kobo), 0);
  const result = checkTransfers({recordedTransferKobo: recorded, verifiedPaystackKobo: verified}, thresholds);
  // Paystack received MORE than recorded, but some transfer entries have no amount yet: they could
  // account for the difference, so there is not enough evidence to flag. (When Paystack received LESS,
  // unpriced entries can only widen the gap, so the flag stands as a lower bound.)
  if (result && result.signedGapKobo > 0 && unpriced.length) return {skipped: {rule, reason: 'unpriced_transfer_entries', entry_ids: unpriced}};
  if (!result) return {evaluated: key(rule, null)};
  const gap = result.gapKobo;
  const lines = [`Transfers recorded on ${day}: ${naira(recorded)}. Paystack payments received: ${naira(verified)}.`];
  lines.push(result.signedGapKobo < 0
    ? `${naira(gap)} recorded as transfer has no matching Paystack payment yet. Compare the transfer entries with the Paystack receipts below.`
    : `Paystack received ${naira(gap)} more than the transfers recorded. A transfer sale may not have been recorded yet.`);
  if (unpriced.length) lines.push(`${unpriced.length} transfer ${unpriced.length === 1 ? 'entry has' : 'entries have'} no amount yet and ${unpriced.length === 1 ? 'is' : 'are'} not included.`);
  return {
    evaluated: key(rule, null),
    flag: {
      rule, day, item: null, amount_gap_kobo: gap,
      evidence_ids: [...priced, ...unpriced, ...payments.map(p => p.id)],
      suggested_action: lines.join(' '),
      details: {recorded_transfer_kobo: recorded, verified_paystack_kobo: verified, signed_gap_kobo: result.signedGapKobo,
        threshold_kobo: thresholds.transferGapKobo, unpriced_entry_ids: unpriced, payment_ids: payments.map(p => p.id)},
    },
  };
}

function marginChecks({day, entries, menu, thresholds}) {
  const rule = 'margin_squeeze';
  const sold = new Map();  // lower(item) -> sale entry ids today
  for (const e of entries) if (e.type === 'sale') sold.set(e.item.toLowerCase(), [...(sold.get(e.item.toLowerCase()) || []), e.id]);
  if (!sold.size) return [{skipped: {rule, reason: 'no_sales'}}];
  const byItem = new Map(menu.map(m => [m.item.toLowerCase(), m]));
  return [...sold].map(([name, saleIds]) => {
    const m = byItem.get(name);
    if (!m || !m.ingredient_costs_kobo?.length) return {skipped: {rule, item: name, reason: 'no_menu_cost'}};
    const priceKobo = num(m.price_kobo), costs = m.ingredient_costs_kobo.map(num);
    let result;
    try { result = checkMargin({priceKobo, ingredientCostsKobo: costs}, thresholds); } catch { return {skipped: {rule, item: m.item, reason: 'invalid_menu_cost'}}; }
    if (!result) return {evaluated: key(rule, m.item)};
    const cost = result.evidence.costKobo, pct = Math.round(result.margin * 100), target = Math.round(thresholds.minGrossMargin * 100);
    return {
      evaluated: key(rule, m.item),
      flag: {
        rule, day, item: m.item, amount_gap_kobo: null,
        evidence_ids: [m.id, ...saleIds],
        suggested_action: `${m.item}: ingredients cost ${naira(cost)} per plate and the menu price is ${naira(priceKobo)}, a ${pct}% margin (target ${target}%). A price of ${naira(result.proposedPriceKobo)} meets the target.`,
        details: {price_kobo: priceKobo, cost_kobo: cost, margin: result.margin, target_margin: thresholds.minGrossMargin,
          proposed_price_kobo: result.proposedPriceKobo, menu_item_id: m.id, sale_entry_ids: saleIds},
      },
    };
  });
}

// Pure: same inputs, same flags. Rules without enough evidence are reported in `skipped`, never assumed zero.
export function computeDayFlags({day, entries, payments, menu = [], thresholds = defaultThresholds}) {
  const results = [transferCheck({day, entries, payments, thresholds}), ...marginChecks({day, entries, menu, thresholds})];
  return {
    flags: results.filter(r => r.flag).map(r => r.flag),
    evaluated: results.filter(r => r.evaluated).map(r => r.evaluated),
    skipped: [{rule: 'stock_sales', reason: 'no_stock_counts'}, ...results.filter(r => r.skipped).map(r => r.skipped)],
  };
}

// Lagos-day window as a half-open timestamptz range, so a sale at 23:59 WAT and one at 00:00 WAT land on different days.
const IN_DAY = col => `${col} >= ($2::date::timestamp AT TIME ZONE '${TIMEZONE}') AND ${col} < (($2::date + 1)::timestamp AT TIME ZONE '${TIMEZONE}')`;

export async function runChecks(run, businessId, day = lagosDay(), {thresholds = defaultThresholds} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('day must be YYYY-MM-DD');
  // Sequential on purpose: one pg client must not run overlapping queries.
  const entries = await run(`SELECT id, type, item, amount_kobo, payment_method, payment_split FROM entries WHERE business_id = $1 AND ${IN_DAY('created_at')} ORDER BY created_at`, [businessId, day]);
  const payments = await run(`SELECT id, amount_kobo FROM payments WHERE business_id = $1 AND ${IN_DAY('paid_at')} ORDER BY paid_at`, [businessId, day]);
  const menu = await run('SELECT id, item, price_kobo, ingredient_costs_kobo FROM menu_items WHERE business_id = $1', [businessId]);
  const computed = computeDayFlags({day, entries, payments, menu, thresholds});
  const written = [];
  for (const f of computed.flags) {
    // New evidence that changes the amount re-opens a flag the owner already checked; same amount keeps it checked.
    const rows = await run(`INSERT INTO flags (business_id, rule, day, item, amount_gap_kobo, evidence_ids, suggested_action, details)
      VALUES ($1, $2, $3::date, $4, $5, $6::uuid[], $7, $8::jsonb)
      ON CONFLICT (business_id, rule, day, (coalesce(item, ''))) DO UPDATE SET
        amount_gap_kobo = EXCLUDED.amount_gap_kobo, evidence_ids = EXCLUDED.evidence_ids,
        suggested_action = EXCLUDED.suggested_action, details = EXCLUDED.details, updated_at = now(),
        status = CASE WHEN flags.status = 'checked' AND flags.amount_gap_kobo IS NOT DISTINCT FROM EXCLUDED.amount_gap_kobo THEN 'checked' ELSE 'open' END
      WHERE flags.status = 'resolved' OR flags.amount_gap_kobo IS DISTINCT FROM EXCLUDED.amount_gap_kobo
        OR flags.evidence_ids IS DISTINCT FROM EXCLUDED.evidence_ids OR flags.details IS DISTINCT FROM EXCLUDED.details
      RETURNING id, status, (xmax = 0) AS inserted`,
      [businessId, f.rule, f.day, f.item, f.amount_gap_kobo, f.evidence_ids, f.suggested_action, JSON.stringify(f.details)]);
    if (rows.length) written.push({rule: f.rule, item: f.item, id: rows[0].id, status: rows[0].status, inserted: rows[0].inserted});
  }
  // An open flag whose rule was evaluated today and no longer triggers is resolved (checked flags keep the owner's decision).
  const flagged = new Set(computed.flags.map(f => key(f.rule, f.item)));
  const cleared = computed.evaluated.filter(k => !flagged.has(k));
  let resolved = [];
  if (cleared.length) {
    resolved = await run(`UPDATE flags SET status = 'resolved', updated_at = now()
      WHERE business_id = $1 AND day = $2::date AND status = 'open' AND (rule || '|' || coalesce(item, '')) = ANY($3::text[])
      RETURNING id, rule, item`, [businessId, day, cleared]);
  }
  return {day, written, resolved, skipped: computed.skipped};
}

// For request handlers: new evidence triggers checks, but a failing check must never fail the save.
export async function runChecksSafely(run, businessId, day = lagosDay(), log = console) {
  try {
    const r = await runChecks(run, businessId, day);
    log.info(JSON.stringify({event: 'checks_ran', day, flags_written: r.written.length, flags_resolved: r.resolved.length}));
    return {flags_written: r.written.length, flags_resolved: r.resolved.length};
  } catch (error) {
    log.error(JSON.stringify({event: 'checks_failed', day, error: error.message}));
    return null;
  }
}
