# WEAR TANVRA order workflow

## What you receive

### COD
After checkout succeeds:
1. Order is stored in D1.
2. Status is `COD_CONFIRMATION_REQUIRED`.
3. Owner email is sent.
4. Order appears in `/admin.html`.

Before T-Adda:
- call/WhatsApp customer if required,
- confirm name/address/size,
- change status to `COD_CONFIRMED`,
- submit the order to T-Adda,
- change status to `SENT_TO_TADDA`.

### Prepaid
After Razorpay payment is verified/captured:
1. Order becomes `PAID`.
2. Owner email is sent.
3. Order appears in `/admin.html`.
4. Submit it to T-Adda.
5. Change status to `SENT_TO_TADDA`.

## Email contains
- Order ID
- payment/status
- customer name
- phone
- email
- full address
- products
- size/color/quantity
- product total
- prepaid discount
- shipping shown
- shipping included discount
- final payable

## Admin dashboard
`https://weartanvra.com/admin.html`

The dashboard requires your private Cloudflare `ADMIN_TOKEN`.
