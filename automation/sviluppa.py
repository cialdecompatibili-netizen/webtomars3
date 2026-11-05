import io, json, os, re, subprocess, sys, glob, datetime, argparse
# GUIDA-SVILUPPO: pipeline GENERICA per qualsiasi sito del template (nessun nome sito, percorso o lingua scritti a mano).
# Uso dalla radice del repo:  python automation/sviluppa.py [-m "messaggio commit"] [--no-push] [--solo-controlli]
# Passi: automation/contenuti_*.py (script di contenuto del sito, se ci sono) -> permalink_articoli.py --apply -> allinea_hash.py <lingua>
#        per ogni cartella lingua trovata -> controlli (JSON validi, testo corrotto, post con data futura) -> commit + push.
# Idempotente. Le foto prodotto sono un'altra cosa: vedi IMMAGINI.md.
ap = argparse.ArgumentParser()
ap.add_argument('-m', default='Aggiornamento contenuti'); ap.add_argument('--no-push', action='store_true'); ap.add_argument('--solo-controlli', action='store_true')
a = ap.parse_args()
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(R)
env = dict(os.environ, PYTHONIOENCODING='utf-8'); py = sys.executable
def run(*c):
    r = subprocess.run(c, capture_output=True, text=True, encoding='utf-8', env=env)
    out = (r.stdout + r.stderr).strip()
    print('>', ' '.join(c[1:]) if c[0] == py else ' '.join(c), '->', 'OK' if r.returncode == 0 else 'ERRORE %d' % r.returncode)
    if out: print('   ' + out[-300:].replace('\n', '\n   '))
    if r.returncode: sys.exit(r.returncode)
if not a.solo_controlli:
    for s in sorted(glob.glob('automation/contenuti_*.py')): run(py, s)
    if os.path.exists('automation/permalink_articoli.py'): run(py, 'automation/permalink_articoli.py', '--apply')
    if os.path.exists('automation/allinea_hash.py'):
        for l in sorted(d for d in os.listdir('.') if re.fullmatch(r'[a-z]{2}', d) and os.path.isdir(d)): run(py, 'automation/allinea_hash.py', l)
# controlli
bad, oggi = [], datetime.date.today().isoformat()
for f in glob.glob('_data/**/*.json', recursive=True):
    t = io.open(f, encoding='utf-8').read()
    try: json.loads(t)
    except Exception as e: bad.append('JSON rotto %s: %s' % (f, e)); continue
    if '\u00c3' in t or '\ufffd' in t: bad.append('testo corrotto in ' + f)
for f in glob.glob('_posts/*.md') + glob.glob('*/_posts/*.md') + glob.glob('_pages/*.md'):
    t = io.open(f, encoding='utf-8').read()
    if '\u00c3' in t or '\ufffd' in t: bad.append('testo corrotto in ' + f)
    m = re.search(r'^date:\s*(\d{4}-\d{2}-\d{2})', t, re.M)
    if m and m.group(1) > oggi: bad.append('data FUTURA (Jekyll non lo pubblica) in %s: %s' % (f, m.group(1)))
if bad: print('\n'.join(bad)); sys.exit(2)
print('controlli ok')
if a.no_push or a.solo_controlli: sys.exit(0)
run('git', 'add', '-A')
if subprocess.run(['git', 'diff', '--cached', '--quiet']).returncode == 0: print('niente da pubblicare'); sys.exit(0)
run('git', 'commit', '-q', '-m', a.m)
print(subprocess.run(['git', 'push'], capture_output=True, text=True).stderr.strip().splitlines()[-1])
