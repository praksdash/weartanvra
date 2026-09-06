# TANVRA v19.4 — EDGE 01 mobile/section fix

Fixed from the supplied screenshots:

1. `edge-01.html` is no longer a second fragile product implementation.
   It redirects to the canonical standard TANVRA product page:
   `product.html?id=oversized-edge-01`

2. Homepage EDGE 01 media is loaded from `window.TANVRA_PRODUCTS`, the same
   source used by the standard product page. No hard-coded cover filename.

3. If the image cannot load, the media panel disappears instead of leaving a
   huge blank/broken rectangle.

4. Standard product page switches to a one-column product layout on compact
   screens instead of squeezing the gallery and purchase information side by side.

5. Gallery, title, price and CTA sizes are improved for mobile.

6. Cache version bumped to v19.4.

No pricing, checkout, cart, account, Razorpay, D1, invoice, return/refund,
or server-side security logic changed.
