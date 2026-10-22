import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTestCheckout,checkoutReference,initializeTestPayment} from '../src/paystack-checkout.js';

const fixture={amount_kobo:10000,email:'test@example.com'};
test('validates integer-kobo checkout',()=>{
 assert.equal(validateTestCheckout(fixture).amount_kobo,10000);
});
test('rejects invalid amount and extra fields',()=>{
 assert.throws(()=>validateTestCheckout({...fixture,amount_kobo:100.5}));
 assert.throws(()=>validateTestCheckout({...fixture,role:'owner'}));
});
test('generates unique synthetic references',()=>{
 assert.notEqual(checkoutReference(),checkoutReference());
});
test('initializes test checkout using Paystack REST API',async()=>{
 const reference=checkoutReference();
 let sent;
 const fakeFetch=async(url,opts)=>{
  sent={url,opts};
  return {ok:true,json:async()=>({status:true,data:{reference,authorization_url:'https://checkout.paystack.com/example'}})};
 };
 const result=await initializeTestPayment({...fixture,reference},'sk_test_example_not_real',fakeFetch);
 assert.equal(sent.url,'https://api.paystack.co/transaction/initialize');
 assert.equal(JSON.parse(sent.opts.body).amount,'10000');
 assert.equal(result.reference,reference);
});
test('rejects non-Paystack checkout redirect',async()=>{
 const reference=checkoutReference();
 const fakeFetch=async()=>({ok:true,json:async()=>({status:true,data:{reference,authorization_url:'https://evil.example'}})});
 await assert.rejects(initializeTestPayment({...fixture,reference},'sk_test_example_not_real',fakeFetch));
});
test('rejects live secret key',async()=>{
 await assert.rejects(initializeTestPayment({...fixture,reference:checkoutReference()},'sk_live_example'));
});
