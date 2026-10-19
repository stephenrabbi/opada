# Opada

Evidence-first business reconciliation for Nigerian restaurants. The first milestone is a tested **deterministic rule engine**; it is not a complete financial product.

The engine checks stock versus recorded sales, staff transfers versus *verified* Paystack receipts, and menu ingredient margins. It uses integer **kobo** and explicitly skips rules whose evidence is missing.

## Local verification

```sh
npm run check
npm test
```

## Deployment

Existing Vercel demonstration: https://opada.vercel.app . It is maintained separately and is **not yet linked to this repository**. Do not enter real business data in the demo.

## Security

Do not commit Paystack, Gemini, or Neon secrets. The repository currently has no live ingest or payment functionality. Add authenticated users and business-scoped persistence before collecting real customer records.
