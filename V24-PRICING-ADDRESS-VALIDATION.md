# TANVRA v24 — Pricing synchronization + checkout validation

## Pricing
- `pricing.json` remains the only manually edited price file.
- Cloudflare Worker now fetches the published `pricing.json` at checkout time and validates product prices server-side.
- This prevents an older bundled Worker catalogue from silently using a previous product price.
- PREPAID50 is also read from `pricing.json` by the Worker.

## Checkout validation
- Full name, mobile, email, pincode, full address, city, and state are validated individually.
- Invalid fields turn red and show a precise inline error.
- The first invalid field receives focus on submit.
- Phone and pincode are normalized before being sent to the Worker.

## Important
Deploy this Worker once. After v24 is live, ordinary price changes still require publishing the updated `pricing.json`/frontend catalogue, but the Worker no longer depends on a separately generated price value for checkout.
