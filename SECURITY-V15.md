# WEAR TANVRA v15 — Security Hardened

This release keeps the v14 product/pricing flow and adds server-side protection around checkout, customer login, admin APIs and Razorpay webhooks.

## Added

- Strict origin validation for browser POST/admin requests.
- D1-backed rate limiting for checkout, COD, login-code, payment verification, order-status and admin endpoints.
- 32 KB JSON/body limit to reduce oversized-request abuse.
- Additional API security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Resource-Policy`.
- Payment verification now checks Razorpay `order_id`, signature, currency **and exact amount** against the D1 order total.
- Razorpay webhook accepts only the events used by this store and ignores unrelated events.
- Webhooks cannot downgrade a prepaid order from paid/fulfilment states back to `PAYMENT_FAILED`.
- Public order-status response no longer exposes the internal TEST/LIVE environment field.
- New D1 migration `0005_security_hardening.sql`.

## Before deploying v15

1. Keep all secrets in Cloudflare Worker Secrets. Never commit them to GitHub:
   - `ADMIN_TOKEN`
   - `AUTH_SECRET`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
2. Confirm `ALLOWED_ORIGINS` contains only your production domains.
3. This package is configured for `ORDER_ENVIRONMENT=LIVE`. The Worker will still block checkout if the configured Razorpay key is not a live key.

## Deploy

```powershell
cd cloudflare-worker
npm install
npm run db:remote
npm run deploy
```

Run the database migration **before** deploying the Worker because the rate limiter needs the new D1 table.

## Recommended account security

Enable 2FA on GitHub, Cloudflare, Razorpay and the email account that controls them. Review GitHub collaborators/deploy keys, Cloudflare API tokens, and Razorpay API keys periodically.

## Important

A public GitHub repository can expose your source code, but it does not give strangers permission to push to your repository. The critical boundary is account/write access and keeping all secrets outside the repo.

## GitHub Pages deployment hardening

The Pages workflow now builds a dedicated `dist/` directory instead of publishing the whole repository. It does **not** publish the Cloudflare Worker source, migrations, scripts, documentation, or print-ready artwork. The checkout step also disables persisted Git credentials.
