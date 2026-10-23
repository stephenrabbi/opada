import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {beginVerifiedStaffSession} from '../src/login-flow.js';
import {findActiveStaffSession} from '../src/session-store.js';

test('two authenticated hospitality businesses can only retrieve their own entries',async()=>{
 const pg=await newPglite();
 await migrate({exec:s=>pg.exec(s),query:(s,p)=>pg.query(s,p)});
 const hotel='a0000000-0000-4000-8000-000000000011';
 const cafe='b0000000-0000-4000-8000-000000000022';
 const hotelStaff='c0000000-0000-4000-8000-000000000033';
 const cafeStaff='d0000000-0000-4000-8000-000000000044';
 await pg.query('INSERT INTO businesses(id,name) VALUES($1,$2),($3,$4)',[hotel,'OPADA SYNTHETIC HOTEL',cafe,'OPADA SYNTHETIC CAFE']);
 await pg.query("INSERT INTO staff(id,business_id,role,display_name,auth_subject) VALUES($1,$2,'owner','Hotel Owner','hotel-sub'),($3,$4,'owner','Cafe Owner','cafe-sub')",[hotelStaff,hotel,cafeStaff,cafe]);
 const sql=async(parts,...params)=>{
  const query=parts.reduce((s,p,i)=>s+p+(i<params.length?'$'+(i+1):''),'');
  return (await pg.query(query,params)).rows;
 };
 const verify=async token=>({subject:token,emailVerified:true,email:'synthetic@example.test'});
 const hotelSession=await beginVerifiedStaffSession({sql,identityToken:'hotel-sub',verify});
 const cafeSession=await beginVerifiedStaffSession({sql,identityToken:'cafe-sub',verify});
 assert.ok(hotelSession?.secret&&cafeSession?.secret);
 for(const [business,staff,item] of [[hotel,hotelStaff,'Hotel breakfast'],[cafe,cafeStaff,'Cafe coffee']]){
  await pg.query("INSERT INTO entries(business_id,type,item,quantity,unit,unit_price_kobo,amount_kobo,payment_method,payment_split,recorded_by,raw_text,source,needs_review) VALUES($1,'sale',$2,1,'piece',10000,10000,'cash',NULL,$3,'synthetic order','text',true)",[business,item,staff]);
 }
 for(const [secret,expectedBusiness,expectedItem,otherItem] of [[hotelSession.secret,hotel,'Hotel breakfast','Cafe coffee'],[cafeSession.secret,cafe,'Cafe coffee','Hotel breakfast']]){
  const actor=await findActiveStaffSession({sql,secret});
  assert.equal(actor.business_id,expectedBusiness);
  const rows=await pg.query('SELECT item FROM entries WHERE business_id=$1 ORDER BY created_at DESC',[actor.business_id]);
  assert.deepEqual(rows.rows.map(x=>x.item),[expectedItem]);
  assert.ok(!rows.rows.some(x=>x.item===otherItem));
 }
});
