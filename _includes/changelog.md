# Changelog

---

## [1.1.1] — 2026-04-30

### Fix layout articolo

- Testo articolo ora occupa tutta la larghezza disponibile accanto alla sidebar (fix CSS Grid con override completo width/float/padding di Minimal Mistakes)

---

## [1.1.0] — 2026-04-30

### Miglioramenti layout e admin

- Sidebar autore spostata a destra sugli articoli (soluzione CSS definitiva, zero rotture)
- "You May Also Enjoy" — card affiancate corrette (2 colonne tablet, 4 colonne desktop)
- Bottone 🚀 Deploy nella topbar admin — link diretto a GitHub Actions, dinamico per ogni cliente
- Link "Admin" nella topbar ora apre nella stessa finestra invece di aprirne una nuova

---

## [1.0.0] — 2026-04-28

### Prima versione pubblica

- CMS completo per Jekyll + GitHub Pages
- Tab Articoli: crea, modifica, elimina articoli
- Tab Pagine: modifica pagine statiche + home
- Tab Menu: gestione navigazione
- Tab Categorie: gestione categorie articoli
- Tab Token: salvataggio token GitHub in localStorage
- Tab Tema: selezione skin Minimal Mistakes (9 skin)
- Tab Impostazioni: titolo, email, autore, bio, social, homepage
- Editor visuale (contenteditable) + HTML grezzo
- Sistema auto-update con bottone nel menu
- Changelog visibile nel menu del CMS
- Licenza: Commons Clause + MIT (uso commerciale richiede licenza)
