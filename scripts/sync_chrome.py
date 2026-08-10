#!/usr/bin/env python3
"""Write the shared header and footer into the hand-written pages.

    python3 scripts/sync_chrome.py [--check]

Blog pages get their chrome from gen_blog.py, which imports the same module,
so both paths render byte-identical markup. --check exits non-zero instead of
writing, so drift is catchable rather than something you notice in the browser
three weeks later.
"""
import pathlib
import re
import sys

from site_chrome import CHROME_JS, STATIC_PAGES, footer, header

ROOT = pathlib.Path(__file__).resolve().parent.parent

HEADER_RE = re.compile(r"<header>.*?</header>", re.S)
FOOTER_RE = re.compile(r"<footer>.*?</footer>", re.S)
# Everything between the footer and </body> — the chrome's own scripts.
TAIL_RE = re.compile(r"(</footer>\s*)(?:<script>.*?</script>\s*)+(</body>)", re.S)


def targets():
    """Every page whose chrome this script owns, with its nav key.

    Blog articles are included: gen_blog.py only rebuilds the twenty it owns,
    so without this the older hand-written posts keep the stale four-item nav
    and the bar visibly changes when a reader moves between them.
    """
    for name, current in STATIC_PAGES.items():
        yield ROOT / name, current, False
    for path in sorted((ROOT / "blog").glob("*.html")):
        # blog/index.html is generator-owned and carries its own filter/search
        # JS; it takes chrome from this same module, so it cannot drift.
        if path.name == "index.html":
            continue
        # Articles carry no bespoke post-footer JS, so their script tail can be
        # replaced too. Root pages can (lead form, calculator) — leave those.
        yield path, "blog", True


def main():
    check = "--check" in sys.argv
    changed, missing = [], []

    for path, current, sync_tail in targets():
        if not path.exists():
            missing.append(path.name)
            continue
        name = str(path.relative_to(ROOT))
        src = path.read_text(encoding="utf-8")

        for label, rx in (("header", HEADER_RE), ("footer", FOOTER_RE)):
            n = len(rx.findall(src))
            assert n == 1, f"{name}: expected 1 <{label}>, found {n}"

        out = HEADER_RE.sub(lambda _: header(current), src, count=1)
        out = FOOTER_RE.sub(lambda _: footer(), out, count=1)

        # The chrome JS drives a reading-progress bar. Pages written before it
        # existed have the script but not the element, so the bar silently
        # vanishes as a reader moves between older and newer articles.
        if 'id="progress"' not in out:
            out = out.replace(
                "<body>\n",
                '<body>\n\n<div class="progress" id="progress" aria-hidden="true"></div>\n',
                1)

        if sync_tail:
            out, n = TAIL_RE.subn(lambda m: m.group(1) + CHROME_JS + "\n" + m.group(2), out)
            assert n == 1, f"{name}: expected 1 script tail, replaced {n}"

        if out != src:
            changed.append(name)
            if not check:
                path.write_text(out, encoding="utf-8")

    if missing:
        print("missing pages (not written):", ", ".join(missing))
    if check:
        if changed:
            print("chrome is stale in:", ", ".join(changed))
            return 1
        print("chrome in sync across", sum(1 for _ in targets()) - len(missing), "pages")
        return 0
    print(f"synced chrome: {len(changed)} page(s) updated"
          + (" — " + ", ".join(changed) if changed else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
