const money=x=>Number.isSafeInteger(x)&&x>=0;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class TotalMismatchError extends Error{constructor(expectedKobo){super('Total does not equal quantity × unit price');this.expectedKobo=expectedKobo}}
// The server's own figure for a line total; the client's amount is only accepted if it matches.
export function lineTotalKobo(quantity,unitPriceKobo){const t=Math.round(quantity*unitPriceKobo);if(!Number.isSafeInteger(t))throw Error('Amount overflow');return t}
export function validateEntry(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Expected entry object');
 const keys=['type','item','quantity','unit','unit_price_kobo','amount_kobo','payment_method','payment_split','raw_text','idempotency_key'];
 if(typeof x.idempotency_key!=='string'||!uuid.test(x.idempotency_key))throw Error('Invalid idempotency key');
 if(Object.keys(x).some(k=>!keys.includes(k)))throw Error('Unexpected field');
 if(!['sale','expense','restock','stock_count'].includes(x.type))throw Error('Invalid type');
 if(typeof x.item!=='string'||!x.item.trim()||x.item.length>160)throw Error('Invalid item');
 if(!Number.isFinite(x.quantity)||x.quantity<0)throw Error('Invalid quantity');
 if(!['plate','piece','kg','litre','bag'].includes(x.unit))throw Error('Invalid unit');
 if(!Object.hasOwn(x,'unit_price_kobo')||!Object.hasOwn(x,'amount_kobo'))throw Error('Missing money fields');
 if((x.unit_price_kobo!==null&&!money(x.unit_price_kobo))||(x.amount_kobo!==null&&!money(x.amount_kobo)))throw Error('Invalid money');
 // No unit price (typical for stock counts): nothing to check against, so the stated amount (or null) stands.
 if(x.unit_price_kobo!==null){
  const expected=lineTotalKobo(x.quantity,x.unit_price_kobo);
  if(x.amount_kobo!==expected)throw new TotalMismatchError(expected);
 }
 if(!['cash','transfer','mixed','unknown'].includes(x.payment_method))throw Error('Invalid payment method');
 if(typeof x.raw_text!=='string'||!x.raw_text.trim()||x.raw_text.length>5000)throw Error('Invalid original message');
 if(x.type==='sale'&&x.quantity===0)throw Error('Sale requires quantity');
 if(x.payment_method==='mixed'){
 const p=x.payment_split;
 if(!p||Object.keys(p).sort().join(',')!=='cash_kobo,transfer_kobo'||!money(p.cash_kobo)||!money(p.transfer_kobo)||p.cash_kobo+p.transfer_kobo!==x.amount_kobo)throw Error('Invalid split');
 }else if(x.payment_split!==null)throw Error('Unexpected split');
 return {...x,item:x.item.trim(),idempotency_key:x.idempotency_key.toLowerCase()};
}