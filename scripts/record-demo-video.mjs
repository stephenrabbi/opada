// Records the backup demo video: staff message -> owner alert (auto-refresh) -> evidence -> Mark as checked.
// Usage (app running, simulated day freshly seeded):
//   npm run db:seed -- --reset && npm start      # in another terminal
//   node scripts/record-demo-video.mjs [base-url] # default http://localhost:3000
// Tokens come from .seed-tokens.local.json and are only typed into password fields (masked on screen).
// Writes demo-video/opada-demo-<time>.webm (gitignored). Aborts without a video if extraction fails.
import {chromium} from 'playwright';
import {readFileSync, mkdirSync, renameSync, rmSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

const BASE = process.argv[2] || 'http://localhost:3000';
const MESSAGE = process.env.DEMO_MESSAGE || 'Sold 2 plates of jollof rice at 1500 each, the customer paid by transfer';
const {tokens} = JSON.parse(readFileSync('.seed-tokens.local.json', 'utf8'));
const token = role => Object.entries(tokens).find(([name]) => name.includes(role))[1];
const pause = ms => new Promise(r => setTimeout(r, ms));

// Start from a clean state: the seeded transfer alert is already checked by the owner.
const api = (path, role, body) => fetch(BASE + path, {method: body ? 'POST' : 'GET', headers: {Authorization: 'Bearer ' + token(role), 'Content-Type': 'application/json'}, body: body && JSON.stringify(body)}).then(r => r.json());
const before = (await api('/api/flags', 'owner')).flags.find(f => f.rule === 'transfer_paystack');
if (before?.status === 'open') await api('/api/flags/check', 'owner', {flag_id: before.id});

mkdirSync('demo-video', {recursive: true});
const browser = await chromium.launch({headless: true, channel: process.env.PW_CHANNEL || undefined});
const context = await browser.newContext({viewport: {width: 1440, height: 900}, recordVideo: {dir: 'demo-video', size: {width: 1440, height: 900}}});
const page = await context.newPage();
// Same-origin wrapper: a blank page isn't a secure context, and the staff frame needs crypto.randomUUID().
await page.goto(BASE + '/api/health');
await page.setContent(`<!doctype html><html><head><title>Opada demo (simulated data)</title><style>
  body{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#0f2a2a;height:100vh;font-family:system-ui}
  section{display:grid;grid-template-rows:auto 1fr;min-height:0} h1{margin:0;padding:6px 12px;color:#fff;font-size:15px;letter-spacing:.04em}
  iframe{width:100%;height:100%;border:0;background:#fff}</style></head><body>
  <section><h1>STAFF PHONE · SIMULATED</h1><iframe name="staff" src="${BASE}/staff"></iframe></section>
  <section><h1>OWNER DASHBOARD · SIMULATED</h1><iframe name="owner" src="${BASE}/owner"></iframe></section></body></html>`);
const staff = page.frameLocator('iframe[name=staff]'), owner = page.frameLocator('iframe[name=owner]');
let ok = false;
try {
  // Sign both in (password fields are masked).
  await owner.locator('input[type="password"]').fill(token('owner'));
  await owner.getByRole('button', {name: 'View verified records'}).click();
  await owner.getByText('Live: refreshes every 5 s').waitFor();
  // The layout depends on pane width: sidebar, tabs, or a Sections menu that reveals the tabs.
  const side = owner.locator('.opada-side-nav').getByRole('button', {name: 'Insights'});
  const tab = owner.locator('.opada-tabs').getByRole('button', {name: 'Insights'});
  if (await side.isVisible()) await side.click();
  else { if (!(await tab.isVisible())) await owner.locator('.opada-mobile-switch button').click(); await tab.click(); }
  await owner.getByRole('heading', {name: 'Alerts'}).waitFor();
  await staff.locator('input[type="password"]').fill(token('cashier'));
  await staff.getByRole('button', {name: 'Continue'}).click();
  await pause(1500);
  // Staff sends a message in their own words.
  await staff.getByRole('textbox', {name: 'Quick message'}).pressSequentially(MESSAGE, {delay: 35});
  await pause(600);
  await staff.getByRole('button', {name: 'Send message'}).click();
  const saved = staff.getByText('Saved for owner review:');
  const failed = staff.getByText(/AI extraction is unavailable/);
  const shown = staff.locator('.opada-quick-message [role=status]');
  await shown.waitFor({timeout: 40000});
  await Promise.race([saved.waitFor({timeout: 5000}), failed.waitFor({timeout: 5000})]).catch(async () => { throw Error('Unexpected staff result: ' + (await shown.innerText())); });
  if (await failed.isVisible()) throw Error('Gemini extraction failed during the take; no video kept. Try again.');
  await pause(1500);
  // Owner: the alert arrives by itself (auto-refresh) and is highlighted.
  const alert = owner.getByRole('article', {name: 'Transfers vs Paystack alert'});
  await alert.getByText('New', {exact: true}).waitFor({timeout: 15000});
  await alert.scrollIntoViewIfNeeded();
  await pause(2500);
  await alert.getByRole('button', {name: 'View evidence'}).click();
  await alert.getByText('Staff records').waitFor();
  await pause(4000);
  await alert.getByRole('button', {name: 'Mark as checked'}).click();
  await alert.getByText('Checked', {exact: true}).waitFor();
  await pause(2500);
  ok = true;
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  const path = await video.path();
  if (ok) {
    const out = `demo-video/opada-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    renameSync(path, out);
    console.log('Saved', out);
  } else {
    rmSync(path, {force: true});
    console.log('Take failed; video discarded.');
  }
}
