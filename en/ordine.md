---
layout: single
classes: wide
author_profile: false
title: Order
description: Complete your order.
ecommerce: true
noindex: true
ref: shop-ordine
lang: en
locale: en
tr: tradotto
tr_hash: 128t5t6
permalink: /en/ordine/
---
{%- assign nz_lh = '/' -%}{%- if page.lang and page.lang != site.default_lang -%}{%- assign nz_lh = '/' | append: page.lang | append: '/' -%}{%- endif -%}
{% if site.ecommerce == true %}
{% comment %}
NOTE PER CHI MODIFICA QUESTA PAGINA (la logica e' in assets/js/carrello.js, blocco ORDINE):
- Gli id nz-o-*, le classi .nz-passo / .nz-steps li / .nz-pay-o, gli attributi data-nav e data-passo sono letti dal JS: non rinominarli.
- Passi: 1 Dati, 2 Spedizione (il JS la nasconde da solo se nel carrello ci sono solo prodotti digitali), 3 Pagamento. Non scrivere il passo 2 come obbligatorio.
- Nuovo campo: aggiungi qui il <div class="nz-f">, poi leggilo con val("nz-o-xxx") nel JS e (se serve) aggiungilo alla riga del foglio.
- Nuovo metodo di pagamento: vedi il commento sopra PAGAMENTI in carrello.js (3 posti).
- #nz-o-web e' la trappola antispam: non va mostrato e non va compilato. data-tracker arriva da _config.yml > ordini.tracker (mai scritto qui).
- I testi del riepilogo laterale (#nz-sum-fiducia) e l'hint del telefono (#nz-o-tel-h) li riscrive il JS in base a fisico/digitale.
{% endcomment %}
<div id="nz-ordine-pag" data-tracker="{{ site.ordini.tracker }}">
<p id="nz-vuoto">Il carrello è vuoto. <a href="{% include shop-url.html k="shop" %}">Vai al negozio</a></p>
<div id="nz-pieno" hidden>
<ol class="nz-steps">
<li data-step="1" class="on"><span class="nz-sn">1</span> <span class="nz-sl">Dati</span></li>
<li data-step="2"><span class="nz-sn">2</span> <span class="nz-sl">Spedizione</span></li>
<li data-step="3"><span class="nz-sn">3</span> <span class="nz-sl">Pagamento</span></li>
</ol>
<div class="nz-ord-grid">
<form id="nz-ordine" class="nz-ord-main" novalidate>

<section class="nz-passo" data-passo="1">
<h2 class="nz-h">I tuoi dati</h2>
<p class="nz-sub">Ti servono pochi secondi: ti scriviamo per aggiornarti sull'ordine.</p>
<div class="nz-f-row">
<div class="nz-f"><label for="nz-o-nome">Nome</label><input type="text" id="nz-o-nome" maxlength="60" required autocomplete="given-name"></div>
<div class="nz-f"><label for="nz-o-cognome">Cognome</label><input type="text" id="nz-o-cognome" maxlength="60" required autocomplete="family-name"></div>
</div>
<div class="nz-f"><label for="nz-o-email">Email</label><input type="email" id="nz-o-email" maxlength="150" required autocomplete="email" placeholder="nome@esempio.it"></div>
<div class="nz-f"><label for="nz-o-tel">Telefono <span class="nz-opz" id="nz-o-tel-h">(facoltativo, utile al corriere)</span></label><input type="tel" id="nz-o-tel" maxlength="30" autocomplete="tel" inputmode="tel"></div>
<p class="nz-err" role="alert"></p>
<div class="nz-az-ord"><a class="btn nz-b nz-b-neutro" href="{{ nz_lh | append: 'carrello/' | relative_url }}">Torna al carrello</a> <button type="button" class="btn nz-b nz-b-vai" data-nav="avanti">Continua</button></div>
</section>

<section class="nz-passo" data-passo="2" hidden>
<h2 class="nz-h">Indirizzo di spedizione</h2>
<p class="nz-sub">Consegna con corriere tracciato.</p>
<div class="nz-f"><label for="nz-o-ind">Indirizzo <span class="nz-opz">(via e numero civico)</span></label><input type="text" id="nz-o-ind" maxlength="120" autocomplete="address-line1" placeholder="Via Roma 12"></div>
<div class="nz-f"><label for="nz-o-ind2">Scala, interno, presso <span class="nz-opz">(facoltativo)</span></label><input type="text" id="nz-o-ind2" maxlength="80" autocomplete="address-line2"></div>
<div class="nz-f-row nz-r3">
<div class="nz-f"><label for="nz-o-cap">CAP</label><input type="text" id="nz-o-cap" maxlength="10" autocomplete="postal-code" inputmode="numeric"></div>
<div class="nz-f"><label for="nz-o-citta">Città</label><input type="text" id="nz-o-citta" maxlength="80" autocomplete="address-level2"></div>
<div class="nz-f"><label for="nz-o-prov">Provincia</label><input type="text" id="nz-o-prov" maxlength="2" autocomplete="address-level1" placeholder="RN" style="text-transform:uppercase"></div>
</div>
<div class="nz-f"><label for="nz-o-paese">Paese</label>
<select id="nz-o-paese" autocomplete="country-name"><option>Italia</option><option>Austria</option><option>Francia</option><option>Germania</option><option>Spagna</option><option>Svizzera</option></select></div>
<div class="nz-f"><label for="nz-o-note">Note per il corriere <span class="nz-opz">(facoltative)</span></label><textarea id="nz-o-note" rows="2" maxlength="200" placeholder="Es. citofono, orari di consegna"></textarea></div>
<p class="nz-err" role="alert"></p>
<div class="nz-az-ord"><button type="button" class="btn nz-b nz-b-neutro" data-nav="indietro">Indietro</button> <button type="button" class="btn nz-b nz-b-vai" data-nav="avanti">Continua</button></div>
</section>

<section class="nz-passo" data-passo="3" hidden>
<h2 class="nz-h">Pagamento</h2>
<p class="nz-sub">Scegli come vuoi pagare, controlla i dati e conferma.</p>
<div id="nz-riep-dati" class="nz-recap"></div>
<fieldset class="nz-pay">
<legend class="nz-h2">Metodo di pagamento</legend>
<label class="nz-pay-o on"><input type="radio" name="nz-pay" value="carta" checked><span class="nz-pay-t">Carta di credito o debito</span><span class="nz-pay-d">Visa, Mastercard, Maestro, American Express</span></label>
<label class="nz-pay-o"><input type="radio" name="nz-pay" value="bancomat"><span class="nz-pay-t">Bancomat / PagoBANCOMAT</span><span class="nz-pay-d">Carta di debito nazionale</span></label>
<label class="nz-pay-o"><input type="radio" name="nz-pay" value="paypal"><span class="nz-pay-t">PayPal</span><span class="nz-pay-d">Paga con il tuo conto PayPal</span></label>
<label class="nz-pay-o"><input type="radio" name="nz-pay" value="applepay"><span class="nz-pay-t">Apple Pay</span><span class="nz-pay-d">Pagamento rapido da iPhone, iPad e Mac</span></label>
<label class="nz-pay-o"><input type="radio" name="nz-pay" value="googlepay"><span class="nz-pay-t">Google Pay</span><span class="nz-pay-d">Pagamento rapido da Android e Chrome</span></label>
<label class="nz-pay-o"><input type="radio" name="nz-pay" value="satispay"><span class="nz-pay-t">Satispay</span><span class="nz-pay-d">Paga dall'app, senza commissioni</span></label>
<label class="nz-pay-o"><input type="radio" name="nz-pay" value="bonifico"><span class="nz-pay-t">Bonifico bancario</span><span class="nz-pay-d">L'ordine parte alla ricezione del pagamento</span></label>
</fieldset>
<div style="position:absolute;left:-9999px;height:0;overflow:hidden" aria-hidden="true"><label for="nz-o-web">Non compilare</label><input type="text" id="nz-o-web" tabindex="-1" autocomplete="off"></div>
<p id="nz-o-esito" class="nz-esito" role="alert" aria-live="assertive" hidden></p>
<p class="nz-legale">Modalità di prova: nessun importo viene addebitato e non vengono chiesti numeri di carta. Confermando accetti le condizioni di vendita e l'informativa privacy.</p>
<div class="nz-az-ord"><button type="button" class="btn nz-b nz-b-neutro" data-nav="indietro">Indietro</button> <button type="submit" class="btn nz-b nz-b-vai" id="nz-o-invia">Paga ora</button></div>
</section>
</form>

<aside class="nz-ord-sum" aria-label="Riepilogo ordine">
<h2 class="nz-sum-t">Riepilogo ordine</h2>
<ul id="nz-sum-righe" class="nz-sum-righe"></ul>
<p class="nz-sum-tot"><span>Totale</span> <strong id="nz-sum-tot"></strong></p>
<ul id="nz-sum-fiducia" class="nz-sum-fiducia"><li>Assistenza via email</li></ul>
</aside>
</div>
</div>
</div>
{% else %}
<p>The shop is not available at the moment.</p>
{% endif %}
