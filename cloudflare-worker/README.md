# WEAR TANVRA Cloudflare Worker — v27

Backend for checkout, Razorpay, COD, D1 orders, customer accounts, invoices, returns/refunds, order tracking and verified product reviews.

## Install

```powershell
npm install
npx wrangler login
```

## Required secrets

Set privately in Cloudflare, never in Git:

```powershell
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put AUTH_SECRET
```

## Database

The existing D1 binding is `DB`.

Apply migrations:

```powershell
npx wrangler d1 migrations apply DB --remote
```

v27 adds migration `0010_product_reviews.sql`.

## Deploy

The predeploy script rebuilds product/catalogue data, so the repository must contain the real `products/` folder.

```powershell
npm run deploy
```

## Main public/customer endpoints

- `GET /api/health`
- `GET /api/reviews?product_id=...`
- `POST /api/track-order` — requires order ID + matching checkout email
- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `GET /api/account/orders`
- `POST /api/account/reviews` — authenticated + delivered order only
- checkout/payment/order endpoints already used by the storefront

## Verified reviews

A customer can review only when:

- they are signed in with the checkout email,
- the order belongs to that email,
- order status is `DELIVERED`,
- the reviewed product exists in that order,
- the same order/product has not already been reviewed.

Public review responses exclude customer email and order ID.

## Order tracking

Tracking lookup requires both the TANVRA order reference and the matching checkout email. It returns operational status only and does not expose address/payment details.

## Razorpay webhook

Use:

```text
https://weartanvra-payments.weartanvra.workers.dev/api/webhooks/razorpay
```

Keep webhook signature verification and server-side amount validation enabled.
