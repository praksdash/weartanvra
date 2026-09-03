# WEAR TANVRA Website v4

This is the normal GitHub Pages storefront we are working on before returning to Shopify.

## What works now
- Responsive homepage
- DROP 01 shop page
- Dynamic product pages
- Size/color selection
- Local shopping bag/cart
- Quantity/remove controls
- Checkout/order-request form
- Size guide
- Shipping / damage / privacy / terms pages
- Mobile navigation
- GitHub Pages CNAME for `weartanvra.com`

## Public products included
1. Wild Instinct Oversized Tee
2. Ghost Compass Oversized Tee
3. Core 220 Oversized Tee

All use the 220 GSM oversized base.

## Why anime-character mockups are NOT in the public website
The supplied image pack also contains recognizable Naruto/Madara/Uchiha-related graphics. They were intentionally excluded from the public storefront unless WEAR TANVRA has documented commercial licensing/rights for them.

## Fastrr / Shiprocket Checkout
The front end is ready for a secure checkout session endpoint.

`assets/config.js`:
- `checkoutMode: "prelaunch"` = current safe/manual mode.
- Later set `checkoutMode: "fastrr"`.
- Set `fastrrSessionEndpoint` to a secure backend/Cloudflare Worker/Vercel Function that creates a Fastrr checkout session.

Do NOT place checkout API secrets directly in this GitHub repository.

## Publish
Push the CONTENTS of this folder to the root of your GitHub Pages repo:

```bash
git add -A
git commit -m "Update WEAR TANVRA storefront v4"
git push origin main
```

## Before taking paid orders
- Confirm final prices.
- Order/check the 220 GSM sample.
- Confirm current supplier stock.
- Finish Fastrr/payment onboarding.
- Run one prepaid test order and one COD test.
