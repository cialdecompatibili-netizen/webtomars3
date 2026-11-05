# mistraltemplate1 - guida per Claude (template Jekyll adattivo)

Template Jekyll per GitHub Pages: si clona, si cambia quasi solo `_config.yml` e il sito si adatta (lingua, URL, brand, menu, shop). Obiettivo e stato del lavoro: `PROGETTO_TEMPLATE.md`.

**CREARE UN SITO DA QUESTO TEMPLATE: leggi PRIMA `docs/CLONAZIONE.md` (un comando `nuovo_sito.ps1` + `personalizza_clone.py` fanno colori, logo, sfondo home; un solo commit). Ogni automazione che impari va scritta come script in `automation/` e annotata li' (regola nella sezione 5): obiettivo meno tempo e meno commit per ogni nuovo sito.**

## Prima di toccare un clone (checklist)
1. `_config.yml`: `brand`, `description`, `default_lang`, `languages`, `whatsapp`, `contact_endpoint`, `ecommerce`. NON scrivere `url:`/`baseurl:` (li imposta GitHub Pages).
2. Menu: `_data/navigation.yml` (voci) + `_data/sottomenu.yml` (tendine, chiave = title identico). Url interni SENZA nome repo.
3. Home a blocchi: `_data/blocks_home.json` (campi id, nome, enabled, html). Modificare solo `html`, mai la struttura. Backup prima, rileggere il JSON dopo.
4. Colori/tema: `_data/tema.json`; kit blocchi in `assets/css/gaming.css` (nome storico, non rinominare; accento = `--gc-acc`).
5. Shop: `ecommerce: true` accende tutto. Dati in `_data/catalogo.json` (prezzi in centesimi) + una pagina per prodotto/categoria in `_negozio/` (esempi inclusi: `prodotto-esempio.md`, `categoria-esempio.md`).
6. Contenuti: `_pages/`, `_posts/`. Ogni pagina/articolo ha `ref:` (chiave di collegamento tra lingue).

## Regole d'oro
- ZERO valori fissi: niente nome repo, utente, dominio, telefono scritti nei layout/include/JS. Si usa `relative_url`, `site.*`, `_includes/site-name.html`.
- Admin (`admin/index.html`): `detectRepo()` ricava utente/repo dall'URL. Su dominio personalizzato chiede il repo una volta (localStorage `cms_repo`). Non hardcodarlo.
- `automation/publish.py`: percorso e URL ricavati da soli (cartella del file + remote git).
- Valore vuoto in config = funzione spenta, mai errore: i layout controllano che il campo sia pieno.
- Nessun plugin fuori da GitHub Pages. Build locale non disponibile su questo PC: si controlla online dopo il deploy.
- COMMENTARE i punti critici (layout, include, JS, CSS, config): dire cosa fa, cosa legge, cosa NON toccare.
- HERO HOME ADATTIVO (OBBLIGATORIO, NON MODIFICARE): `.ent-hero` e `.gc-hero` in `assets/css/gaming.css` si adattano allo schermo come ora e restano cosi' in ogni clone e in ogni nuovo template. Comportamento: `min-height:calc(100svh - 80px)` (fallback `100vh`) + `display:flex;align-items:center` = riempie la prima schermata sotto l'header e centra il contenuto; padding `clamp(1.5rem,4vh,3.5rem)`; titolo `.ent-hero .gc-h1{font-size:clamp(2rem,3.2vw + 1.2vh,3.6rem)}` (scala con larghezza E altezza); sfondo `cover`; sotto 900px colonne in pila e velo verticale. Nei cloni si cambiano SOLO foto e colori, mai queste regole: niente altezze fisse in px, niente rimozione di `clamp`/`svh`/`flex`.

## Multilingua (dettagli in `docs/MULTILINGUA.md`)
IT alla radice, altre lingue in `/xx/` create da admin > Lingue. Cambiare solo `default_lang` e `languages`. Traduzioni: `tr: copia|tradotto|da_aggiornare`, `tr_hash`; `automation/traduzioni_sync.py` + workflow marcano `da_aggiornare`. In Liquid niente `a contains b == false`: usare `{% if a contains b %}{% continue %}{% endif %}`.
**Lingue = cartelle (rilevamento automatico).** Clonare/rinominare una cartella `xx/` basta: `_includes/lingue-attive.html` la mette nel selettore (bandiera), `admin/js/lingue.js` (`lgDetect` + `lgNormalizza`, una volta per sessione aprendo admin > Lingue) la registra in `_config.yml` (languages + defaults), `_data/languages.yml`, `ui-text.yml` e corregge `lang`/`locale`/`permalink` dei file e gli url in `_data/i18n/xx/`; `traduzioni_sync.py` la vede da solo. La cartella e' la fonte di verita': il campo `lang:` dei file dopo un clone e' vecchio.
**Admin con lingua di lavoro** (`admin/js/lingua-admin.js`): selettore lingua nella barra in alto; Articoli, Pagine, Home e Menu usano gli STESSI editor ma leggono/scrivono `xx/_posts`, `xx/*.md`, `_data/i18n/xx/*`. Intercetta `window.fetch` e rimappa i path solo se lingua != base e sezione attiva in Articoli/Pagine/Menu; se il file lingua manca parte dalla copia della base (menu con url `/xx/`). Al salvataggio sistema il front matter (lang, locale, permalink, ref, `tr: tradotto` + `tr_hash`). NON riscrivere i path dentro index.html: aggiungere nuovi file da mappare in `mappa()`. `admin/js/core.js` e `articoli.js` NON sono caricati da index.html (legacy): la logica vera e' nello script inline di index.html.

## Eta' e date
MAI a mano: `<span data-eta="AAAA-MM-GG">N</span> anni`, `<span data-anni-da="AAAA">N</span> anni` (script in `_includes/footer/custom.html`).

## Design
MAI bordi laterali colorati su box, citazioni, avvisi, CTA. Box puliti con sfondo leggero o bordo uniforme.

## Pubblicare e lavorare
- Pubblicare con `..\pubblica.ps1` con `-Files` espliciti. Dopo il push NON aspettare la build: Mirco verifica da solo.
- Sessione interrotta: prima `read_file` e `git status --short`; spesso manca solo commit e push.
- PowerShell lungo: salvare in .ps1 e lanciare con `-NoProfile -ExecutionPolicy Bypass -File`. Mai chiamare funzioni RD/WR/CD/LS (alias: RD cancella!).
- Traduzioni: NIENTE GitHub Actions. L'hook `.githooks/pre-commit` lancia `automation/traduzioni_sync.py` a ogni commit (attivo con `git config core.hooksPath .githooks`, una volta per clone).
- Risposte brevissime, modifiche in una sola chiamata.

## Cose che funzionano
- Test senza build locale: simulare la logica JS dell'admin con node + `vm` (stub di `lgText`/`lgCommit` e albero finto) e lanciare `node --check` sul file. Esempio: `claudetemp\test_lingue.js` (clone en -> de rinominato).
- Rilevare le lingue dalle CARTELLE (non dal config) e normalizzare tutto il resto da li': evita config e cartelle fuori sync.
- Liquid senza plugin: costruire un array con `split` + `concat` + `uniq` dentro un include che fa solo `assign` (le variabili restano visibili a chi lo include).- Patch su file grandi con CRLF (admin/index.html): script node con `readFileSync`/`replace`/`writeFileSync` su stringhe esatte, mai edit multiriga a mano; poi `node --check` sui .js. Mock del wrapper fetch: `claudetemp\test_lingua_admin.js`.

SEO e lingue (24/10/2026)
- SEO per lingua: _includes/seo.html fa un solo meta robots (noindex se noindex:true o tr: copia), description per lingua da _data/languages.yml (chiave description; se manca NON la scrive), og:locale. hreflang in _includes/head/custom.html: solo versioni tradotte (stesso ref), x-default = lingua base. sitemap.xml propria (sostituisce jekyll-sitemap) con alternates hreflang, esclude noindex/copia/admin/404.
- Slug tradotti: lo slug e' il permalink del front matter; MAI scrivere a mano lo slug di un'altra lingua nei link: usare {% include url-ref.html ref="shop-negozio" %} (URL per ref nella lingua della pagina). Inglese: /en/shop/, /en/about-us/, /en/contact/, /en/category/, /en/shop/example-product/. carrello/ordine/grazie restano con slug italiano (noindex, e carrello.js controlla /grazie/). Una lingua clonata da admin parte con gli slug della base: tradurli cambiando permalink (e i link in menu/home).
- Lingua browser: script in head/custom.html. Solo prima visita, solo da pagine in lingua base, solo se esiste la versione tradotta; localStorage lang_pref = scelta ricordata (il click su bandiera/selettore la aggiorna); niente redirect per bot, ?nolang=1 o referrer dello stesso sito.


Elementi per pagina (24/10/2026)
- UN solo valore per tutte le liste: `per_page` in _config.yml (default 20), si cambia da admin > Impostazioni (10, 20, 50, 100, 200, 500). L'admin lo copia in localStorage 'cms_per_page' (getPerPage in admin/index.html); NON reintrodurre limiti separati per elenco.
- Admin: elenchi Articoli, Pagine e Prodotti usano getPerPage(); le miniature/metadati si leggono a gruppi di 6 (metaQueue in wp-elenchi.js) per non finire il limite API con 200-500 voci.
- Sito: assets/js/paginazione.js impagina blog, negozio e pagina categoria (it e en) con gli attributi data-pg, data-pg-item, data-per sul contenitore; le voci restano tutte nell'HTML. Filtri che usano hidden (pillole negozio) chiamano PgLista.refresh. Se aggiungi un nuovo elenco lungo: stessi tre attributi, niente codice nuovo.


Lezioni dal clone "cybersecurity" (24/10/2026)
- Home, Chi siamo e Servizi sono a blocchi con testi SEGNAPOSTO neutri (IT in `_data/`, EN in `_data/i18n/en/`). Stile `ent-*` in `assets/css/gaming.css`; i colori seguono `_data/tema.json` (accent = `--gc-acc`, accent_dark = `--gc-ink`): NON mettere `<style>` con colori nei blocchi.
- I JSON dei blocchi si generano con uno script node (JSON.stringify + rilettura con JSON.parse), mai a mano; apostrofi e accenti nei blocchi come entita' HTML (&#39; &egrave;).
- Dopo aver scritto/tradotto a mano le pagine di una lingua: `python automation/allinea_hash.py en` (imposta `tr: tradotto` e `tr_hash`). Senza, l'hook le marca `da_aggiornare`.
- Ogni pagina/articolo ha `ref:` anche in italiano (serve al collegamento tra lingue e al selettore).
- Dati, cifre e fonti nei testi: solo verificati sul web (cerca prima). Mai loghi clienti, recensioni, certificazioni o prezzi inventati.
- Il modulo contatti resta spento finche' `contact_endpoint` e' vuoto: chiederlo subito al cliente. Lo stesso per `whatsapp` ed `email`.
- Clone: `..\nuovo_sito.ps1` tiene `en/` di default (it,en). Con `-Lingue it` la cartella `en/` viene tolta: farlo solo se richiesto. `-Accento "#rrggbb"` imposta il colore.
- Pubblicare piu' file: `& ..\pubblica.ps1 -Repo x -Msg "..." -Files 'a','b'` (ora accetta anche `-Files a,b` da `-File`).


Lezioni dalla migrazione "pelletteria" -> "pelletteria2" (24/10/2026)
- Migrare un sito esistente in un clone: 1) mappare le due repo (menu, `_data/catalogo.json`, `_negozio/`, `blocks_home.json`, `_posts/`); 2) generare TUTTO con script node (accenti come `\uXXXX`, nei blocchi HTML entita' numeriche con una funzione `ent()`; JSON con `JSON.stringify` e rilettura); 3) `python automation/allinea_hash.py en`; 4) pubblicare con `..\pubblica.ps1 -Files ...`. Script di esempio: `claudetemp\build_pelletteria2\` (`dati.js` = categorie IT/EN, `build.js` = dati/menu, `build2.js` = blocchi/pagine/patch).
- Categorie a DUE LIVELLI: campo `genitore` in `catalogo.json` (il reparto non ha genitore; la sua pagina mostra le sottocategorie e i prodotti di tutte). Nome inglese in `tr.en.nome`. Ogni categoria ha DUE file con `ref: shop-cat-<id>`: `_negozio/categoria-<id>.md` (permalink `/negozio/categoria/<id>/`) e `en/negozio/categoria/<id>.md` (permalink `/en/shop/category/<slug-inglese>/`).
- Link dello shop: MAI `nz_lh | append: 'negozio/'` (in inglese puntava a `/en/negozio/`, che non esiste). Usare `{% include shop-url.html k="shop" %}`, `k="cat" id=...`, `k="prod" id=...`: cerca il `ref` (`shop-negozio`, `shop-cat-<id>`, `shop-prod-<id>`) nella lingua della pagina, poi nella base, poi la vecchia formula. Prodotti/categorie creati da admin senza `ref` in inglese ricadono sulla formula: aggiungere il `ref` a mano ai file.
- Il clone con `nuovo_sito.ps1 -File` storpia le virgole (`default_lang: it,en`) e CANCELLA `en/` e `_data/i18n/en`: dopo il clone controllare `default_lang` e che `en/` esista, altrimenti ripristinare dal template.
- Non portare nei blocchi i `<style>` del vecchio sito: si usano le classi `gc-*`/`ent-*` e `_data/tema.json` (copiare il tema.json del vecchio sito per mantenere i colori).
- Togliere i segnaposto che non servono (`_pages/servizi.md`, articolo di esempio, categoria/prodotto di esempio): restano online e indicizzati.
- Il modulo contatti resta spento senza `contact_endpoint` (il vecchio sito usava il worker del modello: non riusarlo, serve il worker del cliente).
- Questo template ha molti file non committati: le modifiche shop (shop-url.html, negozio-categoria, patch ai link) sono nel working tree ma NON committate; non usare `pubblica.ps1 -Tutto` qui.

## Lezioni dal clone pelletteria2 (24/10/2026)
- FOOTER: _includes/footer/custom.html mette di default © anno nome-sito - Design, Development & Digital Marketing by webtomars.it; site.footer_text nel _config.yml lo sovrascrive. Nei cloni non serve rifarlo.
- TEMA/COLORI: mai hex hardcoded (niente azzurri/teal/ghiaccio in menu.css, gaming.css, head/custom.html, layout): usare _data/tema.json (accent, accent_dark). Dopo il clone: cercare con grep i vecchi colori e sostituirli con la palette del nuovo sito.
- HOME: sfondo hero = assets/images/*-hero.jpg referenziato in gaming.css (.ent-hero). Nei cloni sostituirlo con una texture a tema (esempio: automation/genera_texture.py di pelletteria2, Pillow+numpy) e cambiare logo con automation/genera_logo.py.
- ORDINE CLONE: 1) tema.json 2) logo+texture 3) menu/categorie IT+EN 4) home/chi siamo 5) footer e segnaposto 6) commit+push+verifica online.

## Articoli e categorie del blog (logica da cybersecurity)
- Indirizzi: articolo = /blog/<categoria>/<titolo>/ (EN: /en/blog/...), categoria = /blog/<categoria>/, categoria `blog` = /blog/<titolo>/.
- Dopo ogni nuovo articolo o nuova categoria lancia `python automation/permalink_articoli.py --apply`: scrive il permalink nel front matter, crea i redirect dai vecchi indirizzi e le pagine categoria mancanti (_pages/cat-*.md, en/category-*.md). Idempotente.
- Nomi EN delle categorie: _data/i18n/en/categorie.json (stesso ordine di _data/categorie.json).
- Liste: _includes/lista-categoria.html (blog e categorie), link categoria: _includes/page__taxonomy.html, barra laterale: post-sidebar.html.
- Gli articoli `2026-10-26-*-prova` / `*-test` sono di prova: cancellali (e i loro redirect/ e le categorie Guide/Novità se non servono).

- 31/10/2026 ERRORE CATALOGO: scrivere `_data/*.json` con `ensure_ascii=False` (emoji letterali). Con le escape `\\ud83d...` la build Jekyll si rompe. Vedi docs/ERRORI_NOTI.md punto 23.
- 31/10/2026 DOMINIO: prima DNS, poi CNAME. Vedi docs/ERRORI_NOTI.md punto 24 e DOMINIO.md.


## Flusso che FUNZIONA: categoria + prodotto con foto, IT+EN (31/10/2026, provato su microsystem)
Tutto da Desktop Commander sul PC di Mirco, con Python. Il connettore GitHub non serve (non compare); git e `gh` si lanciano da terminale.
1. Ricerca di mercato sul web PRIMA (cosa si vende davvero), poi scelta di UNA categoria e UN prodotto per la demo.
2. Foto prodotto: `python C:\Users\mirco\Desktop\gemini_auto\img.py "<soggetto>" --profilo prodotto --nome <id> --out assets\images\prodotti --extra "No text, no logos, no brand names anywhere on the device."` (per elettronica NON usare `foto_sito.py`: il suo prompt e' per bottiglie). Foto categoria: stesso comando con `--profilo categoria --out assets\images\categorie`. Guardare SEMPRE la foto (read_file di Desktop Commander) prima di pubblicare.
3. Script Python che scrive `_data/catalogo.json` (categoria + prodotto con `tr.en`, prezzi in centesimi, `immagine: assets/images/prodotti/<id>.webp`) e le 4 pagine: `_negozio/categoria-<id>.md`, `en/negozio/categoria/<id>.md`, `_negozio/<id>.md`, `en/negozio/<id>.md` (ref `shop-cat-<id>` / `shop-prod-<id>`, permalink EN `/en/shop/...`). Esempio completo: `automation/esempio_demo_shop.py`. JSON SEMPRE con `ensure_ascii=False` (vedi docs/ERRORI_NOTI.md punto 23).
4. `python automation/allinea_hash.py en`, poi `git add -A`, commit, push.
5. Aspettare la build: `gh api repos/<utente>/<repo>/pages/builds/latest` deve dare `built` sul commit giusto. Se `errored`/falliti: `gh run list --limit 3` e `gh run view <id> --log-failed`.
6. Verificare online con Invoke-WebRequest: shop, categoria, prodotto IT e EN, le due immagini (200 e contenuto giusto), poi dare i link a Mirco. Dire che la resa grafica non e' stata vista.
- Prezzi e specifiche della demo sono SEGNAPOSTO da confermare con Mirco: nei testi solo cose generiche, niente portate o numeri inventati.
- Per uno o molti prodotti: FATTO, vedi `automation/prodotto.py` (sezione "Prodotto + foto in UN comando" in fondo). Sostituisce i passi 2-4 per i prodotti.
- Idee categorie dal mercato (ricerca 31/10/2026): nodi e schede Meshtastic (Heltec V3/V4, LILYGO T-Beam), ripetitori solari, kit modulari RAK WisBlock, tracker GPS, comunicatori portatili, kit con Raspberry Pi.


## Pipeline e foto (valide per ogni clone)
- Contenuti: `python automation/sviluppa.py` (esegue `automation/contenuti_*.py` del sito, permalink, hash lingue, controlli, commit+push). Nessun nome sito fisso.
- Foto prodotti con Gemini API: `docs/IMMAGINI.md` (stile per sito in `_data/foto_prompt.json`, motore unico in `Desktop\gemini_auto`).

- Barra autore a destra negli articoli del blog: attiva nei default (posts: author_profile true). Dati in _config.yml > author (name, avatar, bio, links): nei cloni sostituire nome, foto (assets/images/autore-segnaposto.svg) e bio; per spegnerla su un articolo mettere author_profile: false nel front matter. CSS gia' in assets/css/main.scss (SIDEBAR A DESTRA).

- 02/11/2026 TENDINE: sempre su 2 colonne (masthead.html: wide se kids.size > 1, Shop sempre wide; menu.css: columns:2 anche mobile/compatto, prima voce NON centrata, divider nascosto nelle tendine larghe). Nei cloni non ritoccare: il clone copia menu.css e masthead.html dal template. Se un clone vecchio ha il problema, copiare questi due file dal template.


## Prodotto + foto in UN comando (03/11/2026, provato su pelletteria2; vale per ogni clone)
`python automation/prodotto.py --nome "..." --categoria <id o nome, anche parziale> --prezzo <euro> --desc "..." [--completa "..."] [--aspetto "..."] [--nome-tr "en=..."] [--desc-tr "en=..."] [--completa-tr "en=..."] [--id slug]`
- Dalla radice della repo (`--repo` facoltativo: di default la repo che contiene il file). Fa tutto: prodotto in `_data/catalogo.json` + pagina di OGNI lingua (da `_config.yml`, permalink presi dalle pagine shop della repo) + foto Gemini via API + UN commit + push + verifica + URL online. ~27 s per prodotto nuovo (18 s sono Gemini), ~4 s per solo aggiornamento prezzo.
- Piu' prodotti: `--lista file.json` (oggetti con nome, categoria, prezzo, desc, completa, aspetto, id, `tr:{"en":{nome,descrizione,descrizione_completa}}`): una sola generazione, un solo commit/push. Prodotto gia' esistente: aggiorna solo i campi passati (`--id x --prezzo 590`) e fa la foto solo se manca.
- La categoria deve ESISTERE gia' in `catalogo.json` (non le crea). Nome, categoria e prezzo li decide Mirco, mai inventati; se chiede di calcolare i prezzi, cercare sul web fasce reali del segmento e citarle in una riga.
- Traduzioni: le scrive Claude e le passa con `--*-tr` o `tr` nella lista. Senza traduzione la pagina della lingua e' `tr: copia` (noindex, testo italiano). L'hash usa `automation/traduzioni_sync.py` della repo: NON lanciare `allinea_hash.py` su tutta la lingua per un prodotto solo.
- Foto: prompt da `_data/foto_prompt.json` (se manca lo crea neutro: sfondo chiaro, niente testo/logo/persone) e l'"aspetto" e' la descrizione del prodotto (o `--aspetto`): per qualunque articolo, non solo bottiglie (il vecchio default di `foto_sito.py` non serve piu'). Per aspetti particolari (es. "senza marchi sul dispositivo") metterli in `--aspetto`.
- Motore foto: cerca da solo `gemini_auto\core\foto_sito.py` (variabile `GEMINI_AUTO`, poi la cartella `gemini_auto` sopra la repo). Se non c'e', usare `--no-foto`. Prima di generare valgono le regole crediti di `gemini_auto\CLAUDE.md` (un solo generatore alla volta, ~22 crediti a foto, nessun retry a raffica).
- Si ferma se la repo ha modifiche non committate (foto_sito fa `git add -A`): committarle o usare `--forza`. Se la foto manca non pubblica nulla e lo dice. Opzioni: `--no-foto`, `--no-push`, `--no-api` (watcher Chrome).
- La foto va online subito: guardarla DOPO su `assets/images/prodotti/<id>.webp` o sul sito e rifarla con `foto_sito.py --repo . --ids <id> --extra "..."` se non va. Dare a Mirco solo l'URL online della categoria e del prodotto.
- Copia del template: l'originale e' `Desktop\gemini_auto\core\prodotto.py`; se si corregge uno, allineare l'altro.
