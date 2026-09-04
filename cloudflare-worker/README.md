# WEAR TANVRA secure orders backend — v10

Architecture:

GitHub Pages storefront → Cloudflare Worker → Razorpay → Cloudflare D1

Owner notification:

Order created/paid → Worker → Resend → your owner email

Admin:

`https://weartanvra.com/admin.html` → Worker admin API → D1

## First-time setup

1. Open this folder:
   `cloudflare-worker`

2. Install:
```bash
npm install
```

3. Login:
```bash
npx wrangler login
```

4. Create D1:
```bash
npx wrangler d1 create weartanvra-orders
```

5. Put the returned database ID in `wrangler.jsonc`.

6. Apply all migrations:
```bash
npm run db:remote
```

7. Add Razorpay TEST secrets:
```bash
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```

8. Create a strong admin token (32+ random characters) and save it somewhere private:
```bash
npx wrangler secret put ADMIN_TOKEN
```

9. For order-email notifications, create/configure a Resend account and verify your sending domain.
Set these values in `wrangler.jsonc`:
- `OWNER_EMAIL`: email where YOU want new-order alerts.
- `FROM_EMAIL`: sender on your verified domain, for example `WEAR TANVRA <orders@weartanvra.com>`.

Then add the secret:
```bash
npx wrangler secret put RESEND_API_KEY
```

10. Deploy:
```bash
npm run deploy
```

11. Razorpay TEST webhook:
`https://YOUR-WORKER/api/webhooks/razorpay`

Subscribe to:
- `payment.captured`
- `payment.failed`
- `order.paid`

12. Website `assets/config.js`:
```js
checkoutMode:"razorpay",
paymentBackendUrl:"https://YOUR-WORKER-URL",
```

## Owner email behavior

- COD: owner email is sent after the COD order is successfully stored in D1.
- Prepaid: owner email is sent only when payment becomes `PAID`.
- Duplicate webhook/payment confirmations do not repeatedly email the same order/status.
- Notification failures do NOT break successful order creation/payment.

## Admin dashboard

Open:

`https://weartanvra.com/admin.html`

Enter the `ADMIN_TOKEN` you configured as the Worker secret.

The token is stored only in the current browser tab using sessionStorage.

You can:
- search orders,
- filter by status,
- view customer + address,
- view products/size/color/quantity,
- view payment/pricing,
- see whether owner email was sent,
- update operational status,
- add a note,
- resend owner notification email,
- view the order timeline.

Recommended operating statuses:

COD:
`COD_CONFIRMATION_REQUIRED`
→ `COD_CONFIRMED`
→ `SENT_TO_TADDA`
→ `PRINTING`
→ `DISPATCHED`
→ `DELIVERED`

Prepaid:
`PAID`
→ `SENT_TO_TADDA`
→ `PRINTING`
→ `DISPATCHED`
→ `DELIVERED`

Cancelled:
`CANCELLED`

## Security

Never place any of these in GitHub/browser JavaScript:
- Razorpay secret
- Razorpay webhook secret
- ADMIN_TOKEN
- RESEND_API_KEY

They must remain Cloudflare Worker secrets.
