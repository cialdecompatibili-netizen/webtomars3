---
layout: single
classes: wide
author_profile: false
title: Cart
description: Your cart.
ecommerce: true
noindex: true
ref: shop-carrello
lang: en
locale: en
tr: tradotto
tr_hash: 12u8l00
permalink: /en/carrello/
---
{%- assign nz_lh = '/' -%}{%- if page.lang and page.lang != site.default_lang -%}{%- assign nz_lh = '/' | append: page.lang | append: '/' -%}{%- endif -%}
{% if site.ecommerce == true %}
<div id="nz-carrello-pag">
<p id="nz-vuoto">Il carrello è vuoto. <a href="{% include url-ref.html ref="shop-negozio" %}">Vai al negozio</a></p>
<div id="nz-pieno" hidden>
<table class="nz-tab">
<thead><tr><th>Prodotto</th><th>Quantità</th><th>Totale</th><th></th></tr></thead>
<tbody id="nz-righe"></tbody>
</table>
<p>Totale <span id="nz-totale" class="nz-totale"></span></p>
<p class="nz-az-passo nz-az-carrello">
<button type="button" id="nz-svuota" class="btn nz-b nz-b-svuota">Svuota il carrello</button>
<a class="btn nz-b nz-b-continua" href="{% include shop-url.html k="shop" %}">Continua lo shopping</a>
<a class="btn nz-b nz-b-vai" id="nz-vai-ordine" href="{{ nz_lh | append: 'ordine/' | relative_url }}">Procedi all'ordine</a>
</p>
</div>
</div>
{% else %}
<p>The shop is not available at the moment.</p>
{% endif %}
