# WEAR TANVRA v17.1 — Refund UX & semantics

This patch is designed for the live refund flow validated with Razorpay.

## Admin modal changes

All messages generated while an order popup is open now appear inside that popup:

- API errors
- refund errors
- refund success
- invoice download result
- return status update
- owner/customer email resend result

The modal is smaller, scrollable and responsive.

## LIVE / TEST protection

A TEST order now shows:

`REFUND DISABLED — TEST ORDER`

The frontend does not expose the Razorpay refund button for TEST orders.

The Worker independently rejects refund requests unless:

1. the order itself is `LIVE`,
2. `ORDER_ENVIRONMENT=LIVE`,
3. the configured Razorpay key is a LIVE key,
4. the order is prepaid,
5. the return is approved,
6. no Razorpay refund already exists for that return.

Frontend protection is only convenience; backend validation remains authoritative.

## Partial vs full refund

Example order total: ₹699.

- refund ₹1 → `PARTIALLY_REFUNDED`
  - customer sees **Partial Refund Processed**
- refund ₹699 → `REFUNDED`
  - customer sees **Refund Processed**

Migration `0008_refund_ux_semantics.sql` repairs historical records where a partial refund was previously labelled `REFUNDED`.

## Customer wording

After Razorpay confirms processing, customer email/My Orders says:

- `Partial Refund Processed`, or
- `Refund Processed`

The message also explains that the bank/UPI provider may take up to **5–7 business days** to reflect the credit.

This avoids implying that the customer's bank balance is updated instantly.

## Refund amount

The refund input defaults to the currently refundable order amount instead of ₹1.

The admin confirmation explicitly says whether the action is a PARTIAL or FULL refund.
