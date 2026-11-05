# mistraltemplate1 - progetto template stabile e adattivo

Creata il 24/10/2026. Base: clone di `gamingcorp` (che a sua volta deriva da edilextreme4/renzoferrucci con motore multilingua). Account GitHub `cialdecompatibili-netizen`, cartella `C:\Users\mirco\Desktop\repository\mistraltemplate1`.

## Obiettivo (da Mirco)
Un template STABILE e ADATTIVO che qualsiasi nuova repo possa prendere, con tutto automatico: si clona, si cambia (quasi) solo la configurazione e il sito si adatta da solo (lingua, URL, brand, menu, shop, date, eta').

## Principi
- Zero valori fissi nei file: brand, descrizione, lingue, remoto/baseurl, WhatsApp, contatti stanno solo in `_config.yml` (e `_data/`).
- Software con remoto/baseurl automatici (come italfuni/edilextreme2): nessun URL scritto a mano nei layout.
- Multilingua automatico: IT alla radice, altre lingue in `/xx/` create dall'admin (voce Lingue), lette dal sito senza codice. Per un clone si cambia solo `languages` e `default_lang`.
- Nessun plugin fuori da GitHub Pages; build nativa (un push = un deploy).
- Contenuti a blocchi (`_data/blocks_home.json`), menu da `_data/navigation.yml` + `sottomenu.yml`, tutto gestibile dall'admin.
- Eta' e anni automatici (`data-eta`, `data-anni-da`), mai scritti a mano.
- Regole di design: niente bordi laterali colorati su box/citazioni/CTA.

## Cosa c'e' gia' (ereditato da gamingcorp)
- Motore multilingua FASE 1-3 (config, defaults, i18n, hreflang, selettore con bandiera, admin Lingue, sync `tr: da_aggiornare` via `automation/traduzioni_sync.py` + workflow).
- Admin in `admin/`, collezioni `_negozio`, `_tour`, `_pages`, `_posts`; ecommerce con ordini smoke test.
- `template-map.json`, `version.json`.

## Da fare (ordine proposto)
1. Pulire i contenuti specifici di gaming (brand GamingCorp, `_tour`, `_negozio`, post demo) lasciando struttura e un esempio minimo per tipo.
2. Rendere `_config.yml` l'unico punto da cambiare: brand, description, languages, default_lang, whatsapp, contact_endpoint, ecommerce on/off.
3. `url` e `baseurl` automatici (nessun valore fisso in layout, include, JS, admin).
4. Script `nuovo_sito.ps1`: copia il template in una nuova cartella, git init, imposta brand/lingue, `gh repo create`, push, attiva Pages.
5. Admin: interruttore Shop/Tour/Blog per attivare o spegnere sezioni senza toccare file.
6. Aggiornare `CLAUDE.md` (oggi dice ancora edilextreme4) con regole generiche del template.
7. Provare il template clonandolo su una repo di prova e verificare che si adatti da solo.

## Note
- Pubblicare con `..\pubblica.ps1` (vedi `..\claude.md`), sempre con `-Files` espliciti.
- Non aspettare la build dopo il push: Mirco verifica da solo.
- Prima di modificare JSON: backup, poi rileggere e verificare.

- TRADUZIONI SENZA WORKFLOW: la sync `da_aggiornare` gira con l'hook `.githooks/pre-commit` (locale, a ogni commit); il workflow GitHub Actions e' stato eliminato (serviva lo scope workflow).

## STATO (24/10/2026)
- FATTO: contenuti gaming rimossi (giochi, _negozio, post, .bak, crea_shop_gaming.py), sostituiti da esempi minimi (post, prodotto e categoria shop); _config.yml unico punto di configurazione con commenti guida; shop spento di default.
- FATTO: admin senza repo fisso (detectRepo, su dominio personalizzato chiede il repo una volta); publish.py senza percorsi/URL fissi (repo = cartella del file, URL dal remote git); CLAUDE.md riscritto come guida ai cloni.
- FATTO (24/10/2026): multilingua automatico dalle cartelle (selettore, admin Lingue, lingua di lavoro in admin); punto 4: `..\nuovo_sito.ps1 -Nome x -Brand "X" -Lingue it,en [-Shop] [-Whatsapp N]` copia il template, imposta solo i campi identita' in _config.yml, attiva l'hook (core.hooksPath), crea la repo e Pages.
- RESTA: punto 5 (interruttori Shop/Tour/Blog nell'admin), punto 7 (prova di clone), commenti guida nei layout/include/JS/CSS ancora da completare, attivare l'hook nei cloni (lo fara' nuovo_sito.ps1).

## PIANO MULTILINGUA 2 (deciso da Mirco 24/10/2026, ordine fisso) - PUNTI 1-3 FATTI il 24/10/2026 (non provati con build Jekyll: controllare online sitemap.xml, hreflang, /en/shop/, redirect da browser in inglese)
Ispirato a WPML, Polylang, TranslatePress, Weglot. Da sviluppare in quest'ordine:
1. SEO per lingua: hreflang corretto (solo pagine tradotte), canonical, titolo e meta description per lingua, sitemap per lingua, "copia" = noindex finche' non segnata tradotta.
2. Slug tradotti per pagine e categorie (es. /en/shop/ invece di /en/negozio/), gestibili da admin; base: automation/permalink_lingue.py + _data/i18n/xx/categorie.yml di renzoferrucci.
3. Lingua preferita del browser: alla PRIMA visita porta da solo alla lingua del browser (se esiste), ricorda la scelta (localStorage), la scelta manuale col selettore vince sempre, niente redirect per i bot.
Idee per dopo (non decise): traduzione AI con un tasto, elenco contenuti per lingua cliccabile, editor affiancato, editor stringhe UI, fallback selettore, glossario, export .po/.csv, immagini per lingua.



## ADMIN CMS - PIANO (24/10/2026)
- FATTO/IN CORSO oggi: fix categorie sparite (causa: SeoPanel chiamato a livello globale prima del caricamento di seo-panel.js, bloccava lo script; NON chiamare mai SeoPanel fuori da funzioni), date automatiche (created_at/last_modified_at), redirect 301 (redirect/ + admin Redirect).
- DA FARE oggi, in ordine: SEO articolo di nuovo editabile, commit del lavoro date/redirect, elementi per pagina (10,20,50,100,200,500) in Impostazioni valido per liste admin e frontend, redirect 301 completi, date automatiche.
- NON OGGI (in pausa, deciso da Mirco): punto 7 = bozze/programmazione, cestino e storico, commit unico + conflitti, immagini WebP, audit SEO, traduzione AI con un tasto, editor stringhe interfaccia.


## OTTIMIZZAZIONE DA CLONE "cybersecurity" (24/10/2026) - cosa cambiare per i prossimi cloni
Lezioni dal primo clone reale (sito corporate cybersecurity IT+EN). Ordine di lavoro, tutto nel template:
1. Home pronta "corporate/enterprise" generica (hero scuro + ciclo in 4 passi, fascia dati, servizi in 4 colonne, per chi, metodo, blog, CTA), IT ed EN, con testi segnaposto neutri. Lo stile `ent-*` va in `assets/css/gaming.css`, NON inline nei blocchi.
2. Colori da UN solo punto: `_data/tema.json` (accent, accent_dark) deve pilotare anche `--gc-acc` e `--gc-ink` (in `_includes/head/custom.html`). Oggi per cambiare colore ai blocchi serviva un `<style>` nel blocco.
3. Pagina Servizi di esempio (IT `_pages/servizi.md`, EN `en/servizi.md`, slug /servizi/ e /en/services/, `ref: servizi`) e voce di menu Servizi.
4. Pagina Chi siamo a blocchi anche in EN (`_data/i18n/en/blocks_azienda.json`) e blocchi azienda IT puliti (oggi "Nuovo box").
5. Contenuti di esempio puliti: articolo IT/EN senza testo di prova, senza immagine marte e senza URL con il nome del template (violava ZERO valori fissi).
6. Colori fissi residui in blog.md (verde/marrone) e contatti.md (#3f6b00) -> variabili del tema; testo contatti generico (era "magazine").
7. `automation/allinea_hash.py`: per ogni lingua imposta `tr: tradotto` e `tr_hash` corretto sui file tradotti a mano (prima si faceva con uno script usa e getta). Da lanciare dopo aver scritto le pagine EN.
8. `..\pubblica.ps1`: `-Files a,b,c` falliva se lanciato con `-File` (la virgola diventava una sola stringa). Ora separa da solo.
9. `..\nuovo_sito.ps1`: nuovo parametro `-Accento "#rrggbb"` (scrive tema.json) e promemoria finale con cio' che resta vuoto (contact_endpoint, whatsapp, email) perche' il modulo contatti resta spento finche' contact_endpoint e' vuoto. Default lingue resta it,en: se si passa solo `it` la cartella `en/` viene tolta (e' successo a cybersecurity: da non ripetere senza motivo).
10. CLAUDE.md: regole nuove (vedi sezione "Cose che funzionano" in fondo).
Dopo l'implementazione: provare un clone di prova (punto 7 del piano generale) e controllare online.

- FATTO (24/10/2026) ottimizzazione da clone cybersecurity: punti 1-10 della sezione sopra (home corporate IT/EN con stile in gaming.css, tema.json pilota --gc-acc/--gc-ink, Servizi di esempio, Chi siamo EN a blocchi, esempi puliti, colori fissi tolti da blog/contatti, automation/allinea_hash.py, pubblica.ps1 con -Files a virgole, nuovo_sito.ps1 con -Accento e promemoria). RESTA: prova di clone online (punto 7 del piano generale).

## PUNTO DI RIPRESA (24/10/2026) - da riprendere
- Mirco ha detto "non adesso, appunta, ci torniamo": la PROVA DI CLONE e' rimandata.
- Prossimo passo: `..\nuovo_sito.ps1 -Nome prova -Brand "Prova" -Lingue it,en -Accento "#0b6cf0"` e controllare online home IT/EN, Servizi, Chi siamo, selettore lingua, colori da tema.json, hreflang/sitemap, ricerca.
- Poi: interruttori Shop/Tour/Blog nell'admin (punto 5 del piano), commenti guida ancora mancanti (layout product, publish.py, traduci_lingua.py, js admin).
- Sito cybersecurity (clone fatto prima di queste ottimizzazioni, ha stile inline suo): contatti spenti (mancano email/WhatsApp/contact_endpoint), da scrivere altri articoli avvisi (GitLab 10/10, LiteLLM su PyPI, CVE-2026-115560 segnalata da ACN: verificare sul web prima), altre lingue da admin > Lingue.

## STATO 24/10/2026 (fine sessione) - cosa e' fatto e cosa RIMANE
Fatto e online (commit dbf2839): logo montagna innevata coi colori del tema + `automation/genera_logo.py` (legge `accent` da `_data/tema.json`; rilancia dopo ogni cambio accento: `python automation\genera_logo.py`).
Fatto solo in LOCALE, non pubblicato: logo con cielo celestino chiaro e senza cappuccio bianco sulla cima di destra (script gia' aggiornato, file rigenerati). Pubblicare con: `..\pubblica.ps1 -Repo mistraltemplate1 -Msg "Logo: cielo celestino" -Files "assets/images/favicon.svg,assets/images/favicon-32.png,assets/images/favicon-192.png,assets/images/favicon-512.png,assets/images/apple-touch-icon.png,assets/images/favicon.ico,favicon.ico,automation/genera_logo.py" -Aspetta`. Poi Ctrl+F5 per la cache.
Documentazione agenti: `AGENTS.md`, `docs/MAPPA.md`, `RICETTE.md`, `ERRORI_NOTI.md` scritti; testate `GUIDA-SVILUPPO:` messe su seo.html, footer/custom.html, servizio-faq/cta, servizi-correlati, negozio-prodotto, gaming.css, menu.css, negozio.css, ui-text.yml. `automation\controllo.ps1` = TUTTO OK.

### Da fare (in ordine)
1. Testo HOME troppo robotico/artificiale: riscrivere in modo umano e invitante `_data/blocks_home.json` (IT) e `_data/i18n/en/blocks_home.json` (EN). Sono dati, non pagine: non cambia l'hash delle traduzioni. NON ancora iniziato (richiesta del proprietario, mai partita per limite messaggi).
2. Pubblicare il logo celestino (comando sopra).
3. Commit unico dei ~32 file modificati non committati (testate GUIDA-SVILUPPO, AGENTS.md, docs, ui-text.yml, include, css/js). Guardare prima `git status --short`.
4. `_includes/servizio-cta.html`: testi in italiano fisso (non passano da ui-text.yml) e link WhatsApp che diventa `#` se `site.whatsapp` e' vuoto: renderli traducibili e avvolgere il blocco in `{% if site.whatsapp != '' %}`.
5. `automation/test_admin.js`: non tracciato, decidere se committarlo.
6. Residui nome vecchio in commenti: `_data/sidebar.yml:4` e `_includes/head/custom.html:214` ("Renzo Ferrucci").
7. Non verificati: carrello, ordine, pagine inglesi interne. Stili inline in ~14 file da spostare in gaming.css. Immagini pesanti da ridimensionare.
8. Opzionale: far scrivere a `nuovo_sito.ps1 -Accento` anche il logo (chiamare genera_logo.py dopo aver scritto tema.json).
Deploy: https://cialdecompatibili-netizen.github.io/mistraltemplate1/
