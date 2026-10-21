// Daily Gemini call budget, counted in the database so it holds across serverless instances.
// `run(text, params)` must return result rows (neon: sql.query, PGlite: wrap .query().rows).
export const GEMINI_DAILY_CALL_CAP_MAX=200;
export function dailyCap(env=process.env){const n=Number(env.GEMINI_DAILY_CALL_CAP);return Number.isSafeInteger(n)&&n>0?Math.min(n,GEMINI_DAILY_CALL_CAP_MAX):GEMINI_DAILY_CALL_CAP_MAX}
export class GeminiCapReachedError extends Error{constructor(cap){super(`Daily AI extraction limit reached (${cap} calls). Type the entry instead; it will be saved for review. The limit resets at midnight Lagos time.`);this.cap=cap}}
const lagosDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Reserves one call before it is made (failed calls still count: they can still cost credits).
export async function reserveGeminiCall(run,{cap=dailyCap(),log=console}={}){
 const rows=await run(`INSERT INTO gemini_usage (day, calls) VALUES ((now() AT TIME ZONE 'Africa/Lagos')::date, 1)
  ON CONFLICT (day) DO UPDATE SET calls = gemini_usage.calls + 1, updated_at = now() WHERE gemini_usage.calls < $1
  RETURNING day::text AS day, calls`,[cap]);
 if(!rows.length){log.warn(JSON.stringify({event:'gemini_daily_cap_reached',day:lagosDay(),cap}));throw new GeminiCapReachedError(cap)}
 log.info(JSON.stringify({event:'gemini_call',day:rows[0].day,calls:rows[0].calls,cap}));
 return {day:rows[0].day,calls:rows[0].calls,cap};
}
