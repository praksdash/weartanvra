# Checkout plan

## Current implementation
This package now contains a working secure-payment architecture for Razorpay:

GitHub Pages storefront
→ Cloudflare Worker
→ Razorpay Orders API
→ Razorpay Checkout
→ Worker signature verification
→ success page

The frontend never stores the Razorpay secret.

## Prepaid offer
`PREPAID50` = ₹50 off prepaid orders.

The frontend displays it automatically and the Worker independently recalculates it.
COD receives no ₹50 discount.

## Fastrr / Shiprocket Checkout
Keep Fastrr as a later checkout option. Its current dashboard supports fixed/percentage prepaid discount rules. When WEAR TANVRA receives the required custom-platform integration details, the secure Worker can be adapted to create Fastrr checkout sessions.

Do not put Fastrr API credentials or shared secrets in GitHub Pages JavaScript.
