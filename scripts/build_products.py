from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
PRODUCTS=ROOT/'products'
OUT_JS=ROOT/'assets'/'generated-products.js'
OUT_JSON=ROOT/'assets'/'generated-products.json'
WORKER_CATALOG=ROOT/'cloudflare-worker'/'src'/'catalog.js'
PRICING_FILE=ROOT/'pricing.json'
OUT_PRICING_JS=ROOT/'assets'/'generated-pricing.js'
IMAGE_EXTS={'.jpg','.jpeg','.png','.webp'}
DEFAULTS={
 'oversized':{'price':549,'compareAt':699,'badge':'NEW','fit':'Oversized','gsm':'220 GSM','material':'100% Cotton','sizes':['S','M','L','XL']},
 'regular':{'price':399,'compareAt':599,'badge':'NEW','fit':'Regular','gsm':'180 GSM','material':'100% Cotton','sizes':['S','M','L','XL']}
}

def title(slug): return ' '.join(w.capitalize() for w in re.split(r'[-_]+',slug) if w)
def rel(p): return p.relative_to(ROOT).as_posix()
def image_rank(p):
 n=p.name.lower(); rank=50
 if n.startswith('front'): rank=0
 elif n.startswith('back'): rank=10
 elif 'model' in n: rank=20
 elif 'detail' in n: rank=30
 return (rank,n)

def build():
 pricing=json.loads(PRICING_FILE.read_text(encoding='utf-8'))
 price_map=pricing.get('products') or {}
 if not isinstance(price_map,dict): raise SystemExit('pricing.json products must be an object')
 products=[]; ids=set()
 for cat in ('oversized','regular'):
  base=PRODUCTS/cat
  if not base.exists(): continue
  for folder in sorted([p for p in base.iterdir() if p.is_dir()]):
   meta={}
   mf=folder/'product.json'
   if mf.exists(): meta=json.loads(mf.read_text(encoding='utf-8'))
   if meta.get('published',True) is False: continue
   imgs=sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS], key=image_rank)
   declared_images=meta.get('images') or []
   if not imgs and not declared_images: continue
   d=DEFAULTS[cat]; slug=folder.name; pid=str(meta.get('id') or f'{cat}-{slug}')
   if pid in ids: raise SystemExit(f'Duplicate product id: {pid}')
   ids.add(pid)
   paths=[rel(p) for p in imgs]
   if declared_images:
    declared_paths=[]
    for img in declared_images:
     declared_paths.append(rel(folder/img) if '/' not in img else img)
    # keep declared order, then append any local extras not already listed
    paths=declared_paths+[p for p in paths if p not in declared_paths]
   colors=meta.get('colors') or [{'name':'As Shown','hex':'#777777','image':paths[0]}]
   norm=[]
   for c in colors:
    c=dict(c); img=c.get('image')
    if img and (str(img).startswith('http://') or str(img).startswith('https://')): c['image']=str(img)
    elif img and '/' not in img: c['image']=rel(folder/img)
    elif not img: c['image']=paths[0]
    norm.append(c)
   if pid not in price_map:
    raise SystemExit(f'Missing price in pricing.json for published product: {pid}')
   price_entry=price_map[pid]
   price_value=price_entry.get('price') if isinstance(price_entry,dict) else price_entry
   if not isinstance(price_value,(int,float)) or int(price_value)<=0:
    raise SystemExit(f'Invalid price in pricing.json for {pid}')
   prod={
    'id':pid,'slug':slug,'category':cat,
    'name':meta.get('name') or f"{title(slug)} {'Oversized Tee' if cat=='oversized' else 'Regular Tee'}",
    'subtitle':meta.get('subtitle') or f"{meta.get('gsm',d['gsm'])} • {meta.get('material',d['material'])} • {meta.get('fit',d['fit'])} Fit",
    'price':int((price_map.get(pid) or {}).get('price')) if isinstance(price_map.get(pid),dict) else int(price_map.get(pid)),
    'compareAt':int((price_map.get(pid) or {}).get('price')) if isinstance(price_map.get(pid),dict) else int(price_map.get(pid)),
    'badge':meta.get('badge',d['badge']),'fit':meta.get('fit',d['fit']),'gsm':meta.get('gsm',d['gsm']),
    'material':meta.get('material',d['material']),'print':meta.get('print','Graphic print'),
    'description':meta.get('description') or f"{title(slug)} from WEAR TANVRA.",
    'sizes':meta.get('sizes',d['sizes']),'colors':norm,'images':paths,
    'featured':bool(meta.get('featured',False)),'sort':int(meta.get('sort',100)),'collection':meta.get('collection','GRAPHIC DROP' if cat=='oversized' else 'ESSENTIALS'),'printTier':meta.get('printTier','GRAPHIC')
   }
   products.append(prod)
 products.sort(key=lambda p:(p['sort'],p['name'].lower()))
 OUT_JSON.write_text(json.dumps(products,indent=2,ensure_ascii=False),encoding='utf-8')
 OUT_JS.write_text('window.TANVRA_PRODUCTS='+json.dumps(products,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 catalog={p['id']:int(p['price']) for p in products}
 prepaid=pricing.get('prepaidCoupon') or {}
 prepaid_code=str(prepaid.get('code') or 'PREPAID50')
 prepaid_discount=int(prepaid.get('discount') or 0)
 price_label=str(pricing.get('priceLabel') or 'LAUNCH PRICE')
 frontend_pricing={
  'currency':str(pricing.get('currency') or 'INR'),
  'priceLabel':price_label,
  'prepaidCoupon':{'code':prepaid_code,'discount':prepaid_discount}
 }
 OUT_PRICING_JS.write_text('window.TANVRA_PRICING='+json.dumps(frontend_pricing,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 WORKER_CATALOG.write_text(
  'export const PRODUCTS='+json.dumps(catalog,separators=(',',':'))+';\n'
  +'export const PREPAID_COUPON_CODE='+json.dumps(prepaid_code)+';\n'
  +'export const PREPAID_DISCOUNT='+str(prepaid_discount)+';\n',
  encoding='utf-8'
 )
 print(f'Built {len(products)} products, frontend pricing and Worker catalog from pricing.json')
if __name__=='__main__': build()
