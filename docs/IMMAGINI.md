# IMMAGINI.md - stile foto prodotti di questo sito

Il motore che genera le foto NON sta in questo repo (e' pubblico): vive sul PC di chi gestisce il sito, con la sua guida privata.
Qui sta solo cio' che e' specifico del sito, in `_data/`:

- Bottiglie/bevande: `_data/colori_foto.json` -> `{"id-prodotto": "colore del liquido"}`.
- Altri prodotti: `_data/foto_prompt.json`
      {"template": "<prompt in inglese con {nome} e {aspetto}>", "default": "<aspetto generico>", "aspetti": {"<id>": "<aspetto>"}}
  `{nome}` = nome prodotto del catalogo (va in etichetta), `{aspetto}` = voce di `aspetti` per l'id (o `default`).
- Prodotti da fotografare: in `_data/catalogo.json` quelli fisici con `"immagine": ""`. Il motore scrive da solo `assets/images/prodotti/<id>.webp` e il campo `immagine`.
- Regola prompt: etichetta SOLO col nome prodotto, niente marchi inventati.

Contenuti (home, pagine, articoli): `python automation/sviluppa.py [-m "msg"] [--no-push] [--solo-controlli]` (esegue `automation/contenuti_*.py`, permalink, hash lingue, controlli, commit, push).