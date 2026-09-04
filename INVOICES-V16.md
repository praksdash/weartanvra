# WEAR TANVRA v16 — Customer Invoices

v16 adds secure customer/admin invoice issuance and PDF download while preserving the v15 hardened payment flow.

## What v16 does

- Creates an invoice only for a valid fulfilment-eligible order:
  - Prepaid: `PAID` or a later fulfilment state.
  - COD: `COD_CONFIRMED` or a later fulfilment state.
- Assigns one immutable invoice number per order using a fiscal-year sequence, for example `WT/2026-27/000001`.
- Stores `invoice_number`, `invoice_issued_at`, and a snapshot of seller details in D1.
- Customer: **My Orders → Download PDF**. The endpoint verifies the customer's account token and email ownership of the order.
- Admin: **View / Update → Download Invoice PDF**. The endpoint requires the admin bearer token.
- Invoice data is generated from D1 server-side values, not browser-supplied price data.
- Customer order emails show the invoice number and direct the customer to the secure My Orders page when an invoice exists.
- Existing paid/confirmed orders receive an invoice lazily when the customer/admin requests it after v16 is deployed.

## Required seller configuration

Before customer invoices are issued, fill these in `cloudflare-worker/wrangler.jsonc`:

```json
"INVOICE_SELLER_NAME": "WEAR TANVRA",
"INVOICE_SELLER_ADDRESS": "YOUR COMPLETE BUSINESS / INVOICE ADDRESS",
"INVOICE_SELLER_EMAIL": "weartanvra@gmail.com",
"INVOICE_GSTIN": "",
"INVOICE_HSN": ""
```

`INVOICE_SELLER_ADDRESS` is intentionally blank in this package because the project does not have a verified legal invoice address. The Worker will not issue a new invoice until seller name, address and email are configured. This does **not** block checkout or payment processing.

## GST safety

v16 labels the document **COMMERCIAL INVOICE**, not `TAX INVOICE`, and does not calculate or represent GST amounts. `INVOICE_GSTIN` and `INVOICE_HSN` are reserved seller/product fields only. Do not use v16 as a GST tax-invoice engine until your accountant confirms your GST registration, invoice format, HSN, place-of-supply and tax-breakup requirements and those calculations are implemented.

## Database migration

Run before deploying the Worker:

```powershell
cd cloudflare-worker
npm run db:remote
npm run deploy
```

Migration: `migrations/0006_customer_invoices.sql`.

## Test after deploy

1. Sign in to `https://weartanvra.com/account.html` using the email from a real paid order.
2. Confirm the order shows an invoice number.
3. Click **DOWNLOAD PDF**.
4. Confirm the PDF order ID, items, amount and customer address match the D1/admin order.
5. Open the same order in `admin.html` and verify **DOWNLOAD INVOICE PDF** works.

For an older paid order, use **RESEND CUSTOMER EMAIL** after the invoice has been issued if you want the customer to receive a fresh order email containing the invoice reference.
