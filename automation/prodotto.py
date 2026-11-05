#!/usr/bin/env python3
"""
automation/prodotto.py (copia per il template, originale in gemini_auto/core) - UN SOLO COMANDO: crea il prodotto (catalogo + pagine di ogni lingua) + foto Gemini + commit + push.

Universale: nessun nome di sito, repo, categoria o lingua scritto qui. Tutto si ricava dalla repo puntata
(_data/catalogo.json, _config.yml, _negozio/, <lingua>/, git remote, CNAME). Funziona su qualunque clone del template.

Uso dalla radice della repo (--repo e' facoltativo: di default la repo che contiene questo file).
Il motore foto (gemini_auto/core/foto_sito.py) si cerca da solo: variabile GEMINI_AUTO, poi la cartella gemini_auto in ogni cartella sopra la repo.
Senza motore foto usare --no-foto.
Nome, categoria e prezzo li decide l'utente: MAI inventarli:
  python automation/prodotto.py --nome "Borsa in pelle" --categoria donna-borse-mano --prezzo 590 \
      --desc "testo breve" [--completa "testo lungo"] [--aspetto "descrizione per la foto"] \
      [--nome-tr "en=Leather bag"] [--desc-tr "en=..."] [--completa-tr "en=..."] [--id slug] [--digitale]
  Piu' prodotti in una volta (una sola generazione, un solo commit/push):
  python prodotto.py --repo <repo> --lista prodotti.json
     (lista di oggetti: nome, categoria, prezzo, desc, completa, aspetto, id, tr:{"en":{"nome","descrizione","descrizione_completa"}})
Opzioni: --no-foto (solo pagine+catalogo)  --no-push  --no-api (usa il watcher Chrome)  --forza (repo con altre modifiche)
Se il prodotto esiste gia': aggiorna solo i campi passati (es. --prezzo) e fa la foto solo se manca.
Categoria: id oppure nome (anche parziale, es. "uomo portafogli"). Lingue: da _config.yml; senza traduzione la pagina
della lingua parte come tr: copia (testo italiano, noindex) invece di inventare traduzioni.
"""
import os, re, io, sys, json, time, argparse, subprocess, unicodedata, importlib.util

try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
HERE = os.path.dirname(os.path.abspath(__file__))


def trova_foto_sito(repo):
    """Motore foto gemini_auto/core/foto_sito.py: variabile GEMINI_AUTO, poi la cartella 'gemini_auto' in ogni cartella
    sopra la repo e sopra questo file, poi ~/Desktop/gemini_auto. Nessun percorso scritto a mano. None se non c'e'."""
    cand = []
    if os.environ.get("GEMINI_AUTO"): cand.append(os.environ["GEMINI_AUTO"])
    for start in (repo, HERE):
        d = os.path.abspath(start)
        while True:
            cand.append(os.path.join(d, "gemini_auto"))
            n = os.path.dirname(d)
            if n == d: break
            d = n
    cand.append(os.path.join(os.path.expanduser("~"), "Desktop", "gemini_auto"))
    for c in cand:
        f = os.path.join(c, "core", "foto_sito.py")
        if os.path.exists(f): return f
    return None
T0 = time.time()


def log(*a): print("[%5.1fs]" % (time.time() - T0), *a, flush=True)
def rd(p): return io.open(p, encoding="utf-8").read()
def wr(p, t):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(t)
def git(repo, *a): return subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True, encoding="utf-8", errors="replace")
def norm(s): return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()).strip()
def slug(s): return norm(s).replace(" ", "-")
def q(s): return (s or "").replace("\\", "\\\\").replace('"', '\\"')


def trova_repo(p):
    d = os.path.abspath(p or os.path.dirname(HERE))  # default: la repo che contiene questo file
    while True:
        if os.path.exists(os.path.join(d, "_data", "catalogo.json")): return d
        n = os.path.dirname(d)
        if n == d: sys.exit("ERRORE: _data/catalogo.json non trovato (passa --repo).")
        d = n


def lingue(repo):
    cfg = rd(os.path.join(repo, "_config.yml")) if os.path.exists(os.path.join(repo, "_config.yml")) else ""
    m = re.search(r"^default_lang:\s*(\w+)", cfg, re.M); base = m.group(1) if m else "it"
    m = re.search(r"^languages:\s*\[(.*?)\]", cfg, re.M)
    tutte = [x.strip() for x in m.group(1).split(",") if x.strip()] if m else [base]
    return base, [l for l in tutte if l != base and os.path.isdir(os.path.join(repo, l))]


def fm_get(t, k):
    m = re.match(r"---\n(.*?)\n---", t, re.S)
    if not m: return ""
    m2 = re.search(r"^" + k + r":\s*(.+)$", m.group(1), re.M)
    return m2.group(1).strip().strip('"') if m2 else ""


def cerca_ref(repo, cartella, ref):
    """permalink della pagina con quel ref dentro cartella (None se manca)"""
    base = os.path.join(repo, cartella) if cartella else repo
    for r, ds, fs in os.walk(base):
        ds[:] = [d for d in ds if not d.startswith((".", "_site", "node_modules")) and not (not cartella and re.fullmatch(r"[a-z]{2}", d))]
        for f in fs:
            if f.endswith(".md"):
                t = rd(os.path.join(r, f))
                if fm_get(t, "ref") == ref: return fm_get(t, "permalink")
    return None


def permalink(repo, lang, base, pid, slug_lang):
    if lang == base:
        cfg = rd(os.path.join(repo, "_config.yml"))
        m = re.search(r"negozio:\s*\n(?:[ \t]+.*\n)*?[ \t]+permalink:\s*(\S+)", cfg)
        return (m.group(1) if m else "/negozio/:name/").replace(":name", pid)
    sh = cerca_ref(repo, lang, "shop-negozio")
    return (sh.rstrip("/") if sh else "/%s/shop" % lang) + "/" + slug_lang + "/"


def hash_vuoto(repo):
    """tr_hash con lo stesso algoritmo dell'hook della repo (corpo vuoto); None se la repo non lo ha"""
    p = os.path.join(repo, "automation", "traduzioni_sync.py")
    try:
        sp = importlib.util.spec_from_file_location("ts_repo", p); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
        return m.lg_hash("")
    except Exception:
        return None


def categoria(cat, query):
    cs = cat["categorie"]; qn = norm(query)
    for c in cs:
        if c["id"] == query or norm(c["id"]) == qn or norm(c["nome"]) == qn: return c["id"]
    gen = {c.get("genitore") for c in cs}  # id che sono genitori di altre categorie (reparti)
    cand = [c for c in cs if qn in norm(c["id"]) or qn in norm(c["nome"]) or qn in norm((c.get("genitore") or "") + " " + c["nome"])]
    foglie = [c for c in cand if c["id"] not in gen] or cand
    if len(foglie) == 1: return foglie[0]["id"]
    sys.exit("ERRORE categoria '%s': %s. Categorie: %s" % (query, "ambigua" if foglie else "non trovata", ", ".join(c["id"] for c in cs)))


def prezzo_cent(v): return int(round(float(str(v).replace("\u20ac", "").replace(",", ".").strip()) * 100))


def crea(repo, cat, spec, base, langs, h0):
    nome = spec["nome"]; pid = spec.get("id") or slug(nome)
    trs = spec.get("tr", {})
    prod = next((p for p in cat["prodotti"] if p.get("id") == pid), None)
    nuovo = prod is None
    if nuovo:
        for k in ("nome", "categoria", "prezzo"):
            if not spec.get(k): sys.exit("ERRORE: per un prodotto nuovo servono --nome --categoria --prezzo (non li invento).")
        desc = spec.get("desc") or nome
        prod = {"tipo": "digitale" if spec.get("digitale") else "fisico", "id": pid, "nome": nome,
                "categoria": categoria(cat, spec["categoria"]), "prezzo_centesimi": prezzo_cent(spec["prezzo"]),
                "descrizione": desc, "descrizione_completa": spec.get("completa") or desc,
                "immagine": "", "icona": "", "visibile": True}
        cat["prodotti"].append(prod)
    else:
        if spec.get("prezzo"): prod["prezzo_centesimi"] = prezzo_cent(spec["prezzo"])
        if spec.get("desc"): prod["descrizione"] = spec["desc"]
        if spec.get("completa"): prod["descrizione_completa"] = spec["completa"]
    if trs:
        prod.setdefault("tr", {})
        for l, v in trs.items(): prod["tr"].setdefault(l, {}).update({k: x for k, x in v.items() if x})
    # pagine: una per lingua (la base in _negozio/, le altre in <lingua>/negozio/)
    for l in [base] + langs:
        dest = os.path.join(repo, "_negozio" if l == base else os.path.join(l, "negozio"), pid + ".md")
        if os.path.exists(dest): continue
        t = trs.get(l, {}) if l != base else {}
        titolo = t.get("nome") or prod["nome"]; d = t.get("descrizione") or prod["descrizione"]
        sl = slug(t.get("nome") or pid) if l != base else pid
        riga = "" if l == base else "lang: %s\nlocale: %s\n" % (l, l)
        tr = "" if l == base else ("tr: %s\n" % ("tradotto" if t.get("nome") else "copia")) + ("tr_hash: %s\n" % h0 if h0 else "")
        wr(dest, '---\nlayout: negozio-prodotto\ntitle: "%s"\npid: %s\npermalink: %s\ndescription: "%s"\n%sref: shop-prod-%s\n%s---\n'
           % (q(titolo), pid, permalink(repo, l, base, pid, sl), q(d), riga, pid, tr))
    # prompt foto: aspetto = testo del prodotto (mai un valore fisso per tipo di articolo)
    return pid, nuovo, not prod.get("immagine")


def foto_cfg(repo, aspetti):
    fp = os.path.join(repo, "_data", "foto_prompt.json")
    cfg = json.loads(rd(fp)) if os.path.exists(fp) else {
        "template": "Fotografia di prodotto professionale e-commerce: {nome}, {aspetto}. Sfondo neutro chiaro sfumato, luce morbida da studio, alta definizione, nessun testo, nessuna scritta, nessun logo, nessuna persona",
        "default": ""}
    cfg.setdefault("aspetti", {}).update(aspetti)
    wr(fp, json.dumps(cfg, ensure_ascii=False, indent=1) + "\n")


def url_base(repo):
    c = os.path.join(repo, "CNAME")
    if os.path.exists(c): return "https://%s/" % rd(c).strip()
    m = re.search(r"github\.com[:/]([^/]+)/([^/.\s]+)", git(repo, "remote", "get-url", "origin").stdout)
    if not m: return ""
    return "https://%s.github.io/%s" % (m.group(1), "" if m.group(2).lower() == m.group(1).lower() + ".github.io" else m.group(2) + "/")


def main():
    ap = argparse.ArgumentParser(description="Crea prodotto + foto Gemini + push (universale)")
    ap.add_argument("--repo"); ap.add_argument("--lista")
    ap.add_argument("--nome"); ap.add_argument("--categoria"); ap.add_argument("--prezzo"); ap.add_argument("--id")
    ap.add_argument("--desc"); ap.add_argument("--completa"); ap.add_argument("--aspetto"); ap.add_argument("--digitale", action="store_true")
    for k in ("nome", "desc", "completa"): ap.add_argument("--%s-tr" % k, action="append", default=[], help="lingua=testo")
    ap.add_argument("--no-foto", action="store_true"); ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--no-api", action="store_true"); ap.add_argument("--forza", action="store_true")
    a = ap.parse_args()
    repo = trova_repo(a.repo)
    FOTO = None if a.no_foto else trova_foto_sito(repo)
    if not a.no_foto and not FOTO:
        sys.exit("ERRORE: motore foto (gemini_auto/core/foto_sito.py) non trovato. Imposta GEMINI_AUTO=<cartella gemini_auto> oppure usa --no-foto.")
    sporco = git(repo, "status", "--porcelain").stdout.strip()
    if sporco and not a.forza:
        sys.exit("ERRORE: la repo ha modifiche non committate (foto_sito fa 'git add -A' e le pubblicherebbe):\n%s\nCommittale o usa --forza." % sporco)
    if a.lista: specs = json.loads(rd(a.lista))
    else:
        tr = {}
        for chiave, arg in (("nome", a.nome_tr), ("descrizione", a.desc_tr), ("descrizione_completa", a.completa_tr)):
            for x in arg:
                l, _, t = x.partition("="); tr.setdefault(l.strip(), {})[chiave] = t.strip()
        specs = [{"nome": a.nome, "categoria": a.categoria, "prezzo": a.prezzo, "id": a.id, "desc": a.desc, "completa": a.completa,
                  "aspetto": a.aspetto, "digitale": a.digitale, "tr": tr}]
    cat = json.loads(rd(os.path.join(repo, "_data", "catalogo.json")))
    base, langs = lingue(repo); h0 = hash_vuoto(repo)
    da_foto, aspetti, tutti = [], {}, []
    for s in specs:
        pid, nuovo, senza_foto = crea(repo, cat, s, base, langs, h0)
        tutti.append(pid); log(("creato " if nuovo else "aggiornato ") + pid)
        if senza_foto and not a.no_foto and not s.get("digitale"):
            da_foto.append(pid)
            p = next(x for x in cat["prodotti"] if x["id"] == pid)
            aspetti[pid] = s.get("aspetto") or p["descrizione"]
    wr(os.path.join(repo, "_data", "catalogo.json"), json.dumps(cat, ensure_ascii=False, indent=2) + "\n")
    json.loads(rd(os.path.join(repo, "_data", "catalogo.json")))  # rilettura = validazione
    log("catalogo e pagine scritti (lingue:", ", ".join([base] + langs) + ")")
    if da_foto:
        foto_cfg(repo, aspetti)
        cmd = [sys.executable, FOTO, "--repo", repo, "--ids", ",".join(da_foto)] + ([] if a.no_api else ["--api"]) + (["--no-push"] if a.no_push else [])
        t1 = time.time(); log("foto Gemini:", ", ".join(da_foto))
        subprocess.run(cmd, cwd=os.path.dirname(FOTO))  # genera, copia, aggiorna catalogo, git add -A + commit + push: UN commit con pagine e foto
        log("foto fatta in %.0fs" % (time.time() - t1))
    else:
        git(repo, "add", "-A"); git(repo, "commit", "-q", "-m", "Prodotti: " + ", ".join(tutti))
        if not a.no_push: log("push:", (git(repo, "push").stderr.strip().splitlines() or ["ok"])[-1])
    # verifica obbligatoria: immagine nel catalogo, file in repo, repo in sync
    cat = json.loads(rd(os.path.join(repo, "_data", "catalogo.json"))); ko = []
    for pid in da_foto:
        p = next(x for x in cat["prodotti"] if x["id"] == pid)
        if not p.get("immagine") or not os.path.exists(os.path.join(repo, p["immagine"])): ko.append(pid)
    st = git(repo, "status", "-sb").stdout.splitlines()[0]
    if ko:
        print("FOTO MANCANTE per: %s. Nulla e' stato pubblicato. Riprova con gli stessi parametri + --forza." % ", ".join(ko)); sys.exit(1)
    ub = url_base(repo); ps = [x for x in cat["prodotti"] if x["id"] in tutti]
    for p in ps:
        cp = cerca_ref(repo, "_negozio", "shop-cat-" + p["categoria"]); pp = cerca_ref(repo, "_negozio", "shop-prod-" + p["id"])
        print("URL categoria:", ub.rstrip("/") + (cp or ""), "| prodotto:", ub.rstrip("/") + (pp or ""))
    log("FINE | %s | repo: %s" % (st, os.path.basename(repo)))


if __name__ == "__main__":
    main()
