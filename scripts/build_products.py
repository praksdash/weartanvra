from pathlib import Path
import json, re

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "products"
OUTPUT = ROOT / "assets" / "generated-products.js"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

DEFAULTS = {
    "oversized": {
        "price": 899,
        "compareAt": 1299,
        "badge": "DROP 01",
        "fit": "Oversized",
        "gsm": "220 GSM",
        "material": "100% Cotton",
        "sizes": ["S", "M", "L", "XL"]
    },
    "regular": {
        "price": 699,
        "compareAt": 999,
        "badge": "REGULAR",
        "fit": "Regular",
        "gsm": "180 GSM",
        "material": "100% Cotton",
        "sizes": ["S", "M", "L", "XL"]
    }
}

def title_from_slug(slug):
    return " ".join(x.capitalize() for x in re.split(r"[-_]+", slug) if x)

def web_path(p):
    return p.relative_to(ROOT).as_posix()

def build():
    generated = []

    for category in ("oversized", "regular"):
        category_dir = PRODUCTS / category
        if not category_dir.exists():
            continue

        for folder in sorted(p for p in category_dir.iterdir() if p.is_dir()):
            images = sorted(
                p for p in folder.iterdir()
                if p.is_file() and p.suffix.lower() in IMAGE_EXTS
            )
            if not images:
                continue

            meta = {}
            meta_file = folder / "product.json"
            if meta_file.exists():
                meta = json.loads(meta_file.read_text(encoding="utf-8"))

            defaults = DEFAULTS[category]
            slug = folder.name
            product_id = meta.get("id") or f"{category}-{slug}"
            name = meta.get("name") or f"{title_from_slug(slug)} {'Oversized Tee' if category == 'oversized' else 'Regular Tee'}"
            fit = meta.get("fit", defaults["fit"])
            gsm = meta.get("gsm", defaults["gsm"])
            material = meta.get("material", defaults["material"])

            image_paths = [web_path(p) for p in images]

            colors = meta.get("colors")
            if not colors:
                colors = [{
                    "name": "As Shown",
                    "hex": "#777777",
                    "image": image_paths[0]
                }]
            else:
                # Allow color image values to be just filenames inside the product folder.
                normalized = []
                for c in colors:
                    c = dict(c)
                    img = c.get("image")
                    if img and "/" not in img:
                        c["image"] = web_path(folder / img)
                    elif not img:
                        c["image"] = image_paths[0]
                    normalized.append(c)
                colors = normalized

            generated.append({
                "id": product_id,
                "name": name,
                "subtitle": meta.get("subtitle") or f"{gsm} • {material} • {fit} Fit",
                "price": int(meta.get("price", defaults["price"])),
                "compareAt": int(meta.get("compareAt", defaults["compareAt"])),
                "badge": meta.get("badge", defaults["badge"]),
                "print": meta.get("print", "Graphic print"),
                "fit": fit,
                "gsm": gsm,
                "material": material,
                "category": category,
                "description": meta.get("description") or f"{name} from the WEAR TANVRA {fit.lower()} collection.",
                "colors": colors,
                "images": image_paths,
                "sizes": meta.get("sizes", defaults["sizes"])
            })

    OUTPUT.write_text(
        "window.TANVRA_GENERATED_PRODUCTS = " + json.dumps(generated, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8"
    )
    print(f"Generated {len(generated)} product(s) -> {OUTPUT.relative_to(ROOT)}")

if __name__ == "__main__":
    build()
