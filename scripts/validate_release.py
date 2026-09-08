from pathlib import Path
import json,re,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]; warnings=[]
pricing=json.loads((ROOT/'pricing.json').read_text(encoding='utf-8'))
products=json.loads((ROOT/'assets/generated-products.json').read_text(encoding='utf-8'))
price_map=pricing.get('products') or {}
for p in products:
    pe=price_map.get(p['id'])
    pv=pe.get('price') if isinstance(pe,dict) else pe
    if pv is None: errors.append(f"Missing price: {p['id']}")
    elif int(pv)!=int(p['price']): errors.append(f"Price mismatch: {p['id']}")
    if not p.get('sizes'): errors.append(f"No sizes: {p['id']}")
    if not p.get('colors'): errors.append(f"No colors: {p['id']}")
    for img in p.get('images') or []:
        if re.match(r'^https?://',img): continue
        if not (ROOT/img).exists(): warnings.append(f"Image not bundled locally: {img}")
for f in (ROOT/'products').rglob('product.json'):
    d=json.loads(f.read_text(encoding='utf-8'))
    if 'price' in d or 'compareAt' in d: errors.append(f"Price must only live in pricing.json: {f.relative_to(ROOT)}")
cat=(ROOT/'cloudflare-worker/src/catalog.js').read_text(encoding='utf-8')
if 'PRODUCT_VARIANTS=' not in cat: errors.append('Worker PRODUCT_VARIANTS missing')
if f'PREPAID_DISCOUNT={int(pricing["prepaidCoupon"]["discount"])};' not in cat: errors.append('Worker prepaid discount drift')
worker=(ROOT/'cloudflare-worker/src/index.js').read_text(encoding='utf-8')
for required in ['status_token_hash','checkout_request_id','PRODUCT_VARIANTS','Webhook payment amount mismatch','X-File-Name']:
    if required not in worker: errors.append(f'Missing hardening marker: {required}')
if 'INVOICE_SELLER_ADDRESS": ""' in (ROOT/'cloudflare-worker/wrangler.jsonc').read_text(encoding='utf-8'):
    warnings.append('Invoice seller address is blank; invoice generation remains configuration-blocked.')
print('TANVRA release validation')
for w in warnings: print('WARN:',w)
for e in errors: print('ERROR:',e)
print(f'Products: {len(products)} | Warnings: {len(warnings)} | Errors: {len(errors)}')
sys.exit(1 if errors else 0)
