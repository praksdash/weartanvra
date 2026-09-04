# WEAR TANVRA Website v7

This is the full GitHub Pages storefront plus a separate secure Cloudflare Worker payment backend.

## Included
- Rojana Ek Ghanta oversized product with front/back web previews.
- Original transparent front/back PNG artwork under `products/oversized/rojana-ek-ghanta/print-ready/`.
- Existing test/sample oversized products.
- Automatic product-folder publishing for oversized and regular tees.
- Shop search and fit filter.
- Product gallery, colour/size selection and cart.
- PREPAID50 automatic ₹50 discount.
- Current checkout shipping formula: prepaid ₹68; COD ₹98 or 2.3% of merchandise subtotal, whichever is higher.
- Secure Razorpay architecture with Cloudflare Worker + D1 persistent orders + webhook idempotency.
- GitHub Actions deployment.

## Publish the website
Replace your repository contents with this folder and push to `main`.

For first-time GitHub Pages setup: Repository → Settings → Pages → Source → GitHub Actions.

## Add a product
Create `products/oversized/my-product/` or `products/regular/my-product/`, copy images there and push. `product.json` is optional.

## Payment
The website intentionally ships in `prelaunch` mode. Follow `cloudflare-worker/README.md`, use Razorpay TEST mode, then change `assets/config.js` only after the Worker is deployed.


# v8 update — pricing, free shipping, stronger shopping flow

Customer-facing launch pricing for the current oversized catalogue is now:
- MRP: ₹1,299
- Sale price: ₹899
- Free shipping when merchandise subtotal is ₹799 or more
- PREPAID50: extra ₹50 off prepaid orders

Example single ₹899 tee:
- COD: ₹899 total, shipping FREE
- Prepaid: ₹849 total after PREPAID50, shipping FREE

## Product cards
Every shop card now has:
- Add to Bag
- Checkout

Checkout adds the default first size/color. Customers who want another size/color should open the product page and select it before adding/buying.

## Rojana Ek Ghanta
The website gallery now uses T-shirt mockups rather than showing only isolated/sticker artwork.
The original transparent print-ready PNG files remain under:

`products/oversized/rojana-ek-ghanta/print-ready/`

## Payment security
Pricing is recalculated on the Cloudflare Worker. The Worker imports a generated product price catalogue from:

`cloudflare-worker/src/catalog.js`

Run `python scripts/build_products.py` after product/pricing changes before deploying the Worker.

The website remains in `prelaunch` checkout mode until Razorpay TEST setup is complete.


## v9 — shipping included display

Checkout now keeps the advertised product total stable.

### Orders below ₹799
Example COD on a ₹749 product:

- Product total: ₹749
- Shipping: ~~₹98~~
- Shipping included: −₹98
- Final payable: ₹749

Example prepaid on a ₹749 product:

- Product total: ₹749
- PREPAID50: −₹50
- Shipping: ~~₹68~~
- Shipping included: −₹68
- Final payable: ₹699

### Orders ₹799+
Shipping is shown simply as `FREE`.

The same pricing rule is recalculated in the Cloudflare Worker so the browser and payment amount cannot disagree.


## v10 — owner notifications + order admin

New:
- owner email notification on new COD orders,
- owner email notification only after prepaid order becomes PAID,
- Resend integration from the Cloudflare Worker,
- duplicate owner-email prevention,
- secure `/admin.html` dashboard,
- private bearer-token admin API,
- order search/filter,
- detailed customer/address/item/payment view,
- operational status updates,
- COD confirmation workflow,
- T-Adda handoff status,
- order timeline/events,
- manual owner-email resend,
- no customer data exposed by the public order-status endpoint.

See:
- `ORDER-MANAGEMENT.md`
- `cloudflare-worker/README.md`


## v11 — order integrity

This release fixes the prepaid/COD status mixing seen in the admin dashboard.

New protections:
- prepaid orders cannot be assigned COD statuses,
- COD orders cannot be assigned prepaid payment statuses,
- old mismatched test orders are repaired by migration,
- TEST/LIVE environment is stored per order,
- dashboard filters: ALL / TEST / COD PENDING / PREPAID PENDING / PAID,
- payment-method-specific status dropdowns,
- red integrity warning if a mismatched legacy record somehow appears,
- live Worker URL is already configured in `assets/config.js`.


## v12
- Customer order emails
- Passwordless account login
- My Orders history
- Customer status emails
- Required checkout email
- Admin resend customer email
- TEST/LIVE Razorpay mismatch guard
- Live Worker URL retained


## v13 — pre-live storefront cleanup

- Removed the Rojana Ek Ghanta campaign from the homepage hero.
- Fixed the homepage broken image reference.
- Homepage now uses the existing Core 220 black tee image.
- Rojana Ek Ghanta remains available as a normal shop product.
- Keeps customer accounts, My Orders, admin dashboard, Razorpay backend and order emails from v12.
- ORDER_ENVIRONMENT remains TEST until the final live switch.


## v14 — manual pricing baseline

Current launch prices:
- Rojana Ek Ghanta Oversized Tee: ₹899 / compare-at ₹1,299
- Ghost Compass Oversized Tee: ₹899 / compare-at ₹1,299
- Core 220 Oversized Tee: ₹749 / compare-at ₹999

Future product pricing should be changed in each product's `product.json`, then rebuild with:

`python scripts/build_products.py`

See `PRICE-UPDATE-GUIDE.md`.

## v15 — Security Hardened

Adds D1 rate limiting, strict browser-origin checks, request size limits, security headers, exact Razorpay payment amount verification, safer webhook state handling, and migration `0005_security_hardening.sql`.

Read `SECURITY-V15.md` before deployment. Apply the D1 migration before deploying the Worker.

## v16 — Customer Invoice + PDF Download

v16 adds authenticated invoice issuance and PDF downloads for customers and admins. Apply `0006_customer_invoices.sql` before deploying. Seller address is intentionally blank and must be configured before new invoices can be issued. See `INVOICES-V16.md`.


## v17 — Returns & Refunds
Secure customer return requests, private R2 evidence uploads, admin review, replacement tracking, and Razorpay prepaid refunds. See `RETURNS-V17.md`.


## v17.1 — refund UX + partial/full semantics

Added:
- all admin popup success/error messages render inside the popup,
- smaller responsive/scrollable admin modal,
- TEST orders show `REFUND DISABLED — TEST ORDER`,
- Worker enforces LIVE-order + LIVE-backend for real refunds,
- partial refunds use `PARTIALLY_REFUNDED`,
- full refunds use `REFUNDED`,
- customer wording is `Partial Refund Processed` / `Refund Processed`,
- customer is told bank/UPI credit may take up to 5–7 business days,
- migration `0008_refund_ux_semantics.sql` repairs old partial refunds previously labelled as full refunds.

See `V17_1-REFUND-UX.md`.
