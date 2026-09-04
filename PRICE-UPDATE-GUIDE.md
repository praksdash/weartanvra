# WEAR TANVRA — Manual Price Update Guide

You can change product prices without editing shop.html or checkout.html.

## 1. Open the product folder

Examples:

- Core 220:
  `products/oversized/core-220/product.json`

- Rojana Ek Ghanta:
  `products/oversized/rojana-ek-ghanta/product.json`

- Ghost Compass:
  `products/oversized/ghost-compass/product.json`

## 2. Edit only these values

```json
"price": 749,
"compareAt": 999
```

- `price` = current selling price
- `compareAt` = crossed-out MRP/reference price

Example:

```json
{
  "name": "Core 220 Oversized Tee",
  "price": 749,
  "compareAt": 999
}
```

## 3. Rebuild product catalogues

From the project root:

```powershell
python scripts/build_products.py
```

This rebuilds:

- `assets/generated-products.js` for the website
- `cloudflare-worker/src/catalog.js` for secure server-side pricing

Do not manually change only the browser catalogue, because the Cloudflare Worker recalculates order prices server-side.

## 4. Push website

```powershell
git add -A
git commit -m "Update product prices"
git push origin main
```

## 5. Deploy Worker

```powershell
cd cloudflare-worker
npm run deploy
```

That keeps:
website price = checkout price = Razorpay amount.
