#!/usr/bin/env python3
"""allinea_hash.py - dopo aver TRADOTTO a mano pagine/articoli di una lingua (cartella xx/),
imposta su ogni file tradotto  tr: tradotto  e  tr_hash = hash del testo italiano (stesso
algoritmo di admin/js/lingue.js e automation/traduzioni_sync.py).

Uso (dalla radice della repo):
  python automation/allinea_hash.py            # tutte le cartelle lingua, file non 'copia'
  python automation/allinea_hash.py en         # solo la lingua en
  python automation/allinea_hash.py en --forza # anche i file ancora 'copia'

Il file italiano si trova dal campo `ref:` (stesso ref = stessa pagina). I file senza ref o senza
originale italiano restano com'erano. NON usare se il testo non e' davvero tradotto: l'hash dice
"questa traduzione e' allineata all'italiano di adesso".
"""
# GUIDA-SVILUPPO (punti critici di allinea_hash.py)
# - Usalo SOLO dopo aver davvero tradotto/aggiornato il testo: dice "questa traduzione e' allineata all'italiano di adesso". Se il testo non e' tradotto, nasconde il problema.
# - Stesso algoritmo di hash di traduzioni_sync.py e admin/js/lingue.js: non modificarlo da solo.
# - Caso tipico: hai cambiato il corpo IT e quello EN nello stesso modo (es. un colore dentro uno <style>) -> `python automation/allinea_hash.py en`. Meglio ancora: gli stili vanno in assets/css, non nel corpo.
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import traduzioni_sync as ts  # stessa libreria dell'hook: un solo algoritmo di hash

ROOT = Path(__file__).resolve().parent.parent
EXT = ('.md', '.html')


def front(t):
    m = ts.split(t)
    return (m.group(1), m.group(2)) if m else (None, None)


def base_by_ref(skip):
    out = {}
    cands = [ROOT / 'index.html']
    for d in ('_pages', '_posts', '_negozio', '_servizi', '_progetti'):
        cands += sorted((ROOT / d).rglob('*')) if (ROOT / d).exists() else []
    for p in cands:
        if not p.is_file() or p.suffix not in EXT:
            continue
        fm, body = front(p.read_text(encoding='utf-8'))
        if fm is None:
            continue
        ref = ts.get(fm, 'ref') or ('home' if p.name == 'index.html' else '')
        if ref and ref not in out:
            out[ref] = body
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    forza = '--forza' in sys.argv
    langs = args or sorted(d.name for d in ROOT.iterdir() if d.is_dir() and re.fullmatch(r'[a-z]{2}', d.name))
    base = base_by_ref(set(langs))
    n = 0
    for lang in langs:
        for p in sorted((ROOT / lang).rglob('*')):
            if not p.is_file() or p.suffix not in EXT:
                continue
            t = p.read_text(encoding='utf-8')
            fm, body = front(t)
            if fm is None:
                continue
            ref = ts.get(fm, 'ref') or ('home' if p.name == 'index.html' else '')
            if ref not in base:
                continue
            if ts.get(fm, 'tr') == 'copia' and not forza:
                continue
            h = ts.lg_hash(base[ref])
            new = fm
            new = re.sub(r'^tr:.*$', 'tr: tradotto', new, count=1, flags=re.M) if re.search(r'^tr:', new, re.M) else new + '\ntr: tradotto'
            new = re.sub(r'^tr_hash:.*$', 'tr_hash: ' + h, new, count=1, flags=re.M) if re.search(r'^tr_hash:', new, re.M) else new + '\ntr_hash: ' + h
            if new != fm:
                p.write_text('---\n' + new + '\n---\n' + body, encoding='utf-8', newline='\n')
                n += 1
                print('allineato', p.relative_to(ROOT), h)
    print('file aggiornati:', n)


if __name__ == '__main__':
    main()
