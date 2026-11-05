// =====================================================================================================================
// CARRELLO + ORDINE del negozio. Un solo file, caricato UNA volta da _includes/header.liquid quando la pagina ha ecommerce: true.
// Il carrello sta nel browser (localStorage, chiave "nz_carrello" = {idProdotto: quantita'}). Nessun server, nessun pagamento reale.
//
// DOVE SI USA (il file capisce la pagina guardando quale contenitore esiste):
//   - su TUTTE le pagine: icona nel menu con contatore (#nz-cart), anteprima al passaggio del mouse (#nz-prev), pop-up "prodotto aggiunto"
//   - #negozio         -> /negozio/, /negozio/categoria/x/ e schede prodotto: card .nz-box, pulsanti + / - / Aggiungi al carrello
//   - #nz-carrello-pag -> /carrello/: tabella righe (#nz-righe), Svuota (#nz-svuota), Continua lo shopping, Procedi all'ordine
//   - #nz-ordine-pag   -> /ordine/: passi Dati > Spedizione (solo se c'e' un prodotto fisico) > Pagamento, con riepilogo a lato
//
// DA DOVE ARRIVANO I PRODOTTI
//   _data/catalogo.json -> header.liquid li scrive in #nz-cart[data-catalogo] come {id,p,n,t,u,i,e}:
//     id | p = prezzo in centesimi | n = nome | t = "fisico" o "digitale" | u = link alla scheda | i = immagine (vuota = si usa l'icona) | e = icona emoji
//   Esempio di riga: {"id":"casa-eco","p":3200,"n":"Kit Casa Eco","t":"fisico","u":"/negozio/casa-eco/","i":"","e":"..."}
//   Per aggiungere un campo: 1) header.liquid (capture nz_cat)  2) il parse qui sotto (mappa "info")  3) usarlo dove serve.
//   Un id nel carrello che non e' piu' in catalogo (prodotto nascosto o eliminato) NON si conta e NON si mostra.
//
// PUNTI CRITICI
// 1) NON rimettere <script src=carrello.js> nelle singole pagine: window.__nzCarrello evita il doppio avvio, ma il tag in piu' non serve.
// 2) Testi che vengono da fuori (nomi, icone, indirizzi scritti dal cliente): SEMPRE textContent / el(), MAI innerHTML con quei dati.
// 3) FISICO / DIGITALE: box[id].fisico. serve() = nel carrello c'e' almeno un fisico -> compare il passo Spedizione (indirizzo obbligatorio).
//    Solo digitali: niente indirizzo, corriere o reso nei testi (adattaTipo()) e nel foglio la riga dice "digitale". Misto: come i fisici.
// 4) ORDINE = SMOKE TEST (blocco "ORDINE" piu' sotto): nessun pagamento e nessun numero di carta. Scrive UNA riga nel foglio Google
//    (_config.yml > ordini.tracker: nessun indirizzo scritto qui) e mostra sempre un errore di pagamento. Il carrello NON si svuota.
//    Per passare a un ordine vero: sostituire mostraErrore() con il pagamento reale, poi salva({}) e redirect a /grazie/.
// 5) /grazie/ svuota il carrello (pagina senza contenitori: ramo "if (!radice)" qui sotto).
// 6) Id e classi che usano insieme JS e CSS (non rinominarli in uno solo dei due): nz-o-* (campi ordine), .nz-passo, .nz-steps li, [data-nav],
//    .nz-pay-o, #nz-riep-dati, #nz-sum-righe / #nz-sum-tot / #nz-sum-fiducia, #nz-o-esito, #nz-o-invia, #nz-o-web (trappola antispam: deve restare vuota).
// 7) CSS: le classi che iniziano con nz- sono nella safelist di purgecss (deploy), quindi quelle create da JS funzionano. Un prefisso diverso verrebbe tolto.
// 8) Anteprima del menu: tieniDentro() mette un transform inline su #nz-prev per non uscire dallo schermo: non usare transform nel CSS di .nz-prev.
// =====================================================================================================================
(function () {
  if (window.__nzCarrello) return;
  window.__nzCarrello = true;

  var KEY = "nz_carrello";
  var MAX = 20;
  var euro = new Intl.NumberFormat((document.documentElement.lang || "it").replace("_", "-"), { style: "currency", currency: "EUR" }) /* lingua dalla pagina (shop multilingua) */;

  function leggi() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function salva(c) {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch (e) {}
  }
  function el(tag, testo, classe) {
    var x = document.createElement(tag);
    if (testo !== undefined) x.textContent = testo;
    if (classe) x.className = classe;
    return x;
  }
  function tasto(testo, act, id, classe) {
    var b = el("button", testo, classe || "btn btn-sm btn-outline-secondary");
    b.type = "button";
    b.dataset.act = act;
    b.dataset.id = id;
    return b;
  }

  /* ---------- icona nel menu + contatore ---------- */
  var link = document.getElementById("nz-cart");
  var prezzi = {}; // id -> centesimi (dal header)
  var nomi = {}; // id -> nome (dal header, per l'anteprima)
  var tipi = {}; // id -> fisico|digitale (dal header)
  var info = {}; // id -> {u: link scheda prodotto, i: immagine, e: icona} (dal header)
  if (link && link.dataset.catalogo) {
    try {
      JSON.parse("[" + link.dataset.catalogo + "null]").forEach(function (x) {
        if (x && x.id) {
          prezzi[x.id] = Number(x.p) || 0;
          nomi[x.id] = String(x.n || x.id);
          tipi[x.id] = String(x.t || "fisico");
          info[x.id] = { u: String(x.u || ""), i: String(x.i || ""), e: String(x.e || "") };
        }
      });
    } catch (e) {}
  }
  /* prodotti noti (da header): servono anche nelle pagine /carrello/ e /ordine/, che non hanno le card del negozio */
  var box = {};
  Object.keys(prezzi).forEach(function (id) {
    box[id] = { nome: nomi[id], prezzo: prezzi[id], fisico: tipi[id] !== "digitale" };
  });
  function riepilogo(c) {
    var n = 0;
    var tot = 0;
    Object.keys(c).forEach(function (id) {
      if (prezzi[id] !== undefined && c[id] > 0) {
        n += c[id];
        tot += prezzi[id] * c[id];
      }
    });
    return { n: n, tot: tot };
  }
  /* Anteprima al passaggio del mouse (come .blockcart .body di PrestaShop): righe "q x nome", totale, pulsante. Solo CSS la mostra (desktop con mouse). */
  function anteprima(r) {
    var p = document.getElementById("nz-prev");
    if (!p) return;
    p.innerHTML = "";
    if (!r.n) return; // carrello vuoto: nessuna anteprima (resta nascosta anche da CSS)
    var c = leggi();
    var ul = el("ul");
    Object.keys(c).forEach(function (id) {
      if (prezzi[id] === undefined || !(c[id] > 0)) return;
      var li = el("li");
      var nm = el("span", c[id] + " \u00d7 ");
      if (info[id] && info[id].u) {
        var al = el("a", nomi[id]);
        al.href = info[id].u;
        nm.appendChild(al);
      } else {
        nm.appendChild(document.createTextNode(nomi[id]));
      }
      li.appendChild(nm);
      li.appendChild(el("span", euro.format((prezzi[id] * c[id]) / 100)));
      /* ✕ per togliere il prodotto al volo. Il click e' gestito UNA volta sola piu' sotto (rimozione dal mini-carrello), via data-id. */
      var x = el("button", "\u00d7", "nz-prev-x");
      x.type = "button";
      x.dataset.rimuovi = id;
      x.setAttribute("aria-label", "Rimuovi " + nomi[id]);
      x.title = "Rimuovi";
      li.appendChild(x);
      ul.appendChild(li);
    });
    var tot = el("p", undefined, "nz-prev-tot");
    tot.appendChild(el("span", "Totale"));
    tot.appendChild(el("strong", euro.format(r.tot / 100)));
    var vai = el("a", "Vai al carrello", "btn btn-primary btn-sm");
    vai.href = link.getAttribute("href");
    [ul, tot, vai].forEach(function (n) {
      p.appendChild(n);
    });
  }
  function badge(salto) {
    if (!link) return;
    var r = riepilogo(leggi());
    // Pallino sopra l'icona del menu: solo il numero (le parentesi allargavano la riga e facevano sparire il menu desktop, vedi menu.css "CARRELLO DEL NEGOZIO NEL MENU")
      link.querySelector(".nz-n").textContent = String(r.n);
    link.classList.toggle("nz-pieno", r.n > 0);
    link.setAttribute("aria-label", "Carrello: " + r.n + (r.n === 1 ? " prodotto" : " prodotti"));
    anteprima(r);
    if (salto) {
      link.classList.remove("nz-bump");
      void link.offsetWidth; // riavvia l'animazione
      link.classList.add("nz-bump");
    }
  }

  /* Anteprima sempre dentro lo schermo: a ogni hover misuro il pop-up e lo sposto di quanto serve (a sinistra o a destra), con 8px di margine.
     Funziona con qualunque posizione dell'icona e larghezza della finestra, senza breakpoint scritti nel codice. */
  function tieniDentro() {
    var p = document.getElementById("nz-prev");
    if (!p || !p.firstChild) return;
    p.style.transform = "";
    var d = p.style.display;
    var v = p.style.visibility;
    p.style.display = "block";
    p.style.visibility = "hidden";
    var r = p.getBoundingClientRect();
    var W = document.documentElement.clientWidth;
    var m = 8;
    var dx = 0;
    if (r.right > W - m) dx = W - m - r.right;
    if (r.left + dx < m) dx = m - r.left;
    p.style.display = d;
    p.style.visibility = v;
    p.style.transform = dx ? "translateX(" + Math.round(dx) + "px)" : "";
  }
  if (link && link.parentNode) {
    ["mouseenter", "focusin"].forEach(function (ev) {
      link.parentNode.addEventListener(ev, tieniDentro);
    });
  }
  /* ✕ nel mini-carrello: toglie l'intero prodotto e ridisegna. Delegato su document perche' le righe vengono ricreate a ogni badge().
     Su /carrello/ e /ordine/ (radice presente) richiamo disegna() cosi' anche tabella e riepilogo si aggiornano; altrove basta badge().
     stopPropagation: il popup non deve seguire il link della riga ne' chiudersi. Se il carrello si svuota il popup sparisce da solo (:empty). */
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".nz-prev-x") : null;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var c = leggi();
    delete c[b.dataset.rimuovi];
    salva(c);
    if (radice) disegna();
    else badge();
    tieniDentro();
  });

  var radice = document.getElementById("negozio") || document.getElementById("nz-carrello-pag") || document.getElementById("nz-ordine-pag");
  if (!radice) {
    if (/\/grazie\/?$/.test(location.pathname)) salva({});
    badge();
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) badge();
    });
    return;
  }

  /* ---------- prodotti presenti nella pagina ---------- */
  radice.querySelectorAll(".nz-box").forEach(function (c) {
    var prezzo = Number(c.dataset.prezzo);
    box[c.dataset.id] = { nome: c.dataset.nome, prezzo: prezzo, fisico: c.dataset.tipo !== "digitale" }; // tipo mancante = fisico
    prezzi[c.dataset.id] = prezzo;
    c.querySelector(".nz-prezzo").textContent = euro.format(prezzo / 100);
  });

  /* ---------- carrello (/carrello/) e stato della pagina ordine (/ordine/) ---------- */
  /* riepilogo a lato di /ordine/ (#nz-sum-righe, #nz-sum-tot): si ridisegna a ogni disegna() */
  function sommario(ids, c, tot) {
    var ul = document.getElementById("nz-sum-righe");
    var tt = document.getElementById("nz-sum-tot");
    if (ul) {
      ul.innerHTML = "";
      ids.forEach(function (id) {
        var li = el("li");
        var n = el("span", undefined, "nz-sum-n");
        n.appendChild(el("span", box[id].nome));
        n.appendChild(el("small", "\u00d7 " + c[id] + (box[id].fisico ? "" : " \u00b7 digitale")));
        li.appendChild(n);
        li.appendChild(el("span", euro.format((box[id].prezzo * c[id]) / 100)));
        ul.appendChild(li);
      });
    }
    if (tt) tt.textContent = euro.format(tot / 100);
  }
  var concluso = false; // ordine inviato: nascondo carrello e modulo
  /* disegna(): ridisegna TUTTO cio' che dipende dal carrello (badge, tabella in /carrello/, riepilogo laterale in /ordine/, passi dell'ordine).
     Va richiamata dopo ogni salva(c). Il passo corrente dell'ordine si riallinea da solo: se il carrello diventa tutto digitale il passo
     Spedizione sparisce, se torna un fisico riappare. */
  function disegna() {
    badge();
    var righe = document.getElementById("nz-righe");
    var c = leggi();
    var ids = Object.keys(c).filter(function (id) {
      return box[id] && c[id] > 0;
    });
    var tot = 0;
    var n = 0;
    if (righe) righe.innerHTML = "";
    ids.forEach(function (id) {
      var q = c[id];
      if (righe) {
        var tr = el("tr");
        var q_td = el("td");
        var q_box = el("span", undefined, "nz-q");
        q_box.appendChild(tasto("-", "meno", id));
        q_box.appendChild(el("span", String(q)));
        q_box.appendChild(tasto("+", "piu", id));
        q_td.appendChild(q_box);
        var x_td = el("td");
        var xb = tasto("", "togli", id, "nz-x");
        xb.setAttribute("aria-label", "Togli dal carrello");
        xb.title = "Togli dal carrello";
        x_td.appendChild(xb);
        var n_td = el("td");
        var inf = info[id] || {};
        var pr = el(inf.u ? "a" : "span", undefined, "nz-pr");
        if (inf.u) pr.href = inf.u;
        var im = el("span", undefined, "nz-pr-i");
        if (inf.i) {
          var img = el("img");
          img.src = inf.i;
          img.alt = "";
          img.loading = "lazy";
          im.appendChild(img);
        } else {
          im.textContent = inf.e || "";
        }
        pr.appendChild(im);
        pr.appendChild(el("span", box[id].nome, "nz-pr-n"));
        n_td.appendChild(pr);
        tr.appendChild(n_td);
        tr.appendChild(q_td);
        tr.appendChild(el("td", euro.format((box[id].prezzo * q) / 100)));
        tr.appendChild(x_td);
        righe.appendChild(tr);
      }
      tot += box[id].prezzo * q;
      n += q;
    });
    sommario(ids, c, tot);
    var vuoto = document.getElementById("nz-vuoto");
    var pieno = document.getElementById("nz-pieno");
    var tt = document.getElementById("nz-totale");
    var cn = document.getElementById("nz-conta");
    if (vuoto) vuoto.hidden = ids.length > 0 || concluso;
    if (pieno) pieno.hidden = ids.length === 0 || concluso;
    if (tt) tt.textContent = euro.format(tot / 100);
    if (cn) cn.textContent = n ? "(" + n + ")" : "";
    if (modulo && !concluso) vai(passo, true);
  }

  /* ---------- finestra "prodotto aggiunto" (come PrestaShop) ---------- */
  /* Pop-up "prodotto aggiunto" (<dialog> nativo creato qui, testi sempre con textContent).
     Classi: nz-dlg* = struttura, nz-db-continua = arancio con contorno, nz-db-vai = verde pieno. Stili in negozio.css (blocco .nz-dialog).
     Ordine bottoni: desktop Continua a sinistra e Vai al carrello a destra; su mobile e' invertito dal CSS (column-reverse), non da qui. */
  function apri(id, aggiunta) {
    var d = document.getElementById("nz-dialog");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "nz-dialog";
      d.className = "nz-dialog";
      d.setAttribute("aria-labelledby", "nz-dlg-tit");
      document.body.appendChild(d);
      d.addEventListener("click", function (ev) {
        // click sullo sfondo (il <dialog> stesso) o su un elemento con data-chiudi
        if (ev.target === d || ev.target.closest("[data-chiudi]")) d.close();
      });
    }
    var p = box[id];
    var r = riepilogo(leggi());
    d.innerHTML = "";
    var w = el("div", undefined, "nz-dlg");
    var x = el("button", "\u00d7", "nz-x");
    x.type = "button";
    x.dataset.chiudi = "1";
    x.setAttribute("aria-label", "Chiudi");
    var h = el("h2", "\u2713 Prodotto aggiunto al carrello");
    h.id = "nz-dlg-tit";
    var pr = el("div", undefined, "nz-dlg-prod");
    var inf = info[id] || {};
    var im = el("span", undefined, "nz-dlg-i");
    if (inf.i) {
      var img = el("img");
      img.src = inf.i;
      img.alt = "";
      im.appendChild(img);
    } else {
      im.textContent = inf.e || "";
    }
    var tx = el("div", undefined, "nz-dlg-t");
    tx.appendChild(el("strong", p.nome));
    tx.appendChild(el("span", euro.format(p.prezzo / 100)));
    tx.appendChild(el("span", aggiunta ? "Quantità aggiunta: " + aggiunta : "Quantità massima raggiunta (" + MAX + ")"));
    pr.appendChild(im);
    pr.appendChild(tx);
    var tt = el("div", undefined, "nz-dlg-tot");
    tt.appendChild(el("p", r.n === 1 ? "Nel carrello c\u2019è 1 prodotto" : "Nel carrello ci sono " + r.n + " prodotti"));
    tt.appendChild(el("p", "Totale: " + euro.format(r.tot / 100), "nz-totale"));
    var az = el("div", undefined, "nz-dlg-az");
    var b1 = el("button", "Continua lo shopping", "btn nz-db nz-db-continua");
    b1.type = "button";
    b1.dataset.chiudi = "1";
    var b2 = el("a", "Vai al carrello", "btn nz-db nz-db-vai");
    b2.href = link ? link.getAttribute("href") : "#carrello";
    b2.dataset.chiudi = "1";
    az.appendChild(b1);
    az.appendChild(b2);
    [x, h, pr, tt, az].forEach(function (n) {
      w.appendChild(n);
    });
    d.appendChild(w);
    if (typeof d.showModal === "function") {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute("open", ""); // browser vecchi senza <dialog> modale
    }
    b2.focus();
  }

  /* ---------- quantita' con + e - (lista prodotti e scheda prodotto) ---------- */
  function limita(i) {
    var v = parseInt(i.value, 10);
    if (!(v >= 1)) v = 1;
    i.value = Math.min(MAX, v);
  }
  radice.addEventListener("click", function (ev) {
    var s = ev.target.closest(".nz-stp");
    if (!s) return;
    var i = s.parentNode.querySelector(".nz-qta");
    if (!i) return;
    i.value = (parseInt(i.value, 10) || 1) + Number(s.dataset.d);
    limita(i);
  });
  radice.addEventListener("change", function (ev) {
    if (ev.target.classList && ev.target.classList.contains("nz-qta")) limita(ev.target);
  });

  /* ---------- azioni ---------- */
  radice.addEventListener("click", function (ev) {
    var pill = ev.target.closest(".nz-pill");
    if (pill) {
      radice.querySelectorAll(".nz-pill").forEach(function (b) {
        b.classList.toggle("on", b === pill);
      });
      radice.querySelectorAll(".nz-lista .nz-box").forEach(function (r) {
        r.hidden = !!pill.dataset.cat && r.dataset.cat !== pill.dataset.cat;
      });
      /* GUIDA-SVILUPPO: le voci nascoste dal filtro non contano nelle pagine; senza questa riga la paginazione resterebbe quella di "Tutti". */
      if (window.PgLista) window.PgLista.refresh(radice.querySelector(".nz-lista"), true);
      return;
    }
    var b = ev.target.closest("button");
    if (!b) return;
    var c = leggi();
    var aggId = "";
    var aggiunta = 0;
    if (b.classList.contains("nz-add")) {
      var card = b.closest(".nz-box");
      var q = parseInt(card.querySelector(".nz-qta").value, 10) || 1;
      q = Math.max(1, Math.min(MAX, q));
      aggId = card.dataset.id;
      var prima = c[aggId] || 0;
      c[aggId] = Math.min(MAX, prima + q);
      aggiunta = c[aggId] - prima;
      card.querySelector(".nz-qta").value = 1;
    } else if (b.dataset.act === "piu") {
      c[b.dataset.id] = Math.min(MAX, (c[b.dataset.id] || 0) + 1);
    } else if (b.dataset.act === "meno") {
      c[b.dataset.id] = (c[b.dataset.id] || 0) - 1;
      if (c[b.dataset.id] <= 0) delete c[b.dataset.id];
    } else if (b.dataset.act === "togli") {
      delete c[b.dataset.id];
    } else if (b.id === "nz-svuota") {
      c = {};
    } else {
      return;
    }
    salva(c);
    disegna();
    if (aggId) {
      badge(true);
      apri(aggId, aggiunta);
    }
  });

  /* ORDINE (/ordine/): passi Dati > Spedizione (solo se c'e' un prodotto fisico) > Pagamento.
     SMOKE TEST: nessun pagamento reale e NESSUN dato di carta raccolto (si sceglie solo il metodo). Alla conferma si scrive UNA RIGA nel foglio Google
     (tracker, _config.yml > ordini.tracker) con nome, email, telefono, prodotti e totale, poi si mostra "moduli di pagamento fuori servizio" (modalita' test):
     il carrello resta com'e' e si puo' riprovare o cambiare metodo.
     Riga: bottone "ordine-errore-pagamento-test", prodotto "nome xQta [#id]", prezzo = totale in euro, browser "smoke-test",
     device "email | nome cognome | telefono".
     Limiti noti: risposta del tracker opaca (no-cors); antispam leggero lato browser (campo trappola + 3 secondi minimi). */
  var modulo = document.getElementById("nz-ordine");
  var passo = 1;
  var vai = function () {};
  /* AGGIUNGERE UN METODO DI PAGAMENTO: 3 posti, con la stessa chiave.
     1) _pages/ordine.md: nuovo <label class="nz-pay-o"> con <input type="radio" name="nz-pay" value="CHIAVE">
     2) PAGAMENTI (qui sotto): CHIAVE: "Nome leggibile" (finisce nel foglio Google)
     3) ERRORI (qui sotto): CHIAVE: "Errore: ..." (messaggio mostrato nello smoke test)
     Esempio: value="postepay" -> PAGAMENTI.postepay = "PostePay" e ERRORI.postepay = "Errore: carta PostePay non autorizzata." */
  var PAGAMENTI = {
    carta: "Carta di credito o debito",
    bancomat: "Bancomat / PagoBANCOMAT",
    paypal: "PayPal",
    applepay: "Apple Pay",
    googlepay: "Google Pay",
    satispay: "Satispay",
    bonifico: "Bonifico bancario",
  };
  var ERRORI = {
    carta: "Errore: il pagamento con carta è stato rifiutato dall'emittente (codice 05).",
    bancomat: "Errore: il circuito PagoBANCOMAT non ha autorizzato l'operazione (codice 51).",
    paypal: "Errore: non è stato possibile completare il pagamento con PayPal.",
    applepay: "Errore: Apple Pay non è disponibile su questo dispositivo.",
    googlepay: "Errore: Google Pay non ha confermato il pagamento (timeout).",
    satispay: "Errore: la richiesta Satispay è scaduta senza conferma.",
    bonifico: "Errore: impossibile generare le coordinate per il bonifico.",
  };
  if (modulo) {
    var tracker = radice.dataset.tracker || "";
    var esitoOrd = document.getElementById("nz-o-esito");
    var inviaOrd = document.getElementById("nz-o-invia");
    var t0Ord = Date.now(); // apertura pagina
    var val = function (id) {
      var x = document.getElementById(id);
      return x ? x.value.trim() : "";
    };
    var sicuro = function (s) {
      s = String(s || "").trim();
      return /^[=+\-@]/.test(s) ? "'" + s : s; // niente formule iniettate nel foglio
    };
    var serve = function () {
      var c = leggi();
      return Object.keys(c).some(function (id) {
        return box[id] && c[id] > 0 && box[id].fisico;
      });
    };
    var elenco = function () {
      return serve() ? [1, 2, 3] : [1, 3];
    };
    var errore = function (n, m) {
      var p = modulo.querySelector('[data-passo="' + n + '"] .nz-err');
      if (p) p.textContent = m || "";
    };
    var metodo = function () {
      var r = modulo.querySelector('input[name="nz-pay"]:checked');
      return r ? r.value : "carta";
    };
    var totale = function () {
      var c = leggi();
      var tot = 0;
      Object.keys(c).forEach(function (id) {
        if (box[id] && c[id] > 0) tot += box[id].prezzo * c[id];
      });
      return tot;
    };
    var indirizzo = function () {
      if (!serve()) return "";
      var via = [val("nz-o-ind"), val("nz-o-ind2")].filter(Boolean).join(", ");
      var pr = val("nz-o-prov").toUpperCase();
      return via + " - " + val("nz-o-cap") + " " + val("nz-o-citta") + (pr ? " (" + pr + ")" : "") + " - " + val("nz-o-paese");
    };
    var riepilogoOrd = function () {
      var cont = document.getElementById("nz-riep-dati");
      cont.innerHTML = "";
      var riga = function (k, v) {
        var d = el("div", undefined, "nz-recap-r");
        d.appendChild(el("span", k, "nz-recap-k"));
        d.appendChild(el("span", v, "nz-recap-v"));
        cont.appendChild(d);
      };
      riga("Contatto", val("nz-o-nome") + " " + val("nz-o-cognome") + " \u00b7 " + val("nz-o-email") + (val("nz-o-tel") ? " \u00b7 " + val("nz-o-tel") : ""));
      var haDig = Object.keys(leggi()).some(function (id) {
        return box[id] && leggi()[id] > 0 && !box[id].fisico;
      });
      riga(serve() ? "Spedizione" : "Consegna", serve() ? indirizzo() + (haDig ? " (i prodotti digitali arrivano via email)" : "") : "Prodotti digitali: li ricevi via email, nessuna spedizione.");
      inviaOrd.textContent = "Paga " + euro.format(totale() / 100);
    };
    /* testi che dipendono dal contenuto del carrello: solo digitali = niente spedizione/reso/corriere; solo fisici = spedizione e reso; misto = entrambi */
    var adattaTipo = function () {
      var c = leggi();
      var fisici = serve();
      var digitali = Object.keys(c).some(function (id) {
        return box[id] && c[id] > 0 && !box[id].fisico;
      });
      var ul = document.getElementById("nz-sum-fiducia");
      if (ul) {
        var voci = [];
        if (fisici) voci.push("Spedizione tracciata", "Reso entro 14 giorni");
        if (digitali) voci.push(fisici ? "Prodotti digitali via email, senza spedizione" : "Download immediato via email");
        voci.push("Assistenza via email");
        ul.innerHTML = "";
        voci.forEach(function (v) {
          ul.appendChild(el("li", v));
        });
      }
      var h = document.getElementById("nz-o-tel-h");
      if (h) h.textContent = fisici ? "(facoltativo, utile al corriere)" : "(facoltativo)";
    };
    vai = function (n, senzaFocus) {
      adattaTipo();
      var l = elenco();
      if (l.indexOf(n) < 0) n = l[l.length - 1]; // il passo 2 sparisce se il carrello diventa tutto digitale
      passo = n;
      modulo.querySelectorAll(".nz-passo").forEach(function (s) {
        s.hidden = Number(s.dataset.passo) !== n;
      });
      var num = 0;
      document.querySelectorAll(".nz-steps li").forEach(function (li) {
        var k = Number(li.dataset.step);
        li.hidden = l.indexOf(k) < 0;
        li.classList.toggle("on", k === n);
        li.classList.toggle("fatto", k < n);
        if (!li.hidden) li.querySelector(".nz-sn").textContent = String(++num);
      });
      if (n === 3) riepilogoOrd();
      if (!senzaFocus) {
        esitoOrd.hidden = true;
        var f = modulo.querySelector('[data-passo="' + n + '"] input:not([type="radio"])');
        if (f) f.focus({ preventScroll: true });
      }
    };
    var campo = function (n, id, msg) {
      errore(n, msg);
      document.getElementById(id).focus();
      return false;
    };
    /* VALIDAZIONE per passo (n = 1 dati, n = 2 spedizione). Se qualcosa non va: mette il messaggio in .nz-err del passo, porta il focus sul campo
       (campo()) e ritorna false. Il passo 2 gira solo se serve() cioe' c'e' un prodotto fisico.
       Esempio nuovo paese con CAP a 4 cifre: aggiungilo a <select id="nz-o-paese"> in ordine.md e alla condizione cap4 qui sotto. */
    var valida = function (n) {
      errore(n, "");
      if (n === 1) {
        if (val("nz-o-nome").length < 2) return campo(1, "nz-o-nome", "Scrivi il tuo nome.");
        if (val("nz-o-cognome").length < 2) return campo(1, "nz-o-cognome", "Scrivi il tuo cognome.");
        if (!val("nz-o-email") || !document.getElementById("nz-o-email").checkValidity()) return campo(1, "nz-o-email", "Controlla l'email.");
        if (val("nz-o-tel") && !/^[+\d][\d\s().\-]{5,}$/.test(val("nz-o-tel"))) return campo(1, "nz-o-tel", "Controlla il numero di telefono.");
      }
      if (n === 2) {
        var paese = val("nz-o-paese");
        var cap4 = paese === "Austria" || paese === "Svizzera";
        if (val("nz-o-ind").length < 5 || !/\d/.test(val("nz-o-ind"))) return campo(2, "nz-o-ind", "Indica via e numero civico.");
        if (!(cap4 ? /^\d{4}$/ : /^\d{5}$/).test(val("nz-o-cap"))) return campo(2, "nz-o-cap", cap4 ? "Il CAP deve avere 4 cifre." : "Il CAP deve avere 5 cifre.");
        if (val("nz-o-citta").length < 2) return campo(2, "nz-o-citta", "Scrivi la città.");
        if (paese === "Italia" && !/^[A-Za-z]{2}$/.test(val("nz-o-prov"))) return campo(2, "nz-o-prov", "Indica la sigla della provincia (2 lettere).");
      }
      return true;
    };
    var prossimo = function (dir) {
      var l = elenco();
      var i = l.indexOf(passo) + dir;
      vai(l[Math.max(0, Math.min(l.length - 1, i))]);
    };
    modulo.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-nav]");
      if (!b) return;
      if (b.dataset.nav === "indietro") return prossimo(-1);
      if (valida(passo)) prossimo(1);
    });
    modulo.addEventListener("change", function (ev) {
      if (ev.target.name !== "nz-pay") return;
      modulo.querySelectorAll(".nz-pay-o").forEach(function (o) {
        o.classList.toggle("on", o.querySelector("input").checked);
      });
    });
    modulo.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (passo !== 3) {
        if (valida(passo)) prossimo(1); // Invio nei campi = Continua
        return;
      }
      var daVal = serve() ? [1, 2] : [1];
      for (var i = 0; i < daVal.length; i++) {
        if (!valida(daVal[i])) {
          vai(daVal[i], true);
          valida(daVal[i]);
          return;
        }
      }
      var c = leggi();
      var tot = 0;
      var voci = [];
      Object.keys(c).forEach(function (id) {
        if (!box[id] || !(c[id] > 0)) return;
        tot += box[id].prezzo * c[id];
        voci.push(box[id].nome + " x" + c[id]);
      });
      if (!voci.length) return;
      var m = metodo();
      var idOrd = Array.prototype.map
        .call(crypto.getRandomValues(new Uint8Array(4)), function (x) {
          return ("0" + x.toString(16)).slice(-2);
        })
        .join("")
        .toUpperCase();
      // errore di pagamento (smoke test): il carrello NON si svuota
      /* PUNTO DI SVOLTA smoke test -> ordine vero: qui oggi si mostra sempre l'errore e il carrello resta intatto. Con un pagamento reale
         si manderebbe l'esito al foglio/gestionale, poi salva({}), disegna() e redirect a /grazie/ (che svuota comunque il carrello). */
      var mostraErrore = function () {
        esitoOrd.className = "nz-esito nz-esito-err";
        esitoOrd.textContent = "I moduli di pagamento sono momentaneamente fuori servizio. Nessun importo è stato addebitato. Riprova più tardi. Rif. " + idOrd;
        esitoOrd.hidden = false;
        inviaOrd.disabled = false;
        riepilogoOrd();
      };
      // bot: campo trappola compilato o invio troppo veloce -> stesso errore, niente riga nel foglio
      if (val("nz-o-web") || Date.now() - t0Ord < 3000) {
        mostraErrore();
        return;
      }
      if (!tracker) {
        esitoOrd.className = "nz-esito nz-esito-err";
        esitoOrd.textContent = "Modulo ordini non ancora attivo.";
        esitoOrd.hidden = false;
        return;
      }
      inviaOrd.disabled = true;
      inviaOrd.textContent = "Elaborazione...";
      esitoOrd.className = "nz-esito";
      esitoOrd.textContent = "Elaborazione del pagamento in corso...";
      esitoOrd.hidden = false;
      var nota = val("nz-o-note");
      var q = new URLSearchParams({
        sito: location.hostname + location.pathname,
        bottone: "ordine-errore-pagamento-test",
        prodotto: sicuro(voci.join(", ") + " [#" + idOrd + "]").slice(0, 500),
        prezzo: String(tot / 100),
        browser: "smoke-test",
        device: sicuro([val("nz-o-email"), val("nz-o-nome") + " " + val("nz-o-cognome"), val("nz-o-tel") || "-"].join(" | ")).slice(0, 700),
      });
      fetch(tracker + (tracker.indexOf("?") < 0 ? "?" : "&") + q.toString(), { mode: "no-cors" })
        .then(function () {
          setTimeout(mostraErrore, 900); // un attimo di "elaborazione" prima dell'errore
        })
        .catch(function () {
          esitoOrd.className = "nz-esito nz-esito-err";
          esitoOrd.textContent = "Errore di rete. Riprova.";
          inviaOrd.disabled = false;
          riepilogoOrd();
        });
    });
  }

  window.addEventListener("storage", function (e) {
    if (e.key === KEY) disegna();
  });

  disegna();
})();
