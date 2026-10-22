import test from 'node:test';
import assert from 'node:assert/strict';
import {teamScope,TEAM_READER_ROLES} from '../src/team-access.js';
const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
test('only owner and manager can read scoped team records',()=>{
  for(const role of TEAM_READER_ROLES)assert.equal(teamScope({staff:{role,business_id:first}}),first);
  for(const role of ['staff','auditor','admin','',null])assert.equal(teamScope({staff:{role,business_id:first}}),null);
});
test('team scope comes from authenticated identity, not caller restaurant',()=>{
  const auth={staff:{role:'owner',business_id:first}};
  const forgedRequest={searchParams:{business_id:second},body:{business_id:second}};
  assert.equal(teamScope(auth,forgedRequest),first);
  assert.notEqual(teamScope(auth,forgedRequest),second);
});
test('invalid and missing business scope fail closed',()=>{
  for(const id of [null,undefined,'','not-a-uuid',123])assert.equal(teamScope({staff:{role:'owner',business_id:id}}),null);
  assert.equal(teamScope(null),null);
  assert.equal(teamScope({}),null);
});
