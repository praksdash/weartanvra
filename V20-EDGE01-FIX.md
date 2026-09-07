# TANVRA v20 — EDGE 01 card / hero fix

- EDGE 01 shop card explicitly uses `products/oversized/edge-01/001-cover.png`.
- EDGE 01 product hero explicitly uses the same known-good cover as its safe initial image.
- Gallery remains independent; working thumbnails can still replace the hero.
- Desktop product hero is capped at 680px / 68vh so price, size and CTA remain above the fold.
- Shop broken-image fallback collapses to TANVRA branding instead of an empty beige card.
- EDGE 01 price remains ₹599 and single-source `pricing.json` is unchanged.
- PREPAID50 remains ₹50 off prepaid.
