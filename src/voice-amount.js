// Conservative amount extraction for demo voice reports. Ambiguous reports require manual review.
const ONES={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
const TENS={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
export function wordsToNaira(input){
 const words=input.toLowerCase().replace(/-/g,' ').trim().split(/\s+/).filter(x=>x!=='and');
 if(!words.length)return null;
 let value=0,group=0;
 for(const w of words){
  if(Object.hasOwn(ONES,w)) group+=ONES[w];
  else if(Object.hasOwn(TENS,w))group+=TENS[w];
  else if(w==='hundred'){if(group<1||group>9)return null;group*=100;}
  else if(w==='thousand'){if(group<1||group>999)return null;value+=group*1000;group=0;}
  else if(w==='million'){if(group<1||group>9||value!==0)return null;value+=group*1000000;group=0;}
  else return null;
 }
 const n=value+group;
 return Number.isSafeInteger(n)&&n>0&&n<=10000000?n:null;
}
export function parseNairaAmounts(text){
 const normalized=String(text).toLowerCase().replace(/,/g,'');
 const numeric=[...normalized.matchAll(/(?:₦\s*|\bngn\s*|\bnaira\s+)(\d+(?:\.\d{1,2})?)\b|\b(\d+(?:\.\d{1,2})?)\s+naira\b/g)].map(m=>Number(m[1]||m[2]));
 const spoken=[...normalized.matchAll(/\b((?:(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|and)[ -]+)+)naira\b/g)].map(m=>wordsToNaira(m[1]));
 return [...numeric,...spoken].filter(n=>Number.isSafeInteger(n)&&n>0&&n<=10000000);
}
