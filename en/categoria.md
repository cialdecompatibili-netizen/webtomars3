---
title: "Category"
layout: single
author_profile: false
classes: wide
ref: categoria
lang: en
locale: en
tr: tradotto
tr_hash: 1bk11xf
permalink: /en/category/
---
{%- assign posts_l = site.posts | where: "lang", page.lang -%}

<style>
#page-title{display:none}
.cat-header{margin-bottom:1.6em}
.cat-header-name{font-family:'Playfair Display',Georgia,serif;font-size:2em;font-weight:500;color:#141414;margin:0 0 .3em}
.cat-header-desc{font-size:15px;color:#6b665f;margin:0;line-height:1.6;max-width:62ch}
.cat-back{font-size:13px;color:#0e7490;text-decoration:none;display:inline-block;margin-bottom:1.2em}
.cat-back:hover{text-decoration:underline}
.art-list{display:flex;flex-direction:column;gap:1.1rem}
.art-row{display:grid;grid-template-columns:clamp(220px,34%,320px) 1fr;background:#fff;border:1px solid #e9e3d9;border-radius:18px;overflow:hidden;text-decoration:none;color:inherit;transition:border-color .2s,box-shadow .2s}
.art-row:hover{border-color:#7fd8e6;box-shadow:0 6px 22px rgba(14,80,100,.08);text-decoration:none}
.art-row:focus-visible{outline:3px solid #0e9bb5;outline-offset:3px}
.art-row-media{position:relative;min-height:190px;background:#f3eee6}
.art-row-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.art-row-body{padding:1.4rem 1.7rem;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.5rem}
.art-row-date{font-size:12px;color:#9a948a}
.art-row-title{font-family:'Playfair Display',Georgia,serif;font-size:1.25rem;font-weight:500;color:#141414;line-height:1.3}
.art-row-excerpt{font-size:.95rem;color:#5b5650;line-height:1.7;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.cat-empty{color:#9a948a;font-size:14px;padding:2em 0;text-align:center}
@media(max-width:640px){
.art-row{grid-template-columns:1fr}
.art-row-media{min-height:0;aspect-ratio:16/10}
.art-row-body{padding:1.1rem 1.2rem 1.3rem}
}
</style>

<a class="cat-back" href="{{ '/categorie/' | relative_url }}">← All categories</a>
<div id="cat-container"><div class="cat-empty">Loading...</div></div>

<script>
const SITE_POSTS = [
  {% for post in posts_l %}
  {
    title: {{ post.title | jsonify }},
    url: "{{ post.url | relative_url }}",
    date: "{{ post.date | date: '%d %b %Y' }}",
    excerpt: {{ post.excerpt | strip_html | strip_newlines | truncate: 320 | jsonify }},
    image: {% if post.header.teaser %}{{ post.header.teaser | relative_url | jsonify }}{% else %}""{% endif %},
    categories: {{ post.categories | jsonify }}
  }{% unless forloop.last %},{% endunless %}
  {% endfor %}
];

(function(){
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat') || '';
  const container = document.getElementById('cat-container');
  if(!cat){ container.innerHTML = '<div class="cat-empty">No category specified.</div>'; return; }

  const CAT_DATA = {{ site.data.categorie | jsonify }};
  const catInfo = (CAT_DATA||[]).find(c => c.nome === cat) || {};
  const posts = SITE_POSTS.filter(p => p.categories && p.categories.includes(cat));

  document.title = cat + ' — Categories';

  let html = `<div class="cat-header">
    <div class="cat-header-name">${cat}</div>
    ${catInfo.descrizione ? `<div class="cat-header-desc">${catInfo.descrizione.replace(/<[^>]*>/g,'')}</div>` : ''}
  </div>`;

  if(!posts.length){
    html += '<div class="cat-empty">No articles in this category.</div>';
  } else {
    html += '<div class="art-list" data-pg data-pg-item=".art-row" data-per="{{ site.per_page | default: 20 }}">';
    posts.forEach(p => {
      const alt = p.title.replace(/"/g,'&quot;');
      const img = p.image
        ? `<img class="art-row-img" src="${p.image}" alt="${alt}" loading="lazy">`
        : '';
      html += `<a class="art-row" href="${p.url}">
        <div class="art-row-media">${img}</div>
        <div class="art-row-body">
          <div class="art-row-date">${p.date}</div>
          <div class="art-row-title">${p.title}</div>
          <div class="art-row-excerpt">${p.excerpt}</div>
        </div>
      </a>`;
    });
    html += '</div>';
  }

  container.innerHTML = html;
})();
</script>
