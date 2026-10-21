// The one place the app talks to an AI provider. Swap providers here; callers only see
// { provider, model, entries, notes, raw }. AI extracts; it never computes totals or decides anything.
import {extractWithGemini} from './gemini-extract.js';

export async function extractRecords(text, {env = process.env, fetcher = fetch} = {}) {
  const result = await extractWithGemini(text, env.GEMINI_API_KEY, fetcher);
  return {provider: 'gemini', ...result};
}
