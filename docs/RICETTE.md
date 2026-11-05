# RICETTE - procedure passo passo (mistraltemplate1)

Prima di ogni ricetta: `git status --short`. Dopo: vedi "Pubblicare e verificare" in fondo. Dove sta cosa: `docs/MAPPA.md`. Errori gia' fatti: `docs/ERRORI_NOTI.md`.

## Nuovo sito da questo template
1. Dalla cartella padre: `.\nuovo_sito.ps1 -Nome villarossa -Brand "Villa Rossa" -Descrizione "..." -Lingue it,en [-Whatsapp 39333...] [-Accento "#0e7490"] [-Shop]`
2. Fa da solo: cartella, repo GitHub, Pages. Non scrive `url:`/`baseurl:`.
3. A mano restano: `contact_endpoint`, `whatsapp`, email in `_config.yml`, testi della home (admin > Home), foto di esempio.
4. Cercare residui: `Select-String -Path (Get-ChildItem -Recurse -File -Exclude .git) -Pattern "gamingcorp|edilextreme"` (deve dare zero).

## Nuova pagina
1. Italiano: `_pages/nome.md` con `layout: single`, `title`, `permalink: /nome/`, `ref: nome` (chiave che lega le lingue).
2. Inglese: `en/nome.md` con lo stesso `ref`, `lang: en`, `locale: en`, `permalink: /en/nome-in-inglese/`, `tr: copia` (diventa `tradotto` dopo la traduzione, poi `python automation/allinea_hash.py en`).
3. Menu: `_data/navigation.yml` e `_data/i18n/en/navigation.yml`. Link interni SENZA nome repo.
4. Pagina a blocchi: nel corpo `{% include render-blocks.html data="blocks_nome" %}` e un file `_data/blocks_nome.json` (campi `id`, `nome`, `enabled`, `html`). Per l'inglese `_data/i18n/en/blocks_nome.json`.

## Home
- Si modifica da admin > Home, oppure il campo `html` di `_data/blocks_home.json` (IT) e `_data/i18n/en/blocks_home.json` (EN). Mai la struttura. Backup prima, rileggere il JSON dopo.
- Nei link usare `__BASEURL__/percorso/` (viene sostituito da `render-blocks.html`).
- Non scrivere dati inventati: `00` e segnaposto finche' non c'e' il dato vero.

## Colori e tema
- Un solo posto: `_data/tema.json` (accent, nav_hover, link...). Le variabili `--t-*` sono definite in `_includes/head/custom.html`.
- Classi dei blocchi home: `assets/css/gaming.css` (nome storico, non rinominare; accento `--gc-acc`).

## Nuova lingua
1. Admin > Lingue > "Nuova lingua" (codice es. `de`, origine una lingua esistente), oppure clonare/rinominare a mano una cartella `xx/`: viene rilevata da sola (selettore, `_config.yml`, `_data/languages.yml`).
2. Ogni contenuto nasce `tr: copia` (noindex). Dopo la traduzione: `tr: tradotto`.
3. Bandiera: `assets/images/flags/xx.svg` (ci sono it, en, de, fr, es). Etichette data: `_data/date_ui.yml`. Testi interfaccia: `_data/ui-text.yml` e `_data/shop_ui.yml`.
4. Slug tradotti: cambiare `permalink` e i link del menu.

## Nuovo articolo
- Admin > Articoli, oppure `_posts/AAAA-MM-GG-titolo.md` con `categories`, `ref`. In inglese `en/_posts/` con `lang: en`. Data pubblicazione = `date`; `last_modified_at` lo scrive l'admin al salvataggio.

## Nuovo prodotto (shop)
1. `_config.yml`: `ecommerce: true`.
2. `_data/catalogo.json`: aggiungere il prodotto (prezzi in CENTESIMI).
3. Una pagina in `_negozio/nome.md`: `layout: negozio-prodotto`, `title`, `pid` (uguale all'id del catalogo), `permalink`, `description`. Esempi: `prodotto-esempio.md`, `categoria-esempio.md`.
4. Non rinominare classi `nz-*` e attributi `data-*` (li legge `carrello.js`).

## Pubblicare e verificare
1. Controlli: `node --check file.js`, `node automation/test_admin.js`, `python automation/traduzioni_sync.py` (deve dare 0).
2. Dalla cartella padre: `.\pubblica.ps1 -Repo nomerepo -Msg "..." -Files a,b,c -Aspetta`.
3. Poi `git show --stat HEAD`: il commit deve contenere i file voluti.
4. Online: home, `/en/`, la pagina toccata, `/sitemap.xml`. Se la build e' rotta, ripristinare il commit precedente.
