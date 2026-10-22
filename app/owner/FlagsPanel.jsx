'use client';
import {useEffect, useRef, useState} from 'react';

const RULE_LABEL = {transfer_paystack: 'Transfers vs Paystack', margin_squeeze: 'Menu margin', stock_sales: 'Stock vs sales'};
const STATUS_PILL = {open: 'opada-pill-amber', checked: 'opada-pill-green', resolved: 'opada-pill-green'};
const STATUS_LABEL = {open: 'Open', checked: 'Checked', resolved: 'Resolved: no longer applies'};
const REVIEW_REASON = {total_mismatch: 'total corrected to quantity × price', amount_computed: 'total worked out from quantity × price', missing_price: 'no unit price', missing_quantity: 'no quantity', missing_amount: 'no amount', missing_unit: 'no unit', unit_unrecognised: 'unit not recognised', split_unknown: 'cash/transfer split not given', missing_payment_method: 'payment method not given'};
const lagosTime = value => new Date(value).toLocaleString('en-NG', {timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
const naira = value => { const n = Number(value); return Number.isSafeInteger(n) ? '₦' + (n / 100).toLocaleString('en-NG', {maximumFractionDigits: 2}) : 'not given'; };
const signature = f => `${f.status}|${f.amount_gap_kobo}|${f.updated_at}`;

function Evidence({data}) {
  if (data.error) return <p role="alert" style={{color: '#a12424'}}>{data.error}</p>;
  const {entries, payments, menu, checked_by} = data;
  return <div className="opada-evidence" style={{marginTop: 10, borderTop: '1px solid #e3e9f0', paddingTop: 10, display: 'grid', gap: 10}}>
    {entries.length > 0 && <div>
      <strong>Staff records ({entries.length})</strong>
      <ul style={{margin: '6px 0 0', paddingLeft: 18, display: 'grid', gap: 6}}>{entries.map(e => <li key={e.id}>
        <span>{lagosTime(e.created_at)} WAT · {e.recorded_by}</span><br/>
        <span>{e.type}: {e.quantity ?? '?'} {e.unit ?? ''} {e.item} · {naira(e.amount_kobo)} · {e.payment_method}{e.payment_split ? ` (cash ${naira(e.payment_split.cash_kobo)}, transfer ${naira(e.payment_split.transfer_kobo)})` : ''}</span><br/>
        <q style={{color: '#46566b'}}>{e.raw_text}</q>
        {e.review_reasons?.length > 0 && <small style={{display: 'block', color: '#7a5600'}}>Needs review: {e.review_reasons.map(r => REVIEW_REASON[r] || r).join(', ')}</small>}
      </li>)}</ul>
    </div>}
    {payments.length > 0 && <div>
      <strong>Paystack test-mode payments ({payments.length})</strong>
      <ul style={{margin: '6px 0 0', paddingLeft: 18}}>{payments.map(p => <li key={p.id}>{lagosTime(p.paid_at)} WAT · {naira(p.amount_kobo)} · {p.channel} · <code style={{fontSize: 12}}>{p.paystack_reference}</code></li>)}</ul>
    </div>}
    {menu.length > 0 && <div>
      <strong>Menu cost used</strong>
      <ul style={{margin: '6px 0 0', paddingLeft: 18}}>{menu.map(m => <li key={m.id}>{m.item}: price {naira(m.price_kobo)}, ingredients {m.ingredient_costs_kobo.map(naira).join(' + ')}</li>)}</ul>
    </div>}
    {checked_by && <small>Checked by {checked_by.display_name} at {lagosTime(checked_by.created_at)} WAT.</small>}
  </div>;
}

export default function FlagsPanel({flags, token, onChanged}) {
  const [fresh, setFresh] = useState(() => new Set());
  const [evidence, setEvidence] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [announce, setAnnounce] = useState('');
  const seen = useRef(null);

  // A flag that appears or changes after the first load (new evidence, re-opened) is highlighted.
  useEffect(() => {
    const now = new Map(flags.map(f => [f.id, signature(f)]));
    if (seen.current) {
      const changed = flags.filter(f => f.status === 'open' && seen.current.get(f.id) !== now.get(f.id));
      if (changed.length) {
        setFresh(prev => new Set([...prev, ...changed.map(f => f.id)]));
        setAnnounce(`New alert: ${changed.map(f => RULE_LABEL[f.rule] || f.rule).join(', ')}`);
        setEvidence(prev => { const next = {...prev}; for (const f of changed) delete next[f.id]; return next; });
      }
    }
    seen.current = now;
  }, [flags]);

  const headers = {Authorization: 'Bearer ' + token};
  async function toggleEvidence(id) {
    if (evidence[id]) { setEvidence(prev => { const next = {...prev}; delete next[id]; return next; }); return; }
    setEvidence(prev => ({...prev, [id]: {loading: true}}));
    try {
      const r = await fetch(`/api/flags/${id}/evidence`, {headers, cache: 'no-store'});
      const d = await r.json();
      setEvidence(prev => ({...prev, [id]: r.ok ? d : {error: d.error || 'Evidence unavailable'}}));
    } catch { setEvidence(prev => ({...prev, [id]: {error: 'Evidence unavailable'}})); }
  }
  async function markChecked(id) {
    setBusyId(id);
    try {
      const r = await fetch('/api/flags/check', {method: 'POST', headers: {...headers, 'Content-Type': 'application/json'}, body: JSON.stringify({flag_id: id})});
      if (!r.ok && r.status !== 404) throw Error();
      setFresh(prev => { const next = new Set(prev); next.delete(id); return next; });
      setAnnounce('Alert marked as checked.');
      await onChanged();
    } catch { setAnnounce('Could not mark as checked. Try again.'); } finally { setBusyId(null); }
  }

  const open = flags.filter(f => f.status === 'open').length;
  return <section className="opada-flags-panel" style={{background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #dce5ee', marginTop: 18}}>
    <div className="opada-section-heading"><div><span className="opada-overline">INTELLIGENCE</span><h2 style={{marginTop: 4}}>Alerts</h2></div><span className="opada-status-count">{open} open</span></div>
    <p style={{color: '#53657b'}}>Each alert is calculated by code from stored records and shows the evidence behind it. It is a prompt to check, not a finding against anyone.</p>
    <p aria-live="polite" className="opada-visually-hidden" style={{position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)'}}>{announce}</p>
    {!flags.length && <p>No alerts are stored for this restaurant.</p>}
    {flags.map(f => {
      const isFresh = fresh.has(f.id) && f.status === 'open';
      const ev = evidence[f.id];
      return <article key={f.id} className={'opada-flag' + (isFresh ? ' opada-flag-new' : '')} aria-label={`${RULE_LABEL[f.rule] || f.rule} alert`}
        style={{border: '1px solid ' + (isFresh ? '#d99a00' : '#dce5ee'), background: isFresh ? '#fff8e6' : '#fff', borderRadius: 12, padding: 14, marginTop: 10, transition: 'background .4s'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap'}}>
          <strong>{RULE_LABEL[f.rule] || f.rule}{f.item ? ` · ${f.item}` : ''}</strong>
          <span style={{display: 'flex', gap: 6, alignItems: 'center'}}>
            {isFresh && <span className="opada-pill opada-pill-amber" style={{fontWeight: 700}}>New</span>}
            <span className={'opada-pill ' + (STATUS_PILL[f.status] || '')}>{STATUS_LABEL[f.status] || f.status}</span>
          </span>
        </div>
        {f.amount_gap_kobo != null && <div style={{fontSize: 26, fontWeight: 700, margin: '6px 0'}}>{naira(f.amount_gap_kobo)}</div>}
        {f.rule === 'margin_squeeze' && f.details?.proposed_price_kobo && <div style={{fontSize: 18, fontWeight: 700, margin: '6px 0'}}>Suggested price: {naira(f.details.proposed_price_kobo)}</div>}
        <p style={{margin: '6px 0'}}>{f.suggested_action || 'Review the records behind this alert.'}</p>
        <small style={{color: '#65738b'}}>Day {f.day} · updated {lagosTime(f.updated_at || f.created_at)} WAT · {f.evidence_ids?.length || 0} evidence {f.evidence_ids?.length === 1 ? 'record' : 'records'}</small>
        <div style={{display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap'}}>
          {f.status === 'open' && <button type="button" onClick={() => markChecked(f.id)} disabled={busyId === f.id}
            style={{background: '#173967', color: '#fff', border: 0, borderRadius: 9, padding: '10px 14px', fontWeight: 700, minHeight: 44}}>{busyId === f.id ? 'Saving…' : 'Mark as checked'}</button>}
          <button type="button" onClick={() => toggleEvidence(f.id)} aria-expanded={Boolean(ev && !ev.loading)}
            style={{background: '#fff', color: '#173967', border: '1px solid #aebed2', borderRadius: 9, padding: '10px 14px', fontWeight: 700, minHeight: 44}}>{ev ? (ev.loading ? 'Loading…' : 'Hide evidence') : 'View evidence'}</button>
        </div>
        {ev && !ev.loading && <Evidence data={ev}/>}
      </article>;
    })}
  </section>;
}
