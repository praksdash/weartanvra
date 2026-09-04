# WEAR TANVRA v17 — Returns & Refund Management

## Customer flow
- Eligible only after DELIVERED and within `RETURN_WINDOW_HOURS` (default 48).
- Allowed reasons: DAMAGED, TORN, DIRTY.
- Customer chooses refund or replacement and uploads 1–4 evidence files.
- Evidence is private in Cloudflare R2; it is never exposed as a public bucket URL.
- Customer sees friendly return status in My Orders and receives status emails.

## Admin flow
- Open an order in admin. The return request, evidence and controls appear in the order detail.
- Review -> Approve / Reject -> Refund or Replacement processing.
- Prepaid approved returns can use `REFUND VIA RAZORPAY`. A confirmation dialog is required.
- Refund status is recorded in D1. Enable Razorpay live webhook events `refund.processed` and `refund.failed` in addition to existing payment events.
- COD is not refunded through Razorpay. Use replacement/support resolution.

## Evidence storage
Create the R2 bucket before deploying v17:

```powershell
npx wrangler r2 bucket create weartanvra-return-evidence
```

The binding is already configured as `RETURN_EVIDENCE`.

## Database + deployment
```powershell
cd cloudflare-worker
npm install
npx wrangler r2 bucket create weartanvra-return-evidence
npm run db:remote
npm run deploy
```

Migration: `migrations/0007_returns_refunds.sql`.

## Safety
- Never issue refunds merely because a request was created. Admin approval is required.
- Razorpay refunds are server-side and require the existing live Razorpay secret.
- Evidence download requires customer authentication or the private admin token.
- Do not publish R2 evidence URLs.
