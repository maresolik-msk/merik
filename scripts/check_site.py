#!/usr/bin/env python3
"""Static validation for the marketing site: links, assets, JSON-LD, sitemap.

    python3 scripts/check_site.py

Exits non-zero on any problem, so it can gate a deploy.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {"/": "index.html", "/features": "features.html", "/how-it-works": "how-it-works.html",
         "/modules": "modules.html", "/pricing": "pricing.html", "/roi": "roi.html",
         "/blog/": "blog/index.html", "/app/": None}


def main():
    files = sorted(list(ROOT.glob("*.html")) + list((ROOT / "blog").glob("*.html")))
    bad = 0
    titles, descs = {}, {}
    for f in files:
        t = f.read_text(encoding="utf-8")
        rel = f.relative_to(ROOT)

        for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', t, re.S):
            try:
                json.loads(m.group(1))
            except Exception as e:
                print(f"JSON-LD INVALID {rel}: {e}"); bad += 1

        for href in re.findall(r'href="([^"]+)"', t):
            h = href.split("#")[0].split("?")[0]
            if not h.startswith("/") or h.startswith("//"):
                continue
            if h in PAGES:
                if PAGES[h] and not (ROOT / PAGES[h]).exists():
                    print(f"BROKEN LINK {rel} -> {href}"); bad += 1
            elif h.startswith("/blog/"):
                slug = h[len("/blog/"):].strip("/")
                if slug and not (ROOT / "blog" / f"{slug}.html").exists():
                    print(f"BROKEN LINK {rel} -> {href}"); bad += 1
            elif h.startswith("/assets/"):
                if not (ROOT / h.lstrip("/")).exists():
                    print(f"BROKEN ASSET {rel} -> {href}"); bad += 1
            else:
                print(f"UNKNOWN LINK {rel} -> {href}"); bad += 1

        for src in re.findall(r'src="((?:\.\./|/)?assets/[^"]+)"', t):
            s = src.split("?")[0]
            p = (ROOT / s.lstrip("/")) if s.startswith("/") else (f.parent / s)
            if not p.resolve().exists():
                print(f"MISSING IMAGE {rel} -> {src}"); bad += 1

        ti = re.search(r"<title>(.*?)</title>", t, re.S)
        de = re.search(r'<meta name="description" content="(.*?)"', t, re.S)
        for store, m, label in ((titles, ti, "title"), (descs, de, "description")):
            if not m:
                print(f"MISSING {label} {rel}"); bad += 1
            elif m.group(1) in store:
                print(f"DUPLICATE {label} {rel} == {store[m.group(1)]}"); bad += 1
            else:
                store[m.group(1)] = str(rel)

        navs = re.findall(r'<nav class="nav-links".*?</nav>', t, re.S)
        if len(navs) != 1:
            print(f"NAV COUNT {rel}: {len(navs)}"); bad += 1
        else:
            if re.search(r'<a class="link" href="#', navs[0]):
                print(f"IN-PAGE ANCHOR IN NAV {rel}"); bad += 1
            cur = len(re.findall(r'aria-current="page"', navs[0]))
            if cur > 1:
                print(f"MULTIPLE aria-current {rel}: {cur}"); bad += 1

    nav_sigs = {re.search(r'<nav class="nav-links".*?</nav>', f.read_text(), re.S).group(0)
                .replace(' aria-current="page"', '') for f in files}
    if len(nav_sigs) != 1:
        print(f"NAV MARKUP DIFFERS across pages: {len(nav_sigs)} variants"); bad += 1

    locs = re.findall(r"<loc>(.*?)</loc>", (ROOT / "sitemap.xml").read_text())
    for l in locs:
        p = l.replace("https://www.merik.in", "")
        if p in ("/", "/blog/"):
            continue
        fp = ROOT / "blog" / (p[len("/blog/"):] + ".html") if p.startswith("/blog/") \
            else ROOT / (p.lstrip("/") + ".html")
        if not fp.exists():
            print(f"SITEMAP DEAD {l}"); bad += 1
    if len(locs) != len(set(locs)):
        print("SITEMAP has duplicate <loc> entries"); bad += 1
    if len(locs) != len(files):
        print(f"SITEMAP covers {len(locs)} urls but there are {len(files)} pages"); bad += 1

    print(f"\n{len(files)} pages · {len(locs)} sitemap urls · 1 nav variant · {bad} problem(s)")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
