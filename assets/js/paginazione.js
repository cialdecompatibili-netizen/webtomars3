/* GUIDA-SVILUPPO: PAGINAZIONE LATO SITO (blog, negozio, pagina categoria). Nessuna dipendenza.
   COME SI USA: sul contenitore dell'elenco si scrivono tre attributi: data-pg (attiva), data-pg-item="selettore CSS delle voci"
   (relativo al contenitore) e data-per (numero per pagina: nei layout si scrive il valore di site.per_page, da _config.yml > per_page, che si cambia da admin > Impostazioni).
   Tutte le voci restano nell'HTML (utile ai motori di ricerca): qui si nascondono solo con la classe .pg-off.
   FILTRI: le voci con l'attributo hidden (es. pillole del negozio) NON contano nelle pagine. Dopo aver cambiato hidden chiamare window.PgLista.refresh(contenitore, true).
   Se rinomini data-pg / data-pg-item / data-per / pg-off aggiorna anche i layout che li usano (blog.md, negozio.md, categoria.md, in it e en). */
(function () {
  var st = document.createElement('style');
  st.textContent = '.pg-off{display:none!important}.pg-nav{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;margin:1.6rem 0}'
    + '.pg-nav button{min-width:38px;height:38px;padding:0 10px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer;opacity:.75}'
    + '.pg-nav button:hover:not(:disabled){opacity:1}.pg-nav button[aria-current="true"]{opacity:1;font-weight:700;background:rgba(127,127,127,.18)}'
    + '.pg-nav button:disabled{opacity:.3;cursor:default}.pg-nav .pg-gap{opacity:.5}';
  document.head.appendChild(st);
  var EN = /^en/i.test(document.documentElement.lang || '');

  function btn(label, p, opts) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.setAttribute('data-p', p);
    if (opts && opts.cur) b.setAttribute('aria-current', 'true');
    if (opts && opts.dis) b.disabled = true;
    if (opts && opts.aria) b.setAttribute('aria-label', opts.aria);
    return b;
  }

  function draw(box, scroll) {
    var s = box._pg, per = parseInt(box.getAttribute('data-per'), 10) || 20;
    var items = [].slice.call(box.querySelectorAll(box.getAttribute('data-pg-item')));
    var vis = items.filter(function (el) { return !el.hidden; });
    var np = Math.max(1, Math.ceil(vis.length / per));
    if (s.page > np) s.page = np;
    items.forEach(function (el) { el.classList.remove('pg-off'); });
    vis.forEach(function (el, i) {
      if (i < (s.page - 1) * per || i >= s.page * per) el.classList.add('pg-off');
    });
    s.nav.innerHTML = '';
    if (np <= 1) return;
    s.nav.appendChild(btn('\u00ab', 1, { dis: s.page === 1, aria: EN ? 'First page' : 'Prima pagina' }));
    s.nav.appendChild(btn('\u2039', s.page - 1, { dis: s.page === 1, aria: EN ? 'Previous page' : 'Pagina precedente' }));
    var last = 0;
    for (var p = 1; p <= np; p++) {
      if (p === 1 || p === np || Math.abs(p - s.page) <= 1) {
        if (last && p - last > 1) { var g = document.createElement('span'); g.className = 'pg-gap'; g.textContent = '\u2026'; s.nav.appendChild(g); }
        s.nav.appendChild(btn(p, p, { cur: p === s.page }));
        last = p;
      }
    }
    s.nav.appendChild(btn('\u203a', s.page + 1, { dis: s.page === np, aria: EN ? 'Next page' : 'Pagina successiva' }));
    s.nav.appendChild(btn('\u00bb', np, { dis: s.page === np, aria: EN ? 'Last page' : 'Ultima pagina' }));
    if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init(box) {
    if (box._pg) { draw(box, false); return; }
    var nav = document.createElement('nav');
    nav.className = 'pg-nav'; nav.setAttribute('aria-label', EN ? 'Pages' : 'Pagine');
    box.parentNode.insertBefore(nav, box.nextSibling);
    box._pg = { page: 1, nav: nav };
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-p]');
      if (!b || b.disabled) return;
      box._pg.page = parseInt(b.getAttribute('data-p'), 10);
      draw(box, true);
    });
    draw(box, false);
  }

  function refresh(box, reset) {
    var list = box ? [box] : [].slice.call(document.querySelectorAll('[data-pg]'));
    list.forEach(function (b) { if (b && b._pg) { if (reset) b._pg.page = 1; draw(b, false); } });
  }

  window.PgLista = { init: init, refresh: refresh };
  function all() { [].forEach.call(document.querySelectorAll('[data-pg]'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
