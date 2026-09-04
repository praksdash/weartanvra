CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  coupon TEXT,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order ON orders(razorpay_order_id);
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL
);
