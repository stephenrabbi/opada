// Non-mutating release audit. Never applies migrations or prints credentials.
// Run against an isolated database first: npm run db:preflight
import {connect} from '../db/connect.mjs';
import {listMigrations} from '../db/migrate.mjs';

export async function inspectSchema(db){
  const expected=await listMigrations();
  const tables=['businesses','staff','entries','flags','payments','messages','staff_sessions','login_attempt_buckets','staff_invitations'];
  const found=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name = ANY($1::text[])",[tables])).rows.map(r=>r.table_name);
  const hasLedger=(await db.query("SELECT to_regclass('schema_migrations') AS table_name")).rows[0]?.table_name!=null;
  const applied=hasLedger?(await db.query('SELECT version,checksum FROM schema_migrations')).rows:[];
  const lookup=new Map(applied.map(r=>[r.version,r.checksum]));
  const pending=expected.filter(x=>!lookup.has(x.version)).map(x=>x.version);
  const modified=expected.filter(x=>lookup.has(x.version)&&lookup.get(x.version)!==x.checksum).map(x=>x.version);
  const unknown=applied.filter(x=>!expected.some(y=>y.version===x.version)).map(x=>x.version);
  // A nonempty database without our checksum ledger must not be automatically baselined.
  const baselineRisk=!hasLedger&&found.length>0;
  return {tablesFound:found.sort(),migrationLedger:hasLedger,applied:applied.length,pending,modified,unknown,baselineRisk,readyForAutomaticMigration:!baselineRisk&&modified.length===0&&unknown.length===0};
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const db=await connect();
 try {
  await db.exec('BEGIN READ ONLY');
  const report=await inspectSchema(db);
  console.log(JSON.stringify({databaseHost:db.host,...report},null,2));
  if(!report.readyForAutomaticMigration)process.exitCode=2;
 }finally{
  await db.exec('ROLLBACK').catch(()=>{});
  await db.end();
 }
}
