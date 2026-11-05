---
layout: single
title: "Progetti"
permalink: /progetti/
ref: progetti
author_profile: false
classes: wide
seo_description: "I progetti realizzati: e-commerce, siti WordPress, SEO e branding."
---
<link rel="stylesheet" href="{{ '/assets/css/home-webtomars.css' | relative_url }}">
{%- comment -%} Elenco dinamico dei file di _progetti/ (campo importance, 1 = per primo). Link esterno se il progetto ha 'redirect:'. {%- endcomment -%}
{%- assign prj = site.progetti | sort: 'importance', 'last' -%}
<div class="prj-home"><div class="prj-home-grid">
{%- for p in prj -%}
<a class="prj-home-card" href="{{ p.url | relative_url }}"><b>{{ p.title | escape }}</b>{% if p.description != blank %}<small>{{ p.description | escape }}</small>{% endif %}</a>
{%- endfor -%}
</div></div>
