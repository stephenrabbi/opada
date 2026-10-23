import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveLoginAttempt,LOGIN_MAX_ATTEMPTS_PER_MINUTE} from '../src/login-rate-limit.js';

test('login limiter reserves a shared minute bucket and rejects exhausted budget',async()=>{
 const date=new Date('2026-10-22T21:42:33.123Z');
 const seen=[];
 const sql=async(strings,...args)=>{
  seen.push({statement:strings.join('?'),args});
  return seen.length===1?[{attempts:1}]:[];
 };
 assert.equal(await reserveLoginAttempt({sql,now:date}),true);
 assert.equal(await reserveLoginAttempt({sql,now:date}),false);
 assert.equal(seen[0].args[0],'2026-10-22T21:42:00.000Z');
 assert.equal(seen[0].args[1],LOGIN_MAX_ATTEMPTS_PER_MINUTE);
 assert.match(seen[0].statement,/ON CONFLICT\(bucket_start\) DO UPDATE/);
 assert.match(seen[0].statement,/WHERE login_attempt_buckets\.attempts</);
});
test('limiter fails closed for invalid dependencies and propagates DB errors',async()=>{
 assert.equal(await reserveLoginAttempt({}),false);
 assert.equal(await reserveLoginAttempt({sql:async()=>[],now:new Date('invalid')}),false);
 await assert.rejects(reserveLoginAttempt({sql:async()=>{throw Error('DB unavailable')}}),/DB unavailable/);
});
