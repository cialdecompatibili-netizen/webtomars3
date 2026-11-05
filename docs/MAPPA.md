# MAPPA DEI FILE - dove sta cosa (mistraltemplate1)

Prima la tabella "voglio cambiare X", poi l'elenco per cartella. I JSON non hanno commenti: i loro campi sono spiegati qui.

## Voglio cambiare... -> tocca...
| Voglio | File (e cosa) |
|---|---|
| Nome sito, descrizione SEO, WhatsApp, endpoint contatti, shop on/off, elementi per pagina | `_config.yml` (`brand`, `description`, `whatsapp`, `contact_endpoint`, `ecommerce`, `per_page`). Vuoto = spento |
| Colori | `_data/tema.json` (`accent`, `accent_dark`, `nav_bg`, `nav_text`, `nav_hover`, `body_bg`, `text`, `link`). Unico punto |
| Voci del menu | `_data/navigation.yml` (+ tendine in `_data/sottomenu.yml`, chiave = `title` identico). In inglese: `_data/i18n/en/` |
| Home | `_data/blocks_home.json` (inglese: `_data/i18n/en/blocks_home.json`). Cambiare solo `html` |
| Pagina Chi siamo | `_pages/azienda.md` + `_data/blocks_azienda.json` (EN: `en/azienda.md`) |
| Lingue attive | `_config.yml` (`default_lang`, `languages`), oppure admin > Lingue (crea, clona, elimina) |
| Testi dell'interfaccia (bottoni, etichette) | `_data/ui-text.yml`; shop: `_data/shop_ui.yml`; date: `_data/date_ui.yml` |
| Categorie del blog | `_data/categorie.json` (admin > Categorie) |
| Prodotti e categorie shop | `_data/catalogo.json` (prezzi in CENTESIMI) + una pagina per prodotto/categoria in `_negozio/` |
| Foto della galleria | `assets/foto/` + `_data/foto.yml` (admin > Foto) |
| Barra laterale articoli (foto + presentazione) | `_data/sidebar.yml` |
| Redirect 301 | admin > Redirect, oppure automatico al cambio di permalink (cartella `redirect/`, layout `redirect.html`) |
| Aspetto di una pagina | front matter della pagina; CSS in `assets/css/` (mai `<style>` nel corpo delle pagine italiane: cambia l'hash delle traduzioni) |

## Radice
- `_config.yml` - unica configurazione; ogni campo ha un commento. NON scrivere `url:` e `baseurl:` (li imposta GitHub Pages).
- `index.html` - home italiana (layout `default` + `home-content.html`). `en/index.html` - home inglese.
- `sitemap.xml` - generata da noi con hreflang, esclude copie, noindex, 404, admin. Non sostituirla con il plugin.
- `version.json` - versione e changelog del template. `template-map.json` - mappa di campi per l'admin, con riferimenti di un tema precedente (es. `_pages/home.md` non esiste): NON e' la fonte di verita', per la home vale `blocks_home.json`.
- `AGENTS.md`, `CLAUDE.md`, `PROGETTO_TEMPLATE.md`, `README.md`, `docs/` - documentazione.
- `.githooks/pre-commit` - hook traduzioni (attivo con `git config core.hooksPath .githooks`, una volta per clone).

## _layouts (come si disegna una pagina)
- `single.html` - pagina/articolo/servizio standard. `categories.html`, `tags`, `posts` (archivi) vengono dal tema o dalle pagine `cat-list`, `tag-archive`, `year-archive`.
- `negozio-prodotto.html`, `negozio-categoria.html` - schede shop; il contenuto viene da `_data/catalogo.json`, il file in `_negozio/` ha solo l'id.
- `product.html` - scheda prodotto vecchia (legacy). `redirect.html` - pagine di redirect. `home.html` e `blog-custom.html` - legacy, non usati.

## _includes (pezzi riusabili)
- `head/custom.html` - head di OGNI pagina: variabili colore, CSS critico, integrazioni, JS (indice automatico, lingua browser). Sommario in testa. `footer/custom.html` - selettore lingua e script del piede.
- `masthead.html` - menu in alto (voci, tendine, lingua con bandiera, carrello). Si abbina a `assets/css/menu.css` e `assets/js/menu.js`.
- `seo.html` - meta, canonical, hreflang (solo traduzioni `tradotto`), `noindex` per le copie. `lingue-attive.html` - rileva le lingue dalle cartelle (variabile `lg_arr`). `url-ref.html` - URL di una pagina dal suo `ref` nella lingua corrente: mai scrivere a mano lo slug di un'altra lingua.
- `render-blocks.html` + `home-content.html`, `home-servizi.html`, `home-progetti.html` - home a blocchi.
- `page__date.html` (Pubblicato / Aggiornato), `page__hero.html`, `page__related.html`, `post-sidebar.html`, `blog-lista.html`, `social-share.html`, `site-name.html`.
- Servizi e progetti: `servizio-cta.html`, `servizio-faq.html`, `servizi-correlati.html`, `ex-galleria.html`, `ex-lista.html`. Shop: `negozio-riga.html`.

## _data
- `tema.json` - colori (vedi sopra). `languages.yml` - nome e descrizione SEO per lingua. `ui-text.yml`, `shop_ui.yml`, `date_ui.yml` - testi per lingua (chiave di primo livello = codice lingua).
- `navigation.yml`, `sottomenu.yml`, `shop_nav.yml` - menu. `i18n/<lingua>/` - versione tradotta di menu, home e Chi siamo.
- `blocks_home.json`, `blocks_azienda.json`, `blocks_about.json` - elenco di blocchi `{id, nome, enabled, html}`. Si modifica solo `html` (e `enabled`), mai la struttura. `__BASEURL__` nell'html diventa il baseurl.
- `categorie.json` - `[{nome, descrizione}]` categorie blog. `shop-categorie.json` - `[{nome, slug}]` categorie shop per l'admin.
- `catalogo.json` - `{categorie: [{id, nome, icona}], prodotti: [{id, nome, categoria, prezzo_centesimi, tipo (digitale|fisico), visibile, immagine, descrizione, tr: {lingua: {nome, descrizione}}}]}`.
- `foto.yml` - `[{f (nome file senza .jpg), cap, t (lista temi), w, h}]`; `foto_temi.yml` - collega una pagina servizio (slug) ai temi della galleria; `sidebar.yml` - riquadro laterale articoli.

## Contenuti
- `_pages/*.md` (italiano) e `en/*.md` (inglese): una pagina = un file; stesso `ref:` = stessa pagina nelle due lingue. `_posts/` e `en/_posts/` articoli (`AAAA-MM-GG-slug.md`). `_negozio/` e `en/negozio/` pagine shop.
- Pagine tecniche (non traducibili): `404`, `categories-redirect`, `cat-list`, `category-archive`, `tag-archive`, `year-archive` (elenco `SKIP` in `traduzioni_sync.py`).
- Collection opzionali create dall'admin: `_servizi/`, `_progetti/` (non esistono finche' non si crea il primo elemento).

## assets
- `css/main.scss` (tema + ritocchi), `menu.css`, `negozio.css` (shop), `gaming.css` (blocchi home `.gc-`, nome storico), `galleria.css`, `post-cover.css`, `home.css` (purgato, solo classi usate).
- `js/carrello.js` (carrello e checkout, legge `nz-*` e `data-*`), `shop-i18n.js` (traduce l'interfaccia shop), `menu.js`, `galleria.js` (lightbox), `paginazione.js` (elementi per pagina).
- `images/` (favicon, bandiere in `images/flags/<lingua>.svg`), `foto/` (galleria; miniature in `foto/t/`).

## admin (il CMS)
- `index.html` - script inline con la logica vera + elenco delle sezioni con numeri di riga (cerca `GUIDA-SVILUPPO` e `~` vicino a `SHOP CATEGORIE`). Carica i file `js/` DOPO lo script inline.
- `js/`: `lingue.js` (admin > Lingue, rilevamento e normalizzazione), `lingua-admin.js` (lingua di lavoro, rimappa i path), `automatico.js` (date e salvataggi in background), `wp-elenchi.js` (elenchi), `seo-panel.js`, `editor-seo.js`, `foto.js`, `collezioni.js`, `dashboard.js`. LEGACY non caricati: `core.js`, `articoli.js`.

## automation (script Python/Node, si lanciano dalla radice del sito)
- `publish.py` - pubblica articoli e prodotti (ricava repo e URL da soli). `traduzioni_sync.py` - segna `da_aggiornare` (lo lancia l'hook). `allinea_hash.py` - dopo traduzione a mano imposta `tr: tradotto` e l'hash. `traduci_lingua.py` - traduce in automatico le copie. `test_admin.js` - prova l'admin senza browser.
- Fuori dalla repo (cartella `repository\`): `nuovo_sito.ps1` (crea un clone: `-Nome -Brand -Descrizione -Lingue -Whatsapp -Accento -Shop`) e `pubblica.ps1` (pull, commit, push, attende la build).
