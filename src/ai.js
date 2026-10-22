// The one place the app talks to an AI provider. Swap providers here; callers only see
// { provider, model, entries, notes, raw }. AI extracts; it never computes totals or decides anything.
import {extractWithGemini, DEFAULT_MODEL} from './gemini-extract.js';

export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

// Overloaded, rate-limited or slow: worth one retry on another model. Bad requests and bad keys are not.
export function isTransient(error) {
  return error?.status === 429 || error?.status >= 500 || error?.name === 'TimeoutError' || /timeout|aborted/i.test(error?.message ?? '');
}

// beforeRetry() runs before the fallback call so it can be counted against the daily cap (and may throw).
export async function extractRecords(text, {env = process.env, fetcher = fetch, beforeRetry = async () => {}, log = console} = {}) {
  const primary = env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  try {
    return {provider: 'gemini', ...(await extractWithGemini(text, env.GEMINI_API_KEY, fetcher, primary))};
  } catch (error) {
    if (!isTransient(error) || fallback === primary) throw error;
    log.warn(JSON.stringify({event: 'gemini_fallback', from: primary, to: fallback, error: error.message}));
    await beforeRetry();
    return {provider: 'gemini', ...(await extractWithGemini(text, env.GEMINI_API_KEY, fetcher, fallback))};
  }
}
