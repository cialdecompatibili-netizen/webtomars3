# CLONAZIONE - creare un sito da questo template: veloce, automatico, UN commit

OBIETTIVO: meno tempo e meno commit possibili. Tutto cio' che si ripete e' uno script in `automation/` (o `nuovo_sito.ps1`): non rifarlo a mano.

## 1) Crea il sito (un solo comando, dalla cartella `repository`)
```
.\nuovo_sito.ps1 -Nome pelletteria3 -Brand "Pelletteria 3" -Descrizione "..." -Lingue it,en -Accento "#8a6a3a" -AccentoScuro "#503629" -Iniziale P -Stile pelle -Shop
```
Fa da solo: copia il template, lingue, `_config.yml`, `personalizza_clone.py` (tema.json + colori + sfondo home + logo/favicon), repo GitHub, primo commit, Pages.
Senza `-Accento` il sito resta con la palette di default del template (teal). Il footer con credito webtomars.it e' gia' di default.

## 2) Poi, in questo ordine (sempre, un file/gruppo alla volta, commit UNICO alla fine)
1. Menu e categorie IT+EN (`_data/`, categorie a due livelli, link shop con `shop-url.html`).
2. Home e Chi siamo IT+EN (testi del cliente, mai segnaposto). 3. Articolo/i. 4. Tolti i segnaposto del template (Servizi, articolo e categoria di esempio).
5. Verifica con `automation\controllo.ps1` (deve dire TUTTO OK). 6. UN push con `..\pubblica.ps1 -Repo NOME -Msg "..." -Tutto -Aspetta`.

## 3) Script disponibili (non riscriverli)
| Script | A cosa serve |
|---|---|
| `nuovo_sito.ps1` (in `repository`) | crea il clone completo |
| `automation/personalizza_clone.py` | palette + sfondo home + logo in un colpo (`--accent --dark --iniziale --stile pelle/liscio --bg --text`), idempotente |
| `automation/genera_logo.py` | solo logo/favicon |
| `automation/genera_texture.py` | solo sfondo home (`--stile pelle/liscio`) |
| `automation/controllo.ps1` | controllo completo prima di pubblicare |
| `automation/traduci_lingua.py`, `allinea_hash.py`, `traduzioni_sync.py` | traduzioni e hash IT/EN |
| `..\pubblica.ps1` | pull, commit, push, attesa build, verifica live |

## 4) Regole di stabilita'
- Mai colori hex fissi nei css/layout: solo `_data/tema.json` (variabili `--t-*`, `--gc-*`). I default del template sono sostituiti da `personalizza_clone.py`.
- Il template NON si pubblica con modifiche dei cloni: le lezioni si scrivono qui, il contenuto del cliente resta nel clone.
- Cartella `repository` ha file non committati di altri lavori: committa SOLO i file toccati (`git commit -m ... -- file`), mai `git add -A` nel template senza controllare `git status`.
- Dopo il push non serve rileggere tutto: `pubblica.ps1 -Aspetta -Url ... -Cerca "testo"` verifica la pagina live.

## 5) REGOLA PER CLAUDE: ogni automazione imparata va annotata
Quando durante un clone scopri una cosa che si ripete (un fix, un grep, un passaggio manuale, un bug):
1. Se si puo' scriverla in codice: crea/estendi uno script in `automation/` (Python se serve) e, se e' un passo del clone, richiamalo da `nuovo_sito.ps1` o `personalizza_clone.py`.
2. Annota subito qui (sezione 3 o 4) e in `CLAUDE.md` UNA riga: cosa, dove sta lo script, come si lancia.
3. Metti nello script in testa un commento `GUIDA-SVILUPPO:` con uso e cosa scrive.
4. Committa template (script + guida) in un solo commit, poi il clone. Obiettivo: il prossimo clone non richiede di riscoprire nulla.

## 6) Ancora da automatizzare (idee, quando capita)
- Categorie IT+EN da una lista (`python automation/crea_categorie.py "Donna:Borse,Scarpe" "Uomo:..."`) invece che a mano.
- Pagine Home/Chi siamo da un file di testi del cliente (un solo `.md` -> IT+EN).
- Controllo live automatico di tutte le pagine dopo il push.

## 7) PUNTI CRITICI DEL SISTEMA (con esempi) - leggi prima di cambiare qualcosa
| Punto critico | Esempio sbagliato -> giusto | Dove e' spiegato |
|---|---|---|
| URL interni SENZA nome repo | `/nome-repo/blog/` -> `/blog/` (ci pensa `relative_url`) | `_data/navigation.yml` |
| Slug di un'altra lingua mai a mano | `/en/shop/` scritto a mano -> `{% include url-ref.html ref="shop-negozio" %}` | `_includes/url-ref.html` |
| Link shop localizzati | `/en/negozio/..` (non esiste) -> `shop-url.html` | `_includes/shop-url.html` |
| Chiave sottomenu = title del menu, identica | `Servizi:` in sottomenu vs `Servizio` in navigation -> la tendina sparisce | `_data/sottomenu.yml` |
| `url:` e `baseurl:` NON in `_config.yml` | scrivere `url: https://..` -> rompe i link su Pages | `_config.yml` (regole d'oro) |
| Graffa chiusa dentro `{{ }}` | `{{ '}' }}` rompe la build -> `controllo.ps1` lo trova | `automation/controllo.ps1` |
| Lingua base `it` fissa in `render-blocks.html` | `default_lang: en` alla radice -> blocchi non letti | `_includes/render-blocks.html` |
| Hash traduzioni | tradurre a mano e non allineare -> `traduzioni_sync` segnala `!= 0` -> `python automation/allinea_hash.py en` | `automation/allinea_hash.py` |
| Colori solo da `tema.json` | `#0e7490` scritto in un css -> bordino azzurro su sito marrone -> `personalizza_clone.py` | sezione 4 |
| Credito webtomars nel footer | metterlo nei 'residui' di `controllo.ps1` -> fallisce sempre | `automation/controllo.ps1` |
| `-Brand` non cambia il nome nel menu | il nome viene da dominio/repo (`site-name.html`) | `nuovo_sito.ps1` |
| Commit selettivi nel template | `git add -A` mischia file di altri lavori -> `git commit -m .. -- file1 file2` | sezione 4 |
| `-Lingue it,en` lanciato con `-File` | arriva come UNA stringa -> `default_lang: it,en` e cartella `en/` cancellata (successo su startupfinance). Ora `nuovo_sito.ps1` spezza sulle virgole; dopo ogni clone controlla `default_lang: it` e che `en/` esista | `nuovo_sito.ps1` |
