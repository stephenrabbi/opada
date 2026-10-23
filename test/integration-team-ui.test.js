import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const owner=readFileSync(new URL('../app/owner/page.jsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../app/api/team/route.js',import.meta.url),'utf8');
test('owner navigation exposes Team without discarding live alerts',()=>{
 assert.match(owner,/label:'Team'/);
 assert.match(owner,/label:"Team"/);
 assert.match(owner,/view==='team'/);
 assert.match(owner,/fetch\('\/api\/team'/);
 assert.match(owner,/FlagsPanel flags=/);
 assert.match(owner,/setInterval\(/);
});
test('team listing is read-only and business-scoped',()=>{
 assert.match(api,/authorizeStaff\(request,TEAM_READER_ROLES\)/);
 assert.match(api,/teamScope\(auth\)/);
 assert.match(api,/WHERE business_id=\$\{businessId\}/);
 assert.doesNotMatch(api,/export async function (POST|PATCH|DELETE|PUT)\(/);
 assert.doesNotMatch(api,/token_hash|auth_subject/);
});
