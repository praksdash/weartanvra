ALTER TABLE orders ADD COLUMN invoice_number TEXT;
ALTER TABLE orders ADD COLUMN invoice_issued_at TEXT;
ALTER TABLE orders ADD COLUMN invoice_seller_json TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_number
  ON orders(invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_sequences (
  fiscal_year TEXT PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
