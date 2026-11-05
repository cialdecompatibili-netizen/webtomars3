#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
migra_da_sito.py - porta il CONTENUTO di un sito al-folio (webtomars) dentro questo clone del template mistraltemplate1.

COSA FA (idempotente: si puo' rilanciare, riscrive gli stessi file):
  1. _servizi/*.md        copiati, tolto 'layout: servizio' (il layout viene da _config.yml > defaults)
  2. _data/servizi_gruppi.yml + _includes/servizi_tabella.html + _pages/servizi.md (pagina dinamica a sezioni)
  3. _posts/*.md          front matter adattato (thumbnail -> header.teaser, toc, niente barra autore/commenti) + immagini
  4. _progetti/*.md       da _projects/ (collection del template)
  5. _pages/azienda.md    = pagina Chi siamo copiata (CSS e script inclusi), link /projects/ -> /progetti/
  6. _pages/progetti.md   elenco progetti; _pages/contatti.md riceve il testo introduttivo del sito di partenza
  7. home                 _data/blocks_home.json (hero con Marte + reti) + assets/css/home-webtomars.css + assets/js/home-webtomars.js
  8. menu, tema, config   navigation.yml, sottomenu.yml (tendina Agenzia), tema.json, description, languages
  9. pulizia              tolti i segnaposto del template (articoli di prova, en/, esempi shop, redirect)
DA DOVE RICAVA I DATI: argomento --da (cartella del sito di partenza); destinazione = la radice di questa repo (cartella sopra automation/).
NON scrive url/baseurl, non tocca CNAME. Dopo: python automation/permalink_articoli.py --apply, poi commit e push.
"""
import argparse, json, pathlib, re, shutil, sys

ap = argparse.ArgumentParser()
ap.add_argument('--da', required=True, help='cartella del sito di partenza (es. ..\\webtomars)')
A = ap.parse_args()
S = pathlib.Path(A.da).resolve()
R = pathlib.Path(__file__).resolve().parent.parent
log = []


def rd(p):
    return pathlib.Path(p).read_bytes().decode('utf-8-sig').replace('\r\n', '\n')


def wr(p, s):
    p = pathlib.Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(s.encode('utf-8'))  # niente BOM, a-capo LF


def split_fm(t):
    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', t, re.S)
    return (m.group(1), m.group(2)) if m else ('', t)


def fm_get(fm, key):
    m = re.search(r'(?m)^' + re.escape(key) + r':[ \t]*(.*)$', fm)
    return m.group(1).strip().strip('"').strip("'") if m else ''


def fm_drop(fm, key):
    # toglie la riga 'key:' e le righe rientrate che la seguono
    return re.sub(r'(?m)^' + re.escape(key) + r':.*(?:\n[ \t]+.*)*\n?', '', fm).strip('\n')


def ent(s):
    # accenti nei blocchi JSON come entita' numeriche (regola del template)
    return s.encode('ascii', 'xmlcharrefreplace').decode('ascii')


def rm(p):
    p = pathlib.Path(p)
    if p.is_dir():
        shutil.rmtree(p, ignore_errors=True)
    elif p.exists():
        p.unlink()


# ---------------------------------------------------------------- 1-2 SERVIZI
n = 0
for f in sorted((S / '_servizi').glob('*.md')):
    fm, body = split_fm(rd(f))
    fm = fm_drop(fm, 'layout')
    wr(R / '_servizi' / f.name, '---\n' + fm + '\n---\n' + body)
    n += 1
log.append('servizi: %d' % n)
shutil.copyfile(S / '_data' / 'servizi_gruppi.yml', R / '_data' / 'servizi_gruppi.yml')
wr(R / '_includes' / 'servizi_tabella.html', rd(S / '_includes' / 'servizi_tabella.liquid'))
t = rd(S / '_pages' / 'servizi.md')
fm, body = split_fm(t)
body = body.replace('servizi_tabella.liquid', 'servizi_tabella.html')
wr(R / '_pages' / 'servizi.md',
   '---\nlayout: single\ntitle: "Servizi"\npermalink: /servizi/\nref: servizi\nauthor_profile: false\nclasses: wide\n'
   'seo_description: "I servizi della web agency: strategia, SEO, advertising, siti, e-commerce, sicurezza e applicazioni su misura."\n---\n' + body)

# ---------------------------------------------------------------- 3 POST
meta = {}
mp = S / '_data' / 'category_meta.yml'
if mp.exists():
    cur = None
    for l in rd(mp).split('\n'):
        m = re.match(r'^([A-Za-z0-9_\-]+):\s*$', l)
        if m:
            cur = m.group(1)
            meta[cur] = ''
        m = re.match(r'^\s+desc:\s*"(.*)"\s*$', l)
        if m and cur:
            meta[cur] = m.group(1)
cats = []
(R / 'assets' / 'images' / 'blog').mkdir(parents=True, exist_ok=True)
for f in sorted((S / '_posts').glob('*.md')):
    fm, body = split_fm(rd(f))
    th = fm_get(fm, 'thumbnail')
    cat = fm_get(fm, 'categories').strip('[]')
    if cat and cat not in cats:
        cats.append(cat)
    for k in ('layout', 'thumbnail', 'thumbnail_alt', 'toc', 'categories', 'featured', 'tags'):
        fm = fm_drop(fm, k)
    nome = {'seo': 'SEO'}.get(cat, cat.replace('-', ' ').capitalize())
    extra = 'categories:\n  - %s\ntoc: true\nauthor_profile: false\ncomments: false\n' % nome
    if th:
        src = S / th
        dst = R / 'assets' / 'images' / 'blog' / src.name
        if src.exists():
            shutil.copyfile(src, dst)
        extra += 'header:\n  teaser: /assets/images/blog/%s\n' % src.name
    body = re.sub(r"/assets/img/([^'\"\s)|]+\.(?:jpg|jpeg|png|webp|svg))", lambda m: '/assets/images/blog/' + m.group(1), body)
    wr(R / '_posts' / f.name, '---\n' + fm + '\n' + extra + '---\n' + body)
cj = []
for c in cats:
    nome = {'seo': 'SEO'}.get(c, c.replace('-', ' ').capitalize())
    cj.append({'nome': nome, 'descrizione': meta.get(c) or 'Guide e approfondimenti: %s.' % nome})
wr(R / '_data' / 'categorie.json', json.dumps(cj, ensure_ascii=False, indent=2) + '\n')
log.append('post: %d, categorie: %s' % (len(list((S / '_posts').glob('*.md'))), ', '.join(cats)))
for f in (R / '_posts').glob('*.md'):
    if re.search(r'(prova|esempio)', f.name):
        f.unlink()

# ---------------------------------------------------------------- 4 PROGETTI
for f in sorted((S / '_projects').glob('*.md')):
    fm, body = split_fm(rd(f))
    for k in ('layout', 'img', 'category'):
        fm = fm_drop(fm, k)
    if 'in_home' not in fm:
        fm += '\nin_home: true'
    wr(R / '_progetti' / f.name, '---\nlayout: single\nauthor_profile: false\n' + fm + '\n---\n' + body)
log.append('progetti: %d' % len(list((S / '_projects').glob('*.md'))))

# ---------------------------------------------------------------- 5-6 PAGINE
az = rd(S / '_pages' / 'chi-siamo.md')
fm, body = split_fm(az)
desc = fm_get(fm, 'description')
body = body.replace("'/projects/", "'/progetti/")
wr(R / '_pages' / 'azienda.md',
   '---\nlayout: single\ntitle: "Chi siamo"\npermalink: /chi-siamo/\nref: azienda\nauthor_profile: false\nclasses: wide\n'
   'seo_description: "%s"\n---\n' % desc.replace('"', "'") + body)
wr(R / '_pages' / 'progetti.md', '''---
layout: single
title: "Progetti"
permalink: /progetti/
ref: progetti
author_profile: false
classes: wide
seo_description: "I progetti realizzati: e-commerce, siti WordPress, SEO e branding."
---
<link rel="stylesheet" href="{{ '/assets/css/home-webtomars.css' | relative_url }}">
{%- comment -%} Elenco dinamico dei file di _progetti/ (campo importance, 1 = per primo). Link esterno se il progetto ha 'redirect:'. {%- endcomment -%}
{%- assign prj = site.progetti | sort: 'importance', 'last' -%}
<div class="prj-home"><div class="prj-home-grid">
{%- for p in prj -%}
<a class="prj-home-card" href="{{ p.url | relative_url }}"><b>{{ p.title | escape }}</b>{% if p.description != blank %}<small>{{ p.description | escape }}</small>{% endif %}</a>
{%- endfor -%}
</div></div>
''')
ct = rd(R / '_pages' / 'contatti.md')
sc = rd(S / '_pages' / 'contatti.md')
m = re.search(r'<p class="cf-intro">.*?</p>', sc, re.S)
if m and 'Hai un progetto in mente' not in ct:
    ct = ct.replace('{%- endcomment -%}', '{%- endcomment -%}\n\n' + m.group(0), 1)
    wr(R / '_pages' / 'contatti.md', ct)

# ---------------------------------------------------------------- 7 HOME
h = rd(S / '_pages' / 'home.md')
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', h, re.S))
css = re.sub(r'(\.rete-box[^{,]*?)\bh2\b', r'\1h1', css)
wr(R / 'assets' / 'css' / 'home-webtomars.css',
   '/* Stili della home e delle card (servizi, progetti, articoli) portati da webtomars. Caricato dal blocco hero e da _pages/progetti.md. */\n' + css + '\n')
js = re.findall(r'<script>(.*?)</script>', h, re.S)
js = [x.replace("\"{{ '/assets/img/marte.webp' | relative_url }}\"", "(o.getAttribute('data-img')||'')") for x in js]
wr(R / 'assets' / 'js' / 'home-webtomars.js',
   '/* Home webtomars: Marte che ruota (canvas) + rete di punti dietro il titolo. Legge .marte-orbita[data-img] e #rete-box. Se mancano non fa nulla. */\n' + '\n'.join(js) + '\n')
mm = re.search(r"\{%-?\s*if site\.home_marte != false\s*%\}(<div class=\"marte-orbita\".*?)\{%-?\s*endif\s*%\}", h, re.S)
marte = mm.group(1) if mm else ''
marte = marte.replace('<div class="marte-orbita"', '<div class="marte-orbita" data-img="__BASEURL__/assets/img/marte.webp"', 1)
bx = re.search(r'<div class="rete-box"[^>]*>(.*?)\n</div>', h, re.S).group(1)
testo = []
for l in bx.split('\n'):
    l = l.strip()
    if not l or l.startswith('<!--') or l.startswith('{%') or l.startswith('<canvas') or l.startswith('<div class="marte'):
        continue
    l = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', l)
    l = re.sub(r"\{\{\s*'([^']*)'\s*\|\s*relative_url\s*\}\}", r'__BASEURL__\1', l)
    if l.startswith('## '):
        testo.append('<h1>' + l[3:] + '</h1>')
    elif not re.match(r'<(div|canvas|h\d|section|ul|ol)\b', l):
        testo.append('<p>' + l + '</p>')
    else:
        testo.append(l)
hero = ('<link rel="stylesheet" href="__BASEURL__/assets/css/home-webtomars.css"><div class="rete-box" id="rete-box">' + marte +
        '<canvas id="rete-cv" aria-hidden="true"></canvas>' + ''.join(testo) + '</div>'
        '<script src="__BASEURL__/assets/js/home-webtomars.js" defer></script>')
src_marte = S / 'assets' / 'img' / 'marte.webp'
if src_marte.exists():
    (R / 'assets' / 'img').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src_marte, R / 'assets' / 'img' / 'marte.webp')
bj = json.loads(rd(R / '_data' / 'blocks_home.json'))
modello = dict(bj[0])


def blocco(i, nome, html):
    b = dict(modello)
    b.update({'id': i, 'nome': nome, 'enabled': True, 'html': ent(html)})
    return b


blocchi = [blocco('hero', 'Hero', hero), blocco('features', 'Servizi', ''), blocco('progetti', 'Progetti', ''), blocco('avvisi', 'Ultimi articoli', '')]
wr(R / '_data' / 'blocks_home.json', json.dumps(blocchi, ensure_ascii=False, indent=2) + '\n')
wr(R / '_includes' / 'home-servizi.html', '''{%- comment -%}
GUIDA-SVILUPPO: blocco "Servizi" della home (render-blocks.html, id "features"). DINAMICO: prende i servizi di _servizi con in_home: true, in ordine alfabetico.
Descrizione tagliata a 8 parole. Se nessun servizio ha in_home: true la sezione sparisce. NON scrivere card a mano. Stili: assets/css/home-webtomars.css.
{%- endcomment -%}
{%- assign srv_home = site.servizi | where: 'in_home', 'true' | sort: 'title' -%}
{%- if srv_home.size > 0 %}
<div class="srv-home"><h2>I nostri servizi</h2><div class="srv-home-grid">
{%- for p in srv_home -%}
<a class="srv-home-card" href="{{ p.url | relative_url }}"><b>{{ p.title | escape }}</b>{% if p.description != blank %}<small>{{ p.description | truncatewords: 8 | escape }}</small>{% endif %}</a>
{%- endfor %}
</div><div class="srv-home-more"><a href="{{ '/servizi/' | relative_url }}">Vedi tutti i servizi</a></div></div>
{%- endif %}
''')
wr(R / '_includes' / 'home-progetti.html', '''{%- comment -%}
GUIDA-SVILUPPO: blocco "Progetti" della home (render-blocks.html, id "progetti"). DINAMICO da _progetti: se almeno uno ha in_home: true vanno solo quelli, altrimenti i primi 6.
Ordine = campo importance (1 per primo). Link esterno se il progetto ha 'redirect:'. Stili: assets/css/home-webtomars.css.
{%- endcomment -%}
{%- assign prj_home = site.progetti | where: 'in_home', 'true' | sort: 'importance', 'last' -%}
{%- assign prj_limit = prj_home.size -%}
{%- if prj_home.size == 0 -%}{%- assign prj_home = site.progetti | sort: 'importance', 'last' -%}{%- assign prj_limit = 6 -%}{%- endif -%}
{%- if prj_home.size > 0 %}
<div class="prj-home"><h2>I nostri progetti</h2><div class="prj-home-grid">
{%- for p in prj_home limit: prj_limit -%}
{%- assign p_ext = false -%}{%- if p.redirect contains '://' -%}{%- assign p_ext = true -%}{%- endif -%}
<a class="prj-home-card" href="{% if p_ext %}{{ p.redirect }}{% else %}{{ p.url | relative_url }}{% endif %}"{% if p_ext %} target="_blank" rel="noopener"{% endif %}><b>{{ p.title | escape }}</b>{% if p.description != blank %}<small>{{ p.description | escape }}</small>{% endif %}</a>
{%- endfor %}
</div><div class="prj-home-more"><a href="{{ '/progetti/' | relative_url }}">Vedi tutti i progetti</a></div></div>
{%- endif %}
''')
wr(R / '_includes' / 'home-articoli.html', '''{%- comment -%}
GUIDA-SVILUPPO: blocco "Ultimi articoli" della home (render-blocks.html, id "avvisi"). DINAMICO: gli ultimi 3 articoli del blog. Stili: assets/css/home-webtomars.css (stesse card dei servizi).
{%- endcomment -%}
{%- if site.posts.size > 0 %}
<div class="srv-home"><h2>Dal blog</h2><div class="srv-home-grid">
{%- for p in site.posts limit: 3 -%}
<a class="srv-home-card" href="{{ p.url | relative_url }}"><b>{{ p.title | escape }}</b>{% assign d = p.description | default: p.excerpt | strip_html | strip %}{% if d != blank %}<small>{{ d | truncatewords: 14 | escape }}</small>{% endif %}</a>
{%- endfor %}
</div><div class="srv-home-more"><a href="{{ '/blog/' | relative_url }}">Vai al blog</a></div></div>
{%- endif %}
''')
rb_ = rd(R / '_includes' / 'render-blocks.html')
if "home-articoli.html" not in rb_:
    rb_ = rb_.replace("{% elsif block.id == 'progetti' %}{% include home-progetti.html %}",
                      "{% elsif block.id == 'progetti' %}{% include home-progetti.html %}\n{% elsif block.id == 'avvisi' and site.posts.size > 0 %}{% include home-articoli.html %}")
    wr(R / '_includes' / 'render-blocks.html', rb_)

# ---------------------------------------------------------------- 8 MENU, TEMA, CONFIG
nav = rd(R / '_data' / 'navigation.yml')
nav = nav[:nav.index('main:')] + '''main:
  - title: "Home"
    url: /
  - title: "Agenzia"
    url: /chi-siamo/
  - title: "Progetti"
    url: /progetti/
  - title: "Contatti"
    url: /contatti/
'''
wr(R / '_data' / 'navigation.yml', nav)
sm = rd(R / '_data' / 'sottomenu.yml')
if '\nAgenzia:' not in sm:
    sm = sm.rstrip('\n') + '''

Agenzia:
  - title: "Blog"
    url: /blog/
  - divider: true
  - title: "Chi siamo"
    url: /chi-siamo/
  - divider: true
  - title: "Servizi"
    url: /servizi/
'''
    wr(R / '_data' / 'sottomenu.yml', sm)
tj = json.loads(rd(R / '_data' / 'tema.json'))
tj.update({'accent': '#4f3cf2', 'accent_dark': '#15173b', 'nav_hover': '#4f3cf2', 'link': '#4f3cf2'})
wr(R / '_data' / 'tema.json', json.dumps(tj, ensure_ascii=False, indent=2) + '\n')
cfg = rd(R / '_config.yml')
sd = re.search(r'(?m)^description:\s*>[^\n]*\n\s+(.+)$', rd(S / '_config.yml'))
if sd:
    cfg = re.sub(r'(?m)^description:.*$', lambda _m: 'description: "%s"' % sd.group(1).strip().replace('"', "'"), cfg, count=1)
cfg = re.sub(r'(?m)^languages:.*$', 'languages: [it]', cfg, count=1)
if 'toc_label: "In questa pagina"' not in cfg:
    cfg = cfg.replace("      type: servizi\n    values:\n      layout: single\n      author_profile: false",
                      "      type: servizi\n    values:\n      layout: single\n      author_profile: false\n      toc: true\n      toc_label: \"In questa pagina\"", 1)
wr(R / '_config.yml', cfg)

# ---------------------------------------------------------------- 9 PULIZIA SEGNAPOSTO
for p in ('en', '_data/i18n/en', 'redirect', '_pages/cat-guide.md', '_pages/cat-novita.md'):
    rm(R / p)
for f in (R / '_negozio').glob('*.md'):
    f.unlink()
log.append('pulizia: en/, redirect/, esempi shop, categorie Guide/Novita')
print('\n'.join(log))
