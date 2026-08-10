#!/usr/bin/env python3
"""Generate /glossary from glossary_terms.py.

One page, not twenty. Twenty ~400-word definition pages for a site with no
domain authority is a thin-content risk that outweighs the ranking upside of
separate URLs; one substantial page with per-term anchors and DefinedTerm
markup competes for the same long-tail queries without that risk. If a term
later earns real traffic, promote that one to its own page.

    python3 scripts/gen_glossary.py
"""
import html
import json
import pathlib
import re

from glossary_terms import TERMS
from site_chrome import CHROME_JS, footer, header

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://www.merik.in"


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s)).strip()


def build():
    slugs = {t["slug"] for t in TERMS}
    for t in TERMS:
        for r in t["related"]:
            assert r in slugs, f"{t['slug']} links to unknown term {r}"
        if t["post"]:
            assert (ROOT / "blog" / f"{t['post']}.html").exists(), \
                f"{t['slug']} links to missing post {t['post']}"

    cats = []
    for t in TERMS:
        if t["cat"] not in cats:
            cats.append(t["cat"])

    toc = "\n".join(
        '      <li><a href="#{s}">{n}</a></li>'.format(s=t["slug"], n=html.escape(t["term"]))
        for t in TERMS
    )

    blocks = []
    for t in TERMS:
        rel = " · ".join(
            '<a href="#{s}">{n}</a>'.format(
                s=r, n=html.escape(next(x["term"] for x in TERMS if x["slug"] == r)))
            for r in t["related"])
        if t["post"]:
            label = html.escape(t["term"].split(" (")[0]) + " in practice"
            post = ('        <p class="g-post">Full guide: '
                    '<a href="/blog/{p}">{label}</a></p>').format(p=t["post"], label=label)
        else:
            post = ""
        blocks.append(f"""      <article class="g-term reveal" id="{t['slug']}">
        <span class="tag2">{t['cat']}</span>
        <h2>{html.escape(t['term'])}</h2>
        <p class="g-short">{html.escape(t['short'])}</p>
{t['body']}
        <div class="g-example">{t['example']}</div>
        <p class="g-rel"><b>Related:</b> {rel}</p>
{post}
      </article>""")

    defined = ",\n      ".join(
        json.dumps({
            "@type": "DefinedTerm", "@id": f"{SITE}/glossary#{t['slug']}",
            "name": strip(t["term"]), "description": strip(t["short"]),
            "inDefinedTermSet": f"{SITE}/glossary#set",
            "url": f"{SITE}/glossary#{t['slug']}",
        }, ensure_ascii=False) for t in TERMS)

    faqs = ",\n      ".join(
        json.dumps({
            "@type": "Question", "name": f"What is {strip(t['term'])}?",
            "acceptedAnswer": {"@type": "Answer", "text": strip(t["short"])},
        }, ensure_ascii=False) for t in TERMS)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-5L9G7GMZWD"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag("js", new Date());
  gtag("config", "G-5L9G7GMZWD");
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.className+=' js';</script>
<title>Payroll &amp; HR Glossary — {len(TERMS)} Indian Workforce Terms Explained | Merik</title>
<meta name="description" content="Plain-English definitions of {len(TERMS)} Indian payroll and workforce terms — CTC, gross and net salary, LOP, HRA, provident fund, earned leave, encashment, notice period and full and final settlement, each with a worked example.">
<meta name="keywords" content="payroll glossary India, HR terms explained, what is CTC, what is LOP, gross vs net salary, earned leave meaning, leave encashment meaning, full and final settlement">
<meta name="author" content="Merik">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#D93A31">
<link rel="canonical" href="{SITE}/glossary">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Merik">
<meta property="og:title" content="Payroll &amp; HR glossary — {len(TERMS)} Indian workforce terms explained">
<meta property="og:description" content="CTC, LOP, HRA, provident fund, earned leave, encashment and more — each defined in one sentence, with a worked example.">
<meta property="og:url" content="{SITE}/glossary">
<meta property="og:image" content="{SITE}/assets/images/og-image.png">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Merik payroll &amp; HR glossary">
<meta name="twitter:description" content="{len(TERMS)} Indian payroll and workforce terms, each in one quotable sentence.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css?v=9">
<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@graph":[
    {{"@type":"DefinedTermSet","@id":"{SITE}/glossary#set","name":"Merik payroll and workforce glossary","url":"{SITE}/glossary","description":"Definitions of {len(TERMS)} Indian payroll and workforce management terms.","publisher":{{"@id":"{SITE}/#org"}},"inLanguage":"en","hasDefinedTerm":[
      {defined}]}},
    {{"@type":"BreadcrumbList","itemListElement":[
      {{"@type":"ListItem","position":1,"name":"Home","item":"{SITE}/"}},
      {{"@type":"ListItem","position":2,"name":"Glossary","item":"{SITE}/glossary"}}]}}
  ]
}}
</script>
<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@type":"FAQPage",
  "mainEntity":[
      {faqs}]
}}
</script>
</head>
<body>

<div class="progress" id="progress" aria-hidden="true"></div>

{header("")}

<div class="page-hero">
  <div class="wrap">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span> Glossary</nav>
    <div class="eyebrow">Glossary</div>
    <h1>Payroll &amp; workforce terms, <span class="accent">in plain English</span></h1>
    <p class="lead">{len(TERMS)} terms that show up on Indian payslips and leave policies — each defined in one sentence, then explained, with a worked example.</p>
  </div>
</div>

<section style="padding-top:48px;padding-bottom:0">
  <div class="wrap">
    <nav class="toc" aria-label="All terms" style="max-width:820px;margin:0 auto">
      <b>{len(TERMS)} terms</b>
      <ol class="toc-2col">
{toc}
      </ol>
    </nav>
    <div class="callout" style="max-width:820px;margin:24px auto 0">
      Rates and thresholds — contribution percentages, tax slabs, statutory leave minimums —
      are deliberately not stated here. They vary by state and establishment and they change.
      The concepts below are stable; confirm the current figures that apply to you.
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="glossary">
{chr(10).join(blocks)}
    </div>
  </div>
</section>

<section class="soft">
  <div class="wrap">
    <div class="cta-wrap reveal">
      <h2>These numbers should calculate themselves</h2>
      <p>Merik computes payable days, loss of pay and payslips from the attendance your team already records — so the terms above stop being things you work out by hand.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/app/">Create your workspace →</a>
        <a class="btn btn-ghost" href="/blog/">Read the guides</a>
      </div>
    </div>
  </div>
</section>

{footer()}

{CHROME_JS}
</body>
</html>
"""


def main():
    (ROOT / "glossary.html").write_text(build(), encoding="utf-8")
    print(f"wrote glossary.html ({len(TERMS)} terms)")


if __name__ == "__main__":
    main()
