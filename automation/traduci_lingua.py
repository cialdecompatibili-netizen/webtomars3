#!/usr/bin/env python3
"""Traduce in automatico gli articoli segnati `tr: copia` di una lingua (es. en).

USO (dalla radice del sito):
    pip install deep-translator
    python automation/traduci_lingua.py en                 # tutti gli articoli ancora 'copia'
    python automation/traduci_lingua.py en --limit 3       # solo i primi 3 (prova)
    python automation/traduci_lingua.py en --file leibovitz  # solo i file il cui nome contiene il testo

COSA FA
- Legge `<lingua>/_posts/**/*.md` con `tr: copia` (le copie create dall'admin > Lingue).
- Traduce title, excerpt, seo_title, seo_description e il corpo HTML, lasciando intatti tag, link,
  immagini, iframe e classi. I tag in linea (strong, em, a...) diventano segnaposto [1] [2]...
  durante la traduzione; se la verifica fallisce si traduce testo per testo (sempre sicuro).
- Imposta `tr: tradotto`, toglie `sitemap: false`, lascia `tr_hash` (cosi' traduzioni_sync.py
  segna `da_aggiornare` solo se cambia l'italiano).
- E' RIPRENDIBILE: le frasi gia' tradotte stanno in automation/tmp/cache_tr.json e i file gia'
  fatti non vengono ripresi. Se Google blocca (troppe richieste) aspetta e riprova da solo.
- NON fa commit: controlla il risultato e poi fai tu `git add -A && git commit`.

PER CAMBIARE MOTORE: sostituisci solo la funzione `motore()` (es. DeepL con la tua chiave).
"""
# GUIDA-SVILUPPO (punti critici di traduci_lingua.py)
# - Tocca SOLO articoli con `tr: copia` in <lingua>/_posts: le pagine (<lingua>/*.md) si traducono a mano o con l'admin.
# - Dopo la traduzione imposta `tr: tradotto` MA lascia tr_hash: e' il legame con l'italiano (vedi traduzioni_sync.py). Se cambi il testo a mano, poi `python automation/allinea_hash.py <lingua>`.
# - I tag HTML diventano segnaposto [1] [2]...: se la verifica (annidamento_ok / unita) fallisce si traduce testo per testo. Non "semplificare" questa parte: e' quella che evita link e immagini rotti.
# - La cache frasi sta in automation/tmp/cache_tr.json (riprendibile): non cancellarla a meta' lavoro. Non fa commit: controlla il risultato a occhio e poi committa tu.
# - Per cambiare motore di traduzione modifica solo motore(). PAUSA e' l'anti-blocco verso il servizio: non azzerarla.
import hashlib
import html
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / 'automation' / 'tmp' / 'cache_tr.json'
PAUSA = 0.6  # secondi tra una richiesta e l'altra (anti-blocco)
INLINE = {'a', 'strong', 'b', 'em', 'i', 'u', 'span', 'sup', 'sub', 'small', 'mark', 'abbr', 'cite', 'code', 's', 'del', 'ins', 'font'}
TAGRE = re.compile(r'(<!--.*?-->|<(?:script|style|iframe)\b.*?</(?:script|style|iframe)>|<[^>]+>)', re.S)
FM_KEYS = ('title', 'excerpt', 'seo_title', 'seo_description')

cache = {}
nuovi = 0


def carica_cache():
    global cache
    if CACHE_FILE.exists():
        cache = json.loads(CACHE_FILE.read_text(encoding='utf-8'))


def salva_cache():
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False), encoding='utf-8')


def motore(testo, lingua):
    """Unico punto che parla col traduttore. Cambia solo questa funzione per usare un altro servizio."""
    # Endpoint "gtx" di Google: non richiede librerie e di solito non e' bloccato come translate.google.com
    # (che usa deep-translator). Se un giorno smette di funzionare, usa il ripiego qui sotto.
    import urllib.parse
    import urllib.request
    url = ('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=%s&dt=t&q=%s'
           % (lingua, urllib.parse.quote(testo)))
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as r:
        return ''.join(x[0] for x in json.loads(r.read())[0] if x and x[0])
    # ripiego (libreria): from deep_translator import GoogleTranslator
    #                     return GoogleTranslator(source='auto', target=lingua).translate(testo)


def traduci(testo, lingua):
    """Traduce una stringa con cache, pausa e nuovi tentativi se Google blocca."""
    global nuovi
    testo = testo.strip()
    if not re.search(r'[A-Za-zÀ-ÿ]', testo):
        return testo
    chiave = hashlib.sha1((lingua + '|' + testo).encode('utf-8')).hexdigest()
    if chiave in cache:
        return cache[chiave]
    if len(testo) > 4500:  # limite del servizio: spezza alle frasi
        pezzi = re.split(r'(?<=[.!?])\s+', testo)
        out, cur = [], ''
        for p in pezzi:
            if len(cur) + len(p) > 4000 and cur:
                out.append(cur)
                cur = p
            else:
                cur = (cur + ' ' + p).strip()
        out.append(cur)
        return ' '.join(traduci(x, lingua) for x in out)
    for tentativo in range(10):
        try:
            risultato = motore(testo, lingua) or testo
            break
        except Exception as e:  # blocco temporaneo o rete: attesa crescente
            attesa = min(60 * (tentativo + 1), 300)
            print('   pausa %ds (%s)' % (attesa, type(e).__name__), flush=True)
            time.sleep(attesa)
    else:
        raise RuntimeError('Traduzione impossibile dopo 10 tentativi: riavvia lo script piu\' tardi')
    cache[chiave] = risultato
    nuovi += 1
    if nuovi % 15 == 0:
        salva_cache()
    time.sleep(PAUSA)
    return risultato


def esc(t):
    return html.escape(t, quote=False).replace('\u00a0', '&nbsp;')


def annidamento_ok(tags):
    pila = []
    for t in tags:
        m = re.match(r'<(/?)([a-zA-Z0-9]+)', t)
        chiuso, nome = m.group(1), m.group(2).lower()
        if t.endswith('/>'):
            continue
        if not chiuso:
            pila.append(nome)
        else:
            if not pila or pila.pop() != nome:
                return False
    return not pila


def unita(tokens, lingua):
    """tokens: lista di ('t', testo) e ('i', tag in linea). Ritorna l'HTML tradotto."""
    testo = ''.join(html.unescape(v) if k == 't' else '[%d]' % i for i, (k, v) in enumerate(tokens))
    tags = [v for k, v in tokens if k == 'i']
    if not re.search(r'[A-Za-zÀ-ÿ]', re.sub(r'\[\d+\]', '', testo)):
        return ''.join(v if k == 'i' else v for k, v in tokens)
    sx = testo[:len(testo) - len(testo.lstrip())]
    dx = testo[len(testo.rstrip()):]
    out = traduci(testo, lingua)
    out = re.sub(r'\[\s*(\d+)\s*\]', lambda m: '[%s]' % m.group(1), out)
    idx = [i for i, (k, _) in enumerate(tokens) if k == 'i']
    ok = all(out.count('[%d]' % i) == 1 for i in idx)
    if ok:
        ordine = [int(x) for x in re.findall(r'\[(\d+)\]', out)]
        ris = re.sub(r'\[(\d+)\]', lambda m: '\x00%s\x00' % m.group(1), esc(out))
        ris = re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m.group(1))][1], ris)
        if annidamento_ok([tokens[i][1] for i in ordine]):
            return esc(sx).replace('&nbsp;', '&nbsp;') + ris.strip() + esc(dx)
    # ripiego: ogni pezzo di testo da solo (mai rompe l'HTML)
    res = []
    for k, v in tokens:
        if k == 'i':
            res.append(v)
        else:
            u = html.unescape(v)
            a = u[:len(u) - len(u.lstrip())]
            b = u[len(u.rstrip()):]
            res.append(esc(a) + esc(traduci(u, lingua)) + esc(b) if u.strip() else v)
    return ''.join(res)


def traduci_corpo(body, lingua):
    out, buf = [], []

    def svuota():
        if buf:
            out.append(unita(buf[:], lingua))
            buf.clear()

    for tok in TAGRE.split(body):
        if not tok:
            continue
        if tok.startswith('<') and TAGRE.fullmatch(tok):
            m = re.match(r'</?([a-zA-Z0-9]+)', tok)
            if m and m.group(1).lower() in INLINE and not tok.startswith('<!--'):
                buf.append(('i', tok))
            else:
                svuota()
                out.append(tok)
        else:
            buf.append(('t', tok))
    svuota()
    return ''.join(out)


def traduci_fm(fm, lingua):
    for k in FM_KEYS:
        m = re.search(r'^(' + k + r'):[ \t]*(["\']?)(.*?)\2[ \t]*$', fm, re.M)
        if not m or not m.group(3).strip():
            continue
        valore = m.group(3).replace('\\"', '"')
        nuovo = traduci(html.unescape(valore), lingua).replace('"', '\\"')
        fm = fm[:m.start()] + '%s: "%s"' % (k, nuovo) + fm[m.end():]
    fm = re.sub(r'^tr:.*$', 'tr: tradotto', fm, count=1, flags=re.M)
    fm = re.sub(r'^sitemap:.*\r?\n?', '', fm, flags=re.M)
    return fm.rstrip()


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 1
    lingua = args[0]
    limite = int(args[args.index('--limit') + 1]) if '--limit' in args else 10 ** 9
    filtro = args[args.index('--file') + 1] if '--file' in args else ''
    carica_cache()
    fatti = 0
    for p in sorted((ROOT / lingua / '_posts').rglob('*.md')):
        if filtro and filtro not in p.name:
            continue
        with open(p, encoding='utf-8', newline='') as f:
            t = f.read()
        m = re.match(r'^---(\r?\n)([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$', t)
        if not m or not re.search(r'^tr:\s*copia\s*$', m.group(2), re.M):
            continue
        if fatti >= limite:
            break
        nl = m.group(1)
        if '\ufffd' in t:
            print('   ATTENZIONE: %s contiene caratteri rovinati (\\ufffd) gia\' nell\'originale' % p.name)
        print('[%d] %s' % (fatti + 1, p.name), flush=True)
        fm = traduci_fm(m.group(2), lingua)
        body = traduci_corpo(m.group(3), lingua)
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write('---' + nl + fm + nl + '---' + nl + body)
        salva_cache()
        fatti += 1
    salva_cache()
    print('FINITO. Articoli tradotti in questa esecuzione: %d' % fatti, flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
