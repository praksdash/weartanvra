-- WEAR TANVRA — TEST DATA CLEANUP PREVIEW
-- READ-ONLY. This file does NOT delete anything.

SELECT COUNT(*) AS test_orders
FROM orders
WHERE environment='TEST';

SELECT COUNT(*) AS live_orders_preserved
FROM orders
WHERE environment='LIVE';

SELECT COUNT(*) AS test_order_events
FROM order_events
WHERE order_id IN (
  SELECT id FROM orders WHERE environment='TEST'
);

SELECT COUNT(*) AS test_return_requests
FROM return_requests
WHERE order_id IN (
  SELECT id FROM orders WHERE environment='TEST'
);

SELECT COUNT(*) AS test_return_evidence_rows
FROM return_evidence
WHERE return_id IN (
  SELECT id
  FROM return_requests
  WHERE order_id IN (
    SELECT id FROM orders WHERE environment='TEST'
  )
);

-- If rows appear below, these are private R2 objects belonging to TEST returns.
-- Delete those exact R2 objects before running the delete script.
SELECT
  re.object_key AS r2_object_key,
  re.file_name,
  re.size_bytes
FROM return_evidence re
WHERE re.return_id IN (
  SELECT rr.id
  FROM return_requests rr
  WHERE rr.order_id IN (
    SELECT id FROM orders WHERE environment='TEST'
  )
)
ORDER BY re.uploaded_at;
