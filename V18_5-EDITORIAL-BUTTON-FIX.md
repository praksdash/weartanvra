# WEAR TANVRA v18.5 — Editorial CTA visibility fix

Problem:
- `.editorial-band` sets text to white.
- `.btn` uses a white background.
- Anchor text inherited white, making the CTA appear as an empty white rectangle.

Fixed:
- Homepage `DISCOVER THE DROP` button is now white with black text.
- About page `EXPLORE THE DROP` button is now white with black text.
- Added readable hover/focus state.

No navigation destination changed. Both buttons still intentionally open `shop.html`.
No pricing, Razorpay, D1, checkout, order, SEO, refund, invoice or security logic changed.
