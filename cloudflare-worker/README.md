# WEAR TANVRA secure payment backend

This Worker is required only when you are ready to accept real/test gateway payments.

## Architecture
GitHub Pages storefront → Cloudflare Worker → Razorpay → D1 order database.

The Worker recalculates every product price and shipping charge server-side. The browser is never trusted for the payable amount.

## Setup
1. `cd cloudflare-worker`
2. `npm install`
3. `npx wrangler login`
4. `npx wrangler d1 create weartanvra-orders`
5. Copy the returned database ID into `wrangler.jsonc`.
6. Run `npm run db:remote`
7. Add TEST secrets:
   - `npx wrangler secret put RAZORPAY_KEY_ID`
   - `npx wrangler secret put RAZORPAY_KEY_SECRET`
   - `npx wrangler secret put RAZORPAY_WEBHOOK_SECRET`
8. `npm run deploy`
9. In Razorpay TEST dashboard, configure webhook URL: `https://YOUR-WORKER/api/webhooks/razorpay` using the same webhook secret. Subscribe at least to `payment.captured`, `payment.failed`, and `order.paid`.
10. In website `assets/config.js`, set `checkoutMode:"razorpay"` and `paymentBackendUrl:"https://YOUR-WORKER"`.

## Important
Use TEST mode first. Do not fulfil prepaid orders unless the order status is PAID/captured. The success page checks the backend order status when available.
