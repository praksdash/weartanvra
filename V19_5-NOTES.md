# TANVRA v19.5

This version fixes the actual problems shown in the latest mobile screenshots:

- EDGE 01 images now use absolute raw GitHub URLs from the public repository.
- Homepage uses `001-cover.webp` as the EDGE 01 cover.
- Homepage cover falls back to the black model image if the cover cannot load.
- EDGE product gallery starts with the black model image, not the cover.
- Failed gallery thumbnails hide themselves rather than showing broken-image cards.
- Rojana section uses the mobile width intentionally.
- Shop is 2 columns on compact/tablet and 1 column on phones.
- Shop card CTA is VIEW PRODUCT instead of ADD TO BAG.
- `edge-01.html` redirects to the canonical standard product page.
- Cache bumped to v19.5.

No Razorpay, D1, cart math, checkout, account, invoice, return/refund or security code changed.
