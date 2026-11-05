---
ref: shop-grazie
layout: single
classes: wide
author_profile: false
title: Grazie
permalink: /grazie/
description: Ordine ricevuto.
ecommerce: true
noindex: true
---
{% if site.ecommerce == true %}
Grazie per l'ordine! Ti scriviamo a breve con i dettagli della consegna.
{% else %}
<p>Il negozio non e' attivo in questo momento.</p>
{% endif %}
