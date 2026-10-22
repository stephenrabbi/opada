import test from 'node:test';
import assert from 'node:assert/strict';
import {sessionCookie,newSessionSecret,sessionDigest} from '../src/session-policy.js';
import {resolveRequestSession,sessionSecretFromCookie} from '../src/session-request.js';

const staffA={staff_id:'staff-a',business_id:'business-a',role:'owner',display_name:'Synthetic Owner A'};
const staffB={staff_id:'staff-b',business_id:'business-b',role:'staff',display_name:'Synthetic Staff B'};
function request(cookie){return {headers:{get(name){return name==='cookie'?cookie:null}}}}
test('valid opaque cookie resolves only database-scoped business identity',async()=>{
 const secret=newSessionSecret(),cookie=sessionCookie(secret);
 let query='',params=[];
 const resolved=await resolveRequestSession({request:request(cookie),sql:async(parts,...values)=>{query=parts.join('?');params=values;return [staffA]}});
 assert.deepEqual(resolved,staffA);
 assert.match(query,/s\.business_id=ss\.business_id/);
 assert.match(query,/ss\.revoked_at IS NULL/);
 assert.match(query,/ss\.expires_at>/);
 assert.match(query,/s\.active=true/);
 assert.equal(params[0],sessionDigest(secret));
});
test('cookie parser rejects duplicate, malformed and oversized session cookies',()=>{
 const token=newSessionSecret(),pair=sessionCookie(token).split(';')[0];
 assert.equal(sessionSecretFromCookie(pair+'; '+pair),null);
 assert.equal(sessionSecretFromCookie('__Host-opada_session=invalid'),null);
 assert.equal(sessionSecretFromCookie('x='.padEnd(8200,'a')),null);
 assert.equal(sessionSecretFromCookie(pair),token);
});
test('missing, expired, revoked or ambiguous sessions fail closed',async()=>{
 const secret=newSessionSecret(),cookie=sessionCookie(secret);
 assert.equal(await resolveRequestSession({request:request(''),sql:async()=>{throw Error('must not query')}}),null);
 assert.equal(await resolveRequestSession({request:request(cookie),sql:async()=>[]}),null);
 assert.equal(await resolveRequestSession({request:request(cookie),sql:async()=>[staffA,staffB]}),null);
});
