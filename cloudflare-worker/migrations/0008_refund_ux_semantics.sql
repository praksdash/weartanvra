-- v17.1 refund semantics repair
-- Any already-processed refund smaller than the order total is a partial refund,
-- not a full refund.
UPDATE return_requests
SET status='PARTIALLY_REFUNDED',
    updated_at=datetime('now')
WHERE status='REFUNDED'
  AND refund_amount IS NOT NULL
  AND refund_amount > 0
  AND refund_amount < (
    SELECT o.total
    FROM orders o
    WHERE o.id=return_requests.order_id
  );
