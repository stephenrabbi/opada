// The records behind a flag, for the owner's evidence view: who recorded what, when, in their own words,
// and the Paystack payments and menu costs the rule compared them with. Facts only, no verdicts.
// Every query is scoped to the caller's business, including each evidence id.
export async function loadFlagEvidence(run, businessId, flagId) {
  const [flag] = await run(`SELECT id, rule, day::text AS day, item, amount_gap_kobo, evidence_ids, suggested_action, details, status,
      checked_at, updated_at FROM flags WHERE id = $1 AND business_id = $2`, [flagId, businessId]);
  if (!flag) return null;
  const ids = flag.evidence_ids ?? [];
  const entries = await run(`SELECT e.id, e.type, e.item, e.quantity, e.unit, e.unit_price_kobo, e.amount_kobo, e.payment_method,
      e.payment_split, e.raw_text, e.source, e.needs_review, e.created_at, e.extraction->'review_reasons' AS review_reasons,
      s.display_name AS recorded_by, s.role AS recorded_by_role
    FROM entries e JOIN staff s ON s.id = e.recorded_by
    WHERE e.business_id = $1 AND e.id = ANY($2::uuid[]) ORDER BY e.created_at`, [businessId, ids]);
  const payments = await run(`SELECT id, paystack_reference, amount_kobo, channel, paid_at FROM payments
    WHERE business_id = $1 AND id = ANY($2::uuid[]) ORDER BY paid_at`, [businessId, ids]);
  const menu = await run(`SELECT id, item, price_kobo, ingredient_costs_kobo FROM menu_items
    WHERE business_id = $1 AND id = ANY($2::uuid[])`, [businessId, ids]);
  let checkedBy = null;
  if (flag.status === 'checked') {
    const [a] = await run(`SELECT s.display_name, a.created_at FROM action_audit a JOIN staff s ON s.id = a.actor_id
      WHERE a.flag_id = $1 AND a.business_id = $2 AND a.action = 'mark_checked' ORDER BY a.created_at DESC LIMIT 1`, [flagId, businessId]);
    checkedBy = a ?? null;
  }
  return {flag, entries, payments, menu, checked_by: checkedBy};
}
