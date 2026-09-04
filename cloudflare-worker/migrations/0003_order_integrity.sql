ALTER TABLE orders ADD COLUMN environment TEXT NOT NULL DEFAULT 'TEST';

UPDATE orders
SET status='PENDING_PAYMENT',
    updated_at=datetime('now')
WHERE payment_method='Prepaid'
  AND status IN ('COD_CONFIRMATION_REQUIRED','COD_CONFIRMED');

UPDATE orders
SET status='COD_CONFIRMATION_REQUIRED',
    updated_at=datetime('now')
WHERE payment_method='Cash on Delivery'
  AND status='PENDING_PAYMENT';

CREATE INDEX IF NOT EXISTS idx_orders_environment ON orders(environment);
