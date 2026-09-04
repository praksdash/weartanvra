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
