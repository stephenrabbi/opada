// SIMULATED restaurant seed. Every name, message and payment below is invented test data.
// No real people, businesses or Paystack transactions. Safe to re-run: fixed ids + ON CONFLICT.
//
// The day is built so the demo has something real for the rules to find:
//   staff-reported transfers   ₦27,200 (fried rice ₦14,400 + amala ₦4,800 + pounded yam transfer part ₦8,000)
//   Paystack test-mode receipts ₦23,700 (pounded yam transfer arrived as ₦4,500, not ₦8,000)
//   gap                         ₦3,500  > ₦2,000 transfer threshold
// and jollof rice costs ₦1,200 in ingredients at a ₦1,500 menu price (20% margin < 35% target).
import {createHash, randomBytes} from 'node:crypto';
import {runChecks} from '../../src/checks.js';

export const SIMULATED_BUSINESS_ID = 'a0000000-0000-4000-8000-000000000001';
// Must keep the 'OPADA SYNTHETIC' prefix: the test-mode Paystack routes only serve businesses named this way.
export const SIMULATED_BUSINESS_NAME = 'OPADA SYNTHETIC TEST RESTAURANT (SIMULATED)';

export const SIMULATED_STAFF = [
  {id: 'a0000000-0000-4000-8000-000000000011', role: 'owner', display_name: 'Simi (simulated owner)'},
  {id: 'a0000000-0000-4000-8000-000000000012', role: 'staff', display_name: 'Tunde (simulated cashier)'},
  {id: 'a0000000-0000-4000-8000-000000000013', role: 'staff', display_name: 'Bola (simulated kitchen)'},
];
const [OWNER, CASHIER, KITCHEN] = SIMULATED_STAFF.map(s => s.id);

// time is Africa/Lagos wall-clock time on the seed day.
export const SIMULATED_ENTRIES = [
  {n: 1, time: '09:10', by: KITCHEN, type: 'restock', item: 'rice (50kg bag)', quantity: 1, unit: 'bag', unit_price_kobo: 6200000, amount_kobo: 6200000, payment_method: 'cash', payment_split: null, needs_review: false,
    raw_text: 'Restocked 1 bag rice, 62,000 cash'},
  {n: 2, time: '09:40', by: KITCHEN, type: 'expense', item: 'cooking gas refill', quantity: 1, unit: 'piece', unit_price_kobo: 800000, amount_kobo: 800000, payment_method: 'cash', payment_split: null, needs_review: false,
    raw_text: 'Gas refill 8000, I pay cash'},
  {n: 3, time: '12:05', by: CASHIER, type: 'sale', item: 'jollof rice', quantity: 10, unit: 'plate', unit_price_kobo: 150000, amount_kobo: 1500000, payment_method: 'cash', payment_split: null, needs_review: false,
    raw_text: 'Sold 10 plates jollof rice, 1500 each, cash'},
  {n: 4, time: '13:20', by: CASHIER, type: 'sale', item: 'fried rice', quantity: 8, unit: 'plate', unit_price_kobo: 180000, amount_kobo: 1440000, payment_method: 'transfer', payment_split: null, needs_review: false,
    raw_text: '8 plate fried rice don comot, 1800 each, dem transfer am'},
  {n: 5, time: '14:00', by: CASHIER, type: 'sale', item: 'amala and ewedu', quantity: 4, unit: 'plate', unit_price_kobo: 120000, amount_kobo: 480000, payment_method: 'transfer', payment_split: null, needs_review: false,
    raw_text: 'Amala mẹrin ni a ta, 1200 naira kọọkan, transfer ni wọn fi san'},
  {n: 6, time: '15:30', by: CASHIER, type: 'sale', item: 'pounded yam and egusi', quantity: 6, unit: 'plate', unit_price_kobo: 200000, amount_kobo: 1200000, payment_method: 'mixed', payment_split: {cash_kobo: 400000, transfer_kobo: 800000}, needs_review: false,
    raw_text: '6 pounded yam and egusi, 2000 each. 4000 cash, 8000 transfer'},
  // Incomplete message: saved with needs_review and no price rather than blocking the flow.
  {n: 7, time: '16:45', by: CASHIER, type: 'sale', item: 'jollof rice', quantity: 2, unit: 'plate', unit_price_kobo: null, amount_kobo: null, payment_method: 'unknown', payment_split: null, needs_review: true,
    raw_text: 'Another 2 plate jollof, I no sure of the price'},
];

// Simulated menu: price and ingredient cost per plate (kobo).
export const SIMULATED_MENU = [
  {item: 'jollof rice', price_kobo: 150000, ingredient_costs_kobo: [80000, 25000, 15000]},  // ₦1,200: rice, tomato/pepper base, oil and seasoning
  {item: 'fried rice', price_kobo: 180000, ingredient_costs_kobo: [70000, 20000]},
  {item: 'amala and ewedu', price_kobo: 120000, ingredient_costs_kobo: [40000, 20000]},
  {item: 'pounded yam and egusi', price_kobo: 200000, ingredient_costs_kobo: [60000, 50000]},
];

// Simulated Paystack TEST-MODE receipts (as the webhook would store them), each with its expected-reference mapping.
export const SIMULATED_PAYMENTS = [
  {n: 1, time: '13:21', amount_kobo: 1440000, channel: 'bank_transfer'},
  {n: 2, time: '14:02', amount_kobo: 480000, channel: 'bank_transfer'},
  {n: 3, time: '15:33', amount_kobo: 450000, channel: 'bank_transfer'},
];

// Deterministic UUID (v4 layout) per seed day and row, so re-running a day is a no-op
// and seeding another day adds that day's rows.
export function entryId(day, n) {
  const h = createHash('sha256').update(`opada-simulated-entry:${day}:${n}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
// Same shape as src/paystack-checkout.js references; deterministic per day so re-runs don't duplicate.
export const paymentReference = (day, n) => 'opada_test_' + createHash('sha256').update(`opada-simulated:${day}:${n}`).digest('hex').slice(0, 24);

export function lagosToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
}

// Lagos wall-clock time on `day` -> timestamptz, computed by Postgres.
const AT_LAGOS = `(($1::date + $2::time) AT TIME ZONE 'Africa/Lagos')`;

export async function resetSimulatedRestaurant(db) {
  const found = await db.query('SELECT name FROM businesses WHERE id = $1', [SIMULATED_BUSINESS_ID]);
  if (!found.rows.length) return;
  // Hard stop: only ever delete the simulated business.
  if (!found.rows[0].name.startsWith('OPADA SYNTHETIC')) throw Error('Refusing to reset: business is not the simulated restaurant');
  const id = [SIMULATED_BUSINESS_ID];
  await db.query('DELETE FROM action_audit WHERE business_id = $1', id);
  await db.query('DELETE FROM flags WHERE business_id = $1', id);
  await db.query('DELETE FROM menu_items WHERE business_id = $1', id);
  await db.query('DELETE FROM payments WHERE business_id = $1', id);
  await db.query('DELETE FROM paystack_expected_references WHERE business_id = $1', id);
  await db.query('DELETE FROM entries WHERE business_id = $1', id);
  await db.query('DELETE FROM staff_api_tokens WHERE staff_id IN (SELECT id FROM staff WHERE business_id = $1)', id);
  await db.query('DELETE FROM staff WHERE business_id = $1', id);
  await db.query('DELETE FROM businesses WHERE id = $1', id);
}

// Returns freshly issued bearer tokens { [role/name]: token }. The caller decides where they go; never log them.
export async function seedSimulatedRestaurant(db, {day = lagosToday(), tokenTtlHours = 72, reset = false} = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('day must be YYYY-MM-DD');
  await db.exec('BEGIN');
  try {
    if (reset) await resetSimulatedRestaurant(db);
    await db.query(`INSERT INTO businesses (id, name, timezone) VALUES ($1, $2, 'Africa/Lagos')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, [SIMULATED_BUSINESS_ID, SIMULATED_BUSINESS_NAME]);
    for (const s of SIMULATED_STAFF) {
      await db.query(`INSERT INTO staff (id, business_id, role, display_name, active) VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (id) DO NOTHING`, [s.id, SIMULATED_BUSINESS_ID, s.role, s.display_name]);
    }
    for (const m of SIMULATED_MENU) {
      await db.query(`INSERT INTO menu_items (business_id, item, price_kobo, ingredient_costs_kobo) VALUES ($1, $2, $3, $4::bigint[])
        ON CONFLICT (business_id, (lower(item))) DO NOTHING`, [SIMULATED_BUSINESS_ID, m.item, m.price_kobo, m.ingredient_costs_kobo]);
    }
    for (const e of SIMULATED_ENTRIES) {
      await db.query(`INSERT INTO entries (id, business_id, type, item, quantity, unit, unit_price_kobo, amount_kobo,
          payment_method, payment_split, recorded_by, raw_text, source, needs_review, created_at)
        VALUES ($3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, 'text', $15, ${AT_LAGOS})
        ON CONFLICT (id) DO NOTHING`,
        [day, e.time, entryId(day, e.n), SIMULATED_BUSINESS_ID, e.type, e.item, e.quantity, e.unit,
          e.unit_price_kobo, e.amount_kobo, e.payment_method, e.payment_split && JSON.stringify(e.payment_split), e.by, e.raw_text, e.needs_review]);
    }
    for (const p of SIMULATED_PAYMENTS) {
      const reference = paymentReference(day, p.n);
      await db.query(`INSERT INTO paystack_expected_references (reference, business_id, expected_amount_kobo, currency)
        VALUES ($1, $2, $3, 'NGN') ON CONFLICT (reference) DO NOTHING`, [reference, SIMULATED_BUSINESS_ID, p.amount_kobo]);
      await db.query(`INSERT INTO payments (business_id, paystack_reference, amount_kobo, channel, paid_at)
        VALUES ($3, $4, $5, $6, ${AT_LAGOS}) ON CONFLICT (paystack_reference) DO NOTHING`,
        [day, p.time, SIMULATED_BUSINESS_ID, reference, p.amount_kobo, p.channel]);
    }
    // Rotate: revoke earlier seed tokens, then issue one per staff member.
    await db.query(`UPDATE staff_api_tokens SET revoked_at = now()
      WHERE revoked_at IS NULL AND staff_id IN (SELECT id FROM staff WHERE business_id = $1)`, [SIMULATED_BUSINESS_ID]);
    const tokens = {};
    for (const s of SIMULATED_STAFF) {
      const token = randomBytes(32).toString('base64url');  // 43 chars, matches src/token-auth.js
      await db.query(`INSERT INTO staff_api_tokens (staff_id, token_hash, expires_at)
        VALUES ($1, $2, now() + make_interval(hours => $3))`, [s.id, createHash('sha256').update(token).digest('hex'), tokenTtlHours]);
      tokens[s.display_name] = token;
    }
    await db.exec('COMMIT');
    // Flags come from the rules over the stored data, never from the seed itself.
    const checks = await runChecks(async (t, p) => (await db.query(t, p)).rows, SIMULATED_BUSINESS_ID, day);
    return {day, businessId: SIMULATED_BUSINESS_ID, tokens, checks};
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}
