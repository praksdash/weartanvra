# TANVRA v21.0 — Principal engineering hardening

High-risk production improvements:
- Server validates product, size, colour and quantity from generated catalogue data.
- `pricing.json` remains the price/coupon source; Worker catalogue is generated from it.
- Checkout/COD idempotency key reduces duplicate orders on retries/double submits.
- Public order status requires a per-order opaque token; order ID alone is insufficient.
- Razorpay webhook processing is retry-safe and validates INR amount before PAID.
- Unknown internal errors are not exposed to customers.
- Expired passwordless login records are opportunistically cleaned.
- Return-evidence CORS now allows `X-File-Name`.
- D1 migration 0009 adds checkout integrity columns and high-value composite indexes.
- Checkout errors render inline instead of browser alerts.
- Cart wording/presentation is normalized.

Deploy migration 0009 before Worker v21.0.
