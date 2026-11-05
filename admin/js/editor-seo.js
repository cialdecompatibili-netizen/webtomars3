// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: editor di testo + analisi SEO di Servizi/Progetti. Il Markdown e' la fonte unica: md2html() serve SOLO all'anteprima, mai per salvare (i tag Liquid non si devono rompere). Espone window.SEOED e window.openMediaLib (usata da wp-elenchi.js).
// Editor di testo + analisi SEO e leggibilita' per Servizi e Progetti (stile Yoast, solo admin).
// Il Markdown resta la fonte unica: niente conversione HTML, quindi i tag Liquid non si rompono.
(function(){
'use strict';
const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const wordsOf=s=>norm(s).match(/[a-z0-9']+/g)||[];
const stem=w=>w.length>5?w.slice(0,w.length-2):w.slice(0,Math.max(3,w.length-1));

function plain(md){
  return String(md||'').replace(/\{%[\s\S]*?%\}/g,' ').replace(/\{\{[\s\S]*?\}\}/g,' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/^#{1,6}\s*/gm,'').replace(/^\s*(?:[-+*]|\d+\.)\s+/gm,'').replace(/[*_`>]/g,'');
}
function blocks(md){return String(md||'').replace(/\r\n/g,'\n').split(/\n{2,}/).map(b=>b.trim()).filter(Boolean);}

function md2html(src,base){
  const fix=u=>{u=u.replace(/\{\{\s*['"]?([^'"|}]*?)['"]?\s*\|\s*relative_url\s*\}\}/,'$1').replace(/\{\{[\s\S]*?\}\}/g,'');return(/^\//.test(u)&&base)?base.replace(/\/$/,'')+u:u;};
  const inline=t=>{
    t=esc(t).replace(/\{\{\s*&#39;|\{\{\s*'/g,"{{ '");
    t=t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(m,a,u)=>'<img alt="'+a.replace(/"/g,'&quot;')+'" src="'+fix(u)+'">');
    t=t.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(m,a,u)=>'<a href="'+fix(u)+'">'+a+'</a>');
    return t.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>').replace(/\{\{[\s\S]*?\}\}/g,'');
  };
  return blocks(src).map(b=>{
    if(/^\{%\s*include\s+servizio-cta/.test(b))return '<div class="sx-cta">Qui compare la striscia con il pulsante WhatsApp</div>';
    if(/^\{%/.test(b))return '<div class="sx-cta">Blocco del tema</div>';
    let m=b.match(/^(#{1,4})\s+(.+)$/m);
    if(m&&b.split('\n').length===1)return '<h'+(m[1].length)+'>'+inline(m[2])+'</h'+(m[1].length)+'>';
    const L=b.split('\n');
    if(L.every(l=>/^\s*[-+*]\s+/.test(l)))return '<ul>'+L.map(l=>'<li>'+inline(l.replace(/^\s*[-+*]\s+/,''))+'</li>').join('')+'</ul>';
    if(L.every(l=>/^\s*\d+\.\s+/.test(l)))return '<ol>'+L.map(l=>'<li>'+inline(l.replace(/^\s*\d+\.\s+/,''))+'</li>').join('')+'</ol>';
    return '<p>'+L.map(inline).join('<br>')+'</p>';
  }).join('');
}

function analyze(d){
  const kw=norm(d.kw).trim(), kws=wordsOf(kw), md=d.md||'';
  const has=t=>kws.length>0&&kws.every(w=>norm(t).includes(stem(w)));
  const txt=plain(md), W=wordsOf(txt), n=W.length;
  const seo=[], read=[];
  const add=(a,s,t)=>a.push({s,t});
  const title=(d.seot||'').trim(), desc=(d.seod||'').trim();
  // parola chiave
  if(!kw)add(seo,'bad','Scegli una parola chiave: la frase che i clienti cercano su Google.');
  else{
    add(seo,has(title)?'good':'bad',has(title)?'La parola chiave è nel titolo SEO.':'Inserisci la parola chiave nel titolo SEO.');
    if(has(title)&&norm(title).indexOf(stem(kws[0]))>15)add(seo,'ok','Sposta la parola chiave verso l’inizio del titolo SEO.');
    add(seo,has(desc)?'good':'bad',has(desc)?'La parola chiave è nella descrizione SEO.':'Inserisci la parola chiave nella descrizione SEO.');
    const first=blocks(md).find(b=>!/^(#|\{%|[-+*]\s|\d+\.\s)/.test(b))||'';
    add(seo,has(first)?'good':'bad',has(first)?'La parola chiave è nel primo paragrafo.':'Usa la parola chiave nel primo paragrafo.');
    const heads=(md.match(/^#{2,3}\s+.+$/gm)||[]);
    add(seo,heads.some(has)?'good':'ok',heads.some(has)?'La parola chiave è in un sottotitolo.':'Usa la parola chiave in almeno un sottotitolo.');
    const phrase=kws.join(' '), c=phrase?(wordsOf(txt).join(' ').split(phrase).length-1):0, dn=n?c/n*100:0;
    if(!c)add(seo,has(txt)?'ok':'bad',has(txt)?'La frase esatta non compare: usala almeno una volta.':'La parola chiave non compare nel testo.');
    else if(dn<0.4)add(seo,'ok','La parola chiave compare '+c+(c===1?' volta':' volte')+': è poca, ripetila con naturalezza.');
    else if(dn>2.5)add(seo,'bad','La parola chiave è ripetuta troppo ('+dn.toFixed(1)+'%): variala con sinonimi.');
    else add(seo,'good','Frequenza della parola chiave corretta ('+dn.toFixed(1)+'%).');
  }
  // titolo e descrizione
  if(!title)add(seo,'bad','Il titolo SEO manca: Google userà il titolo del servizio.');
  else add(seo,title.length>=30&&title.length<=60?'good':'ok',title.length>60?'Il titolo SEO è lungo ('+title.length+'): Google lo taglia oltre 60 caratteri.':title.length<30?'Il titolo SEO è corto ('+title.length+'): arriva ad almeno 30 caratteri.':'La lunghezza del titolo SEO è giusta.');
  if(!desc)add(seo,'bad','La descrizione SEO manca: scrivila, è il testo che invoglia al clic.');
  else add(seo,desc.length>=120&&desc.length<=155?'good':'ok',desc.length>155?'La descrizione SEO è lunga ('+desc.length+'): Google la taglia oltre 155.':desc.length<120?'La descrizione SEO è corta ('+desc.length+'): punta a 120–155 caratteri.':'La lunghezza della descrizione SEO è giusta.');
  // contenuto
  add(seo,n>=600?'good':n>=300?'ok':'bad',n>=600?'Il testo è ricco ('+n+' parole).':n>=300?'Il testo è di '+n+' parole: per posizionarsi meglio punta a 600.':'Il testo è troppo breve ('+n+' parole): scrivi almeno 300 parole.');
  const links=[...md.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)].map(m=>m[1]);
  const inner=links.filter(u=>/^(\/|#|\{\{)/.test(u)||u.indexOf('relative_url')>-1).length;
  add(seo,inner?'good':'bad',inner?'Ci sono '+inner+' link interni.':'Aggiungi almeno un link a un altro servizio.');
  const imgs=[...md.matchAll(/!\[([^\]]*)\]\(/g)];
  if(imgs.length){const noAlt=imgs.filter(m=>!m[1].trim()).length; add(seo,noAlt?'bad':'good',noAlt?noAlt+' immagini senza testo alternativo.':'Tutte le immagini hanno il testo alternativo.');}
  add(seo,/servizio-cta/.test(md)?'good':'ok',/servizio-cta/.test(md)?'Hai una call to action a metà pagina.':'Aggiungi la call to action a metà pagina (pulsante “Call to action”).');
  // leggibilita'
  const sents=txt.split(/(?<=[.!?])\s+|\n+/).map(s=>wordsOf(s).length).filter(x=>x>2);
  if(sents.length){const lg=sents.filter(x=>x>20).length/sents.length*100;
    add(read,lg<=25?'good':lg<=40?'ok':'bad',lg<=25?'Le frasi sono brevi e chiare.':Math.round(lg)+'% delle frasi supera 20 parole: spezzale.');}
  const paras=blocks(md).filter(b=>!/^(#|\{%|[-+*]\s|\d+\.\s)/.test(b)).map(b=>wordsOf(plain(b)).length);
  const lp=paras.filter(x=>x>120).length;
  if(paras.length)add(read,lp?'ok':'good',lp?lp+(lp===1?' paragrafo supera':' paragrafi superano')+' 120 parole: dividi il testo.':'I paragrafi hanno una lunghezza comoda.');
  if(n>300){const parts=md.split(/^#{2,3}\s+.*$/m).map(p=>wordsOf(plain(p)).length), mx=Math.max.apply(null,parts);
    add(read,mx>300?'bad':'good',mx>300?'Una sezione senza sottotitoli supera 300 parole: aggiungi titoli.':'I sottotitoli spezzano bene il testo.');}
  if(/^\s*[-+*]\s/m.test(md))add(read,'good','Usi elenchi puntati: aiutano la lettura veloce.');
  return {seo,read};
}
function level(a){if(!a.length)return 'ok';const p=a.reduce((x,i)=>x+(i.s==='good'?1:i.s==='ok'?.5:0),0)/a.length;return p>=.75?'good':p>=.45?'ok':'bad';}

const api={md2html,analyze,plain};
if(typeof window==='undefined'){module.exports=api;return;}
window.SEOED=api;

// ---------- interfaccia ----------
const $=id=>document.getElementById(id);
const BASE=location.origin+location.pathname.replace(/\/admin\/?.*$/,'/');
const css=`
.sx-ed{margin-top:4px}
.sx-tabs{display:flex;gap:2px;margin-bottom:-1px;position:relative;z-index:1}
.sx-tabs button{border:1px solid var(--wp-line,#c3c4c7);background:#f6f7f7;color:var(--wp-blue,#2271b1);padding:5px 14px;font-size:13px;cursor:pointer;border-radius:3px 3px 0 0}
.sx-tabs button.on{background:#fff;color:#1d2327;border-bottom-color:#fff;font-weight:600}
.sx-bar2{display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:#f6f7f7;border:1px solid var(--wp-line,#c3c4c7);border-bottom:none}
.sx-bar2 button{border:1px solid var(--wp-line,#c3c4c7);background:#fff;border-radius:3px;padding:3px 10px;font-size:13px;cursor:pointer;color:#1d2327;min-height:28px}
.sx-bar2 button:hover{background:var(--wp-blue,#2271b1);border-color:var(--wp-blue,#2271b1);color:#fff}
.sx-ed textarea{border-radius:0!important;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;font-size:14px!important;line-height:1.7!important;min-height:420px!important;resize:vertical}
.sx-prev{display:none;border:1px solid var(--wp-line,#c3c4c7);background:#fff;padding:18px 24px;min-height:420px;max-height:640px;overflow:auto;font-size:16px;line-height:1.7;color:#1d2327}
.sx-prev h2{font-size:22px;margin:1.2em 0 .4em}.sx-prev h3{font-size:18px;margin:1em 0 .3em}.sx-prev p,.sx-prev ul,.sx-prev ol{margin:0 0 1em}.sx-prev ul,.sx-prev ol{padding-left:1.4em}.sx-prev a{color:var(--wp-blue,#2271b1)}.sx-prev img{max-width:100%}
.sx-cta{border:1px dashed #8c8f94;background:#f6f7f7;color:#646970;padding:12px;text-align:center;font-size:14px;margin:0 0 1em}
.sx{margin-top:22px;border:1px solid var(--wp-line,#c3c4c7);background:#fff}
.sx>details{border-top:1px solid #f0f0f1}.sx>details:first-child{border-top:none}
.sx summary{cursor:pointer;padding:12px 16px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;list-style:none}
.sx summary::-webkit-details-marker{display:none}
.sx summary::after{content:"+";margin-left:auto;color:#646970;font-weight:400}.sx details[open]>summary::after{content:"–"}
.sx-in{padding:0 16px 16px}
.sx-dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#dcdcde;flex:none}
.sx-dot.good,.sx-li.good::before{background:#00a32a}.sx-dot.ok,.sx-li.ok::before{background:#dba617}.sx-dot.bad,.sx-li.bad::before{background:#d63638}
.sx-snip{border:1px solid #dcdcde;border-radius:6px;padding:14px 16px;margin-bottom:14px;font-family:Arial,sans-serif;max-width:640px}
.sx-snip .u{font-size:13px;color:#202124;margin-bottom:2px}.sx-snip .t{font-size:20px;line-height:1.3;color:#1a0dab}.sx-snip .d{font-size:14px;line-height:1.58;color:#4d5156;margin-top:3px}
.sx-ul{list-style:none;margin:0;padding:0}
.sx-li{position:relative;padding:5px 0 5px 20px;font-size:13px;line-height:1.5}
.sx-li::before{content:"";position:absolute;left:0;top:11px;width:9px;height:9px;border-radius:50%}
.sx-meter{height:4px;background:#f0f0f1;margin-top:5px;border-radius:2px;overflow:hidden}.sx-meter i{display:block;height:100%;width:0;background:#d63638;transition:width .2s,background .2s}
.sx-cnt{font-size:12px;color:#646970;margin-top:3px}
.sx-st{margin-left:auto;font-size:12px;color:#646970;align-self:center;padding-right:4px}
.sx-fp{display:flex;gap:14px;align-items:flex-start}
.sx-fpi{width:140px;aspect-ratio:4/3;background:#f6f7f7;border:1px dashed #c3c4c7;display:flex;align-items:center;justify-content:center;color:#646970;font-size:12px;overflow:hidden;flex:none}
.sx-fpi img{width:100%;height:100%;object-fit:cover;display:block}
.sx-fpa .hint{margin-top:8px;max-width:340px}
.mx-ov{position:fixed;inset:0;background:rgba(29,35,39,.7);z-index:100000;display:flex;align-items:center;justify-content:center;padding:3vh 3vw}
.mx-ov.drag{outline:3px dashed #72aee6;outline-offset:-12px}
.mx{background:#fff;width:min(1100px,100%);height:min(720px,100%);display:flex;flex-direction:column;box-shadow:0 4px 24px rgba(0,0,0,.3)}
.mx-h{display:flex;justify-content:space-between;align-items:center;padding:0 16px;height:50px;border-bottom:1px solid #dcdcde;font-size:18px}
.mx-x{border:none;background:none;font-size:26px;line-height:1;cursor:pointer;color:#646970;padding:4px 8px}.mx-x:hover{color:#d63638}
.mx-t{display:flex;gap:12px;align-items:center;padding:10px 16px;border-bottom:1px solid #f0f0f1}
.mx-q{max-width:280px}
.mx-up{background:#2271b1;color:#fff;padding:6px 14px;border-radius:3px;cursor:pointer;font-size:13px;white-space:nowrap}.mx-up:hover{background:#135e96}
.mx-s{font-size:12px;color:#646970}
.mx-b{flex:1;display:flex;min-height:0}
.mx-g{flex:1;overflow:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;align-content:start}
.mx-i{padding:0;border:none;background:#f0f0f1;aspect-ratio:1;cursor:pointer;position:relative;outline-offset:0}
.mx-i img{width:100%;height:100%;object-fit:cover;display:block}
.mx-i:hover{outline:2px solid #72aee6}.mx-i.on{outline:3px solid #2271b1;box-shadow:inset 0 0 0 2px #fff}
.mx-d{width:290px;border-left:1px solid #dcdcde;padding:16px;overflow:auto;background:#f6f7f7;flex:none}
.mx-pv{width:100%;display:block;margin-bottom:10px;background:#fff}
.mx-n{font-weight:600;word-break:break-all}.mx-m{color:#646970;font-size:12px;margin-bottom:14px}
.mx-l{margin-top:4px}.mx-d .mx-ok{margin-top:16px;width:100%;justify-content:center}
.mx-e{grid-column:1/-1;color:#646970;font-size:13px;padding:8px 0}
@media (max-width:782px){.mx-b{flex-direction:column}.mx-d{width:100%;border-left:none;border-top:1px solid #dcdcde;max-height:45%}.mx-q{max-width:none;flex:1}}
.wp-list{width:100%;border-collapse:collapse;background:#fff;border:1px solid #c3c4c7;margin-top:10px}
.wp-list th{text-align:left;font-weight:600;padding:8px 10px;border-bottom:1px solid #c3c4c7;font-size:13px}
.wp-list td{padding:10px;border-bottom:1px solid #f0f0f1;vertical-align:top}
.wp-list tr:nth-child(even) td{background:#f6f7f7}.wp-list tr:hover td{background:#f0f6fc}
.wp-th{width:80px}.wp-th div{width:64px;height:48px;background:#f0f0f1;overflow:hidden}.wp-th img{width:100%;height:100%;object-fit:cover;display:block}
.wp-t{font-weight:600;font-size:14px;color:#2271b1;text-decoration:none;cursor:pointer}.wp-t:hover{color:#135e96}
.wp-ra{font-size:12px;margin-top:3px;color:#a7aaad;visibility:hidden}
.wp-list tr:hover .wp-ra{visibility:visible}
@media (hover:none){.wp-ra{visibility:visible}}
.wp-ra a{color:#2271b1;text-decoration:none;cursor:pointer}.wp-ra a:hover{text-decoration:underline}.wp-ra a.del{color:#b32d2e}
.wp-search{max-width:280px;margin:0 0 4px}
.wp-n{color:#646970;font-size:13px;white-space:nowrap}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function wrap(ta,a,b,ph){const s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||ph||'';
  ta.setRangeText(a+sel+b,s,e,'end');ta.focus();ta.setSelectionRange(s+a.length,s+a.length+sel.length);}
function lineP(ta,p){const s=ta.selectionStart,e=ta.selectionEnd,v=ta.value,a=v.lastIndexOf('\n',s-1)+1;let b=v.indexOf('\n',e);if(b<0)b=v.length;
  const txt=v.slice(a,b).split('\n').map((l,i)=>p==='1.'?(i+1)+'. '+l:p+l).join('\n');ta.setRangeText(txt,a,b,'end');ta.focus();}
function ins(ta,t){ta.setRangeText(t,ta.selectionStart,ta.selectionEnd,'end');ta.focus();}

function renderFoto(k,f){
  const el=$('sx-fpi-'+k); if(!el)return; const L=window.FOTOLIB;
  el.innerHTML=(f&&L)?'<img alt="" src="'+L.url(f)+'" data-p="'+((L.prev&&L.prev[f])||'')+'" onerror="this.onerror=null;if(this.dataset.p)this.src=this.dataset.p">':'<span>Nessuna foto</span>';
  const r=$('sx-fpr-'+k); if(r)r.style.display=f?'':'none';
}
const attr=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

// Libreria media in finestra, come WordPress: griglia, ricerca, carica, dettagli con testo alternativo.
window.openMediaLib=openMedia;
function openMedia(o){
  const L=window.FOTOLIB; if(!L){alert('La libreria foto non è disponibile.');return;}
  const ov=document.createElement('div'); ov.className='mx-ov';
  ov.innerHTML='<div class="mx" role="dialog" aria-label="Libreria media"><div class="mx-h"><b>'+(o.mode==='pick'?'Scegli la foto principale':'Inserisci una foto')+'</b><button type="button" class="mx-x" aria-label="Chiudi">×</button></div>'
   +'<div class="mx-t"><input type="search" class="mx-q" placeholder="Cerca per nome o descrizione"><label class="mx-up">Carica foto<input type="file" accept="image/*" multiple hidden></label><span class="mx-s"></span></div>'
   +'<div class="mx-b"><div class="mx-g"><p class="mx-e">Caricamento della libreria…</p></div><aside class="mx-d"><p class="mx-e">Scegli una foto per vedere i dettagli. Puoi anche trascinare qui nuove foto.</p></aside></div></div>';
  document.body.appendChild(ov);
  let items=[],sel=null,q='';
  const g=ov.querySelector('.mx-g'),d=ov.querySelector('.mx-d'),s=ov.querySelector('.mx-s');
  const close=()=>{document.removeEventListener('keydown',esc2);ov.remove();};
  const esc2=e=>{if(e.key==='Escape')close();};
  document.addEventListener('keydown',esc2);
  ov.addEventListener('mousedown',e=>{if(e.target===ov)close();});
  ov.querySelector('.mx-x').onclick=close;
  const use=()=>{if(!sel)return;const alt=(d.querySelector('.mx-alt')||{}).value||sel.cap||'';close();o.onSelect(sel,alt);};
  function draw(){
    const t=norm(q), list=items.filter(x=>!t||norm(x.f+' '+x.cap).includes(t));
    g.innerHTML=list.length?list.map(x=>'<button type="button" class="mx-i'+(sel&&sel.f===x.f?' on':'')+'" data-f="'+attr(x.f)+'" title="'+attr(x.cap)+'"><img loading="lazy" alt="" src="'+L.url(x.f)+'" data-p="'+attr(L.prev[x.f]||'')+'" onerror="this.onerror=null;if(this.dataset.p)this.src=this.dataset.p"></button>').join(''):'<p class="mx-e">'+(items.length?'Nessuna foto con questa ricerca.':'Nessuna foto ancora: usa “Carica foto”.')+'</p>';
    if(!sel){d.innerHTML='<p class="mx-e">Scegli una foto per vedere i dettagli. Puoi anche trascinare qui nuove foto.</p>';return;}
    d.innerHTML='<img class="mx-pv" alt="" src="'+L.url(sel.f)+'" data-p="'+attr(L.prev[sel.f]||'')+'" onerror="this.onerror=null;if(this.dataset.p)this.src=this.dataset.p"><div class="mx-n">'+esc(sel.f)+'.jpg</div><div class="mx-m">'+(sel.w||'')+' × '+(sel.h||'')+' px</div>'
      +'<label class="mx-l">Testo alternativo</label><input type="text" class="mx-alt" value="'+attr(sel.cap)+'"><div class="hint">Descrive la foto a Google e a chi non la vede.</div>'
      +'<button type="button" class="btn btn-primary mx-ok">'+(o.mode==='pick'?'Usa come foto principale':'Inserisci nel testo')+'</button>';
    d.querySelector('.mx-ok').onclick=use;
  }
  g.onclick=e=>{const b=e.target.closest('.mx-i');if(!b)return;sel=items.find(x=>x.f===b.dataset.f)||null;draw();};
  g.ondblclick=e=>{if(e.target.closest('.mx-i'))use();};
  ov.querySelector('.mx-q').oninput=e=>{q=e.target.value;draw();};
  async function up(files){
    const fs=[...files].filter(f=>/^image\//.test(f.type));
    for(let i=0;i<fs.length;i++){
      s.textContent='Carico '+(i+1)+' di '+fs.length+'…';
      try{const it=await L.carica(fs[i]);items.unshift(it);sel=it;draw();}
      catch(e){s.textContent='Errore: '+e.message;return;}
    }
    s.textContent=fs.length?'Fatto. Le foto sono online dopo il deploy.':'';
  }
  ov.querySelector('input[type=file]').onchange=e=>{up(e.target.files);e.target.value='';};
  ov.addEventListener('dragover',e=>{e.preventDefault();ov.classList.add('drag');});
  ov.addEventListener('dragleave',e=>{if(e.target===ov)ov.classList.remove('drag');});
  ov.addEventListener('drop',e=>{e.preventDefault();ov.classList.remove('drag');up(e.dataTransfer.files);});
  L.lista().then(l=>{items=l.reverse();draw();}).catch(()=>{g.innerHTML='<p class="mx-e">Non riesco a leggere la libreria. Controlla il token.</p>';});
}

function mount(k){
  const ta=$('c-'+k+'-corpo'); if(!ta||ta.dataset.sx)return; ta.dataset.sx=1;
  const field=ta.closest('.field'); const lab=field.querySelector('label'); if(lab)lab.textContent='Testo';
  const box=document.createElement('div');box.className='sx-ed';
  box.innerHTML='<div class="sx-tabs"><button type="button" class="on" data-t="w">Scrittura</button><button type="button" data-t="p">Anteprima</button></div>'
   +'<div class="sx-bar2"><button type="button" data-a="b" title="Grassetto"><b>B</b></button><button type="button" data-a="i" title="Corsivo"><i>i</i></button><button type="button" data-a="h2">Titolo</button><button type="button" data-a="h3">Sottotitolo</button><button type="button" data-a="ul">Elenco</button><button type="button" data-a="ol">Elenco numerato</button><button type="button" data-a="a">Link</button><button type="button" data-a="img">Aggiungi foto</button><button type="button" data-a="cta">Call to action</button><span class="sx-st"></span></div>';
  ta.parentNode.insertBefore(box,ta);box.appendChild(ta);
  const pv=document.createElement('div');pv.className='sx-prev';box.appendChild(pv);
  const bar=box.querySelector('.sx-bar2');
  box.querySelector('.sx-tabs').onclick=e=>{const t=e.target.dataset.t;if(!t)return;
    box.querySelectorAll('.sx-tabs button').forEach(b=>b.classList.toggle('on',b===e.target));
    ta.style.display=t==='w'?'':'none';bar.style.display=t==='w'?'':'none';pv.style.display=t==='p'?'block':'none';if(t==='p')pv.innerHTML=md2html(ta.value,BASE);};
  bar.onclick=e=>{const a=e.target.closest('button');if(!a)return;const x=a.dataset.a;
    if(x==='b')wrap(ta,'**','**','testo');else if(x==='i')wrap(ta,'*','*','testo');
    else if(x==='h2')lineP(ta,'## ');else if(x==='h3')lineP(ta,'### ');else if(x==='ul')lineP(ta,'- ');else if(x==='ol')lineP(ta,'1.');
    else if(x==='a'){const u=prompt('Indirizzo del link (es. /servizi/pulizia-vetri/ o https://...)');if(u)wrap(ta,'[','](' +u+ ')','testo del link');}
    else if(x==='img')openMedia({mode:'insert',onSelect:(it,alt)=>ins(ta,'\n\n!['+alt+']('+window.FOTOLIB.liquid(it.f)+')\n\n')});
    else if(x==='cta')ins(ta,'\n\n{% include servizio-cta.html tipo="mini" %}\n\n');};

  // foto principale (e etichette per i progetti)
  const grid=$('c-'+k+'-ord')&&$('c-'+k+'-ord').closest('.grid2');
  if(grid){
    const fp=document.createElement('div');
    fp.innerHTML='<div class="field"><label>Foto principale</label><div class="sx-fp"><div class="sx-fpi" id="sx-fpi-'+k+'"><span>Nessuna foto</span></div><div class="sx-fpa"><button type="button" class="btn btn-secondary btn-sm" id="sx-fpb-'+k+'">Scegli foto</button> <button type="button" class="btn btn-secondary btn-sm" id="sx-fpr-'+k+'" style="display:none">Rimuovi</button><div class="hint">Compare nell’elenco. Se non la scegli, il sito ne sceglie una in automatico.</div></div></div><input type="hidden" id="c-'+k+'-foto"></div>'
      +(k==='progetti'?'<div class="field"><label>Etichette</label><input type="text" id="c-'+k+'-chips" placeholder="Etichetta 1, Etichetta 2"><div class="hint">Separate da virgola: compaiono come pillole nell’elenco.</div></div>':'');
    grid.insertAdjacentElement('afterend',fp);
    $('sx-fpb-'+k).onclick=()=>openMedia({mode:'pick',onSelect:it=>{$('c-'+k+'-foto').value=it.f;renderFoto(k,it.f);}});
    $('sx-fpr-'+k).onclick=()=>{$('c-'+k+'-foto').value='';renderFoto(k,'');};
  }
  // incolla o trascina una foto nel testo: viene caricata e inserita da sola
  const st2=bar.querySelector('.sx-st');
  const upIns=async files=>{
    const fs=[...files].filter(f=>/^image\//.test(f.type));
    for(let i=0;i<fs.length;i++){
      st2.textContent='Carico la foto '+(i+1)+' di '+fs.length+'…';
      try{const it=await window.FOTOLIB.carica(fs[i]);ins(ta,'\n\n!['+it.cap+']('+window.FOTOLIB.liquid(it.f)+')\n\n');st2.textContent='Foto inserita.';}
      catch(e){st2.textContent='Errore: '+e.message;}
    }
  };
  ta.addEventListener('paste',e=>{const fs=[...((e.clipboardData&&e.clipboardData.files)||[])].filter(f=>/^image\//.test(f.type));if(fs.length){e.preventDefault();upIns(fs);}});
  ta.addEventListener('dragover',e=>{if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files'))e.preventDefault();});
  ta.addEventListener('drop',e=>{const fs=[...e.dataTransfer.files].filter(f=>/^image\//.test(f.type));if(fs.length){e.preventDefault();upIns(fs);}});

  // pannello SEO
  const p=document.createElement('div');p.className='sx';
  p.innerHTML='<details open><summary>Anteprima su Google</summary><div class="sx-in"><div class="sx-snip"><div class="u" id="sx-u-'+k+'"></div><div class="t" id="sx-t-'+k+'"></div><div class="d" id="sx-d-'+k+'"></div></div><div id="sx-f-'+k+'"></div></div></details>'
   +'<details open><summary>Parola chiave</summary><div class="sx-in"><div class="field" style="margin:0"><input type="text" id="c-'+k+'-fkw" placeholder="es. nome del servizio + citta"><div class="hint">La frase che un cliente scrive su Google per trovare questo lavoro.</div></div></div></details>'
   +'<details open><summary><i class="sx-dot" id="sx-ds-'+k+'"></i>Analisi SEO</summary><div class="sx-in"><ul class="sx-ul" id="sx-s-'+k+'"></ul></div></details>'
   +'<details><summary><i class="sx-dot" id="sx-dr-'+k+'"></i>Leggibilità</summary><div class="sx-in"><ul class="sx-ul" id="sx-r-'+k+'"></ul></div></details>';
  field.insertAdjacentElement('afterend',p);
  const fl=$('sx-f-'+k);
  [['seot',[30,60]],['seod',[120,155]]].forEach(([f,r])=>{const i=$('c-'+k+'-'+f),w=i&&i.closest('.field');if(!w)return;
    const m=document.createElement('div');m.innerHTML='<div class="sx-meter"><i id="sx-m-'+k+f+'"></i></div><div class="sx-cnt" id="sx-c-'+k+f+'"></div>';w.appendChild(m);fl.appendChild(w);});
  let last='';
  setInterval(()=>{const ev=$('c-'+k+'-editor-view');if(!ev||ev.style.display==='none')return;
    const g=f=>($('c-'+k+'-'+f)||{}).value||'';
    const d={title:g('title'),seot:g('seot'),seod:g('seod'),kw:g('fkw'),md:g('corpo'),foto:g('foto')};
    const sig=JSON.stringify(d);if(sig===last)return;last=sig;renderFoto(k,d.foto);
    const T=d.seot||d.title, D=d.seod||g('desc');
    $('sx-u-'+k).textContent=location.hostname+' › '+k+' › '+(d.title?norm(d.title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''):'');
    $('sx-t-'+k).textContent=T.length>60?T.slice(0,59)+'…':(T||'Titolo del servizio');
    $('sx-d-'+k).textContent=D.length>155?D.slice(0,154)+'…':(D||'Scrivi la descrizione SEO: compare sotto il titolo su Google.');
    [['seot',30,60],['seod',120,155]].forEach(([f,lo,hi])=>{const n=d[f].length,m=$('sx-m-'+k+f);if(!m)return;
      m.style.width=Math.min(100,n/hi*100)+'%';m.style.background=n===0?'#dcdcde':(n>=lo&&n<=hi)?'#00a32a':'#dba617';$('sx-c-'+k+f).textContent=n+' caratteri (ideale '+lo+'–'+hi+')';});
    const r=analyze(d);
    $('sx-s-'+k).innerHTML=r.seo.map(i=>'<li class="sx-li '+i.s+'">'+esc(i.t)+'</li>').join('');
    $('sx-r-'+k).innerHTML=r.read.map(i=>'<li class="sx-li '+i.s+'">'+esc(i.t)+'</li>').join('');
    $('sx-ds-'+k).className='sx-dot '+level(r.seo);$('sx-dr-'+k).className='sx-dot '+level(r.read);
    if(pv.style.display==='block')pv.innerHTML=md2html(d.md,BASE);
  },500);
}
['servizi','progetti'].forEach(mount);
})();
