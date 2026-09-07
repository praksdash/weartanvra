# TANVRA v19.8 — Single Pricing Source

## The only pricing file you edit

`pricing.json`

Do NOT edit prices inside individual product folders anymore.

Example:

```json
"oversized-edge-01": {
  "name": "EDGE 01",
  "price": 599
}
```

After changing a price, run:

```bash
python scripts/build_products.py
```

On Windows you can simply run:

`UPDATE-PRICES.bat`

The build automatically updates:

- `assets/generated-products.json`
- `assets/generated-products.js`
- `assets/generated-pricing.js`
- `cloudflare-worker/src/catalog.js`

The Worker catalogue remains server-side authoritative, so a customer cannot
change the browser price and successfully pay a fake amount.

## Current prices

- Core 220 Oversized Tee — ₹549
- Rojana Ek Ghanta — ₹749
- Ghost Compass — ₹699
- Not Fast Just Furious — ₹649
- Unleash The Beast — ₹649
- Wild Instinct — ₹649
- EDGE 01 — ₹599

Future pricing is already reserved in pricing.json:

- AFTER HOURS — ₹699
- LOST / FOUND — ₹699
- ODISHA 20°N — ₹699

These future products are not automatically published until their product
folders/data are created.

## Pricing presentation

The website now shows:

`LAUNCH PRICE`
`₹599`

It does not show crossed-out MRP, SAVE %, or permanent-sale presentation.

## Prepaid offer

`PREPAID50` remains active for ₹50 off prepaid orders and is also controlled
from `pricing.json`.
