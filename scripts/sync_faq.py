#!/usr/bin/env python3
"""Make every FAQPage block match the FAQ a visitor can actually see.

    python3 scripts/sync_faq.py [--check]

Google requires FAQPage question and answer text to be visible on the page.
Two ways that broke here:

  1. Twenty older blog posts shipped FAQPage markup with no visible FAQ at all
     — 66 questions declared, none rendered. Those get a real FAQ section
     rendered from their own schema.
  2. On pages that did have a visible FAQ, the JSON-LD had been authored
     separately from the copy and drifted apart.

So the visible <details> block is the single source of truth, and the schema is
rebuilt from it. They cannot disagree again, because one is generated from the
other rather than both being maintained by hand.
"""
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

FAQ_LD = re.compile(
    r'<script type="application/ld\+json">\s*(\{[^<]*?"@type"\s*:\s*"FAQPage".*?\})\s*</script>',
    re.S)
DETAILS = re.compile(
    r"<details[^>]*>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>\s*</details>", re.S)


def text_of(fragment):
    """Visible text of an HTML fragment, normalised the way a crawler sees it."""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def render_faq(pairs):
    items = "\n".join(
        '      <details{o}><summary>{q}</summary><p>{a}</p></details>'.format(
            o=" open" if i == 0 else "", q=html.escape(q), a=html.escape(a))
        for i, (q, a) in enumerate(pairs))
    return ('    <h2 id="faq">Frequently asked questions</h2>\n'
            '    <div class="faq" style="margin:0 0 24px">\n' + items + "\n    </div>\n")


def process(path, check):
    src = path.read_text(encoding="utf-8")
    m = FAQ_LD.search(src)
    if not m:
        return None
    doc = json.loads(m.group(1))
    # FAQPage may sit at the top level or inside an @graph.
    node = doc if doc.get("@type") == "FAQPage" else next(
        (n for n in doc.get("@graph", []) if n.get("@type") == "FAQPage"), None)
    if node is None:
        return None
    visible = [(text_of(q), text_of(a)) for q, a in DETAILS.findall(src)]

    out = src
    action = None

    if not visible:
        # Schema exists but nothing is rendered — build the visible FAQ from it.
        pairs = [(qa["name"], qa["acceptedAnswer"]["text"]) for qa in node["mainEntity"]]
        anchor_m = re.search(r'[ \t]*<h2[^>]*>How Merik (?:handles|does) it</h2>', out)
        if anchor_m:
            anchor = anchor_m.group(0)
            out = out.replace(anchor, render_faq(pairs) + "\n" + anchor, 1)
        else:
            # No product section — put the FAQ at the end of the prose block.
            close = re.search(r'(\n\s*</div>\s*</section>)', out)
            if not close:
                return ("SKIPPED (no insert point)", path.name)
            out = out[:close.start(1)] + "\n" + render_faq(pairs) + close.group(1) + out[close.end(1):]
        visible = pairs
        action = f"rendered {len(pairs)} FAQs"

    # Rebuild the schema from what is now visible, in place within the document.
    current = [(qa.get("name", ""), qa.get("acceptedAnswer", {}).get("text", ""))
               for qa in node.get("mainEntity", [])]
    if action is None and current == visible:
        return None          # already agrees; don't churn generated files
    node["mainEntity"] = [
        {"@type": "Question", "name": q,
         "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in visible]
    body = json.dumps(doc, ensure_ascii=False, indent=2)
    out = FAQ_LD.sub(
        lambda _: f'<script type="application/ld+json">\n{body}\n</script>', out, count=1)

    if out == src:
        return None
    if not check:
        path.write_text(out, encoding="utf-8")
    return (action or "schema resynced", path.name)


def main():
    check = "--check" in sys.argv
    pages = [p for p in sorted(list(ROOT.glob("*.html")) + list((ROOT / "blog").glob("*.html")))
             if p.name != "glossary.html"]  # its Q&A render as <h2>, already visible
    changed = [r for r in (process(p, check) for p in pages) if r]
    for what, name in changed:
        print(f"  {name}: {what}")
    if check and changed:
        print(f"FAQ schema is out of sync on {len(changed)} page(s)")
        return 1
    print(f"{'would change' if check else 'synced'} {len(changed)} page(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
