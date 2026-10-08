#!/usr/bin/env python3
"""Publish study notebooks to this GitHub Pages repository.

Usage (from the repository root):
  python tools/publish.py add <slug> <site_dir>   register a notebook folder and export it
  python tools/publish.py [<slug> ...]            re-export the registered notebooks (all of them by default)
  python tools/publish.py --list                  show the registered notebooks

A notebook is a study-notebook site: index.html (the hub), assets/syllabus.js, assets/course.js, assets/course.css and the
lesson pages. The export copies only what a reader needs - the hub, the web files under assets/, and every lesson and
companion page that the syllabus marks ready - and leaves out the builder's files (COMPONENTS.md, kitchen-sink.html,
scratch pages _*.html). While copying it
  - strips HTML comments (notes to the builder) and the header comment of assets/syllabus.js (local paths),
  - adds <meta name="robots" content="noindex, nofollow"> to every page (search engines are asked not to list the site),
  - adds a link back to the list of notebooks at the start of the hub's eyebrow line,
  - adds the credit of the notebook's source under the hub's lede, when site.json has one ("credits" -> slug -> "hub";
    "source", "url", "license" also go on the card of the list and into the README),
  - turns links to pages that are not published yet into plain text (a bridge button to one is left out),
  - checks that every relative link and file reference of the exported pages resolves.
Then it rebuilds index.html (the list of notebooks), notebooks.json and README.md from the exported notebooks.

The local folders of the registered notebooks are kept in sources.local.json, which is not committed.
Site-wide texts (title, intro, address) are in site.json. Requires Node.js to read assets/syllabus.js.
After a run:  git add -A  &&  git commit -m "Update notebooks"  &&  git push
"""
import datetime
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SOURCES = REPO / "sources.local.json"
SITE_CFG = REPO / "site.json"
WEB_EXT = {".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".woff", ".woff2", ".ico"}
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
LANG_NAMES = {"en": "English", "ru": "Русский", "it": "Italiano"}

DEFAULT_SITE = {
    "title": "PoliMi study notebooks",
    "eyebrow": "Politecnico di Milano · MSc",
    "intro": "Interactive notebooks for the courses I take: every lecture rewritten as lessons with figures, live demos, "
             "past-exam exercises with model answers and a quiz at the end of each lesson.",
    "disclaimer": "Personal study notes. They are not official course material and are not endorsed by Politecnico di Milano "
                  "or the course instructors. Quotations from the course slides are used for study purposes; the model "
                  "answers are the author's own, since no official solutions are published.",
    "base_url": "https://valerypotrebina.github.io/polimi-notebooks/",
}


def die(msg):
    print("publish: " + msg, file=sys.stderr)
    sys.exit(1)


def load_json(path, default):
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- reading a notebook

def read_syllabus(site):
    js = site / "assets" / "syllabus.js"
    if not js.is_file():
        die(f"{js} not found: is {site} a study-notebook site?")
    code = "global.window = {}; require(process.argv[1]); process.stdout.write(JSON.stringify(window.SYLLABUS));"
    try:
        out = subprocess.run(["node", "-e", code, str(js.resolve())], capture_output=True, text=True,
                             encoding="utf-8", check=True)
    except FileNotFoundError:
        die("Node.js is needed to read assets/syllabus.js (node was not found on PATH)")
    except subprocess.CalledProcessError as e:
        die(f"could not evaluate {js}:\n{e.stderr}")
    return json.loads(out.stdout)


def is_ready(entry, site):
    f = entry.get("file")
    return bool(f) and entry.get("ready", True) is not False and (site / f).is_file()


def publishable_files(site, syl):
    files = ["index.html"]
    for p in sorted((site / "assets").rglob("*")):
        if p.is_file() and p.suffix.lower() in WEB_EXT and not p.name.startswith("_"):
            files.append(p.relative_to(site).as_posix())
    for m in syl.get("modules", []):
        for lesson in m.get("lessons", []):
            if is_ready(lesson, site):
                files.append(lesson["file"])
    for extra in syl.get("extras", []):
        if is_ready(extra, site):
            files.append(extra["file"])
    return files


# ---------------------------------------------------------------- transforming the pages

SCRIPT_OR_STYLE = re.compile(r"(<script\b.*?</script>|<style\b.*?</style>)", re.S | re.I)


def strip_html_comments(text):
    parts = SCRIPT_OR_STYLE.split(text)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r"<!--.*?-->", "", parts[i], flags=re.S)
    return "".join(parts)


def add_noindex(text):
    if re.search(r"<meta\s+name=[\"']robots[\"']", text, re.I):
        return text
    tag = '<meta name="robots" content="noindex, nofollow">'
    new, n = re.subn(r"(<meta\s+charset=[\"'][^\"']*[\"']\s*/?>)", lambda m: m.group(1) + "\n" + tag, text,
                     count=1, flags=re.I)
    if n:
        return new
    return re.sub(r"(<head[^>]*>)", lambda m: m.group(1) + "\n" + tag, text, count=1, flags=re.I)


def add_backlink(text, lang):
    label = "Все тетради" if lang.startswith("ru") else "All notebooks"
    new, n = re.subn(r'(<p class="eyebrow">)', lambda m: m.group(1) + f'<a href="../">{label}</a> · ', text, count=1)
    if not n:
        print("   ! the hub has no <p class=\"eyebrow\">: no link back to the list of notebooks was added")
    return new


def add_credit(text, hub_html):
    """the source a notebook is built on, right under the hub's lede (site.json, "credits" -> slug -> "hub")"""
    m = re.search(r'<p class="hub-lede">.*?</p>', text, re.S)
    if not m:
        print("   ! the hub has no <p class=\"hub-lede\">: the credit line was not added")
        return text
    return text[:m.end()] + f'\n      <p class="hub-credit">{hub_html}</p>' + text[m.end():]


def strip_js_header(text):
    m = re.match(r"\s*/\*.*?\*/\s*", text, re.S)
    return text[m.end():] if m else text


def page_lang(text):
    m = re.search(r"<html[^>]*\blang=[\"']([^\"']+)[\"']", text, re.I)
    return m.group(1) if m else "en"


def hub_lede(text):
    m = re.search(r'<p class="hub-lede">(.*?)</p>', text, re.S)
    return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""


LOCAL_LINK_RE = re.compile(r'<a\b([^>]*?)\bhref="([^"#?]+\.html)(?:[#?][^"]*)?"([^>]*)>(.*?)</a>', re.S | re.I)


def drop_dead_links(text, page):
    """Links to pages that are not published (a lesson or a companion page still marked ready: false) keep their words
    and lose the link; a bridge button to such a page is left out. Script and style blocks are not touched."""
    dropped = []

    def repl(m):
        href = m.group(2)
        if re.match(r"^(?:[a-z][a-z0-9+.-]*:|//)", href, re.I):
            return m.group(0)
        target = (page.parent / href).resolve()
        if target.exists() or target == (REPO / "index.html").resolve():
            return m.group(0)
        dropped.append(href)
        return "" if "bridge-link" in (m.group(1) + m.group(3)) else m.group(4)

    parts = SCRIPT_OR_STYLE.split(text)
    for i in range(0, len(parts), 2):
        parts[i] = LOCAL_LINK_RE.sub(repl, parts[i])
    return "".join(parts), dropped


TAG_REF_RE = re.compile(r"""<[a-zA-Z][^<>]*?\b(?:src|href)\s*=\s*["']([^"'#?]*)""", re.I)


def page_refs(text):
    """src / href of real tags: inside <script> and <style> only the opening tag counts (widgets build fake pages in strings)"""
    refs = []
    for i, part in enumerate(SCRIPT_OR_STYLE.split(text)):
        if i % 2:
            part = part[:part.find(">") + 1]
        refs += TAG_REF_RE.findall(part)
    return refs


def check_refs(out_dir, rel_files):
    problems = []
    for rel in rel_files:
        if not rel.endswith(".html"):
            continue
        page = out_dir / rel
        for ref in page_refs(page.read_text(encoding="utf-8")):
            if not ref or re.match(r"^(?:[a-z][a-z0-9+.-]*:|//)", ref, re.I):
                continue
            target = (page.parent / ref).resolve()
            if ref.endswith("/"):
                target = target / "index.html"
            if target == (REPO / "index.html").resolve():
                continue                                     # the list of notebooks: written at the end of the run
            if not target.exists():
                problems.append(f"{rel}: {ref}")
    return problems


def export(slug, site, credit=None):
    site = Path(site).resolve()
    syl = read_syllabus(site)
    files = publishable_files(site, syl)
    out_dir = REPO / slug
    if out_dir.exists():
        shutil.rmtree(out_dir)
    hub_text = (site / "index.html").read_text(encoding="utf-8")
    lang = page_lang(hub_text)
    for rel in files:
        src, dst = site / rel, out_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if rel.endswith(".html"):
            text = add_noindex(strip_html_comments(src.read_text(encoding="utf-8")))
            if rel == "index.html":
                text = add_backlink(text, lang)
                if credit and credit.get("hub"):
                    text = add_credit(text, credit["hub"])
            dst.write_text(text, encoding="utf-8", newline="\n")
        elif rel == "assets/syllabus.js":
            dst.write_text(strip_js_header(src.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")
        else:
            shutil.copyfile(src, dst)
    for rel in files:
        if rel.endswith(".html"):
            page = out_dir / rel
            text, dropped = drop_dead_links(page.read_text(encoding="utf-8"), page)
            if dropped:
                page.write_text(text, encoding="utf-8", newline="\n")
                print(f"   link(s) to unpublished pages turned into text in {rel}: {', '.join(sorted(set(dropped)))}")
    problems = check_refs(out_dir, files)
    for p in problems[:20]:
        print("   ! unresolved reference " + p)
    if len(problems) > 20:
        print(f"   ! ... {len(problems) - 20} more")
    course = syl.get("course", {})
    lessons = [le for m in syl.get("modules", []) for le in m.get("lessons", []) if is_ready(le, site)]
    size = sum((out_dir / rel).stat().st_size for rel in files)
    print(f"{slug}: {len(files)} files, {size / 1e6:.1f} MB, {len(lessons)} lessons -> {out_dir}")
    return {
        "slug": slug,
        "title": course.get("title", slug),
        "subtitle": course.get("subtitle", ""),
        "lang": lang,
        "lede": hub_lede(hub_text),
        "modules": len(syl.get("modules", [])),
        "lessons": len(lessons),
        "minutes": sum(int(le.get("minutes") or 0) for le in lessons),
        "extras": [x.get("title", x.get("id")) for x in syl.get("extras", []) if is_ready(x, site)],
        "updated": datetime.date.today().isoformat(),
        "credit": {k: credit[k] for k in ("source", "url", "license") if k in credit} if credit else None,
    }


# ---------------------------------------------------------------- the list of notebooks

def hours(minutes):
    h = minutes / 60
    return f"about {round(h)} hours" if h >= 1.5 else f"about {minutes} minutes"


def card(nb):
    e = html.escape
    lang_name = LANG_NAMES.get(nb["lang"].split("-")[0], nb["lang"])
    extras = "".join(f"<li>{e(x)}</li>" for x in nb["extras"])
    cr = nb.get("credit")
    credit = (f'\n        <p class="nb-credit" lang="en">Based on <a href="{e(cr["url"])}">{e(cr["source"])}</a>'
              f'{" · " + e(cr["license"]) + " License" if cr.get("license") else ""}</p>') if cr and cr.get("url") else ""
    return f"""
    <article class="nb" lang="{e(nb['lang'])}">
      <p class="nb-count"><b>{nb['lessons']}</b> lessons</p>
      <div class="nb-body">
        <h2><a href="{e(nb['slug'])}/">{e(nb['title'])}</a></h2>
        <p class="nb-course">{e(nb['subtitle'])}</p>
        <p class="nb-lede">{e(nb['lede'])}</p>
        <ul class="nb-meta" lang="en">
          <li>{nb['modules']} modules</li><li>{hours(nb['minutes'])}</li><li>{e(lang_name)}</li><li>updated {e(nb['updated'])}</li>
        </ul>
        {f'<ul class="nb-extras" lang="en">{extras}</ul>' if extras else ''}{credit}
        <p class="nb-open" lang="en"><a href="{e(nb['slug'])}/">Open the notebook</a></p>
      </div>
    </article>"""


def landing(cfg, notebooks):
    e = html.escape
    cards = "".join(card(nb) for nb in notebooks) or '\n    <p class="empty">No notebooks published yet.</p>'
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(cfg['title'])}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500..700&amp;family=Geologica:wght@400..760&amp;family=Literata:opsz,wght@7..72,400..600&amp;display=swap">
<style>
/* Layout: one column of notebook covers on the same squared paper as the notebooks themselves. */
:root {{
  --paper: #f6f8fc; --paper-2: #ebf0f8; --ink: #16223d; --ink-2: #3d4963; --ink-3: #5a6681;
  --line: #cdd6e6; --accent: #1764cb; --key-bg: #ffe76a; --grid: rgba(120, 150, 205, 0.12);
  --f-display: "Geologica", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --f-body: "Literata", Georgia, "Times New Roman", serif;
  --f-hand: "Caveat", "Segoe Print", "Bradley Hand", cursive;
  color-scheme: light;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --paper: #1c2723; --paper-2: #243029; --ink: #eceee6; --ink-2: #c6cec5; --ink-3: #9eaaa1;
    --line: #34433c; --accent: #7fb6ef; --key-bg: rgba(255, 216, 61, 0.28); --grid: rgba(236, 238, 230, 0.05);
    color-scheme: dark;
  }}
}}
:root[data-theme="dark"] {{
  --paper: #1c2723; --paper-2: #243029; --ink: #eceee6; --ink-2: #c6cec5; --ink-3: #9eaaa1;
  --line: #34433c; --accent: #7fb6ef; --key-bg: rgba(255, 216, 61, 0.28); --grid: rgba(236, 238, 230, 0.05);
  color-scheme: dark;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0; background: var(--paper); color: var(--ink); font: 400 1.05rem/1.6 var(--f-body);
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 22px 22px;
}}
.wrap {{ max-width: 52rem; margin: 0 auto; padding-inline: max(16px, 4vw); padding-block: clamp(2.5rem, 6vw, 5rem) 3rem; }}
header {{ display: grid; gap: 0.9rem; margin-bottom: clamp(2rem, 5vw, 3.5rem); }}
.eyebrow {{ margin: 0; font: 600 0.78rem/1.3 var(--f-display); letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-3); }}
h1 {{ margin: 0; font: 760 clamp(2.4rem, 1.4rem + 5vw, 4.2rem)/0.98 var(--f-display); letter-spacing: -0.035em; text-wrap: balance; }}
h1 span {{ background: linear-gradient(transparent 58%, var(--key-bg) 58%, var(--key-bg) 92%, transparent 92%); }}
.intro {{ margin: 0; max-width: 38rem; color: var(--ink-2); font-size: 1.1rem; }}
.shelf {{ display: grid; gap: 1.25rem; }}
.nb {{
  display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: 0 1.5rem;
  background: var(--paper); border: 1px solid var(--line); border-radius: 6px; padding: 1.5rem;
  box-shadow: 0 1px 0 var(--line), 0 10px 24px -18px rgba(22, 34, 61, 0.45);
}}
.nb-count {{ margin: 0; font: 400 1rem/1.1 var(--f-hand); color: var(--ink-3); text-align: center; align-self: start;
  border-right: 1px dashed var(--line); padding-right: 1.25rem; }}
.nb-count b {{ display: block; font: 760 3.2rem/1 var(--f-display); letter-spacing: -0.04em; color: var(--accent); }}
.nb-body {{ display: grid; gap: 0.55rem; min-width: 0; }}
.nb h2 {{ margin: 0; font: 700 1.55rem/1.15 var(--f-display); letter-spacing: -0.02em; text-wrap: balance; }}
.nb h2 a {{ color: inherit; text-decoration: none; }}
.nb h2 a:hover, .nb h2 a:focus-visible {{ text-decoration: underline; text-decoration-color: var(--accent); text-underline-offset: 0.18em; }}
.nb-course {{ margin: 0; font: 500 0.88rem/1.4 var(--f-display); color: var(--ink-3); }}
.nb-lede {{ margin: 0.2rem 0 0; color: var(--ink-2); max-width: 65ch; }}
.nb-meta, .nb-extras {{ list-style: none; margin: 0.3rem 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem 1rem;
  font: 500 0.82rem/1.4 var(--f-display); color: var(--ink-3); font-variant-numeric: tabular-nums; }}
.nb-extras li {{ border: 1px solid var(--line); border-radius: 999px; padding: 0.1rem 0.65rem; background: var(--paper-2); color: var(--ink-2); }}
.nb-credit {{ margin: 0.2rem 0 0; font: 400 0.82rem/1.45 var(--f-display); color: var(--ink-3); }}
.nb-credit a {{ color: inherit; text-underline-offset: 0.18em; }}
.nb-open {{ margin: 0.6rem 0 0; font: 650 0.95rem/1.3 var(--f-display); }}
.nb-open a {{ color: var(--accent); text-underline-offset: 0.2em; }}
a:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }}
footer {{ margin-top: clamp(2.5rem, 6vw, 4rem); padding-top: 1.25rem; border-top: 1px solid var(--line);
  font: 400 0.85rem/1.55 var(--f-display); color: var(--ink-3); display: grid; gap: 0.5rem; max-width: 44rem; }}
footer p {{ margin: 0; }}
.empty {{ color: var(--ink-3); }}
@media (max-width: 34rem) {{
  .nb {{ grid-template-columns: minmax(0, 1fr); padding: 1.15rem; }}
  .nb-count {{ border-right: 0; padding-right: 0; text-align: left; margin-bottom: 0.4rem; }}
  .nb-count b {{ display: inline; font-size: 2rem; margin-right: 0.3rem; }}
}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="eyebrow">{e(cfg['eyebrow'])}</p>
    <h1><span>{e(cfg['title'])}</span></h1>
    <p class="intro">{e(cfg['intro'])}</p>
  </header>
  <main class="shelf">{cards}
  </main>
  <footer>
    <p>{e(cfg['disclaimer'])}</p>
    <p>Each notebook keeps your progress and answers in this browser only.</p>
  </footer>
</div>
</body>
</html>
"""


def readme(cfg, notebooks):
    base = cfg["base_url"].rstrip("/") + "/"
    rows = "\n".join(
        f"| [{nb['title']}]({base}{nb['slug']}/) | {nb['subtitle']} | {nb['lessons']} | "
        f"{LANG_NAMES.get(nb['lang'].split('-')[0], nb['lang'])} | {nb['updated']} |" for nb in notebooks)
    credited = [nb for nb in notebooks if nb.get("credit") and nb["credit"].get("url")]
    credits_md = ""
    if credited:
        lines = "\n".join(
            f"- **{nb['title']}** is based on [{nb['credit']['source']}]({nb['credit']['url']})"
            f"{', ' + nb['credit']['license'] + ' License' if nb['credit'].get('license') else ''}." for nb in credited)
        credits_md = (f"\n## Sources and credits\n\n{lines}\n\nThe license texts of these sources are in "
                      f"[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).\n")
    return f"""# {cfg['title']}

{cfg['intro']}

**Open the site:** {base}

| Notebook | Course | Lessons | Language | Updated |
|---|---|---|---|---|
{rows}

{cfg['disclaimer']}
{credits_md}
## How the site is made

Each folder (`{notebooks[0]['slug'] if notebooks else 'slug'}/`, ...) is a static notebook: plain HTML, CSS and JavaScript, with
formulas typeset by MathJax and fonts from Google Fonts. Nothing is sent anywhere: progress and quiz answers stay in the
reader's browser. `index.html`, `notebooks.json` and this README are generated by `tools/publish.py`.

## Adding or updating a notebook

```
python tools/publish.py add <slug> <folder of the notebook site>   # first time
python tools/publish.py                                            # re-export every notebook
git add -A && git commit -m "Update notebooks" && git push
```

The notebook folders on the author's computer are listed in `sources.local.json`, which is not committed.
"""


def rebuild_index(notebooks):
    cfg = dict(DEFAULT_SITE)
    cfg.update(load_json(SITE_CFG, {}))
    if not SITE_CFG.is_file():
        save_json(SITE_CFG, cfg)
    notebooks = sorted(notebooks, key=lambda nb: nb["title"].lower())
    save_json(REPO / "notebooks.json", notebooks)
    (REPO / "index.html").write_text(landing(cfg, notebooks), encoding="utf-8", newline="\n")
    (REPO / "README.md").write_text(readme(cfg, notebooks), encoding="utf-8", newline="\n")
    (REPO / ".nojekyll").write_text("", encoding="utf-8")
    print(f"index.html, notebooks.json, README.md: {len(notebooks)} notebook(s)")


def main(argv):
    sources = load_json(SOURCES, {})
    if argv[:1] == ["--list"]:
        for slug, path in sources.items():
            print(f"{slug}: {path}")
        return
    if argv[:1] == ["add"]:
        if len(argv) != 3:
            die("usage: python tools/publish.py add <slug> <site_dir>")
        slug, site = argv[1], argv[2]
        if not SLUG_RE.match(slug):
            die(f"slug '{slug}': use lowercase letters, digits and dashes (it becomes the folder and the address)")
        if not (Path(site) / "index.html").is_file():
            die(f"{site} has no index.html")
        sources[slug] = str(Path(site).resolve())
        save_json(SOURCES, sources)
        targets = [slug]
    else:
        targets = argv or list(sources)
        unknown = [s for s in targets if s not in sources]
        if unknown:
            die(f"not registered: {', '.join(unknown)} (add them with: python tools/publish.py add <slug> <site_dir>)")
    if not sources:
        die("no notebook registered yet: python tools/publish.py add <slug> <site_dir>")
    meta = {nb["slug"]: nb for nb in load_json(REPO / "notebooks.json", [])}
    credits = load_json(SITE_CFG, {}).get("credits", {})
    for slug in targets:
        meta[slug] = export(slug, sources[slug], credits.get(slug))
    rebuild_index([meta[s] for s in meta if (REPO / s).is_dir()])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1:])
