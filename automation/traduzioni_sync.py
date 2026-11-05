#!/usr/bin/env python3
"""Multilingua fase 3: segna `tr: da_aggiornare` nelle traduzioni quando cambia il testo originale.

Gira in automatico a ogni COMMIT locale (hook .githooks/pre-commit, nessuna GitHub Action) se il commit tocca
_pages/, _posts/ o index.html. Confronta l'hash del testo originale con `tr_hash` salvato nella
traduzione (stesso algoritmo di admin/js/lingue.js, funzione lgHash). Non tocca le copie ancora
da tradurre (`tr: copia`) ne' quelle gia' segnate.
"""
# GUIDA-SVILUPPO (punti critici di traduzioni_sync.py)
# - lg_hash() DEVE restare identico a lgHash() in admin/js/lingue.js e a lg_hash() in allinea_hash.py: se uno dei tre cambia, tutte le traduzioni risultano "da aggiornare" o tutte allineate per errore.
# - Il confronto e' sul CORPO della pagina (dopo il front matter), non sul front matter: cambiare solo titolo/description non fa scattare "da_aggiornare".
# - Gira dall'hook .githooks/pre-commit a ogni commit che tocca _pages/, _posts/ o index.html. Deve stampare "Traduzioni segnate da aggiornare: 0" quando e' tutto allineato.
# - Le lingue arrivano da `languages:` in _config.yml PIU' ogni cartella xx/ trovata (rilevamento automatico). Il file originale si trova dal campo `ref:` (stesso ref = stessa pagina).
# - Salta le copie (`tr: copia`) e quelle gia' `da_aggiornare`. SKIP elenca pagine tecniche senza traduzione.
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP = {'404.md', 'categories-redirect.md', 'cat-list.md', 'category-archive.md', 'tag-archive.md', 'year-archive.md'}


def rd(p):
    with open(p, encoding='utf-8', newline='') as f:
        return f.read()


def wr(p, t):
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(t)


def to36(n):
    d = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0:
        return '0'
    s = ''
    while n:
        n, r = divmod(n, 36)
        s = d[r] + s
    return s


def lg_hash(s):
    s = (s or '').replace('\r', '').strip()
    h = 5381
    b = s.encode('utf-16-le', 'surrogatepass')
    for i in range(0, len(b), 2):
        c = b[i] | (b[i + 1] << 8)
        h = ((h << 5) + h + c) & 0xFFFFFFFF
    return to36(h)


def split(t):
    m = re.match(r'^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$', t)
    return m


def get(fm, k):
    m = re.search(r'^' + k + r':[ \t]*(.*)$', fm, re.M)
    return re.sub(r'^["\']|["\']$', '', m.group(1).strip()) if m else ''


def ref_of(kind, path, fm):
    r = get(fm, 'ref')
    if r:
        return r
    name = path.name
    if kind == 'home':
        return 'home'
    if kind == 'post':
        return re.sub(r'\.md$', '', re.sub(r'^\d{4}-\d{2}-\d{2}-', '', name))
    return re.sub(r'\.md$', '', name)


def collect(lang, base_lang):
    out = []
    if lang == base_lang:
        if (ROOT / 'index.html').exists():
            out.append(('home', ROOT / 'index.html'))
        for p in sorted((ROOT / '_pages').glob('*.md')):
            if p.name not in SKIP:
                out.append(('page', p))
        for p in sorted((ROOT / '_posts').rglob('*.md')):
            out.append(('post', p))
    else:
        d = ROOT / lang
        if (d / 'index.html').exists():
            out.append(('home', d / 'index.html'))
        for p in sorted(d.glob('*.md')):
            out.append(('page', p))
        for p in sorted((d / '_posts').rglob('*.md')):
            out.append(('post', p))
    return out


def main():
    cfg = rd(ROOT / '_config.yml')
    bm = re.search(r'^default_lang:\s*(\S+)', cfg, re.M)
    base = bm.group(1).strip('"\'') if bm else 'it'
    lm = re.search(r'^languages:\s*\[([^\]]*)\]', cfg, re.M)
    langs = [x.strip().strip('"\'') for x in lm.group(1).split(',') if x.strip()] if lm else [base]
    # RILEVAMENTO AUTOMATICO: ogni cartella alla radice con nome-lingua (xx o xx-yy) che contiene
    # index.html o .md e' una lingua, anche se non e' ancora elencata in `languages:` (es. cartella
    # clonata/rinominata a mano). L'admin > Lingue poi la registra in config; qui basta per le traduzioni.
    for d in sorted(ROOT.iterdir()):
        if d.is_dir() and re.fullmatch(r'[a-z]{2}(-[a-z]{2})?', d.name) and d.name not in langs \
                and ((d / 'index.html').exists() or any(d.glob('*.md'))):
            langs.append(d.name)

    base_docs = {}
    for kind, p in collect(base, base):
        m = split(rd(p))
        fm, body = (m.group(1), m.group(2)) if m else ('', rd(p))
        base_docs[ref_of(kind, p, fm)] = lg_hash(body)

    cambiati = 0
    for lang in langs:
        if lang == base:
            continue
        for kind, p in collect(lang, base):
            t = rd(p)
            m = split(t)
            if not m:
                continue
            fm = m.group(1)
            tr = get(fm, 'tr')
            if tr in ('copia', 'da_aggiornare'):
                continue
            ref = ref_of(kind, p, fm)
            trh = get(fm, 'tr_hash')
            if ref not in base_docs or not trh or trh == base_docs[ref]:
                continue
            nl = '\r\n' if '\r\n' in t else '\n'
            if re.search(r'^tr:.*$', fm, re.M):
                newfm = re.sub(r'^tr:.*$', 'tr: da_aggiornare', fm, count=1, flags=re.M)
            else:
                newfm = fm + nl + 'tr: da_aggiornare'
            wr(p, t[:m.start(1)] + newfm + t[m.end(1):])
            cambiati += 1
            print('da_aggiornare:', p.relative_to(ROOT))
    print('Traduzioni segnate da aggiornare:', cambiati)
    return 0


if __name__ == '__main__':
    sys.exit(main())
