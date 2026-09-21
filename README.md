# WEAR TANVRA — v27

Production storefront built with static HTML/CSS/JavaScript plus Cloudflare Workers, D1, R2, Razorpay and Resend.

## Important: product images/folders are intentionally omitted from this ZIP

The uploaded base package did not include `products/` to keep the ZIP small. Before running any product rebuild or Worker deploy, merge this package into your existing repository **without deleting your existing `products/` folder**.

Expected structure:

```text
weartanvra/
├─ products/                    # keep your existing real product folders/images
├─ assets/
├─ scripts/
├─ cloudflare-worker/
├─ pricing.json
└─ *.html
```

`build_products.py` deliberately refuses to rebuild when `products/` is missing so it cannot accidentally overwrite the generated catalogue with an empty one.

## v27 product-page features

- Mobile-first product image carousel.
- Size and colour selection.
- Quantity +/- control.
- Add to Cart and secondary Buy Now flow.
- Sticky mobile purchase bar retained.
- Product-specific Size Guide modal with supplier Regular/Polo and Oversized/Relaxed Fit charts.
- Dynamic estimated delivery timeline using the current 1–3 business-day dispatch and 3–7 business-day delivery policy.
- Product Details, Returns & Damage, Shipping, Manufacturing & Quality and Track Order accordions.
- Dedicated `track-order.html` page.
- Secure tracking lookup using order ID + matching checkout email.
- Product-quality information cards.
- Verified-purchase reviews stored in D1.
- Review submission only from authenticated customer accounts after the order status is `DELIVERED`.
- Public reviews never expose order IDs or customer emails.
- Product schema can include aggregate review rating when reviews exist.
- Optional WhatsApp support button through `assets/config.js`.
- Optional countdown only when a real promotion deadline is configured; blank means hidden.
- Existing Meta Pixel hooks retained.

## Existing commerce features preserved

- Server-authoritative prices from `pricing.json`.
- PREPAID50.
- Free shipping from ₹499 merchandise subtotal.
- Razorpay prepaid checkout and COD.
- D1 orders and status history.
- Customer passwordless account / My Orders.
- Admin order operations.
- Customer invoices.
- Returns, R2 evidence and refunds.
- Order emails through Resend.
- Meta Pixel product funnel events.

## New D1 migration

v27 adds:

```text
cloudflare-worker/migrations/0010_product_reviews.sql
```

Apply migrations before deploying the v27 Worker:

```powershell
cd cloudflare-worker
npm install
npx wrangler d1 migrations apply DB --remote
npm run deploy
```

## Normal product / price update

Edit `pricing.json` and/or product metadata, then from the project root:

```powershell
python scripts/build_products.py
python scripts/validate_release.py
```

Commit the generated files together with your changes:

```text
assets/generated-products.json
assets/generated-products.js
assets/generated-pricing.js
cloudflare-worker/src/catalog.js
```

Because the Worker validates products and prices server-side, deploy it after catalogue/price changes:

```powershell
cd cloudflare-worker
npm run deploy
```

## Optional WhatsApp support

In `assets/config.js`, set the public support number with country code and digits only:

```js
whatsappNumber:"9198XXXXXXXX"
```

Leave it blank to hide the button.

## Optional real promotion countdown

In `assets/config.js`:

```js
promotion:{endsAt:"2026-10-01T23:59:59+05:30"}
```

Leave `endsAt` blank when there is no genuine deadline. The site does not run a fake resetting countdown.

## Secrets

Never commit actual values for:

- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `ADMIN_TOKEN`
- `RESEND_API_KEY`
- `AUTH_SECRET`

Use Cloudflare secrets with `npx wrangler secret put ...`.

## Before live deployment

1. Preserve/restore the real `products/` folder.
2. Run the product build and release validator.
3. Apply all pending D1 migrations including `0010_product_reviews.sql`.
4. Deploy the Worker.
5. Push the static site.
6. Test product page, Add to Cart, prepaid, COD, My Orders, Track Order and a delivered-order review flow.
