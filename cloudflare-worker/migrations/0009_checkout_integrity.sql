-- v21 checkout/payment integrity hardening
ALTER TABLE orders ADD COLUMN checkout_request_id TEXT;
ALTER TABLE orders ADD COLUMN status_token_hash TEXT;

ALTER TABLE webhook_events ADD COLUMN processed_at TEXT;
ALTER TABLE webhook_events ADD COLUMN processing_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_request_id
  ON orders(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
  ON orders(customer_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_environment_status_created
  ON orders(environment, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id_id
  ON order_events(order_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_returns_order_status_requested
  ON return_requests(order_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received
  ON webhook_events(received_at);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment
  ON orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
