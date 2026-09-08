# TANVRA CODE MAP — Homepage, Rojana, Products & Pricing

## Browser tab favicon
Tab icon files:
- `assets/favicon.png`
- `favicon.ico`

These contain only the TANVRA T symbol.

The full header logo remains:
- `assets/wear-tanvra-logo.webp`

Do not use the full logo as the favicon.

---

## Homepage
Main homepage file:
- `index.html`

Homepage visual styles:
- `assets/styles.css`

Homepage shared interactions/header:
- `assets/app.js`

### Homepage sections in order

1. HERO
   HTML class:
   `hero premium-hero`

   Content:
   - TANVRA CLOTHING • PREMIUM STREETWEAR INDIA
   - WEAR YOUR EDGE.
   - SHOP THE DROP
   - EXPLORE ESSENTIALS

2. SHOP BY STYLE
   HTML class:
   `home-style-section`

   Contains:
   - CORE 220
   - STATEMENT PIECES / Graphic Drop

3. OUR POINT OF VIEW
   HTML class:
   `home-pov-section`

   Contains:
   - BUILT DIFFERENT. WORN DAILY.
   - DISCOVER THE DROP

4. ROJANA EK GHANTA
   HTML class:
   `rojana-section`

   Exact homepage block:
   `index.html`

   Main image:
   `products/oversized/rojana-ek-ghanta/front-black-tee.webp`

   Product link:
   `product.html?id=oversized-rojana-ek-ghanta`

   Homepage copy:
   - THE ODISHA EDITION
   - ROJANA EK GHANTA.
   - ONE HOUR. EVERY DAY.
   - CONSISTENCY, WORN.
   - An Odisha-inspired edition celebrating discipline, movement and personal progress.
   - VIEW THE EDITION →

   Mobile styling classes:
   - `.rojana-section`
   - `.rojana-grid`
   - `.rojana-tile`

5. EDGE 01
   HTML class:
   `edge01-preview`

   Cover:
   `products/oversized/edge-01/001-cover.png`

   Product:
   `product.html?id=oversized-edge-01`

6. TRUST STRIP
   `premium-trust`

   Contains:
   - PREMIUM COTTON
   - MADE TO ORDER
   - SECURE PAYMENTS
   - INDIA-WIDE DELIVERY

---

## Product data

Individual product metadata lives under:

`products/oversized/<product-folder>/product.json`

This contains:
- name
- badge
- fit
- GSM
- material
- print type
- description
- sizes
- colors
- collection
- images

Prices should NOT be edited here.

---

## Pricing — single source of truth

Only edit:

`pricing.json`

Current prices:

- Core 220 Oversized Tee — ₹549
- Rojana Ek Ghanta — ₹749
- Ghost Compass — ₹699
- Not Fast Just Furious — ₹649
- Unleash The Beast — ₹649
- Wild Instinct — ₹649
- EDGE 01 — ₹599
- AFTER HOURS — ₹699
- LOST / FOUND — ₹699
- ODISHA 20°N — ₹699

Prepaid:
- PREPAID50
- ₹50 off prepaid orders

After changing `pricing.json`, run:

`python scripts/build_products.py`

or Windows:

`UPDATE-PRICES.bat`

This generates:
- `assets/generated-products.json`
- `assets/generated-products.js`
- `assets/generated-pricing.js`
- `cloudflare-worker/src/catalog.js`

---

## Shop page

HTML:
- `shop.html`

Rendering:
- `assets/shop.js`

Product cards show:
- image
- badge
- name
- product subtitle
- LAUNCH PRICE
- VIEW PRODUCT

---

## Product page

HTML shell:
- `product.html`

Rendering + variants:
- `assets/product.js`

It manages:
- gallery
- colors
- sizes
- launch price
- add to cart
- buy now
- PREPAID50 message
- product details
- fit & size
- delivery
- returns & care

---

## Cart

HTML:
- `cart.html`

Logic:
- `assets/cart.js`

Handles:
- cart items
- quantities
- REMOVE
- subtotal
- cart count

---

## Checkout

HTML:
- `checkout.html`

Logic:
- `assets/checkout.js`

Backend:
- `cloudflare-worker/src/index.js`

The Worker validates authoritative prices, variants, quantities, discounts and payable total.

---

## Header

HTML exists on each page.

Shared behavior:
- `assets/app.js`

Mobile:
- hamburger -> opens navigation
- TANVRA logo -> `index.html`
- CART -> `cart.html`
- cart count -> dynamic

Header/logo styling:
- `assets/styles.css`

---

## Main code ownership rule

Edit:
- homepage content -> `index.html`
- homepage/mobile design -> `assets/styles.css`
- product metadata -> product `product.json`
- all prices -> `pricing.json`
- shop behavior -> `assets/shop.js`
- product behavior -> `assets/product.js`
- cart -> `assets/cart.js`
- checkout -> `assets/checkout.js`
- backend/payment/orders -> `cloudflare-worker/src/index.js`
