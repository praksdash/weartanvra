# Fastrr Checkout Integration Plan

The website is intentionally prepared so checkout can be switched without rebuilding the storefront.

## Current
GitHub Pages is a static host. It is fine for catalog, cart and customer-facing UI, but public JavaScript must not contain merchant API secrets.

## Target
Browser -> `https://weartanvra.com/checkout.html`
-> secure serverless endpoint (Cloudflare Worker / Vercel Function)
-> Fastrr/Shiprocket Checkout APIs
-> returns a secure checkout URL/session
-> browser redirects customer to checkout

## Front-end contract already implemented
POST to the URL configured as `fastrrSessionEndpoint`.

JSON payload contains:
- customer details
- cart items
- size
- color
- quantity
- unit price
- subtotal
- source domain

The endpoint should return one of:
```json
{"checkout_url":"https://..."}
```
or
```json
{"url":"https://..."}
```

## Next information needed
When Fastrr approves/onboards the custom store, use their exact API documentation/credentials to implement the server-side endpoint.

Do not guess API paths or expose keys in `assets/config.js`.
