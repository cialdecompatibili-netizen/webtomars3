# Sistema multilingua: guida per replicare, migrare e usare

Funziona su Jekyll puro (GitHub Pages), senza plugin. Lingua base alla radice (`/`), le altre in sottocartelle (`/en/`, `/de/`...).

## Come e' fatto

| Pezzo | Dove | A cosa serve |
|---|---|---|
| Lingue attive | `_config.yml`: `default_lang`, `languages: [it, en]`, `locale` | Elenco lingue e lingua base |
| Assegnazione lingua | `_config.yml` > `defaults` (blocco `LANG-DEFAULTS`) | Ogni file in `en/` prende `lang: en`; gli articoli in `en/_posts` hanno permalink `/en/:categories/:title/` |
| Collegamento tra versioni | `ref:` nel front matter | Stesso `ref` in tutte le lingue = stessa pagina/articolo |
| Stato traduzione | `tr: copia / tradotto / da_aggiornare` e `tr_hash` | `copia` = ancora testo originale (noindex, fuori sitemap) |
| Nomi lingue e bandiere | `_data/languages.yml`, `assets/images/flags/*.svg` | Selettore nel menu |
| Menu per lingua | `_data/i18n/<lingua>/navigation.yml`, `sottomenu.yml`, `shop_nav.yml` | Se esiste, sostituisce quello italiano |
| Blocchi home per lingua | `_data/i18n/<lingua>/blocks_home.json` | Letto da `_includes/render-blocks.html` |
| Testi del tema | `_data/ui-text.yml` (chiavi `it:`, `en:`...) | Etichette fisse del tema |
| SEO | `_includes/head/custom.html` | `hreflang` tra versioni con lo stesso `ref`, `noindex` sulle `copia` |
| Selettore lingua | `_includes/footer/custom.html`, `masthead.html`, `assets/js/menu.js` | Appare solo se la traduzione esiste |
| Admin | voce **Lingue** (`admin/js/lingue.js`) | Crea lingua, tabella stato, "Crea copia", "Segna tradotto" |
| Controllo modifiche | `automation/traduzioni_sync.py` + hook `.githooks/pre-commit` | Se cambia l'italiano, mette `da_aggiornare` alle traduzioni |
| Traduzione automatica | `automation/traduci_lingua.py` | Traduce in blocco gli articoli `copia` |

Il `tr_hash` e' l'hash del testo originale quando e' stato tradotto. Lo stesso algoritmo e' in `lingue.js` (`lgHash`) e in `traduzioni_sync.py` (`lg_hash`): se cambi uno, cambia anche l'altro.

## Aggiungere una lingua (es. tedesco)

**Metodo veloce (automatico): clona la cartella.** Copia `en/` in `de/` (e, se c'e', `_data/i18n/en/` in `_data/i18n/de/`), poi fai commit e push. Il sito la rileva da solo (bandiera nel selettore, `_includes/lingue-attive.html`). Apri admin > **Lingue**: l'admin la registra in `_config.yml`, `languages.yml`, `ui-text.yml` e corregge `lang`/`permalink` dei file clonati e gli url dei menu, poi la lingua compare nella tabella con "modifica" su ogni pagina. Funziona anche rinominando una cartella esistente (la vecchia lingua senza cartella sparisce dall'elenco). Regola: la CARTELLA e' la fonte di verita'. Nome mostrato e bandiera: vedi i punti 2 sotto.

**Metodo da admin:**

1. Admin > **Lingue** > **Nuova lingua**: scegli `de`, scegli da quale lingua clonare. Crea in un solo commit `de/` con pagine e articoli (`tr: copia`, `ref`, permalink e scope in `_config.yml`).
2. Se la lingua non e' in `_data/languages.yml`, aggiungila (nome) e metti la bandiera in `assets/images/flags/de.svg`.
3. Crea i file del menu in `_data/i18n/de/` (copia quelli di `en` e traduci le etichette) e, se serve, `blocks_home.json`.
4. Traduci gli articoli in blocco:
   ```
   pip install deep-translator    # serve solo per il ripiego, il motore base usa solo la libreria standard
   python automation/traduci_lingua.py de
   ```
5. Le pagine (home, azienda, contatti...) sono poche e importanti: traducile a mano o con Claude, poi in admin premi **Segna tradotto**. Finche' sono `copia` restano noindex.
6. Controlla a campione, poi `git add -A && git commit`.

## Usare lo script di traduzione

```
python automation/traduci_lingua.py en                    # tutti gli articoli ancora 'copia'
python automation/traduci_lingua.py en --limit 3          # prova su 3
python automation/traduci_lingua.py en --file leibovitz   # solo i file con quel testo nel nome
```

- **Riprendibile**: le frasi gia' tradotte sono in `automation/tmp/cache_tr.json`; i file gia' fatti vengono saltati. Se si ferma (Google blocca, spegni il PC) rilancia lo stesso comando.
- **Sicuro**: tag, link, immagini, iframe e classi non vengono toccati. I tag in linea (`strong`, `em`, `a`) diventano `[1] [2]` durante la traduzione; se la verifica fallisce traduce testo per testo.
- **Pausa anti-blocco**: 0,6 s tra le richieste (`PAUSA` in cima al file). In caso di blocco aspetta e riprova da solo.
- **Non fa commit**: verifica e committa tu.
- **Cambiare motore** (DeepL, ecc.): modifica solo la funzione `motore()`.
- **Limiti noti**: il traduttore automatico sbaglia il genere dei nomi di persona (es. "his" per una donna) e non conosce i termini di moda. Rileggi gli articoli piu' importanti.

## Spostare il sistema in un altro sito

Copia questi file/cartelle, poi cambia solo `_config.yml` (`default_lang`, `languages`, `locale`, `LANG-DEFAULTS`):

- `_data/languages.yml`, `_data/ui-text.yml`, `_data/i18n/`
- `_includes/masthead.html`, `_includes/render-blocks.html`, `_includes/head/custom.html`, `_includes/footer/custom.html`
- `assets/js/menu.js`, `assets/images/flags/`, regole `.lang-switch` in `menu.css`
- `admin/js/lingue.js` e la voce "Lingue" in `admin/index.html`
- `automation/traduzioni_sync.py`, `automation/traduci_lingua.py`, `.githooks/pre-commit` (attivo con `git config core.hooksPath .githooks`)

Poi: assicurati che ogni pagina e articolo della lingua base abbia `ref:` (l'admin lo aggiunge da solo quando crei una copia), e che gli elenchi che usano `site.posts` siano filtrati con `where: "lang", page.lang`.

## Problemi tipici

- **Una pagina EN compare in italiano**: ha `tr: copia`. Traducila e passa a `tradotto`.
- **Il selettore lingua non appare**: manca il `ref` uguale nelle due versioni.
- **Troppe richieste al traduttore**: aspetta, oppure cambia `motore()`.
- **PowerShell**: non chiamare funzioni `RD`, `WR`, `CD`, `LS`: sono alias e `RD` cancella i file.
