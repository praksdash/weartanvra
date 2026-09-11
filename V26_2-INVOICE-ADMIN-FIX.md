# v26.2 Invoice admin error fix

Changed only the Cloudflare Worker admin invoice endpoint error handling.

If invoice seller details are incomplete, admin now receives an actionable 409 response instead of the generic 500 message.

Required before invoice generation:
- `INVOICE_SELLER_NAME`
- `INVOICE_SELLER_ADDRESS`
- `INVOICE_SELLER_EMAIL`

The package intentionally leaves `INVOICE_SELLER_ADDRESS` blank because the real legal/seller address must be provided by the store owner.
