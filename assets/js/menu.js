// GUIDA-SVILUPPO: due blocchi indipendenti: (1) menu (hamburger, tendine, voce attiva, adattamento larghezza), (2) selettore lingua. Il masthead e' in cache e identico su tutte le pagine: la lingua corrente e i link alla traduzione si calcolano QUI leggendo i <link rel=alternate hreflang> dell'head, mai nel masthead.
// Non rinominare gli attributi data-nv-* e le classi nv__*: li usano masthead.html e menu.css.
/* =====================================================================
   MENU DEL SITO (assets/js/menu.js)  -  adattato da nav-toggle.js di al-folio
   Nessuna libreria. Fa tre cose:
     1) il pulsante hamburger [data-nv-toggle="nv-panel"] apre/chiude il pannello #nv-panel
     2) il padre di una tendina [data-nv-dropdown-toggle] apre/chiude la sua tendina
        (una sola tendina aperta per volta)
     3) si chiude tutto cliccando fuori, premendo Esc o toccando un link del menu
   Lo stato "aperto" e' la classe .show (sul pannello e sull'<li> della tendina):
   l'aspetto lo decide menu.css. Gli attributi aria-expanded sono aggiornati per
   chi usa la tastiera o uno screen reader.
   ===================================================================== */
(function () {
  function init() {
    var toggle = document.querySelector('[data-nv-toggle]');
    var panel = toggle ? document.getElementById(toggle.getAttribute('data-nv-toggle')) : null;
    var ddToggles = Array.prototype.slice.call(document.querySelectorAll('[data-nv-dropdown-toggle]'));

    // chiude tutte le tendine (tranne "except", se data)
    function closeDropdowns(except) {
      ddToggles.forEach(function (t) {
        if (t === except) return;
        var li = t.closest('.nv__item');
        if (li) li.classList.remove('show');
        t.setAttribute('aria-expanded', 'false');
      });
    }

    // chiude il pannello hamburger (e le tendine dentro)
    function closePanel() {
      if (!toggle || !panel) return;
      panel.classList.remove('show');
      toggle.classList.add('collapsed');
      toggle.setAttribute('aria-expanded', 'false');
      closeDropdowns();
    }

    if (toggle && panel) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = panel.classList.contains('show');
        if (open) { closePanel(); return; }
        panel.classList.add('show');
        toggle.classList.remove('collapsed');
        toggle.setAttribute('aria-expanded', 'true');
      });
    }

    ddToggles.forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();           // cosi' il click non arriva al "chiudi tutto" qui sotto
        var li = t.closest('.nv__item');
        var open = li.classList.contains('show');
        closeDropdowns(t);
        li.classList.toggle('show', !open);
        t.setAttribute('aria-expanded', String(!open));
      });
    });

    // ---- VOCE ATTIVA (calcolata qui e non in masthead.html: il tema mette il masthead in cache) ----
    // Regola: una voce e' attiva se l'indirizzo della pagina e' uguale al suo, oppure sta "dentro"
    // (es. voce /blog/ attiva anche su /blog/2026/...). La Home e' attiva solo sulla home.
    // Ignorati: link esterni, "#", ancore tipo /#pricing. Una voce di tendina e' attiva se lo e' un figlio.
    function norm(p) { return p.replace(/index\.html$/, ''); }
    var here = norm(location.pathname);
    var home = norm(document.querySelector('.nv__brand').pathname);
    function setActive(el) { if (el) el.classList.add('active'); }
    Array.prototype.forEach.call(document.querySelectorAll('.nv__dd-item'), function (a) {
      if (norm(a.pathname) === here) { setActive(a); setActive(a.closest('.nv__item')); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('.nv__item > a.nv__link'), function (a) {
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#' || a.hash || a.host !== location.host) return;
      var p = norm(a.pathname);
      if (p === home ? here === home : here.indexOf(p) === 0) setActive(a.parentNode);
    });

    // click fuori dal menu = chiudi tutto; click su un link = chiudi l'hamburger
    document.addEventListener('click', function (e) {
      var inside = e.target.closest && e.target.closest('#site-nav');
      if (!inside) { closePanel(); closeDropdowns(); return; }
      if (e.target.closest('a')) closePanel();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closePanel(); closeDropdowns(); }
    });

    // MENU SU UNA RIGA: se le voci non ci stanno in una riga, passa all'hamburger (classe nv--compact).
    // Si rimisura a ogni resize, al caricamento dei font e dopo il selettore lingua: nessun breakpoint fisso.
    var hdr = document.querySelector('.nv-header');
    var inner = hdr ? hdr.querySelector('.nv__inner') : null;
    var raf = 0;
    function fit() {
      if (!hdr || !inner) return;
      var wasCompact = hdr.classList.contains('nv--compact');
      hdr.classList.remove('nv--compact');
      var wide = window.innerWidth >= 900;
      var overflow = wide && inner.scrollWidth > inner.clientWidth + 1;
      if (overflow) hdr.classList.add('nv--compact');
      else if (wasCompact) closePanel();
    }
    function fitSoon() { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); }
    window.addEventListener('resize', fitSoon);
    window.addEventListener('load', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
    fit();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* ---- SELETTORE LINGUA NEL MENU (multilingua) ----
   Il masthead e' in cache (identico su tutte le pagine): la lingua corrente e i link alla
   traduzione della pagina si calcolano qui, leggendo i <link rel="alternate" hreflang> dell'<head>.
   Se la pagina non ha una traduzione, la voce porta alla home di quella lingua (sbiadita). */
(function () {
  function init() {
    var li = document.querySelector('.nv__item--lang');
    if (!li) return;
    var base = (li.getAttribute('data-lang-base') || '').replace(/\/$/, '');
    var def = li.getAttribute('data-lang-default') || 'it';
    var items = Array.prototype.slice.call(li.querySelectorAll('.nv__lang-item'));
    var codes = items.map(function (a) { return a.getAttribute('data-lang'); });
    var path = location.pathname;
    if (base && path.indexOf(base) === 0) path = path.slice(base.length);
    var seg = path.split('/').filter(Boolean)[0] || '';
    var cur = (seg && seg !== def && codes.indexOf(seg) > -1) ? seg : def;
    var alt = {};
    Array.prototype.forEach.call(document.querySelectorAll('link[rel="alternate"][hreflang]'), function (l) {
      var k = l.getAttribute('hreflang');
      if (k && k !== 'x-default') alt[k] = l.href;
    });
    var curImg = null;
    items.forEach(function (a) {
      var c = a.getAttribute('data-lang');
      if (alt[c]) a.href = alt[c];
      else if (c !== cur) a.classList.add('nv__lang-item--home');
      if (c === cur) { a.classList.add('is-current'); curImg = a.querySelector('img'); }
    });
    var btnImg = li.querySelector('[data-lang-current]');
    if (btnImg && curImg) btnImg.src = curImg.src;
    var code = li.querySelector('[data-lang-code]');
    if (code) code.textContent = cur.toUpperCase();
    document.documentElement.setAttribute('lang', cur);
    Array.prototype.forEach.call(li.querySelectorAll('img.nv__flag'), function (im) {
      im.addEventListener('error', function () { im.style.display = 'none'; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();