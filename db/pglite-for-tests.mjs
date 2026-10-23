// Test-only: one in-memory Postgres (PGlite) per test file, wiped between tests.
// A new PGlite per test compiles a fresh WebAssembly module each time; across parallel test
// processes that exhausts memory ("Commit wasm code space ... out of memory"). Reusing one
// instance and dropping the schema gives every test a clean database at a fraction of the cost.
import {after} from 'node:test';
import {PGlite} from '@electric-sql/pglite';

let shared = null;
after(async () => { await shared?.close(); });

export async function newPglite() {
  if (!shared) shared = new PGlite();
  else await shared.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  return shared;
}
