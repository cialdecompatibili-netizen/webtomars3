# Demo microsystem: 1 categoria + 1 prodotto (IT+EN). Genera catalogo.json e le 4 pagine, toglie gli esempi del template.
# ESEMPIO per nuovi siti: cambia R (cartella repo), categoria e prodotto. JSON con ensure_ascii=False e riletto.
import json, os
R = r"C:\Users\mirco\Desktop\repository\microsystem"
cat_path = os.path.join(R, "_data", "catalogo.json")
d = json.load(open(cat_path, encoding="utf-8"))

# categoria (id riservato: non riusarlo per un prodotto)
d["categorie"] = [{
    "nome": "Mesh LoRa e Meshtastic",
    "id": "mesh-lora",
    "icona": "\U0001F4E1",
    "descrizione": "Ripetitori, nodi e kit per reti mesh LoRa senza internet: schede ESP32 e Raspberry Pi gia' configurate, pronte da installare.",
    "immagine": "assets/images/categorie/mesh-lora.webp",
    "tr": {"en": {
        "nome": "LoRa Mesh & Meshtastic",
        "descrizione": "Repeaters, nodes and kits for off-grid LoRa mesh networks: ESP32 and Raspberry Pi boards already configured and ready to install."}}
}]

# prodotto (prezzo DEMO da confermare; centesimi)
d["prodotti"] = [{
    "tipo": "fisico",
    "id": "ripetitore-meshtastic-solare",
    "nome": "Ripetitore Meshtastic solare ESP32 LoRa",
    "categoria": "mesh-lora",
    "prezzo_centesimi": 7900,
    "descrizione": "Ripetitore mesh LoRa a energia solare: scheda ESP32-S3 con radio SX1262, firmware Meshtastic gia' installato, in custodia stagna con pannello solare. Lo monti e copre la zona.",
    "descrizione_completa": "Ripetitore per reti mesh LoRa pronto da installare all'aperto: scheda ESP32-S3 con radio LoRa SX1262, antenna esterna e firmware Meshtastic gia' configurato in modalita' ripetitore.\nAlloggiato in una custodia stagna con pannello solare e batteria ricaricabile, per funzionare senza alimentazione di rete.\nPensato per chi vuole estendere una rete mesh su colline, rifugi, aziende agricole o zone senza copertura. La portata reale dipende da altezza di installazione e ostacoli.\nFrequenza europea 868 MHz. Spedito testato, con istruzioni di montaggio in italiano.",
    "immagine": "assets/images/prodotti/ripetitore-meshtastic-solare.webp",
    "icona": "\U0001F4E1",
    "visibile": True,
    "tr": {"en": {
        "nome": "Solar Meshtastic repeater ESP32 LoRa",
        "descrizione": "Solar-powered LoRa mesh repeater: ESP32-S3 board with SX1262 radio, Meshtastic firmware pre-installed, in a weatherproof case with solar panel. Mount it and it covers the area.",
        "descrizione_completa": "Outdoor-ready repeater for LoRa mesh networks: ESP32-S3 board with SX1262 LoRa radio, external antenna and Meshtastic firmware already configured as a repeater.\nHoused in a weatherproof case with a solar panel and rechargeable battery, so it runs without mains power.\nBuilt for anyone extending a mesh network over hills, mountain huts, farms or areas with no coverage. Real-world range depends on mounting height and obstacles.\nEuropean 868 MHz band. Shipped tested, with assembly instructions."}}
}]
open(cat_path, "w", encoding="utf-8", newline="\n").write(json.dumps(d, ensure_ascii=False, indent=2))  # MAI ensure_ascii=True: le emoji escape rompono la build Jekyll
json.load(open(cat_path, encoding="utf-8"))  # rilettura di controllo

def w(rel, txt):
    p = os.path.join(R, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "w", encoding="utf-8", newline="\n").write(txt)

# tolgo gli esempi del template (restano online e indicizzati)
for rel in ["_negozio/categoria-esempio.md", "_negozio/prodotto-esempio.md",
            "en/negozio/categoria/esempio.md", "en/negozio/prodotto-esempio.md"]:
    p = os.path.join(R, rel)
    if os.path.exists(p): os.remove(p)

w("_negozio/categoria-mesh-lora.md", """---
layout: negozio-categoria
title: "Mesh LoRa e Meshtastic"
cid: mesh-lora
permalink: /negozio/categoria/mesh-lora/
description: "Ripetitori, nodi e kit per reti mesh LoRa senza internet, con ESP32 e Raspberry Pi."
ref: shop-cat-mesh-lora
---
""")
w("en/negozio/categoria/mesh-lora.md", """---
layout: negozio-categoria
title: "LoRa Mesh & Meshtastic"
cid: mesh-lora
permalink: /en/shop/category/lora-mesh/
description: "Repeaters, nodes and kits for off-grid LoRa mesh networks, built on ESP32 and Raspberry Pi."
lang: en
locale: en
ref: shop-cat-mesh-lora
---
""")
w("_negozio/ripetitore-meshtastic-solare.md", """---
layout: negozio-prodotto
title: "Ripetitore Meshtastic solare ESP32 LoRa"
pid: ripetitore-meshtastic-solare
permalink: /negozio/ripetitore-meshtastic-solare/
description: "Ripetitore mesh LoRa solare con ESP32-S3 e Meshtastic gia' configurato, in custodia stagna."
ref: shop-prod-ripetitore-meshtastic-solare
---
""")
w("en/negozio/ripetitore-meshtastic-solare.md", """---
layout: negozio-prodotto
title: "Solar Meshtastic repeater ESP32 LoRa"
pid: ripetitore-meshtastic-solare
permalink: /en/shop/solar-meshtastic-repeater/
description: "Solar LoRa mesh repeater with ESP32-S3 and pre-configured Meshtastic, in a weatherproof case."
lang: en
locale: en
ref: shop-prod-ripetitore-meshtastic-solare
---
""")
print("OK")
