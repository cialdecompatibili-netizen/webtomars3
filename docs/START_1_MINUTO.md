# START IN 1 MINUTO - mistraltemplate1

Leggi solo questo per partire. Dettagli: `AGENTS.md` (regole), `docs/MAPPA.md` (dove sta cosa), `docs/RICETTE.md` (procedure), `docs/ERRORI_NOTI.md` (errori da non rifare).

**CREARE UN SITO DA QUESTO TEMPLATE: leggi PRIMA `docs/CLONAZIONE.md` (un comando `nuovo_sito.ps1` + `personalizza_clone.py` fanno colori, logo, sfondo home; un solo commit). Ogni automazione che impari va scritta come script in `automation/` e annotata li' (regola nella sezione 5): obiettivo meno tempo e meno commit per ogni nuovo sito.**

## Ambiente (fisso)
- Cartella repo: `C:\Users\mirco\Desktop\repository\<nome>` | account GitHub: `cialdecompatibili-netizen` | sito: `https://cialdecompatibili-netizen.github.io/<nome>/` | admin: `.../<nome>/admin/`
- Windows + PowerShell. Strumenti: Desktop Commander (file, processi), `git`, `gh`, `node`, `python`. NESSUNA build Jekyll locale: si controlla online.
- Script nella cartella padre `Desktop\repository`: `pubblica.ps1` (commit+push), `nuovo_sito.ps1` (clona il template).

## I 4 comandi (da dentro la cartella del sito)
1. Stato: `git status --short`  (sessione interrotta? spesso manca solo commit+push)
2. Controllo completo (10 s): `powershell -NoProfile -ExecutionPolicy Bypass -File automation\controllo.ps1`  -> deve dire `TUTTO OK`
3. Pubblica: `..\pubblica.ps1 -Repo <nome> -Msg "..." -Files a,b,c -Aspetta`  (poi `git show --stat HEAD`)
4. Online: home, `/en/`, pagina toccata, `/sitemap.xml`

## Nuovo sito in 1 minuto
`..\nuovo_sito.ps1 -Nome <nome> -Brand "Nome Sito" -Descrizione "..." -Lingue it,en [-Accento "#rrggbb"] [-Whatsapp 39...] [-Shop]`
Poi: contact_endpoint/whatsapp/email in `_config.yml`, testi home da admin > Home, `controllo.ps1`, pubblica.

## Dove si cambia cosa (1 riga ciascuno)
| Voglio cambiare | File |
|---|---|
| nome, lingue, shop on/off, contatti | `_config.yml` |
| colori | `_data/tema.json` (solo qui) |
| home IT / EN | `_data/blocks_home.json` / `_data/i18n/en/blocks_home.json` (solo il campo `html`) |
| menu IT / EN | `_data/navigation.yml` / `_data/i18n/en/navigation.yml` |
| pagina | `_pages/x.md` + `en/x.md` (stesso `ref:`) |
| articolo | `_posts/` + `en/_posts/` |
| prodotti | `_data/catalogo.json` (centesimi) + `_negozio/x.md` |
| etichette interfaccia / shop / date | `_data/ui-text.yml`, `_data/shop_ui.yml`, `_data/date_ui.yml` |
| nuova lingua | admin > Lingue, oppure clonare la cartella `xx/` |

## 8 regole che evitano il 90% degli errori
1. Zero valori fissi (repo, utente, dominio, telefono): `relative_url`, `site.*`.
2. Colori solo da `tema.json`; niente bordi laterali colorati.
3. In Liquid mai una graffa chiusa dentro `{{ }}`; mai `a contains b == false`.
4. Non cambiare il corpo di una pagina italiana senza guardare la traduzione (`allinea_hash.py en`).
5. Niente GitHub Actions: traduzioni con hook locale (`git config core.hooksPath .githooks`, una volta per clone).
6. Non toccare `admin/js/core.js` e `articoli.js` (legacy), ne' rinominare `gaming.css`, `nz-*`, `data-*` dello shop.
7. Mai dati inventati: segnaposto (`00`, "Nome Sito") finche' non c'e' il dato vero.
8. Dopo il push verifica che il commit contenga i file voluti. PowerShell: mai funzioni `RD/WR/CD/LS` (alias).

## Chiudere una sessione
Commit+push fatti, `git status` pulito, `controllo.ps1` = TUTTO OK, 3 righe: cosa e' cambiato / cosa verificato / cosa NON verificato.

## Repo del progetto (24/10/2026)
Tutte le repo in `Desktop\repository` sono su GitHub. Elenco e decisioni aperte: `Desktop\repository\SVILUPPO_REPO.md`.
