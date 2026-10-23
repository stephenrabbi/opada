import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('staging QA requires an exact opt-in and performs rollback',async()=>{
 const script=await readFile(new URL('../scripts/db-staging-rollback-qa.mjs',import.meta.url),'utf8');
 assert.match(script,/OPADA_STAGING_TEST_ALLOWED/);
 assert.match(script,/OPADA_STAGING_ENDPOINT_HOST/);
 assert.match(script,/client\.query\('BEGIN'\)/);
 assert.match(script,/ROLLBACK TO SAVEPOINT denied_session/);
 assert.match(script,/ROLLBACK TO SAVEPOINT denied_invite/);
 assert.match(script,/client\.query\('ROLLBACK'\)/);
 assert.doesNotMatch(script,/\bCOMMIT\b/);
});
