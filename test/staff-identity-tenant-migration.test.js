import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('identity migration does not globally restrict staff subjects across tenants',async()=>{
 const sql=await readFile(new URL('../db/migrations/0006_identity_sessions.sql',import.meta.url),'utf8');
 assert.doesNotMatch(sql,/CREATE\s+UNIQUE\s+INDEX[^;]*ON\s+staff\s*\(\s*auth_subject\s*\)/i);
 assert.match(sql,/CREATE\s+UNIQUE\s+INDEX[^;]*ON\s+staff\s*\(\s*id\s*,\s*business_id\s*\)/i);
 assert.match(sql,/FOREIGN\s+KEY\s*\(\s*staff_id\s*,\s*business_id\s*\)/i);
});
