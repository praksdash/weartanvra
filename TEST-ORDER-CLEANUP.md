# WEAR TANVRA v17.2 — Safe TEST Order Cleanup

This cleanup is intentionally manual and is **not** in `migrations/`.

It deletes only orders where:

`environment = 'TEST'`

and directly linked D1 data:
- order events
- return requests
- return-evidence metadata
- TEST orders

It does **not** delete LIVE orders, invoice sequences, webhook history,
customer sessions/login codes, or security/rate-limit data.

## 1. Preview first

From `cloudflare-worker`:

```powershell
npx wrangler d1 execute DB --remote --file=./scripts/cleanup_test_orders_preview.sql
```

Check the TEST and LIVE counts.

## 2. Check private R2 evidence

If the preview prints any `r2_object_key` rows, remove only those exact TEST
objects from:

Cloudflare Dashboard → R2 → `weartanvra-return-evidence` → Objects

Do not delete the bucket and do not remove evidence belonging to LIVE orders.

If no object keys are printed, continue.

## 3. Delete TEST D1 records

```powershell
npx wrangler d1 execute DB --remote --file=./scripts/cleanup_test_orders.sql
```

Expected at the end:

`remaining_test_orders = 0`

The `live_orders_preserved` count should match the preview.

## 4. Refresh Admin

Open:

`https://weartanvra.com/admin.html`

Only LIVE orders should remain.

## Why this is not a migration

Deleting business/order history is an operational action, not a schema change.
Keeping it outside migrations prevents accidental deletion in another environment.
