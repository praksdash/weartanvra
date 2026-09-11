# TANVRA v23 — Pricing + mobile checkout fix

- `pricing.json` remains the only manually edited product-price source.
- PREPAID50 intentionally reduces Razorpay payable by ₹50.
- Checkout now labels the exact Razorpay payable amount before opening Razorpay.
- Frontend aborts payment if the Worker authoritative total differs from the locally displayed total.
- GitHub Pages workflow runs on `main` and `master`.
- Product build refuses to overwrite the catalogue if `products/` is missing.
- Mobile product/cart/checkout layouts were tightened for one-handed purchase flow.
- Product folder/images were intentionally absent from the uploaded review ZIP and are not recreated here. Restore/keep your existing `products/` folder in the repository.
