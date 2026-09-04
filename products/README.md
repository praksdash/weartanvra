# Add products without editing website code

One folder = one product.

Oversized: `products/oversized/<product-slug>/`
Regular: `products/regular/<product-slug>/`

Put JPG/JPEG/PNG/WEBP images directly inside that product folder. On every push to `main`, GitHub Actions runs `scripts/build_products.py` and republishes the catalogue.

Optional `product.json` controls name, price, fit, description, colours, sorting and whether a product is published. Set `"published": false` to hide a folder.

Subfolders such as `print-ready/` are ignored by the website builder, so you can safely keep original 300-DPI transparent artwork there.
