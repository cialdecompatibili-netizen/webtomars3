// GUIDA-SVILUPPO: traduce l'interfaccia dello shop. Per una frase nuova: aggiungi "testo italiano": "traduzione" nella sezione della lingua in _data/shop_ui.yml (il testo italiano deve essere IDENTICO a quello scritto nel codice/HTML). Pagina italiana = nessun dizionario = non fa nulla.
// Traduce solo dentro elementi nz-* e .nv__cart: non allargare il selettore SEL (tradurrebbe anche il contenuto del sito).
/* =====================================================================================
   assets/js/shop-i18n.js  -  traduce l'interfaccia dello SHOP nella lingua della pagina
   (stessa idea di TranslatePress/Weglot: si traduce l'output gia' disegnato, anche quello creato dal JS).
   LEGGE: window.NZ_DICT = { "testo italiano": "traduzione" } (scritto da _includes/head/custom.html
          da _data/shop_ui.yml per la lingua della pagina). Pagina italiana = nessun dizionario = non fa nulla.
   TRADUCE: solo dentro elementi con classe/id "nz-..." (shop) e l'icona carrello .nv__cart.
   REGOLE: chiave uguale al testo = sostituzione esatta; le FRASI (chiavi con spazio, >= 8 caratteri) e le chiavi che
           finiscono con spazio/due punti valgono anche come pezzo di frase (es. "Quantita' aggiunta: 2"), dalla piu' lunga.
           Le parole singole ("Nome", "Descrizione") valgono solo se sono tutto il testo.
   NON TOCCARE: il MutationObserver in fondo (serve per pop-up, righe carrello e messaggi creati dal JS).
   Va caricato PRIMA di carrello.js (head/custom.html lo mette prima, entrambi defer = ordine rispettato).
   ===================================================================================== */
(function () {
  var D = window.NZ_DICT;
  if (!D) return;
  var keys = Object.keys(D);
  if (!keys.length) return;
  var parts = keys.filter(function (k) { return /[ :]$/.test(k) || (k.length >= 8 && k.indexOf(' ') > -1); })
                  .sort(function (a, b) { return b.length - a.length; });
  var SEL = '[class*="nz-"],[id^="nz-"],.nv__cart';
  var ATTR = ['placeholder', 'title', 'aria-label', 'alt'];

  function tr(s) {
    var t = s.trim();
    if (!t) return s;
    if (Object.prototype.hasOwnProperty.call(D, t)) return s.replace(t, D[t]);
    var o = s;
    for (var i = 0; i < parts.length; i++) {
      if (o.indexOf(parts[i]) > -1) o = o.split(parts[i]).join(D[parts[i]]);
    }
    return o;
  }
  function inShop(el) { return el && el.closest && el.closest(SEL); }

  function walk(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode;
      if (p && !/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName) && inShop(p)) {
        var v = tr(n.nodeValue);
        if (v !== n.nodeValue) n.nodeValue = v;
      }
    } else if (n.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(n.tagName)) {
      if (inShop(n)) {
        ATTR.forEach(function (a) {
          var x = n.getAttribute(a);
          if (x) { var y = tr(x); if (y !== x) n.setAttribute(a, y); }
        });
      }
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
    }
  }

  function start() {
    walk(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') walk(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
