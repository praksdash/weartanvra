# Go Live
Keep ORDER_ENVIRONMENT=TEST until Live Razorpay credentials are installed.

1. Apply migrations:
npm run db:remote

2. Add customer auth secret:
npx wrangler secret put AUTH_SECRET

3. Deploy/test v12:
npm run deploy

4. In Razorpay Dashboard switch to Live Mode and generate LIVE API keys.
Replace secrets:
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET

5. Configure the LIVE webhook:
https://weartanvra-payments.weartanvra.workers.dev/api/webhooks/razorpay
Events: payment.captured, payment.failed, order.paid
Then:
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET

6. Change wrangler.jsonc:
"ORDER_ENVIRONMENT": "LIVE"

7. Deploy:
npm run deploy

8. Verify:
https://weartanvra-payments.weartanvra.workers.dev/api/health

Before accepting real prepaid orders it must report BOTH:
"order_environment":"LIVE"
"razorpay_mode":"LIVE"

The Worker rejects a TEST/LIVE mismatch.
