# Gemini extraction for Stack-Mind / Opada
- Uses Google Gemini directly. BimpeAI is not required for first text extraction milestone.
- API key must be created by the project owner in Google AI Studio and set as an **encrypted** Vercel environment variable `GEMINI_API_KEY`.
- The endpoint `POST /api/gemini/extract` requires an authenticated staff bearer token linked to an active Neon staff account.
- This phase supports **text input only**. Voice needs a separate tested endpoint.
- Gemini responses are treated as untrusted and validated. Missing prices and payment totals remain `null`, requiring review. Extraction is never persisted automatically or used for final financial arithmetic.
- Test with synthetic English, Nigerian Pidgin and Yoruba messages before attempting real records.
- No Google Cloud promotional credits have been confirmed; select a free-tier-eligible model and verify quota in the owner account before enabling.
