import test from 'node:test';
import assert from 'node:assert/strict';
import {newPglite} from '../db/pglite-for-tests.mjs';
import {migrate} from '../db/migrate.mjs';
import {inspectSchema} from '../scripts/db-preflight.mjs';

test('read-only preflight refuses to auto-baseline a populated legacy schema',async()=>{
 const pg=await newPglite();
 await pg.exec('CREATE TABLE businesses (id uuid PRIMARY KEY)');
 const report=await inspectSchema({query:(s,p)=>pg.query(s,p)});
 assert.equal(report.baselineRisk,true);
 assert.equal(report.readyForAutomaticMigration,false);
 assert.equal(report.migrationLedger,false);
 assert.ok(report.tablesFound.includes('businesses'));
});

test('preflight recognizes fully migrated synthetic schema',async()=>{
 const pg=await newPglite();
 const db={exec:s=>pg.exec(s),query:(s,p)=>pg.query(s,p)};
 await migrate(db);
 const report=await inspectSchema(db);
 assert.equal(report.readyForAutomaticMigration,true);
 assert.deepEqual(report.pending,[]);
 assert.deepEqual(report.modified,[]);
 assert.equal(report.migrationLedger,true);
});
