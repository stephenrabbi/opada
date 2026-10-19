const money=x=>Number.isSafeInteger(x)&&x>=0;
export function validateEntry(x){
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Expected entry object');
 const keys=['type','item','quantity','unit','unit_price_kobo','amount_kobo','payment_method','payment_split','raw_text'];
 if(Object.keys(x).some(k=>!keys.includes(k)))throw Error('Unexpected field');
 if(!['sale','expense','restock','stock_count'].includes(x.type))throw Error('Invalid type');
 if(typeof x.item!=='string'||!x.item.trim()||x.item.length>160)throw Error('Invalid item');
 if(!Number.isFinite(x.quantity)||x.quantity<0)throw Error('Invalid quantity');
 if(!['plate','piece','kg','litre','bag'].includes(x.unit))throw Error('Invalid unit');
 if(!money(x.unit_price_kobo)||!money(x.amount_kobo))throw Error('Invalid money');
 if(!['cash','transfer','mixed','unknown'].includes(x.payment_method))throw Error('Invalid payment method');
 if(typeof x.raw_text!=='string'||!x.raw_text.trim()||x.raw_text.length>5000)throw Error('Invalid original message');
 if(x.type==='sale'&&x.quantity===0)throw Error('Sale requires quantity');
 if(x.payment_method==='mixed'){
 const p=x.payment_split;
 if(!p||Object.keys(p).sort().join(',')!=='cash_kobo,transfer_kobo'||!money(p.cash_kobo)||!money(p.transfer_kobo)||p.cash_kobo+p.transfer_kobo!==x.amount_kobo)throw Error('Invalid split');
 }else if(x.payment_split!==null)throw Error('Unexpected split');
 return {...x,item:x.item.trim()};
}