# TANVRA v19.8 — EDGE 01 PNG/folder-only image handling

EDGE 01 now follows these rules:

- PNG only.
- Local website folder only.
- No raw GitHub image URLs.
- No `.webp` EDGE 01 references.
- The product builder uses every real image file present inside
  `products/oversized/edge-01/`.
- The declared PNG list in `product.json` is only a fallback for package
  generation when the image bytes are not physically present in the ZIP.
- Homepage cover: `products/oversized/edge-01/001-cover.png`.
- Standard product gallery is generated from the EDGE 01 folder.

No payment, Razorpay, checkout, D1, account, invoice, refund, cart-pricing or
security logic was changed.
