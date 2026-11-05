# ERRORI_NOTI - errori gia' fatti su questo template (leggere PRIMA di toccare Liquid, admin, traduzioni, pubblicazione)

Formato: SINTOMO -> CAUSA -> COSA FARE.

## Liquid / build Jekyll
1. Sito giu' dopo un push (build rotta) -> una graffa chiusa scritta DENTRO le doppie graffe di output (es. `{{ '}' }}` in `_includes/head/custom.html`): Liquid la legge come fine della variabile -> riscrivere in modo che la graffa JS stia fuori dal Liquid (es. `var A = { {{ ml_json }}"_":"" }`). Dopo ogni modifica a file Liquid pubblicare con `-Aspetta`.
2. `a contains b == false` non funziona -> usare `{% if a contains b %}{% continue %}{% endif %}`.
3. Liste/array in Liquid senza plugin -> costruire con `split` + `concat` + `uniq` dentro un include che fa solo `assign` (le variabili restano visibili a chi lo include). Esempio: filtri di `_includes/ex-galleria.html`.
4. Nessuna build locale su questo PC: l'unico controllo e' online dopo il deploy. Simulare solo la logica JS con node.

## Admin (CMS nel browser)
5. Categorie sparite / pannello che non carica -> uno script (`seo-panel.js` e simili) chiamato a livello globale PRIMA dello script inline di `admin/index.html`. Gli script esterni si caricano dopo l'inline: non chiamarli subito. Prova: `node automation/test_admin.js` (nessun errore, categorie visibili).
6. "Failed to fetch" sulle API GitHub -> URL con `/` finale: GitHub fa un redirect senza gli header CORS. Niente slash finale nelle chiamate `ghGet/ghPut`.
7. `admin/js/core.js` e `articoli.js` sono LEGACY e non caricati: modificarli non cambia nulla. La logica vera e' nello script inline di `admin/index.html`.
8. Lingua di lavoro dell'admin: i path sono rimappati da `lingua-admin.js` (`mappa()`). Non riscrivere i path dentro `index.html`.
9. Foto/temi galleria: `admin/js/foto.js` ha i temi (`TEMI`). Il tema `team` e' di riserva: le pagine senza foto del loro tema usano quello.

## Traduzioni
10. Pagine inglesi tornate `da_aggiornare` e sparite dalla sitemap -> e' cambiato il CORPO della pagina italiana (anche un colore o un commento) e l'hash non coincide. Se hai aggiornato anche l'inglese: `python automation/allinea_hash.py en`. Meglio: stili in `assets/css`, non nel corpo delle pagine.
11. Dopo ogni commit che tocca pagine: `python automation/traduzioni_sync.py` deve stampare `Traduzioni segnate da aggiornare: 0`.
12. Permalink articoli con doppio `/en/en/` -> correggere permalink in `_config.yml` (defaults) e nel generatore dell'admin lingue. Una lingua clonata parte con gli slug della base: tradurli cambiando `permalink` e i link nel menu.
13. Niente GitHub Actions: il token non ha lo scope `workflow` e il push fallisce. Le traduzioni usano l'hook `.githooks/pre-commit` (attivo con `git config core.hooksPath .githooks`, una volta per clone).
14. Script che riscrive etichette ("Updated:" -> "Aggiornato:") in `head/custom.html`: non reintrodurlo, rompe le pagine inglesi. Le etichette data sono in `_data/date_ui.yml`.

## Pubblicazione / PowerShell
15. Il push contiene solo una cancellazione, mancano i file nuovi -> `pubblica.ps1` senza `-Files` espliciti non aggiunge tutto. Dopo ogni push: `git status --short` e `git show --stat HEAD`; se mancano file: `git add -- file; git commit; git push`.
16. Non usare `-Tutto` senza guardare `git status`: i file di lavoro finiscono nel sito.
17. PowerShell: MAI funzioni chiamate `RD`, `WR`, `CD`, `LS` (sono alias, `RD` cancella). Script lunghi: salvare in `.ps1` e lanciare con `-NoProfile -ExecutionPolicy Bypass -File`. Gli `.ps1` vanno in ASCII (PowerShell 5 legge male gli accenti senza BOM).
18. Sessione interrotta: prima `git status --short`; spesso manca solo commit e push.

## Contenuti e stile
19. Residui di altri siti dopo un clone (nomi, foto, telefoni, colori) -> cercare con grep `edilextreme|gamingcorp|renzo|ferrucci|ipermark|florbook` prima di pubblicare. Nel template non devono esistere.
20. Colori: solo variabili `--t-*` da `_data/tema.json`. Mai esadecimali nuovi, mai bordi laterali colorati su box e citazioni.
21. Hero a tutta altezza (`gaming.css`): l'altezza e' `100vh` meno circa 80px di menu. Se il menu cambia altezza, aggiornare quel valore.
22. Dati inventati (prezzi, numeri, certificazioni, titoli): mai. Segnaposto neutri (`00`, "Dato da inserire") finche' non c'e' il dato vero.

23. BUILD ROTTA da `catalogo.json` scritto con escape Unicode (31/10/2026, microsystem). Uno script Python con `json.dump(..., ensure_ascii=True)` ha scritto le emoji come coppie surrogate (`\ud83d\udce1`): Jekyll/GitHub Pages legge il .json come YAML e si ferma con "found invalid Unicode character escape code" (build rossa, pagine nuove 404, sito vecchio resta online). REGOLA: i file in `_data/` si scrivono SEMPRE con `json.dumps(d, ensure_ascii=False, indent=2)` e `open(p, 'w', encoding='utf-8', newline='\n')`, emoji e accenti letterali. Controllo prima del push: `python -c "import json;t=open('_data/catalogo.json',encoding='utf-8').read();assert '\\ud8' not in t.lower();json.loads(t)"`. Se la build fallisce: `gh run list --limit 3` poi `gh run view <id> --log-failed`, l'errore e' nel log. Dopo ogni push aspettare `built` (`gh api repos/<utente>/<repo>/pages/builds/latest`) prima di dire "fatto".
24. DOMINIO PERSONALIZZATO: prima il record DNS (CNAME su Cloudflare, nuvola grigia, verificare con `Resolve-DnsName`), POI il file `CNAME` e `gh api -X PUT .../pages -f cname=...`. Al contrario il sito risulta rotto (su `ipermark.com` c'e' un wildcard che risponde con altro contenuto). Procedura completa in `DOMINIO.md` del sito.
