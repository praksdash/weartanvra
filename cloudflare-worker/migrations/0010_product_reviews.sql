-- v27 verified-purchase product reviews
CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED','HIDDEN')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_created
  ON product_reviews(product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_customer_created
  ON product_reviews(customer_email, created_at DESC);
