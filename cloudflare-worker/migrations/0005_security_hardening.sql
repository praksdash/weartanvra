CREATE TABLE IF NOT EXISTS security_rate_limits (
  rate_key TEXT NOT NULL,
  bucket_start TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (rate_key, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_security_rate_limits_updated_at
  ON security_rate_limits(updated_at);
