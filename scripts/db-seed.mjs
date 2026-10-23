// npm run db:seed [-- --day=YYYY-MM-DD] [-- --reset]
// Seeds the SIMULATED restaurant into DATABASE_URL (from .env.local).
// Bearer tokens are written to .seed-tokens.local.json (gitignored) and never printed.
import {writeFile} from 'node:fs/promises';
import {connect} from '../db/connect.mjs';
import {seedSimulatedRestaurant, SIMULATED_BUSINESS_NAME} from '../db/seed/simulated-restaurant.mjs';

if (process.env.VERCEL_ENV === 'production' || process.env.OPADA_ENV === 'production') {
  console.error('Refusing to seed simulated data into a production environment.');
  process.exit(1);
}
const arg = name => process.argv.find(a => a.startsWith(`--${name}`));
const day = arg('day')?.split('=')[1];
const reset = Boolean(arg('reset'));
const tokenTtlHours = Number(process.env.SEED_TOKEN_TTL_HOURS || 72);
const TOKENS_FILE = '.seed-tokens.local.json';

const db = await connect();
try {
  console.log(`Seeding "${SIMULATED_BUSINESS_NAME}" on host ${db.host}${reset ? ' (reset first)' : ''}`);
  const result = await seedSimulatedRestaurant(db, {day, reset, tokenTtlHours});
  await writeFile(TOKENS_FILE, JSON.stringify({
    note: 'SIMULATED restaurant test tokens. Do not commit or share.',
    day: result.day, expires_in_hours: tokenTtlHours, tokens: result.tokens,
  }, null, 2) + '\n', {mode: 0o600});
  console.log(`Seeded day ${result.day}. Fresh test tokens written to ${TOKENS_FILE} (earlier seed tokens revoked).`);
  const {written, skipped} = result.checks;
  console.log(`Checks: ${written.length} flag(s) written (${written.map(w => w.rule + (w.item ? `:${w.item}` : '')).join(', ') || 'none'}); skipped: ${skipped.map(s => s.rule + (s.item ? `:${s.item}` : '') + '=' + s.reason).join(', ')}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
