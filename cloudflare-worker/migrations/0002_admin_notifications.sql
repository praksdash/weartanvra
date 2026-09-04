ALTER TABLE orders ADD COLUMN shipping_discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN owner_notified_at TEXT;
ALTER TABLE orders ADD COLUMN owner_notified_status TEXT;
ALTER TABLE orders ADD COLUMN admin_note TEXT;

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
