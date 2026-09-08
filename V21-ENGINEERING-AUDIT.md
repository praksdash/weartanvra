# TANVRA v21.0 — Principal Engineering Audit

## Executive assessment

The project has evolved beyond a static POD storefront: it already contains a real server-authoritative checkout, Razorpay verification/webhooks, D1 order history, passwordless customer accounts, admin operations, invoices, returns/refunds and R2 evidence. The correct strategy is incremental hardening, not a framework rewrite.

## Critical problems found and fixed

1. **Server did not validate colour against the actual product catalogue.** A client could submit a valid product/price with an impossible colour. v21 generates server-side size/colour data and validates both.
2. **Checkout had no idempotency key.** Network retries/double submits could create duplicate local/Razorpay or COD orders. v21 adds `checkout_request_id` with a unique D1 index and reuse behavior.
3. **Order status was readable with only the order ID.** v21 stores a hashed per-order opaque token and requires it for `/api/order-status`.
4. **Webhook events were recorded before successful processing.** A failure after insertion could make Razorpay retries look like duplicates forever. v21 tracks `processed_at`; an unprocessed event can be retried.
5. **Webhook PAID transitions trusted the event/order association without independently comparing amount/currency to D1 total.** v21 validates INR and exact paise amount before PAID.
6. **Return-evidence CORS omitted `X-File-Name`.** Cross-origin evidence uploads could fail preflight. Fixed.
7. **Unexpected Worker exceptions were returned directly to customers.** v21 exposes known validation errors but converts unknown internals to a generic 500.

## High-priority improvements implemented

- Composite D1 indexes for customer order history, environment/status admin filtering, order events, return lookup and Razorpay payment lookup.
- Opportunistic cleanup of expired login codes and customer sessions.
- Checkout errors are rendered inline instead of `alert()`.
- Checkout coupon code comes from generated configuration instead of hardcoded JS.
- Cart language normalized to CART and launch-price presentation.
- GitHub Pages deploy now runs release validation and JS syntax checks before publishing.

## Architecture preserved intentionally

- Static HTML/CSS/JS storefront on GitHub Pages.
- Cloudflare Worker as API/payment/security boundary.
- D1 for transactional/order/customer metadata.
- R2 only for return evidence.
- Razorpay remains the payment authority.
- `pricing.json` remains the single product-price source; generated Worker catalogue remains authoritative at checkout.

This is cost-efficient for the current catalogue/order volume and does not justify a React/Next/Shopify rewrite solely for architecture fashion.

## Remaining high-priority risks / external blockers

1. **EDGE 01 assets are referenced but not physically bundled in this ZIP.** They exist in the live repository according to the current workflow, but replacing the repository wholesale with this ZIP without preserving those files will break EDGE imagery.
2. **`INVOICE_SELLER_ADDRESS` is blank.** Invoice generation remains configuration-blocked until the real seller address is supplied; it was intentionally not invented.
3. **Customer bearer sessions live in browser localStorage.** This is workable for the current static-site/cross-origin Worker architecture but is not as strong as HttpOnly cookies. A future `api.weartanvra.com` custom domain would allow a cleaner first-party cookie session design.
4. **Admin authentication is a single shared bearer token.** It is acceptable for one owner at low scale, but not a scalable staff/RBAC model. Do not add employees to this admin until per-user admin auth/audit roles are implemented.
5. **No finite inventory reservation exists.** This is acceptable only while TANVRA remains made-to-order/POD. If stocked inventory is introduced, add SKU-level stock and atomic reservation before advertising limited inventory.

## Medium priority

- Product URLs remain query-string URLs (`product.html?id=...`). Generate clean crawlable product pages in a later SEO phase without breaking existing links.
- Admin search uses `LIKE` over JSON and will become inefficient at large order volume; normalize searchable name/phone columns before scale demands it.
- Customer order/admin lists are bounded by limits but not full cursor pagination. Add cursor pagination when volume justifies it.
- Several legacy CSS rules remain from iterative versions; safe consolidation should happen after mobile layout stabilizes, not during payment hardening.
- Product photography file sizes and aspect ratios remain inconsistent across older products. Standardize during the planned EDGE 01 visual transition rather than auto-cropping blindly.

## Low priority / polish

- Consolidate repeated header/footer HTML through a build-time partial system.
- Replace remaining static offer wording with generated UI tokens if prepaid offer values will change frequently.
- Improve skeleton/loading states on account/admin screens.

## Production readiness

**Code state after v21: staging-ready, conditionally production-ready for the existing made-to-order operating model after migration + live smoke tests.**

Do not call it fully production-ready until:
- migration 0009 is applied remotely,
- a ₹1/real live Razorpay smoke flow is verified under your allowed configuration,
- webhook capture is observed in D1,
- COD idempotency is tested,
- evidence upload is tested from the real domain,
- real invoice seller address is configured if customer invoices are enabled,
- EDGE 01 image files are confirmed present in the deployed repository.
