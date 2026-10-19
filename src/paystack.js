import {createHmac,timingSafeEqual} from 'node:crypto';
export function verifyPaystackSignature(rawBody,signature,secret){
 if(typeof rawBody!=='string'||typeof signature!=='string'||typeof secret!=='string'||!secret.startsWith('sk_test_')||!/^[a-f0-9]{128}$/i.test(signature))return false;
 const digest=createHmac('sha512',secret).update(rawBody,'utf8').digest('hex');
 return timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(signature,'hex'));
}
export function validPaystackEvent(event){
 const d=event?.data;
 return event?.event==='charge.success'&&d?.status==='success'&&d?.domain==='test'&&d?.currency==='NGN'&&typeof d.reference==='string'&&/^[A-Za-z0-9._-]{4,150}$/.test(d.reference)&&Number.isSafeInteger(d.amount)&&d.amount>0&&typeof d.paid_at==='string'&&!Number.isNaN(Date.parse(d.paid_at));
}
export async function verifyTestTransaction(reference,secret,fetcher=fetch){
 if(!secret?.startsWith('sk_test_'))throw Error('Test mode key required');
 const response=await fetcher('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Paystack verification failed');
 const body=await response.json(),d=body?.data;
 if(body?.status!==true||d?.status!=='success'||d?.domain!=='test'||d?.currency!=='NGN'||d?.reference!==reference||!Number.isSafeInteger(d?.amount)||d.amount<=0||typeof d?.paid_at!=='string')throw Error('Unverified transaction');
 return d;
}