# WEAR TANVRA — launch pricing rules

- Current oversized products: MRP ₹1,299, sale ₹899.
- Free customer shipping when merchandise subtotal is ₹799 or more.
- Prepaid coupon: PREPAID50 = ₹50 off.
- Free-shipping qualification is checked on merchandise subtotal before PREPAID50.
- Orders below ₹799 use the configured below-threshold shipping amount.
- Frontend and Cloudflare Worker both calculate the same rules, but the Worker is the source of truth for real checkout.
