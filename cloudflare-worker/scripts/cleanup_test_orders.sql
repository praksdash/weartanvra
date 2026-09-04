-- WEAR TANVRA — DELETE TEST ORDERS ONLY
-- Manual operational cleanup. This is NOT a migration.
-- Run only after reviewing cleanup_test_orders_preview.sql.
--
-- R2 NOTE:
-- D1 SQL cannot delete private R2 files.
-- If preview printed TEST return-evidence object keys, delete those exact
-- objects from weartanvra-return-evidence before running this script.

BEGIN TRANSACTION;

DELETE FROM return_evidence
WHERE return_id IN (
  SELECT rr.id
  FROM return_requests rr
  JOIN orders o ON o.id=rr.order_id
  WHERE o.environment='TEST'
);

DELETE FROM return_requests
WHERE order_id IN (
  SELECT id FROM orders WHERE environment='TEST'
);

DELETE FROM order_events
WHERE order_id IN (
  SELECT id FROM orders WHERE environment='TEST'
);

DELETE FROM orders
WHERE environment='TEST';

COMMIT;

SELECT COUNT(*) AS remaining_test_orders
FROM orders
WHERE environment='TEST';

SELECT COUNT(*) AS live_orders_preserved
FROM orders
WHERE environment='LIVE';
