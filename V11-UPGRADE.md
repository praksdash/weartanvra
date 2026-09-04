# WEAR TANVRA v11 upgrade

Your Worker is already deployed at:

https://weartanvra-payments.weartanvra.workers.dev

## Upgrade steps

1. Replace your project files with this v11 package.

2. Apply the new D1 migration:

```powershell
cd C:\Users\pdash\PycharmProjects\weartanvra\cloudflare-worker
npm run db:remote
```

Migration `0003_order_integrity.sql`:
- adds an `environment` column,
- marks existing records as TEST,
- fixes legacy prepaid orders that were incorrectly marked as COD pending.

3. Deploy the updated Worker:

```powershell
npm run deploy
```

4. Push the website to GitHub:

```powershell
git add -A
git commit -m "Upgrade WEAR TANVRA order integrity"
git push origin main
```

5. Open:

https://weartanvra.com/admin.html

Expected result:
- existing COD test order stays `COD_CONFIRMATION_REQUIRED`,
- existing prepaid test order becomes `PENDING_PAYMENT`,
- both show `TEST`,
- COD and prepaid status choices are separated.

Keep:
`ORDER_ENVIRONMENT = "TEST"`

until Razorpay test payments work end-to-end.

When you later move to live Razorpay credentials, change it to:
`ORDER_ENVIRONMENT = "LIVE"`
and redeploy.
