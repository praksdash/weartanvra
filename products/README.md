# Product image folders

This folder is the easiest way to publish new products.

## Add an oversized product
Create a folder:

products/oversized/my-design-name/

Put all JPG / JPEG / PNG / WEBP images for that product inside it.

Example:

products/oversized/my-design-name/
  front.jpg
  back.jpg
  model-black.jpg
  model-green.jpg

You can stop there. The website builder will automatically create a product using defaults.

## Add a regular-fit product
Use:

products/regular/my-design-name/

## Optional product.json
Add `product.json` in the product folder when you want to control the name, price, description, fit or colors.

Example:

{
  "name": "My Design Oversized Tee",
  "price": 899,
  "compareAt": 1299,
  "badge": "DROP 01",
  "fit": "Oversized",
  "gsm": "220 GSM",
  "material": "100% Cotton",
  "description": "Short product description.",
  "sizes": ["S", "M", "L", "XL"]
}

## Publish
Commit/push the new folder to GitHub.

The included GitHub Actions workflow automatically:
1. scans these product folders,
2. builds `assets/generated-products.js`,
3. deploys the updated website to GitHub Pages.

You only need to configure GitHub Pages to use **GitHub Actions** once.
