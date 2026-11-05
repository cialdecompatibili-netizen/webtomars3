# AGENTS.md - istruzioni per qualsiasi agente AI (Claude, Codex, Cursor, Copilot...) su mistraltemplate1

Template Jekyll per GitHub Pages. Si clona, si cambia quasi solo `_config.yml` e `_data/tema.json`, e il sito si adatta (lingua, URL, brand, colori, menu, shop).
Si gestisce dal CMS nel browser (`admin/`), che scrive su GitHub con le API. Non esiste build locale su questo PC: si controlla online dopo il deploy.

**CREARE UN SITO DA QUESTO TEMPLATE: leggi PRIMA `docs/CLONAZIONE.md` (un comando `nuovo_sito.ps1` + `personalizza_clone.py` fanno colori, logo, sfondo home; un solo commit). Ogni automazione che impari va scritta come script in `automation/` e annotata li' (regola nella sezione 5): obiettivo meno tempo e meno commit per ogni nuovo sito.**

**FRETTA? Leggi solo `docs/START_1_MINUTO.md` (comandi, tabella "cosa cambiare dove", 8 regole). Controllo completo prima di pubblicare: `powershell -NoProfile -ExecutionPolicy Bypass -File automation\controllo.ps1` deve dire TUTTO OK.**

## Leggi in quest'ordine (poi lavora)
1. Questo file.
2. `docs/START_1_MINUTO.md` (riassunto), poi `docs/MAPPA.md` - dove sta cosa e "voglio cambiare X, quale file tocco".
3. `docs/RICETTE.md` - procedure passo passo (nuova pagina, nuova lingua, colori, home, prodotto, pubblicazione).
4. `docs/ERRORI_NOTI.md` - errori gia' fatti che rompono il sito. Leggilo PRIMA di toccare Liquid, admin o traduzioni.
5. `CLAUDE.md` (regole di dettaglio), `docs/MULTILINGUA.md` (sistema lingue), `PROGETTO_TEMPLATE.md` (stato e piano).

## Come trovare le istruzioni dentro il codice
Ogni file importante ha in testa un commento che inizia con `GUIDA-SVILUPPO:` (cosa fa, cosa legge, cosa NON toccare).
- Elenco: `grep -rn "GUIDA-SVILUPPO" . --include=*.html --include=*.js --include=*.scss --include=*.py --include=*.yml`
- PowerShell: `Select-String -Path (Get-ChildItem -Recurse -File) -Pattern "GUIDA-SVILUPPO"`
- File con testata diversa ma equivalente: `automation/*.py`, `admin/js/*.js`, `assets/js/*.js`, `assets/css/*.css`, `_includes/*.html`.
- JSON non ammette commenti: i campi di `_data/*.json` sono spiegati in `docs/MAPPA.md`.
Quando scrivi codice nuovo, aggiungi la testata `GUIDA-SVILUPPO:` e commenta i punti critici (cosa fa, cosa legge, cosa non toccare, perche').

## Regole d'oro
1. ZERO valori fissi: niente nome repo, utente, dominio, telefono, brand scritti in layout/include/JS. Usa `relative_url`, `site.*`, `_includes/site-name.html`. Link interni senza nome repo.
2. Colori da UN solo posto: `_data/tema.json` (variabili `--t-accent`, `--t-link`...). Mai esadecimali nuovi nei file: usa le variabili. Niente bordi laterali colorati su box, citazioni, avvisi, CTA.
3. Valore vuoto in `_config.yml` = funzione spenta, mai errore. I layout controllano che il campo sia pieno.
4. Nessun plugin fuori da quelli di GitHub Pages. Niente GitHub Actions (le traduzioni usano l'hook locale).
5. L'admin ricava utente/repo dall'URL (`detectRepo()`): non scriverli nei file admin.
6. Eta' e date mai a mano: `<span data-eta="AAAA-MM-GG">` e `<span data-anni-da="AAAA">`.
7. Liquid: dentro le doppie graffe di output non scrivere mai una graffa chiusa, e niente `a contains b == false` (usa `{% if a contains b %}{% continue %}{% endif %}`). Vedi ERRORI_NOTI.
8. Contenuti: ogni pagina e articolo ha `ref:` (chiave che lega le versioni nelle varie lingue).
9. Non cambiare il CORPO di una pagina italiana senza controllare le traduzioni (vedi sotto, sezione Traduzioni).

## Flusso per OGNI modifica
1. `git status --short` (sessione interrotta: spesso manca solo commit e push). Leggi la testata `GUIDA-SVILUPPO` dei file che tocchi.
2. Modifica piccola e mirata. File JSON di dati (`blocks_*.json`): backup prima, rileggere e validare dopo.
3. Controlli senza build: `node --check file.js`; `node automation/test_admin.js [lingua]` (admin: nessuno script deve dare errore, categorie visibili); `python automation/traduzioni_sync.py` deve stampare `0`.
4. Pubblica dalla cartella padre: `..\pubblica.ps1 -Repo mistraltemplate1 -Msg "..." -Files a,b,c -Aspetta`. Poi `git status --short` e `git show --stat HEAD`: il commit deve contenere davvero i file voluti. Se no: `git add -- file; git commit; git push`.
5. Verifica online (home, /en/, la pagina toccata, `/sitemap.xml`). Se la build e' rotta ripristina subito il commit precedente.
6. Rispondi in 3-5 righe: cosa e' cambiato, cosa hai verificato, cosa NON hai potuto verificare.

## Traduzioni (hook locale, non Actions)
- Lingue = cartelle (`en/`, `de/`...). Clonare o rinominare una cartella basta: il selettore e l'admin la rilevano da soli.
- Ogni traduzione ha `tr: copia | tradotto | da_aggiornare` e `tr_hash` (hash del CORPO della pagina italiana). L'hook `.githooks/pre-commit` segna `da_aggiornare` se il corpo italiano cambia; le pagine non `tradotto` sono `noindex` e fuori da sitemap/hreflang.
- Hai cambiato il corpo IT e anche quello EN in modo equivalente (es. un colore dentro un `<style>`)? Lancia `python automation/allinea_hash.py en`. Meglio ancora: gli stili vanno in `assets/css`, non nel corpo delle pagine.
- Dopo ogni commit che tocca pagine: `python automation/traduzioni_sync.py` -> `Traduzioni segnate da aggiornare: 0`.

## Mai fare
- Rinominare `assets/css/gaming.css` (nome storico, e' caricato da `head/custom.html`) o classi `nz-*` e attributi `data-*` dello shop (li legge `carrello.js`).
- Scrivere nei file `admin/js/core.js` e `articoli.js`: sono LEGACY, non caricati. La logica vera e' nello script inline di `admin/index.html`.
- Riscrivere i path dentro `admin/index.html` per la lingua: `lingua-admin.js` li rimappa (aggiungi nuovi file in `mappa()`).
- Lanciare funzioni PowerShell chiamate `RD`, `WR`, `CD`, `LS`: sono alias e `RD` cancella.
- Committare con `-Tutto` senza aver guardato `git status`: i file di lavoro finiscono nel sito.
- Inventare dati: prezzi, titoli, certificazioni, numeri. Segnaposto neutri (`00`, "Nome Sito") finche' non c'e' il dato vero.

## Stile di lavoro richiesto dal proprietario
Risposte brevissime, modifiche in una sola chiamata dove possibile, commenti guida nei punti critici del codice, niente giri di parole.
