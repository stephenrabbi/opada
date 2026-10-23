-- 0003_gemini_usage.sql
-- One row per Africa/Lagos day counting Gemini calls, so the daily cap holds across
-- all serverless instances. Incremented atomically by src/gemini-budget.js.
CREATE TABLE IF NOT EXISTS gemini_usage (
  day         date PRIMARY KEY,
  calls       integer NOT NULL DEFAULT 0 CHECK (calls >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
