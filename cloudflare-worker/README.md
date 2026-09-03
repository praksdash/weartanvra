# WEAR TANVRA Payment Worker

This Worker keeps payment secrets away from the public GitHub Pages frontend.

## What it does
- Recalculates product prices server-side.
- Applies `PREPAID50` only to prepaid orders.
- Adds the configured launch-test shipping amount.
- Creates a Razorpay Order server-side.
- Verifies the Razorpay payment signature server-side.
- Creates a COD order reference without applying the ₹50 prepaid discount.

## 1. Install
```bash
npm install
```

## 2. Add Razorpay test secrets
Do NOT put secret keys in `wrangler.jsonc`.

```bash
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
```

Start with Razorpay TEST keys.

## 3. Deploy
```bash
npm run deploy
```

Wrangler will give you a Worker URL such as:

`https://weartanvra-payments.<account>.workers.dev`

## 4. Enable payment on the website
Edit `assets/config.js`:

```js
checkoutMode: "razorpay",
paymentBackendUrl: "https://YOUR-WORKER-URL.workers.dev",
```

Commit and push.

## 5. Test
Use Razorpay test mode first:
- add one product
- choose Prepaid
- verify ₹50 is deducted
- verify shipping is added
- complete a test payment
- confirm you reach `success.html`

Then test COD and verify no ₹50 discount is applied.

## Important before taking real orders
The included Worker validates and verifies payments, but it does not yet store a durable order record.
Before production launch, connect the verified order/COD route to a database, email provider, CRM, or other order system.

## Fastrr later
Fastrr supports prepaid-discount configuration in its own checkout settings. When your Fastrr/custom-platform onboarding is ready, keep `PREPAID50` as the customer offer and replace the Razorpay adapter rather than exposing Fastrr secrets in the browser.
