# WEAR TANVRA v18.1 — SEO implementation

Implemented:

1. Homepage H1 remains visually:
   `WEAR / YOUR EDGE.`

2. No hidden SEO keyword text is used.

3. Visible hero eyebrow:
   `TANVRA CLOTHING • PREMIUM STREETWEAR INDIA`

4. Homepage Organization JSON-LD:
   - TANVRA / WEAR TANVRA
   - weartanvra.com
   - official logo
   - India area served
   - Instagram @weartanvra

5. Homepage WebSite JSON-LD.

6. Homepage description, canonical and Open Graph metadata.

7. `sitemap.xml` now includes every live product in generated-products.json.

8. Dynamic product SEO:
   - unique browser title
   - unique meta description
   - unique canonical URL
   - Open Graph title/description/URL/image
   - Product JSON-LD with actual TANVRA product price, images, SKU, material and availability

9. Product schema uses the same generated product data the storefront uses, reducing price drift.

10. robots.txt declares the sitemap.

## Current dynamic product URLs

Query-string URLs are preserved to avoid breaking checkout/store routing.
A later version can migrate to clean product URLs such as `/products/core-220`
with redirects/canonicals.

## After deployment

Check:
- https://weartanvra.com/
- https://weartanvra.com/sitemap.xml
- at least two different product URLs and compare their browser tab titles
- Google Rich Results Test for a product URL
- Google Search Console sitemap submission

No payment, D1, refund, order, invoice or security logic was changed.
