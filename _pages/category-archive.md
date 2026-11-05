---
title: "Categorie"
layout: single
permalink: /categorie/
author_profile: false
classes: wide
---

<style>
.cg-sec{margin:0 0 3rem}
.cg-head h2{margin:0 0 .3rem !important;text-transform:capitalize;font-size:1.8rem}
.cg-head p{margin:0 0 1.4rem !important;color:#666;max-width:46rem}
.cg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.1rem}
.cg-card{display:flex;flex-direction:column;background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:14px;padding:1.3rem 1.4rem;text-decoration:none !important;color:inherit;transition:box-shadow .15s,transform .15s,border-color .15s}
.cg-card:hover{box-shadow:0 8px 22px rgba(0,0,0,.09);transform:translateY(-2px);border-color:rgba(0,0,0,.25)}
.cg-card h3{margin:0 0 .45rem !important;font-size:1.08rem;line-height:1.3;color:#1a1a2e}
.cg-card p{margin:0 0 1rem !important;font-size:.9rem;line-height:1.55;color:#666;flex:1}
.cg-card span{font-weight:700;font-size:.9rem;color:var(--t-accent,#3f6b00)}
</style>

{% assign cats = site.categories | sort %}
{% for cat in cats %}
{% assign cat_data = site.data.categorie | where: "nome", cat[0] | first %}
{% assign items = cat[1] | sort: "ordine" %}
<section class="cg-sec" id="{{ cat[0] | slugify }}">
  <div class="cg-head">
    <h2>{{ cat[0] }}</h2>
    {% if cat_data.descrizione and cat_data.descrizione != "" %}<p>{{ cat_data.descrizione | strip_html }}</p>{% endif %}
  </div>
  <div class="cg-grid">
    {% for it in items %}
    {% assign txt = it.description | default: it.excerpt | strip_html | strip_newlines | truncate: 110 %}
    <a class="cg-card" href="{{ it.url | relative_url }}">
      <h3>{{ it.title }}</h3>
      <p>{{ txt }}</p>
      <span>Scopri &rarr;</span>
    </a>
    {% endfor %}
  </div>
</section>
{% endfor %}
