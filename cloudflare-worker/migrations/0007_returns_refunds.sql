CREATE TABLE IF NOT EXISTS return_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  preference TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_message TEXT,
  admin_note TEXT,
  requested_at TEXT NOT NULL,
  reviewed_at TEXT,
  updated_at TEXT NOT NULL,
  refund_amount INTEGER,
  razorpay_refund_id TEXT UNIQUE,
  refund_status TEXT,
  replacement_tracking TEXT
);
CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer ON return_requests(customer_email,requested_at);
CREATE INDEX IF NOT EXISTS idx_returns_status ON return_requests(status,requested_at);

CREATE TABLE IF NOT EXISTS return_evidence (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_return_evidence_return ON return_evidence(return_id,uploaded_at);
