# Customer accounts
Customers sign in at https://weartanvra.com/account.html with a 6-digit email code.
No password is stored.

COD: customer email is sent after the order is stored.
Prepaid: customer confirmation is sent only after status becomes PAID.
Key status updates also email the customer.

Security:
- OTP expires in 10 minutes
- 60-second resend cooldown
- max 5 wrong attempts
- 30-day session
- raw session token is not stored in D1; only SHA-256 hash
- order history is filtered by authenticated checkout email
