#!/usr/bin/env python3
"""
Genereert statische pagina's uit de Sveltia CMS content-bestanden
(content/blog/*.json, content/testimonials/*.json, content/cases/*.json).

Draait automatisch via .github/workflows/build-content.yml bij elke push
die content/** raakt (dus ook elke commit die Sveltia CMS zelf maakt).
Kan ook lokaal gedraaid worden: python3 scripts/build_content.py
"""
import json
import pathlib
import re
import sys
from urllib.parse import urlparse

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLOG_DIR = ROOT / "content" / "blog"
TESTIMONIALS_DIR = ROOT / "content" / "testimonials"
CASES_DIR = ROOT / "content" / "cases"

MONTHS = {
    "nl": ["januari", "februari", "maart", "april", "mei", "juni", "juli",
           "augustus", "september", "oktober", "november", "december"],
    "en": ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"],
    "de": ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
           "August", "September", "Oktober", "November", "Dezember"],
}

CATEGORY_LABELS = {
    "Tips":    {"nl": "Tips",    "en": "Tips",     "de": "Tipps"},
    "SEO":     {"nl": "SEO",     "en": "SEO",      "de": "SEO"},
    "Branche": {"nl": "Branche", "en": "Industry",  "de": "Branche"},
    "Lokaal":  {"nl": "Lokaal",  "en": "Local",     "de": "Lokal"},
    "Nieuws":  {"nl": "Nieuws",  "en": "News",      "de": "Neuigkeiten"},
}

LANGS = {
    "nl": {
        "prefix": "",
        "blog_dir": "blog",
        "cases_file": "cases.html",
        "blog_file": "blog.html",
        "back_to_blog": "Terug naar blog",
        "min_read": "{n} min lezen",
        "by_author": "Sem van Wijk",
        "need_help_h": "Hulp nodig bij jouw website?",
        "need_help_p": "Vraag een gratis website concept aan en ontvang binnen 5 werkdagen een professioneel voorstel op maat.",
        "cta_btn": "Gratis concept aanvragen",
        "concept_href": "../concept.html",
        "concept_href_root": "/concept.html",
        "locale": "nl_NL",
        "html_lang": "nl",
    },
    "en": {
        "prefix": "/eng",
        "blog_dir": "eng/blog",
        "cases_file": "eng/cases.html",
        "blog_file": "eng/blog.html",
        "back_to_blog": "Back to blog",
        "min_read": "{n} min read",
        "by_author": "Sem van Wijk",
        "need_help_h": "Need help with your website?",
        "need_help_p": "Request a free website concept and receive a tailored proposal within 5 working days.",
        "cta_btn": "Request Free Concept",
        "concept_href": "/eng/concept.html",
        "concept_href_root": "/eng/concept.html",
        "locale": "en_US",
        "html_lang": "en",
    },
    "de": {
        "prefix": "/de",
        "blog_dir": "de/blog",
        "cases_file": "de/cases.html",
        "blog_file": "de/blog.html",
        "back_to_blog": "Zurück zum Blog",
        "min_read": "{n} Min. Lesezeit",
        "by_author": "Sem van Wijk",
        "need_help_h": "Brauchen Sie Hilfe mit Ihrer Website?",
        "need_help_p": "Fordern Sie ein kostenloses Website-Konzept an und erhalten Sie innerhalb von 5 Werktagen einen maßgeschneiderten Vorschlag.",
        "cta_btn": "Kostenloses Konzept Anfragen",
        "concept_href": "/de/concept.html",
        "concept_href_root": "/de/concept.html",
        "locale": "de_DE",
        "html_lang": "de",
    },
}

ICON_CAL = ('<span class="icon-svg " aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" '
            'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
            '<rect x="3" y="4" width="18" height="18" rx="2" pathLength="1"></rect>'
            '<line x1="16" y1="2" x2="16" y2="6" pathLength="1"></line>'
            '<line x1="8" y1="2" x2="8" y2="6" pathLength="1"></line>'
            '<line x1="3" y1="10" x2="21" y2="10" pathLength="1"></line></svg></span>')
ICON_CLOCK = ('<span class="icon-svg " aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" '
              'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
              '<circle cx="12" cy="13" r="8" pathLength="1"></circle>'
              '<path d="M12 9v4l2 2" pathLength="1"></path><path d="M9 2h6" pathLength="1"></path>'
              '</svg></span>')
ICON_USER = ('<span class="icon-svg " aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" '
             'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
             '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" pathLength="1"></path>'
             '<circle cx="12" cy="7" r="4" pathLength="1"></circle></svg></span>')
ICON_SEARCH = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
               'stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle>'
               '<line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>')


def fmt_date(iso_date, lang):
    y, m, d = iso_date.split("-")
    month_name = MONTHS[lang][int(m) - 1]
    if lang == "de":
        return f"{int(d)}. {month_name} {y}"
    if lang == "en":
        return f"{int(d)} {month_name} {y}"
    return f"{int(d)} {month_name} {y}"


def load_json_dir(d):
    items = []
    if not d.exists():
        return items
    for f in sorted(d.glob("*.json")):
        with open(f, encoding="utf-8") as fh:
            items.append(json.load(fh))
    return items


def md_to_html(text):
    return markdown.markdown(text, extensions=["extra"])


WORDS_PER_MINUTE = 200


def reading_time_minutes(markdown_text):
    word_count = len(re.findall(r"\S+", markdown_text or ""))
    return max(1, round(word_count / WORDS_PER_MINUTE))


def head_common(lang, title, description, canonical_path, og_type="website", og_image=None, extra_head=""):
    cfg = LANGS[lang]
    canon_nl = f"https://www.svanwijksolutions.nl{canonical_path['nl']}"
    canon_en = f"https://www.svanwijksolutions.nl{canonical_path['en']}"
    canon_de = f"https://www.svanwijksolutions.nl{canonical_path['de']}"
    canon_self = f"https://www.svanwijksolutions.nl{canonical_path[lang]}"
    image = og_image or "https://www.svanwijksolutions.nl/assets/images/og-image.jpg"
    return f'''<!DOCTYPE html>
<html lang="{cfg['html_lang']}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <link rel="stylesheet" href="/style.css">
  <link rel="canonical" href="{canon_self}">
  <link rel="alternate" hreflang="nl" href="{canon_nl}">
  <link rel="alternate" hreflang="en" href="{canon_en}">
  <link rel="alternate" hreflang="de" href="{canon_de}">
  <link rel="alternate" hreflang="x-default" href="{canon_nl}">
  <link rel="icon" type="image/x-icon" href="/assets/images/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/images/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png">
  <link rel="manifest" href="/assets/images/site.webmanifest">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{canon_self}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:image" content="{image}">
  <meta property="og:locale" content="{cfg['locale']}">
{extra_head}  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZS7GHNBJXD"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-ZS7GHNBJXD');
  </script>
</head>
<body>

  <div id="header-placeholder"></div>
'''


FOOTER_AND_SCRIPTS = '''
  <div id="footer-placeholder"></div>
  <script src="/js/script.js"></script>
{extra_scripts}</body>
</html>
'''


def render_post(post, lang):
    cfg = LANGS[lang]
    L = post[lang]
    title_field = L.get("titel") or L.get("title")
    summary_field = L.get("samenvatting") or L.get("summary") or L.get("zusammenfassung")
    body_field = L.get("tekst") or L.get("text")
    cat_label = CATEGORY_LABELS.get(post["category"], {}).get(lang, post["category"])
    reading_time = reading_time_minutes(body_field)

    page_title = f"{title_field} | S. van Wijk Solutions"
    canonical_path = {
        "nl": f"/blog/{post['slug']}.html",
        "en": f"/eng/blog/{post['slug']}.html",
        "de": f"/de/blog/{post['slug']}.html",
    }
    json_ld = f'''  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": {json.dumps(title_field)},
    "description": {json.dumps(summary_field)},
    "image": {json.dumps(post["image"])},
    "author": {{ "@type": "Person", "name": "Sem van Wijk" }},
    "publisher": {{ "@type": "Organization", "name": "S. van Wijk Solutions" }},
    "datePublished": "{post['date']}"
  }}
  </script>
'''
    html = head_common(lang, page_title, summary_field, canonical_path, og_type="article",
                        og_image=post["image"], extra_head=json_ld)

    concept_href = cfg["concept_href"]
    blog_href = "/blog.html" if lang == "nl" else f"{cfg['prefix']}/blog.html"

    body_html = md_to_html(body_field)

    html += f'''
  <main>
    <article>

      <section class="blog-hero" style="background-image:linear-gradient(rgba(15,10,60,.74),rgba(15,10,60,.78)),url('{post["image"]}');">
        <div class="container">
          <a href="{blog_href}" class="blog-back">{cfg["back_to_blog"]}</a>
          <span class="tag">{cat_label.upper()}</span>
          <h1>{title_field}</h1>
          <div class="blog-hero__meta">
            <span>{ICON_CAL} {fmt_date(post["date"], lang)}</span>
            <span>{ICON_CLOCK} {cfg["min_read"].format(n=reading_time)}</span>
            <span>{ICON_USER} {cfg["by_author"]}</span>
          </div>
        </div>
      </section>

      <section class="section section--alt">
        <div class="container" style="max-width:1040px;">
          <div class="blog-article-base">

{body_html}

            <div class="blog-article-cta">
              <h3 style="margin-top:0;">{cfg["need_help_h"]}</h3>
              <p style="margin-bottom:14px;">{cfg["need_help_p"]}</p>
              <a href="{concept_href}" class="btn btn--primary">{cfg["cta_btn"]}</a>
            </div>

          </div>
        </div>
      </section>

    </article>
  </main>
'''
    html += FOOTER_AND_SCRIPTS.format(extra_scripts="")
    return html


def blog_card_html(post, lang, id_prefix="", delay_class=""):
    cfg = LANGS[lang]
    L = post[lang]
    title_field = L.get("titel") or L.get("title")
    summary_field = L.get("samenvatting") or L.get("summary") or L.get("zusammenfassung")
    body_field = L.get("tekst") or L.get("text")
    cat_label = CATEGORY_LABELS.get(post["category"], {}).get(lang, post["category"])
    reading_time = reading_time_minutes(body_field)
    href = f"/blog/{post['slug']}.html" if lang == "nl" else f"{cfg['prefix']}/blog/{post['slug']}.html"
    date_label = fmt_date(post["date"], lang)
    return f'''          <article class="blog-card reveal{delay_class}" data-search="{(title_field + " " + summary_field).lower().replace('"', '&quot;')}" data-date="{post['date']}">
            <a href="{href}" class="blog-card__link">
              <div class="blog-card__img" style="background-image:url('{post["image"]}');"></div>
              <div class="blog-card__body">
                <span class="blog-card__cat">{cat_label}</span>
                <h2>{title_field}</h2>
                <p>{summary_field}</p>
                <div class="blog-card__meta">
                  <span>{ICON_CAL} {date_label}</span>
                  <span>{ICON_CLOCK} {cfg["min_read"].format(n=reading_time)}</span>
                </div>
              </div>
            </a>
          </article>
'''


BLOG_HEROES = {
    "nl": {"tag": "BLOG", "h1": "Tips, inzichten &amp; inspiratie",
           "p": "Praktische artikelen over websites, SEO en online groeien voor ondernemers.",
           "search_placeholder": "Zoek in blogartikelen…", "empty": "Geen artikelen gevonden voor deze zoekopdracht.",
           "cta_h": "Klaar voor een website die werkt?", "cta_p": "Vraag gratis een website concept aan, binnen 5 werkdagen in je inbox.",
           "cta_btn": "Gratis Concept Aanvragen"},
    "en": {"tag": "BLOG", "h1": "Tips, insights &amp; inspiration",
           "p": "Practical articles about websites, SEO, and growing online for business owners.",
           "search_placeholder": "Search blog articles…", "empty": "No articles found for this search.",
           "cta_h": "Ready for a website that works?", "cta_p": "Request a free website concept, in your inbox within 5 working days.",
           "cta_btn": "Request Free Concept"},
    "de": {"tag": "BLOG", "h1": "Tipps, Einblicke &amp; Inspiration",
           "p": "Praktische Artikel über Websites, SEO und Online-Wachstum für Unternehmer.",
           "search_placeholder": "Blogartikel durchsuchen…", "empty": "Keine Artikel für diese Suche gefunden.",
           "cta_h": "Bereit für eine Website, die funktioniert?", "cta_p": "Fordern Sie kostenlos ein Website-Konzept an, innerhalb von 5 Werktagen in Ihrem Postfach.",
           "cta_btn": "Kostenloses Konzept Anfragen"},
}


def render_blog_listing(posts, lang):
    cfg = LANGS[lang]
    hero = BLOG_HEROES[lang]
    posts_sorted = sorted(posts, key=lambda p: p["date"], reverse=True)

    title = {
        "nl": "Blog | Tips over websites, SEO & online groei | S. van Wijk Solutions",
        "en": "Blog | Tips on websites, SEO & growing online | S. van Wijk Solutions",
        "de": "Blog | Tipps zu Websites, SEO & Online-Wachstum | S. van Wijk Solutions",
    }[lang]
    description = {
        "nl": "Praktische tips over webdesign, SEO, online marketing en hoe je als ondernemer wereldwijd groeit met een sterke website.",
        "en": "Practical tips on web design, SEO, online marketing, and how to grow your business worldwide with a strong website.",
        "de": "Praktische Tipps zu Webdesign, SEO, Online-Marketing und wie Sie als Unternehmer weltweit mit einer starken Website wachsen.",
    }[lang]
    canonical_path = {"nl": "/blog.html", "en": "/eng/blog.html", "de": "/de/blog.html"}

    item_list = [{"@type": "ListItem", "position": i + 1,
                  "url": f"https://www.svanwijksolutions.nl{'/blog/' if lang == 'nl' else cfg['prefix'] + '/blog/'}{p['slug']}.html"}
                 for i, p in enumerate(posts_sorted)]
    json_ld = f'''  <script type="application/ld+json">
  {json.dumps({"@context": "https://schema.org", "@type": "ItemList", "itemListElement": item_list}, ensure_ascii=False)}
  </script>
'''

    html = head_common(lang, title, description, canonical_path, extra_head=json_ld)

    cards = "".join(blog_card_html(p, lang, delay_class=f" reveal--delay-{(i % 3) + 1}") for i, p in enumerate(posts_sorted))
    concept_href = cfg["concept_href_root"]

    html += f'''
  <main>
    <section class="page-hero">
      <div class="container">
        <span class="tag">{hero["tag"]}</span>
        <h1>{hero["h1"]}</h1>
        <p>{hero["p"]}</p>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container container--wide container--blog-wide">
        <div class="blog-toolbar">
          <div class="blog-search">
            {ICON_SEARCH}
            <input type="search" id="blogSearch" placeholder="{hero["search_placeholder"]}" aria-label="{hero["search_placeholder"]}">
          </div>
        </div>

        <nav class="blog-pagination blog-pagination--top" id="blogPaginationTop" aria-label="Paginering boven"></nav>

        <div class="blog-grid" id="blogGrid">
{cards}        </div>
        <p class="blog-empty" id="blogEmpty">{hero["empty"]}</p>

        <nav class="blog-pagination blog-pagination--bottom" id="blogPaginationBottom" aria-label="Paginering onder"></nav>
      </div>
    </section>

    <section class="cta-banner reveal">
      <div class="container">
        <h2>{hero["cta_h"]}</h2>
        <p>{hero["cta_p"]}</p>
        <a href="{concept_href}" class="btn btn--white">{hero["cta_btn"]}</a>
      </div>
    </section>
  </main>
'''
    extra_scripts = '  <script src="/js/blog.js"></script>\n'
    html += FOOTER_AND_SCRIPTS.format(extra_scripts=extra_scripts)
    return html


CASES_HEROES = {
    "nl": {"tag": "CASES", "h1": "Voor en na: bekijk het verschil",
           "p": "Een selectie van projecten. Schuif de vergelijking om oud en nieuw naast elkaar te zien.",
           "cta_h": "Wil jij ook zo'n resultaat?", "cta_p": "Vraag gratis een website concept aan, binnen 5 werkdagen in je inbox.",
           "cta_btn": "Gratis Concept Aanvragen", "live": "Bekijk live website", "old": "OUD", "new": "NIEUW"},
    "en": {"tag": "CASES", "h1": "Before and after: see the difference",
           "p": "A selection of projects. Drag the comparison to see old and new side by side.",
           "cta_h": "Want a result like this too?", "cta_p": "Request a free website concept, in your inbox within 5 working days.",
           "cta_btn": "Request Free Concept", "live": "View live website", "old": "OLD", "new": "NEW"},
    "de": {"tag": "CASES", "h1": "Vorher und nachher: der Unterschied",
           "p": "Eine Auswahl an Projekten. Verschieben Sie den Vergleich, um Alt und Neu nebeneinander zu sehen.",
           "cta_h": "Wollen Sie auch so ein Ergebnis?", "cta_p": "Fordern Sie kostenlos ein Website-Konzept an, innerhalb von 5 Werktagen in Ihrem Postfach.",
           "cta_btn": "Kostenloses Konzept Anfragen", "live": "Live-Website ansehen", "old": "ALT", "new": "NEU"},
}


def render_case_card(case, lang):
    hero = CASES_HEROES[lang]
    L = case.get(lang, {})
    titel = L.get("titel") or L.get("title") or ""
    beschrijving = L.get("beschrijving") or L.get("description") or L.get("beschreibung")
    live_link = ""
    domain = ""
    if case.get("link"):
        live_link = f'<a href="{case["link"]}" target="_blank" rel="noopener noreferrer" class="case-card__live">{hero["live"]} &rarr;</a>'
        domain = urlparse(case["link"]).netloc.removeprefix("www.")
    logo_html = ""
    if case.get("logo"):
        logo_html = f'<img src="{case["logo"]}" alt="" class="case-card__logo" loading="lazy">'
    desc_html = ""
    if beschrijving:
        desc_html = f'<p class="case-card__desc">{beschrijving}</p>'

    dots = ('<span class="case-compare__dot case-compare__dot--red"></span>'
            '<span class="case-compare__dot case-compare__dot--yellow"></span>'
            '<span class="case-compare__dot case-compare__dot--green"></span>')
    url_pill = ""
    if domain:
        url_pill = (f'<div class="case-compare__url">'
                    f'<svg class="case-compare__url-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                    f'stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect>'
                    f'<path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg><span>{domain}</span></div>')
    else:
        url_pill = '<div class="case-compare__url"></div>'

    if case.get("foto_oud"):
        # Voor/na-vergelijking: klant had al een website.
        visual = f'''<div class="case-compare" style="--split:50%;" data-case-compare>
            <div class="case-compare__frame case-compare__old">
              <div class="case-compare__bar">{dots}<div class="case-compare__url"></div><span class="case-compare__label">{hero["old"]}</span></div>
              <div class="case-compare__screen"><img src="{case["foto_oud"]}" alt="" loading="lazy"></div>
            </div>
            <div class="case-compare__frame case-compare__new">
              <div class="case-compare__bar">{dots}{url_pill}<span class="case-compare__label case-compare__label--new">{hero["new"]}</span></div>
              <div class="case-compare__screen"><img src="{case["foto_nieuw"]}" alt="" loading="lazy"></div>
            </div>
            <div class="case-compare__handle" data-case-handle>
              <div class="case-compare__handle-grip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 3 12 9 6"></polyline><polyline points="15 6 21 12 15 18"></polyline></svg>
              </div>
            </div>
          </div>'''
    else:
        # Geen oude website (klant had er nog geen): alleen de nieuwe site tonen, geen slider.
        visual = f'''<div class="case-compare case-compare--solo">
            <div class="case-compare__frame case-compare__new">
              <div class="case-compare__bar">{dots}{url_pill}</div>
              <div class="case-compare__screen"><img src="{case["foto_nieuw"]}" alt="" loading="lazy"></div>
            </div>
          </div>'''

    return f'''        <div class="case-card reveal">
          <div class="case-card__head">
            {logo_html}
            <h3>{titel}</h3>
          </div>
          {desc_html}
          {visual}
          {f'<div class="case-card__foot">{live_link}</div>' if live_link else ''}
        </div>
'''


def render_cases_listing(cases, lang):
    cfg = LANGS[lang]
    hero = CASES_HEROES[lang]
    title = {
        "nl": "Cases | Voorbeelden van onze websites | S. van Wijk Solutions",
        "en": "Cases | Examples of our websites | S. van Wijk Solutions",
        "de": "Cases | Beispiele unserer Websites | S. van Wijk Solutions",
    }[lang]
    description = {
        "nl": "Bekijk voor-en-na voorbeelden van websites die wij hebben gebouwd voor ondernemers wereldwijd.",
        "en": "See before-and-after examples of websites we've built for business owners worldwide.",
        "de": "Sehen Sie Vorher-Nachher-Beispiele von Websites, die wir für Unternehmer weltweit gebaut haben.",
    }[lang]
    canonical_path = {"nl": "/cases.html", "en": "/eng/cases.html", "de": "/de/cases.html"}
    html = head_common(lang, title, description, canonical_path)

    cards = "".join(render_case_card(c, lang) for c in cases)
    concept_href = cfg["concept_href_root"]

    html += f'''
  <main>
    <section class="page-hero">
      <div class="container">
        <span class="tag">{hero["tag"]}</span>
        <h1>{hero["h1"]}</h1>
        <p>{hero["p"]}</p>
      </div>
    </section>

    <section class="section section--alt">
      <div class="container container--wide">
        <nav class="blog-pagination blog-pagination--top" id="casesPaginationTop" aria-label="Paginering boven"></nav>

        <div class="cases-grid" id="casesGrid">
{cards}        </div>

        <nav class="blog-pagination blog-pagination--bottom" id="casesPaginationBottom" aria-label="Paginering onder"></nav>
      </div>
    </section>

    <section class="cta-banner reveal">
      <div class="container">
        <h2>{hero["cta_h"]}</h2>
        <p>{hero["cta_p"]}</p>
        <a href="{concept_href}" class="btn btn--white">{hero["cta_btn"]}</a>
      </div>
    </section>
  </main>
'''
    extra_scripts = '  <script src="/js/case-compare.js"></script>\n  <script src="/js/cases-pagination.js"></script>\n'
    html += FOOTER_AND_SCRIPTS.format(extra_scripts=extra_scripts)
    return html


def testimonial_card_html(t):
    if t.get("logo"):
        logo_html = f'<img src="{t["logo"]}" alt="" class="testimonial-card__logo" loading="lazy">'
    else:
        # Geen logo aangeleverd: toon een letter-avatar zodat het blokje
        # er nog steeds verzorgd uitziet in plaats van een lege ruimte.
        initial = (t.get("naam", "") or "?").strip()[:1].upper() or "?"
        logo_html = f'<span class="testimonial-card__logo testimonial-card__logo--fallback" aria-hidden="true">{initial}</span>'
    company_html = t.get("bedrijf", "")
    if t.get("link"):
        company_html = f'<a href="{t["link"]}" target="_blank" rel="noopener noreferrer" class="testimonial-card__company-link">{t.get("bedrijf", "")}</a>'
    return f'''          <div class="testimonial-card">
            <p class="testimonial-card__text">&ldquo;{t["tekst"]}&rdquo;</p>
            <div class="testimonial-card__footer">
              {logo_html}
              <div class="testimonial-card__who">
                <span class="testimonial-card__name">{t["naam"]}</span>
                <span class="testimonial-card__company">{company_html}</span>
              </div>
            </div>
          </div>
'''


def inject_between_markers(text, start_marker, end_marker, new_content):
    pattern = re.compile(re.escape(start_marker) + r".*?" + re.escape(end_marker), re.DOTALL)
    replacement = start_marker + "\n" + new_content + end_marker
    new_text, n = pattern.subn(replacement, text)
    if n != 1:
        raise SystemExit(f"marker pair {start_marker!r} matched {n} times, expected 1")
    return new_text


def update_homepage(lang, posts, testimonials):
    cfg = LANGS[lang]
    path = ROOT / ("index.html" if lang == "nl" else f"{cfg['prefix'].strip('/')}/index.html")
    text = path.read_text(encoding="utf-8")

    latest3 = sorted(posts, key=lambda p: p["date"], reverse=True)[:3]
    cards = "".join(blog_card_html(p, lang, delay_class=f" reveal--delay-{i + 1}") for i, p in enumerate(latest3))
    text = inject_between_markers(text, "<!-- BLOG_CARDS:START -->", "<!-- BLOG_CARDS:END -->", cards)

    # Eén exemplaar per testimonial: of de rij moet doorlopend bewegen
    # (en dus verdubbeld moet worden voor een naadloze loop) of statisch
    # getoond kan worden, hangt af van de daadwerkelijke schermbreedte —
    # dat bepaalt js/script.js runtime (zie initTestimonialsMarquee).
    t_cards = "".join(testimonial_card_html(t) for t in testimonials)
    text = inject_between_markers(text, "<!-- TESTIMONIALS_CARDS:START -->", "<!-- TESTIMONIALS_CARDS:END -->", t_cards)

    path.write_text(text, encoding="utf-8")


def update_sitemap(posts):
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")

    blocks = []
    for post in sorted(posts, key=lambda p: p["date"], reverse=True):
        slug = post["slug"]
        nl_url = f"https://www.svanwijksolutions.nl/blog/{slug}.html"
        en_url = f"https://www.svanwijksolutions.nl/eng/blog/{slug}.html"
        de_url = f"https://www.svanwijksolutions.nl/de/blog/{slug}.html"
        for loc, prio in [(nl_url, "0.7"), (en_url, "0.6"), (de_url, "0.6")]:
            blocks.append(
                f'  <url>\n'
                f'    <loc>{loc}</loc><priority>{prio}</priority><changefreq>monthly</changefreq>\n'
                f'    <xhtml:link rel="alternate" hreflang="nl" href="{nl_url}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="en" href="{en_url}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="de" href="{de_url}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="x-default" href="{nl_url}"/>\n'
                f'  </url>'
            )
    new_text = inject_between_markers(text, "<!-- BLOG_SITEMAP:START -->", "<!-- BLOG_SITEMAP:END -->",
                                       "\n".join(blocks) + "\n")
    path.write_text(new_text, encoding="utf-8")


def main():
    posts = load_json_dir(BLOG_DIR)
    testimonials = load_json_dir(TESTIMONIALS_DIR)
    cases = load_json_dir(CASES_DIR)

    if not posts:
        print("Geen blogposts gevonden in content/blog/, niets te doen.")
        return

    for lang, cfg in LANGS.items():
        blog_dir = ROOT / cfg["blog_dir"]
        blog_dir.mkdir(parents=True, exist_ok=True)
        # verwijder gegenereerde posts die niet meer in content/blog/ bestaan
        existing_slugs = {p["slug"] for p in posts}
        for f in blog_dir.glob("*.html"):
            if f.stem not in existing_slugs:
                f.unlink()
        for post in posts:
            out = blog_dir / f"{post['slug']}.html"
            out.write_text(render_post(post, lang), encoding="utf-8")

        blog_listing_path = ROOT / cfg["blog_file"]
        blog_listing_path.write_text(render_blog_listing(posts, lang), encoding="utf-8")

        if cases:
            cases_path = ROOT / cfg["cases_file"]
            cases_path.write_text(render_cases_listing(cases, lang), encoding="utf-8")

        update_homepage(lang, posts, testimonials)

    update_sitemap(posts)

    print(f"Gegenereerd: {len(posts)} blogposts x 3 talen, {len(cases)} cases x 3 talen, "
          f"homepages bijgewerkt met {len(testimonials)} testimonial(s).")


if __name__ == "__main__":
    sys.exit(main())
