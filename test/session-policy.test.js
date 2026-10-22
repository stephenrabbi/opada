import test from 'node:test';
import assert from 'node:assert/strict';
import {newSessionSecret,sessionDigest,sessionDigestMatches,sessionCookie,expiredSessionCookie,sessionIsValid,SESSION_COOKIE_NAME} from '../src/session-policy.js';
test('session uses unpredictable secret and stores only digest',()=>{
 const a=newSessionSecret(),b=newSessionSecret();assert.notEqual(a,b);
 assert.match(sessionDigest(a),/^[0-9a-f]{64}$/);
 assert.equal(sessionDigestMatches(a,sessionDigest(a)),true);
 assert.equal(sessionDigestMatches(b,sessionDigest(a)),false);
});
test('cookies prohibit JavaScript access and cross-site transmission by default',()=>{
 const value=sessionCookie(newSessionSecret());
 assert.ok(value.startsWith(SESSION_COOKIE_NAME+'='));
 for(const item of ['HttpOnly','Secure','SameSite=Lax','Path=/','Max-Age=28800'])assert.ok(value.includes(item));
 assert.match(expiredSessionCookie(),/Max-Age=0/);
 assert.throws(()=>sessionCookie('invalid'));
 assert.throws(()=>sessionCookie(newSessionSecret(),{maxAge:999999}));
});
test('expired, revoked, inactive and wrong tenant records fail closed',()=>{
 const now=new Date('2026-10-22T14:00:00Z');
 const record={staff_id:'staff-1',business_id:'restaurant-1',staff_active:true,expires_at:'2026-10-22T15:00:00Z',revoked_at:null};
 const opts={now,staffId:'staff-1',businessId:'restaurant-1'};
 assert.equal(sessionIsValid(record,opts),true);
 for(const change of [{revoked_at:'2026-10-22T13:00:00Z'},{expires_at:'2026-10-22T14:00:00Z'},{staff_active:false},{business_id:'restaurant-2'},{staff_id:'staff-2'}]){
  assert.equal(sessionIsValid({...record,...change},opts),false);
 }
});
