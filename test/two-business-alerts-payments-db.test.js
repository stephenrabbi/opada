import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {beginVerifiedStaffSession} from '../src/login-flow.js';
import {findActiveStaffSession} from '../src/session-store.js';

// Exercises the same business_id predicate used by /api/flags and /api/paystack/receipts.
// These are internal DB tests, not HTTP tests against a deployed preview.
test('separate hotel and cafe owners cannot read each other\'s alerts or payment receipts',async()=>{
 const pg=await newPglite();
 await migrate({exec:s=>pg.exec(s),query:(s,p)=>pg.query(s,p)});
 const hotel='a0000000-0000-4000-8000-000000000011';
 const cafe='b0000000-0000-4000-8000-000000000022';
 const hotelOwner='c0000000-0000-4000-8000-000000000033';
 const cafeOwner='d0000000-0000-4000-8000-000000000044';
 await pg.query('INSERT INTO businesses(id,name) VALUES($1,$2),($3,$4)',[hotel,'OPADA SYNTHETIC HOTEL',cafe,'OPADA SYNTHETIC CAFE']);
 await pg.query("INSERT INTO staff(id,business_id,role,display_name,auth_subject) VALUES($1,$2,'owner','Hotel Owner','hotel-sub'),($3,$4,'owner','Cafe Owner','cafe-sub')",[hotelOwner,hotel,cafeOwner,cafe]);
 await pg.query("INSERT INTO payments(business_id,paystack_reference,amount_kobo,channel,paid_at) VALUES($1,'synthetic_hotel_receipt',150000,'card',now()),($2,'synthetic_cafe_receipt',250000,'transfer',now())",[hotel,cafe]);
 await pg.query("INSERT INTO flags(business_id,rule,day,item,status) VALUES($1,'stock_sales','2026-10-22','hotel-alert','open'),($2,'stock_sales','2026-10-22','cafe-alert','open')",[hotel,cafe]);
 const sql=async(parts,...params)=>{
  const query=parts.reduce((s,p,i)=>s+p+(i<params.length?'$'+(i+1):''),'');
  return (await pg.query(query,params)).rows;
 };
 const verify=async token=>({subject:token,emailVerified:true,email:'synthetic@example.test'});
 const hotelSession=await beginVerifiedStaffSession({sql,identityToken:'hotel-sub',verify});
 const cafeSession=await beginVerifiedStaffSession({sql,identityToken:'cafe-sub',verify});
 for(const [secret,business,receipt,alert,otherReceipt,otherAlert] of [
  [hotelSession.secret,hotel,'synthetic_hotel_receipt','hotel-alert','synthetic_cafe_receipt','cafe-alert'],
  [cafeSession.secret,cafe,'synthetic_cafe_receipt','cafe-alert','synthetic_hotel_receipt','hotel-alert']
 ]){
  const actor=await findActiveStaffSession({sql,secret});
  assert.equal(actor.business_id,business);
  assert.equal(actor.role,'owner');
  const receipts=await pg.query('SELECT paystack_reference FROM payments WHERE business_id=$1',[actor.business_id]);
  const flags=await pg.query('SELECT item FROM flags WHERE business_id=$1',[actor.business_id]);
  assert.deepEqual(receipts.rows.map(r=>r.paystack_reference),[receipt]);
  assert.deepEqual(flags.rows.map(r=>r.item),[alert]);
  assert.ok(!receipts.rows.some(r=>r.paystack_reference===otherReceipt));
  assert.ok(!flags.rows.some(r=>r.item===otherAlert));
 }
});
