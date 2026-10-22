// The one place the app talks to an AI provider. Swap providers here; callers only see
// { provider, model, entries, notes, raw }. AI extracts; it never computes totals or decides anything.
import {extractWithGemini, DEFAULT_MODEL} from './gemini-extract.js';

export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
// Time budget: 10 s primary + 1.5 s backoff + 10 s fallback = 21.5 s worst case, inside the
// message route's 40 s maxDuration with room for DB writes and checks. Paid-tier calls take ~4–6 s.
export const PRIMARY_TIMEOUT_MS = 10000;
export const RETRY_BACKOFF_MS = 1500;
export const FALLBACK_TIMEOUT_MS = 10000;

// Overloaded, rate-limited or slow: worth one retry on another model. Bad requests and bad keys are not.
export function isTransient(error) {
  return error?.status === 429 || error?.status >= 500 || error?.name === 'TimeoutError' || /timeout|aborted/i.test(error?.message ?? '');
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// beforeRetry() runs before the fallback call so it can be counted against the daily cap (and may throw).
export async function extractRecords(text, {env = process.env, fetcher = fetch, beforeRetry = async () => {}, log = console, sleep = wait} = {}) {
  const primary = env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  try {
    return {provider: 'gemini', ...(await extractWithGemini(text, env.GEMINI_API_KEY, fetcher, primary, PRIMARY_TIMEOUT_MS))};
  } catch (error) {
    if (!isTransient(error) || fallback === primary) throw error;
    log.warn(JSON.stringify({event: 'gemini_fallback', from: primary, to: fallback, backoff_ms: RETRY_BACKOFF_MS, error: error.message}));
    // A short pause gives an overloaded service a moment before the retry.
    await sleep(RETRY_BACKOFF_MS);
    await beforeRetry();
    return {provider: 'gemini', ...(await extractWithGemini(text, env.GEMINI_API_KEY, fetcher, fallback, FALLBACK_TIMEOUT_MS))};
  }
}
