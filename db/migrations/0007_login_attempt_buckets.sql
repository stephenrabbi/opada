-- Shared login attempt ceiling. Global safeguard, not a substitute for edge IP limits.
CREATE TABLE IF NOT EXISTS login_attempt_buckets (
  bucket_start timestamptz PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND 120)
);
