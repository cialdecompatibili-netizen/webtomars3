---
ref: shop-negozio
layout: single
classes: wide
author_profile: false
title: Negozio
permalink: /negozio/
description: Scegli i prodotti, indica la quantità e aggiungili al carrello.
ecommerce: true
noindex: false
---
{%- assign nz_lh = '/' -%}{%- if page.lang and page.lang != site.default_lang -%}{%- assign nz_lh = '/' | append: page.lang | append: '/' -%}{%- endif -%}
{% if site.ecommerce == true %}
<div id="negozio" data-tracker="{{ site.ordini.tracker }}">
<div class="nz-pills">
<button type="button" class="nz-pill on" data-cat="">Tutti</button>
{% for c in site.data.catalogo.categorie %}{% unless c.genitore %}
<a class="nz-cpill" href="{% include shop-url.html k="cat" id=c.id %}">{{ c.icona }} {{ c.tr[page.lang].nome | default: c.nome }}</a>
{% endunless %}{% endfor %}
</div>
<div class="nz-lista" data-pg data-pg-item=".nz-box" data-per="{{ site.per_page | default: 20 }}">
{% for b in site.data.catalogo.prodotti %}
{% if b.visibile == false %}{% continue %}{% endif %}
{% assign cat = site.data.catalogo.categorie | where: 'id', b.categoria | first %}
<div class="nz-riga nz-box" data-id="{{ b.id }}" data-cat="{{ b.categoria }}" data-nome="{{ b.tr[page.lang].nome | default: b.nome | escape }}" data-prezzo="{{ b.prezzo_centesimi }}" data-tipo="{{ b.tipo | default: 'fisico' }}">
<div class="nz-icona">{% if b.immagine and b.immagine != '' %}<img src="{% if b.immagine contains '://' %}{{ b.immagine }}{% else %}{{ '/' | append: b.immagine | relative_url }}{% endif %}" alt="" loading="lazy">{% else %}{{ b.icona }}{% endif %}</div>
<div class="nz-testo">
<p class="nz-cat"><a href="{% include shop-url.html k="cat" id=b.categoria %}">{{ cat.tr[page.lang].nome | default: cat.nome }}</a> · <span>{% if b.tipo == 'digitale' %}digitale{% else %}fisico{% endif %}</span></p>
<h3><a href="{% include shop-url.html k="prod" id=b.id %}">{{ b.tr[page.lang].nome | default: b.nome }}</a></h3>
<div class="nz-prezzo fw-bold"></div>
<p class="nz-breve">{{ b.tr[page.lang].descrizione | default: b.descrizione }}</p>
</div>
<div class="nz-azioni">
<div class="nz-step"><button type="button" class="nz-stp" data-d="-1" aria-label="Meno">&minus;</button><input type="number" class="nz-qta" min="1" max="20" value="1" aria-label="Quantità"><button type="button" class="nz-stp" data-d="1" aria-label="Più">+</button></div>
<button type="button" class="btn btn-primary nz-add">Aggiungi al carrello</button>
<span class="nz-ok" aria-live="polite"></span>
</div>
</div>
{% endfor %}
</div>
<p class="nz-vai"><a class="btn btn-outline-secondary" href="{{ nz_lh | append: 'carrello/' | relative_url }}">Vai al carrello <span id="nz-conta" class="text-muted"></span></a></p>
</div>
{% else %}
<p>Il negozio non e' attivo in questo momento.</p>
{% endif %}
