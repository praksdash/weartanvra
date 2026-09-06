# TANVRA v19.1 — Robust Mobile Header Fix

The screenshot showed the entire site remaining in desktop layout on the phone,
which means the effective CSS viewport was wider than the original 850px breakpoint.

Fix:
- Compact header now activates up to 1100px.
- Desktop SHOP / NEW DROP / ABOUT / SIZE GUIDE is forcibly hidden at compact widths.
- Hamburger is forcibly shown.
- TANVRA logo is centered and enlarged.
- BAG remains on the right.
- Drawer uses the same 1100px breakpoint.
- EDGE 01 preview becomes one-column at the same breakpoint.
- Trust strip becomes 2 columns.
- Footer becomes 2 columns, and 1 column below 600px.
- Drawer JS breakpoint updated to 1100px.

No pricing, cart, checkout, Razorpay, D1, account, order, refund, invoice,
SEO or product catalogue logic changed.
