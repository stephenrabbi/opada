// Conservative deterministic extraction from synthetic speech transcripts.
// Only populate fields when explicitly recognized; never infer a payment split.
const numeral={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,twenty:20};
function numberOf(s){const n=Number(s.replace(/,/g,''));return Number.isSafeInteger(n)?n:numeral[s.toLowerCase()]}
export function extractReport(text){
 const raw=String(text||'').trim(),s=raw.toLowerCase().replace(/₦/g,' naira ');
 const result={fields:{},warnings:[]};
 if(!raw)return {...result,warnings:['Enter or dictate a report first.']};
 // Limited explicitly supported English/Pidgin-style patterns only.
 const qty=s.match(/\b(?:sold|sell|sale of)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty)\s+(?:plates?\s+of\s+|portions?\s+of\s+)?([a-z][a-z -]{1,55}?)(?=\s+(?:at|for|each|per|,|\.|$))/i);
 if(qty){const n=numberOf(qty[1]);if(n>0&&n<=10000)result.fields.quantity=String(n);const item=qty[2]?.trim();if(item&&item.length>=2)result.fields.item=item}
 const price=s.match(/\b(?:at|for|price(?:d)?\s+at)\s+(?:naira\s*)?(\d{1,3}(?:,\d{3})+|\d{2,7})\s*(?:naira)?\s*(?:each|per\s+(?:plate|portion|item))\b/i)
 ||s.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,7})\s+naira\s+(?:each|per\s+(?:plate|portion|item))\b/i);
 if(price){const amount=numberOf(price[1]);if(amount>0&&amount<=1000000)result.fields.price=String(amount)}
 const cash=/\b(?:cash|kudi)\b/i.test(s),transfer=/\b(?:transfer|bank transfer)\b/i.test(s);
 if(cash&&!transfer)result.fields.payment='cash';
 if(transfer&&!cash)result.fields.payment='transfer';
 if(cash&&transfer)result.warnings.push('Mixed cash and transfer payments detected. The existing form cannot represent a verified payment split; select Unknown and confirm details in the report.');
 if(!result.fields.quantity)result.warnings.push('Quantity not extracted; verify manually.');
 if(!result.fields.price)result.warnings.push('Unit price not extracted; verify manually.');
 if(!result.fields.item)result.warnings.push('Item not extracted; verify manually.');
 if(!result.fields.payment&&!cash&&!transfer)result.warnings.push('Payment method not extracted; verify manually.');
 result.warnings.push('Extraction is experimental and optimized for a limited set of English/Pidgin phrases. Yoruba, Igbo and Hausa need language-specific validation. Review all fields before saving.');
 return result;
}
