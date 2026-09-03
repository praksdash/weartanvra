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


## v5 payment upgrade
This version adds:
- `PREPAID50`: automatic ₹50 prepaid discount.
- COD remains full price.
- Prepaid/COD price switching in checkout.
- Razorpay Standard Checkout frontend.
- Secure Cloudflare Worker backend scaffold.
- Server-side price recalculation.
- Server-side Razorpay signature verification.
- COD order-reference endpoint.
- `success.html`.

See `cloudflare-worker/README.md` before enabling real payments.


## v6 — automatic product folders

You can now publish products by adding images to folders.

### Oversized
`products/oversized/<product-name>/`

### Regular
`products/regular/<product-name>/`

One subfolder = one product.
All images inside that subfolder become that product's image gallery.

You can optionally add `product.json` to control the name, price and details.
Without it, sensible defaults are used.

### Automatic publishing
The repository includes:

`.github/workflows/deploy-pages.yml`

On every push to `main`, GitHub Actions runs:

`python scripts/build_products.py`

and publishes the rebuilt site automatically.

For the first setup, set:
**GitHub repository → Settings → Pages → Source → GitHub Actions**
