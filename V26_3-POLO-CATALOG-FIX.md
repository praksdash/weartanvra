# v26.3 — POLO catalog synchronization fix

Root cause: the v26 package contained generated product data but did not contain the underlying `products/...` source tree. This made catalog regeneration unreliable and left the Cloudflare Worker without `regular-core-polo` even though the storefront could display it.

Fixed:
- Restored the existing product source tree from the base repository itself.
- Added `products/regular/core-polo/` from the supplied POLO package.
- Added explicit product id `regular-core-polo`.
- Added `regular-core-polo` to `pricing.json` at ₹649.
- Rebuilt frontend generated product data.
- Rebuilt Cloudflare Worker catalog and variant allow-list.
- Preserved PREPAID50 at ₹50.

Required after installing this package: redeploy the Cloudflare Worker so the live backend receives the new catalog.
