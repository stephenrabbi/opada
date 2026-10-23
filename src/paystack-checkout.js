import {randomBytes} from 'node:crypto';
export function checkoutReference(){return 'opada_test_'+randomBytes(12).toString('hex')}
export function validateTestCheckout(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid checkout request');
 if(Object.keys(input).sort().join(',')!=='amount_kobo,email')throw Error('Unexpected checkout fields');
 if(!Number.isSafeInteger(input.amount_kobo)||input.amount_kobo<10000||input.amount_kobo>10000000)throw Error('Invalid test amount');
 if(typeof input.email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||input.email.length>254)throw Error('Invalid test email');
 return {amount_kobo:input.amount_kobo,email:input.email.trim()};
}
export async function initializeTestPayment({amount_kobo,email,reference},secret,fetcher=fetch){
 if(typeof secret!=='string'||!secret.startsWith('sk_test_'))throw Error('Test secret required');
 if(!/^opada_test_[a-f0-9]{24}$/.test(reference))throw Error('Invalid reference');
 const response=await fetcher('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({email,amount:String(amount_kobo),reference,currency:'NGN'}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Paystack initialization failed');
 const data=await response.json();
 if(data?.status!==true||data.data?.reference!==reference||typeof data.data?.authorization_url!=='string'||!/^https:\/\/checkout\.paystack\.com\//.test(data.data.authorization_url))throw Error('Untrusted checkout response');
 return {reference,authorization_url:data.data.authorization_url};
}
