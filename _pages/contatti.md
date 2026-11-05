---
ref: contatti
layout: single
title: "Contatti"
permalink: /contatti/
---

{%- comment -%}
  Pagina Contatti. Logica ispirata al tema al-folio:
  - form con 3 campi (nome, email, messaggio) + honeypot "website" (campo trappola per i bot)
  - antispam ALTCHA: nessun captcha da risolvere, il browser calcola una prova (proof-of-work SHA-256)
    chiesta al worker con ?challenge=1 e la rimanda insieme al form
  - invio via POST al Cloudflare Worker ENDPOINT, che gira la richiesta come email
  Per cambiare destinazione/worker: variabile ENDPOINT nello script qui sotto.
  Colore pulsante: var(--t-accent) del tema (admin > Tema). Se il worker rifiuta l'invio, controllare che
  accetti il dominio di questo sito (campo "sito" = location.hostname).
{%- endcomment -%}



{% if site.whatsapp != "" or site.whatsapp_demo %}<div class="cf-wa-box"><a class="cf-wa" href="{% if site.whatsapp != '' %}https://wa.me/{{ site.whatsapp }}?text={{ 'Buongiorno, vorrei avere informazioni.' | url_encode }}{% else %}#{% endif %}"{% if site.whatsapp == '' %} onclick="return false;"{% endif %} target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>Scrivici su WhatsApp</a><p class="cf-nota">È il modo più rapido per ricevere una risposta.</p><p class="cf-tel">Oppure chiamaci: <a href="{% if site.whatsapp != '' %}tel:+{{ site.whatsapp }}{% else %}#{% endif %}">{% if site.whatsapp != '' %}+{{ site.whatsapp }}{% else %}numero in arrivo{% endif %}</a></p></div>{% endif %}<hr class="cf-hr"><p class="cf-intro">Oppure compila il modulo: ti ricontatteremo via email.</p>

<style>
.page__title{text-align:center}
.cf-hr{max-width:520px;margin:1.5rem auto;border:0;border-top:1px solid rgba(0,0,0,.15)}
.cf-wa-box{text-align:center}
.cf-tel{text-align:center;margin:.8rem 0 0;font-weight:600}
.cf-wa{display:inline-flex;align-items:center;gap:.6rem;padding:.9rem 1.6rem;border-radius:8px;background:#25D366;color:#fff!important;font-weight:700;font-size:1.05rem;text-decoration:none;border:0}
.cf-wa:hover{filter:brightness(1.06)}
.cf-wa svg{width:24px;height:24px;fill:currentColor}
#wa-btn{display:none!important}
.cf-wrap{max-width:520px;margin-left:auto;margin-right:auto}
.page__content p.cf-intro,p.cf-intro{display:block;width:100%;max-width:none;margin:0 0 1.5rem;text-align:center !important}
.cf-form{padding:0;border:0;background:none}
.cf-form .cf-campo{margin:0 0 1.1rem}
.cf-form label{display:block;width:100%;margin:0 0 .4rem;font-weight:600;text-align:left}
.cf-form input[type=text],.cf-form input[type=email],.cf-form input[type=tel],.cf-form textarea{display:block;width:100%;box-sizing:border-box;margin:0;padding:.75rem .9rem;font:inherit;font-size:1rem;line-height:1.4;color:inherit;background:#fff;border:1px solid rgba(0,0,0,.2);border-radius:8px}
.cf-form ::placeholder{opacity:.5}
.cf-form textarea{min-height:9rem;resize:vertical}
.cf-form input:focus,.cf-form textarea:focus{outline:2px solid var(--t-accent,#0e7490);outline-offset:1px}
.cf-form .cf-btn{display:block;width:100%;margin:1.5rem 0 0;padding:1rem 1.5rem;border:0;border-radius:8px;background:var(--t-accent,#0e7490);color:#fff;font-size:1.05rem;font-weight:700;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,filter .15s ease}
.cf-form .cf-btn:hover{transform:translateY(-2px);filter:brightness(1.08)}
.cf-form .cf-btn:active{transform:translateY(0)}
.cf-form .cf-btn:focus-visible{outline:3px solid var(--t-accent,#0e7490);outline-offset:3px}
.cf-form .cf-btn:disabled{opacity:.65;cursor:progress;transform:none;box-shadow:none}
@media (prefers-reduced-motion:reduce){.cf-form .cf-btn{transition:none}.cf-form .cf-btn:hover{transform:none}}
.cf-nota{margin:.8rem 0 0;font-size:.85rem;opacity:.7;text-align:center}
/* Esito = notifica fissa in alto (sempre visibile), sparisce da sola dopo 4 secondi (vedi mostra() nello script) */
#cf-esito{position:fixed;top:1rem;left:50%;transform:translate(-50%,-150%);z-index:99999;max-width:min(92vw,480px);padding:.9rem 1.3rem;border-radius:10px;background:var(--t-accent,#0e7490);color:#fff;font-weight:600;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);opacity:0;pointer-events:none;transition:transform .3s ease,opacity .3s ease}
#cf-esito.cf-visibile{transform:translate(-50%,0);opacity:1}
#cf-esito.cf-errore{background:#b00020}
</style>

{%- if site.contact_endpoint and site.contact_endpoint != "" -%}
<div class="cf-wrap">
<form id="cf-form" class="cf-form" novalidate>
  <div class="cf-campo">
    <label for="cf-nome">Come ti chiami?</label>
    <input type="text" id="cf-nome" name="nome" maxlength="100" required autocomplete="name">
  </div>
  <div class="cf-campo">
    <label for="cf-email">La tua email</label>
    <input type="email" id="cf-email" name="email" maxlength="150" required autocomplete="email" placeholder="nome@email.it">
  </div>
  <div class="cf-campo">
    <label for="cf-tel">Telefono (facoltativo)</label>
    <input type="tel" id="cf-tel" name="telefono" maxlength="30" autocomplete="tel" placeholder="+39 ...">
  </div>
  <div class="cf-campo">
    <label for="cf-msg">Cosa cerchi?</label>
    <textarea id="cf-msg" name="messaggio" rows="5" maxlength="3000" required placeholder="Scrivici la tua richiesta."></textarea>
  </div>
  <div style="position:absolute;left:-9999px;height:0;overflow:hidden" aria-hidden="true">
    <label for="cf-web">Non compilare</label>
    <input type="text" id="cf-web" name="website" tabindex="-1" autocomplete="off">
  </div>
  <button type="submit" class="cf-btn" id="cf-btn">Invia la richiesta</button>
  <p class="cf-nota">Ti rispondiamo il prima possibile. I tuoi dati servono solo per risponderti.</p>
  <p id="cf-esito" role="status" aria-live="polite"></p>
</form>
</div>

<script>
(function () {
  var form = document.getElementById('cf-form');
  var esito = document.getElementById('cf-esito');
  var btn = document.getElementById('cf-btn');
  var ENDPOINT = {{ site.contact_endpoint | default: "" | jsonify }};
  var t0 = Date.now();
  /* notifica in alto: "Invio in corso" resta finche' non c'e' l'esito; successo ed errori spariscono dopo 4 secondi (cambia 4000) */
  var tm = null;
  function mostra(m, ok, fisso) {
    esito.textContent = m;
    esito.className = 'cf-visibile' + (ok ? '' : ' cf-errore');
    clearTimeout(tm);
    if (!fisso) tm = setTimeout(function () { esito.className = ''; }, 4000);
  }

  /* ALTCHA: sfida firmata dal worker; il browser trova il numero n tale che SHA-256(salt+n) = challenge */
  var pre = null, preT = 0;
  function hex(b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  async function altcha() {
    var sep = ENDPOINT.indexOf('?') < 0 ? '?' : '&';
    var c = await (await fetch(ENDPOINT + sep + 'challenge=1')).json();
    if (!c.challenge) throw new Error('altcha');
    var enc = new TextEncoder();
    for (var n = 0; n <= c.maxnumber; n++) {
      if (hex(await crypto.subtle.digest('SHA-256', enc.encode(c.salt + n))) === c.challenge) {
        return btoa(JSON.stringify({ algorithm: c.algorithm, challenge: c.challenge, number: n, salt: c.salt, signature: c.signature }));
      }
    }
    throw new Error('altcha');
  }
  /* la prova si prepara in anticipo (al caricamento) e si rinnova dopo 8 minuti o dopo ogni invio */
  function prepara() { preT = Date.now(); pre = altcha().catch(function () { return ''; }); }
  prepara();
  function token() {
    if (!pre || Date.now() - preT > 480000) prepara();
    return pre.then(function (v) { if (v) return v; prepara(); return pre; });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!form.checkValidity()) { mostra('Compila nome, email e messaggio.', false); return; }
    btn.disabled = true; mostra('Invio in corso...', true, true);
    token().then(function (tk) {
      if (!tk) { mostra('Verifica non riuscita. Riprova.', false); btn.disabled = false; return; }
      var d = new URLSearchParams(new FormData(form));
      d.set('altcha', tk);
      var tel = (form.telefono.value || '').trim();
      if (tel) { d.set('messaggio', (d.get('messaggio') || '') + '\n\nTelefono: ' + tel); }
      d.set('t', String(t0));
      d.set('tipo', 'contatto-web');
      d.set('sito', location.hostname);
      d.set('pagina', location.pathname);
      return fetch(ENDPOINT, { method: 'POST', body: d })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.status === 'ok') { form.reset(); mostra("Ricevuto, grazie! Ti rispondiamo il prima possibile all'email che ci hai lasciato.", true); }
          else { mostra('Invio non riuscito. Riprova tra poco.', false); }
          prepara(); btn.disabled = false; t0 = Date.now();
        });
    }).catch(function () {
      mostra('Errore di rete. Riprova.', false); prepara(); btn.disabled = false;
    });
  });
})();
</script>
{%- else -%}
<p class="cf-nota">I contatti saranno pubblicati a breve.</p>
{%- endif -%}
