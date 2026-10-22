# Local demo runbook (fallback if staging fails)

Use this if `https://opada-staging-okun15ola.vercel.app` isn't working. It runs the same code (**Option B**, the real loop) on Okunola's laptop against the same Neon database. Everything shown is **SIMULATED** data and Paystack **test mode**.

## The night before / 30 minutes before
1. Repo on the demo branch, dependencies installed:
   ```sh
   git checkout feat/owner-dashboard-loop && git pull
   npm ci
   ```
2. `.env.local` has `DATABASE_URL` and `GEMINI_API_KEY` (never show this file on screen).
3. Build once, so the demo runs the fast production server, not dev mode:
   ```sh
   npm run build
   ```
4. Close heavy apps (other dev servers, Docker, extra Chrome tabs). This laptop has 8 GB and gets slow under memory pressure.
5. Check the Neon database hasn't expired: `npx neon@latest claim status crimson-resonance-64310535` (expires **25 Oct 15:55 WAT** unless claimed).

## Start (2 minutes)
```sh
npm run db:seed -- --reset   # fresh simulated day for today; new tokens in .seed-tokens.local.json
npm start                    # http://localhost:3000
```
- The seed prints `Checks: 2 flag(s) written (transfer_paystack, margin_squeeze:jollof rice)`. If it doesn't, stop and re-run.
- Open two browser windows side by side: **Staff** `http://localhost:3000/staff` (cashier token) and **Owner** `http://localhost:3000/owner` (owner token). Copy tokens from `.seed-tokens.local.json` **before** screen sharing; never show the file.
- Owner: go to **Insights**. You should see two open alerts: *Transfers vs Paystack ₦3,500* and *Menu margin · jollof rice, Suggested price ₦1,850*. Press **Mark as checked** on the transfer alert so the demo starts clean.

## The 3 demo messages (type into Staff → Quick message → Send)
| # | Language | Message | What the owner sees within ~15 s |
|---|---|---|---|
| 1 | English | `Sold 2 plates of jollof rice at 1500 each, the customer paid by transfer` | Transfers vs Paystack re-opens: **₦6,500**, highlighted **New** |
| 2 | Pidgin | `3 plate fried rice don comot, 1800 each, dem transfer am` | Gap grows to **₦11,900** |
| 3 | Yoruba | `A ta abọ́ amala mẹ́ta, ẹgbẹ̀rún kan àti igba náírà kọ̀ọ̀kan, wọ́n fi transfer san` | Gap grows to **₦15,500**; the entry shows "unit not recognised" (abọ́ = bowl), an honest needs-review |

After each one, on the owner side:
1. Point at the **New** badge (no refresh pressed; the page refreshes itself every 5 s).
2. **View evidence**: who recorded it, when (WAT), their exact words, and the Paystack test payments it was compared with.
3. **Mark as checked**: the alert turns *Checked*; the next message re-opens it with the new amount.

Talking points: *AI only reads the message; code does every sum. The owner sees evidence, not accusations. Every number on screen came from code.*

## If Gemini fails during the demo
The staff screen says **"AI extraction is unavailable right now. Your message is saved for the owner to review."** That's the product working as designed (*never block the flow, nothing lost*). Then:
1. Say so: "Even when the AI provider is down, the message is saved and nothing is lost."
2. Wait 5 seconds and **send the same message again**: it's a new message, and the app already retries once on a fallback model.
3. If it fails twice, use the **manual form** below the quick message (Type: Sale, Item: jollof rice, Quantity: 2, Unit price: 1500, Payment: Transfer). The server checks the total, saves it, and the rules run the same way, so the alert updates just the same.
4. Last resort: play the backup video (`docs/engineering/demo-video/`, or the screen recording).

## Reset between rehearsals
```sh
npm run db:seed -- --reset
```
Tokens change on every reset: copy them again from `.seed-tokens.local.json`.

## Stop
`Ctrl+C` in the terminal. Lock both browser windows (**Lock** button) before ending the screen share.
