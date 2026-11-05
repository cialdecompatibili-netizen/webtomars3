# GUIDA-SVILUPPO: PERSONALIZZA UN CLONE IN UN COLPO SOLO (colori, logo, sfondo home). Lo chiama nuovo_sito.ps1; si puo' lanciare anche a mano.
# Uso, dalla radice del clone:
#   python automation/personalizza_clone.py --accent "#8a6a3a" --dark "#503629" --iniziale P --stile pelle [--bg "#fbf8f3"] [--text "#2b2622"]
# Cosa fa (idempotente: si puo' rilanciare quante volte vuoi, il risultato non cambia):
#   1) scrive _data/tema.json (accent, accent_dark, nav_hover, link, + bg/text se passati)
#   2) sostituisce nei css/html/layout i colori di default del template (azzurro/teal/ghiaccio) con la palette nuova
#   3) rinomina lo sfondo home artico-hero.jpg -> hero.jpg (css aggiornati) e lo rigenera con genera_texture.py
#   4) rigenera logo e favicon con genera_logo.py
# Non committa: committa UNA volta sola chi lo chiama (nuovo_sito.ps1 lo fa prima del primo commit).
import argparse, json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # radice del clone (il file sta in automation/)
ap = argparse.ArgumentParser()
ap.add_argument('--accent', required=True); ap.add_argument('--dark', default='')
ap.add_argument('--iniziale', default=''); ap.add_argument('--stile', default='pelle', choices=['pelle', 'liscio'])
ap.add_argument('--bg', default=''); ap.add_argument('--text', default='')
a = ap.parse_args()

# --- piccole funzioni colore. Esempio: hx('#8a6a3a') -> (138,106,58); mix((138,106,58),(255,255,255),.5) -> meta' strada verso il bianco
def hx(s): s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))
def mix(c, t, k): return tuple(round(c[i] + (t[i] - c[i]) * k) for i in range(3))   # k=0 -> c, k=1 -> t
def h(c): return '#%02x%02x%02x' % c        # (138,106,58) -> '#8a6a3a'
def rgb(c): return '%d,%d,%d' % c           # (138,106,58) -> '138,106,58' (serve dentro rgba(...) dei css)
ACC, W = hx(a.accent), (255, 255, 255)
# CRITICO: se non passi --dark lo calcolo io (accento al 45%). Esempio: accento #8a6a3a -> scuro #3e301a.
# Se il logo o i titoli ti sembrano troppo chiari/scuri, rilancia con --dark "#..." esplicito.
if not a.dark: a.dark = '#%02x%02x%02x' % tuple(round(v * .45) for v in ACC)
DARK = hx(a.dark)

# 1) tema.json. CRITICO: si aggiornano solo le chiavi note, le altre (nav_text, ecc.) restano com'erano.
# Esempio: nav_bg/body_bg cambiano SOLO se passi --bg "#fbf8f3" (sito caldo/crema); senza, restano bianchi.
tf = os.path.join(ROOT, '_data', 'tema.json'); tema = json.load(open(tf, encoding='utf-8'))
tema.update({'accent': a.accent.lower(), 'accent_dark': a.dark.lower(), 'nav_hover': a.accent.lower(), 'link': a.accent.lower()})
if a.bg: tema.update({'nav_bg': a.bg, 'body_bg': a.bg})
if a.text: tema.update({'text': a.text})
json.dump(tema, open(tf, 'w', encoding='utf-8', newline='\n'), indent=2, ensure_ascii=False); open(tf, 'a').write('\n')

# 2) COLORI DI DEFAULT DEL TEMPLATE -> palette nuova, derivata dall'accento.
# PERCHE': i css hanno fallback tipo var(--t-accent, #0e7490) e hex fissi per hover/sfondi chiari; se restano, su un sito marrone
# compaiono bordini azzurri (errore visto su pelletteria2). Qui sotto: chiave = colore vecchio, valore = colore nuovo.
# Esempio con accento #8a6a3a:  '#0e7490' (teal) -> '#8a6a3a'  |  '#eef8fa' (celeste chiarissimo) -> '#f6f3ef' (tinta chiara dell'accento)
# 'artico-hero.jpg' -> 'hero.jpg': cosi' lo sfondo home non ha piu' il nome di un tema preciso.
MAP = {'#0e7490': h(ACC), '#0891b2': h(ACC), '#155e75': h(DARK), '#164e63': h(DARK), '14,116,144': rgb(ACC),
       '#7fd8e6': h(mix(ACC, W, .55)), '#67e8f9': h(mix(ACC, W, .55)), '#22d3ee': h(mix(ACC, W, .35)), '#06b6d4': h(mix(ACC, DARK, .15)),
       '#a5f3fc': h(mix(ACC, W, .7)), '#cffafe': h(mix(ACC, W, .88)), '#ecfeff': h(mix(ACC, W, .95)), '#eef8fa': h(mix(ACC, W, .92)),
       '#e8f4f8': h(mix(ACC, W, .92)), '#e6f6f9': h(mix(ACC, W, .92)), '#eaf3fb': h(mix(ACC, W, .9)),
       '236,245,255': rgb(mix(ACC, W, .93)), '30,70,110': rgb(DARK), 'artico-hero.jpg': 'hero.jpg',
       'azzurro ghiaccio': 'tinta chiara', 'palette acqua: teal + tinta chiara': 'palette del tema'}
# CRITICO: queste cartelle/file NON si toccano. docs e automation contengono esempi/guide con i vecchi colori scritti apposta;
# tema.json l'abbiamo gia' scritto sopra; .git e _site sono generati.
SKIP = re.compile(r'[\\/](\.git|_site|node_modules|__pycache__|docs|automation)[\\/]|tema\.json$')
n = 0
for dp, dn, fn in os.walk(ROOT):
    for f in fn:
        p = os.path.join(dp, f)
        if not f.lower().endswith(('.css', '.html', '.yml', '.js', '.scss')) or SKIP.search(p): continue
        t = open(p, encoding='utf-8').read(); o = t
        for k, v in MAP.items(): t = re.sub(re.escape(k), v, t, flags=re.I)   # re.escape: '#' e '.' letterali, non regola regex
        if t != o: open(p, 'w', encoding='utf-8', newline='').write(t); n += 1   # newline='': NON converte a capo (niente diff enormi)
print('colori: %d file aggiornati' % n)   # esempio di esito sano su un clone nuovo: "colori: 11 file aggiornati"; rilanciato: 0

# 3) sfondo home + 4) logo. CRITICO: l'ordine conta, la texture legge il tema.json appena scritto al punto 1.
# check=True: se Pillow/numpy mancano lo script si ferma con errore (installa: pip install pillow numpy) invece di lasciare il sito a meta'.
old = os.path.join(ROOT, 'assets', 'images', 'artico-hero.jpg')
if os.path.exists(old): os.remove(old)
py = sys.executable; auto = os.path.join(ROOT, 'automation')
subprocess.run([py, os.path.join(auto, 'genera_texture.py'), '--stile', a.stile, '--out', 'hero.jpg'], cwd=ROOT, check=True)
subprocess.run([py, os.path.join(auto, 'genera_logo.py'), a.accent, a.dark] + ([a.iniziale] if a.iniziale else []), cwd=ROOT, check=True)
print('FATTO: tema + colori + sfondo home + logo. Ora un solo commit.')
# DOPO: controlla a occhio hero.jpg (assets/images) e il logo; se non ti piace cambia --stile (pelle/liscio) o --accent e rilancia.
