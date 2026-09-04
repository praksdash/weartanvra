from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
PRODUCTS=ROOT/'products'
OUT_JS=ROOT/'assets'/'generated-products.js'
OUT_JSON=ROOT/'assets'/'generated-products.json'
IMAGE_EXTS={'.jpg','.jpeg','.png','.webp'}
DEFAULTS={
 'oversized':{'price':899,'compareAt':1299,'badge':'NEW','fit':'Oversized','gsm':'220 GSM','material':'100% Cotton','sizes':['S','M','L','XL']},
 'regular':{'price':699,'compareAt':999,'badge':'NEW','fit':'Regular','gsm':'180 GSM','material':'100% Cotton','sizes':['S','M','L','XL']}
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
   if not imgs: continue
   d=DEFAULTS[cat]; slug=folder.name; pid=str(meta.get('id') or f'{cat}-{slug}')
   if pid in ids: raise SystemExit(f'Duplicate product id: {pid}')
   ids.add(pid)
   paths=[rel(p) for p in imgs]
   colors=meta.get('colors') or [{'name':'As Shown','hex':'#777777','image':paths[0]}]
   norm=[]
   for c in colors:
    c=dict(c); img=c.get('image')
    if img and '/' not in img: c['image']=rel(folder/img)
    elif not img: c['image']=paths[0]
    norm.append(c)
   prod={
    'id':pid,'slug':slug,'category':cat,
    'name':meta.get('name') or f"{title(slug)} {'Oversized Tee' if cat=='oversized' else 'Regular Tee'}",
    'subtitle':meta.get('subtitle') or f"{meta.get('gsm',d['gsm'])} • {meta.get('material',d['material'])} • {meta.get('fit',d['fit'])} Fit",
    'price':int(meta.get('price',d['price'])),'compareAt':int(meta.get('compareAt',d['compareAt'])),
    'badge':meta.get('badge',d['badge']),'fit':meta.get('fit',d['fit']),'gsm':meta.get('gsm',d['gsm']),
    'material':meta.get('material',d['material']),'print':meta.get('print','Graphic print'),
    'description':meta.get('description') or f"{title(slug)} from WEAR TANVRA.",
    'sizes':meta.get('sizes',d['sizes']),'colors':norm,'images':paths,
    'featured':bool(meta.get('featured',False)),'sort':int(meta.get('sort',100))
   }
   products.append(prod)
 products.sort(key=lambda p:(p['sort'],p['name'].lower()))
 OUT_JSON.write_text(json.dumps(products,indent=2,ensure_ascii=False),encoding='utf-8')
 OUT_JS.write_text('window.TANVRA_PRODUCTS='+json.dumps(products,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
 print(f'Built {len(products)} products')
if __name__=='__main__': build()
