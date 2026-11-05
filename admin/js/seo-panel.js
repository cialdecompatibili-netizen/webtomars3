// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: pannello SEO. Scrive nel front matter seo_title, seo_description, seo_kw, noindex, canonical, seo_image: sono gli stessi nomi che legge _includes/seo.html. Se cambi un nome cambialo in entrambi. Campi vuoti = non scritti. API: window.SeoPanel.
// SEO PANEL stile Yoast per Articoli, Pagine e Prodotti (solo admin).
// COSA FA: disegna sotto il testo un pannello con anteprima Google, parola chiave, titolo SEO,
//   meta description, opzioni avanzate (noindex, canonical, immagine social) e analisi a semaforo.
// COSA SCRIVE nel front matter (lo legge _includes/seo.html): seo_title, seo_description, seo_kw (solo admin),
//   noindex, canonical, seo_image. Campi vuoti = non scritti (il sito usa i default).
// API: SeoPanel.get(id) | set(id,obj) | read(fmText) | lines(id) | patch(fmCompleto,id) | refresh(id)
// NON TOCCARE: le chiavi dei campi (devono combaciare con seo.html) e q() (escape YAML).
(function(){
'use strict';
const KEYS=['seo_title','seo_description','seo_kw','noindex','canonical','seo_image'];
const P={}; // stato per pannello: { el, ctx }
const norm=s=>String(s==null?'':s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const wordsOf=s=>norm(s).match(/[a-z0-9']+/g)||[];
const stem=w=>w.length>5?w.slice(0,w.length-2):w.slice(0,Math.max(3,w.length-1));
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// q(): valore YAML tra virgolette (escape di \ e ")
const q=s=>'"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,' ')+'"';
const unq=s=>String(s).replace(/\\"/g,'"').replace(/\\\\/g,'\\');
// testo semplice da HTML/Markdown/Liquid
const strip=h=>String(h||'').replace(/\{%[\s\S]*?%\}/g,' ').replace(/\{\{[\s\S]*?\}\}/g,' ')
  .replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/^#{1,6}\s*/gm,'').replace(/[*_`>]/g,'').replace(/\s+/g,' ').trim();
const slugify=s=>norm(s).replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');

// ---------- CSS (iniettato una volta) ----------
function css(){
  if(document.getElementById('sp-css'))return;
  const s=document.createElement('style');s.id='sp-css';
  s.textContent=`
.sp{border:1px solid #e2e2e2;border-radius:10px;background:#fff;margin:18px 0;overflow:hidden}
.sp-h{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f7f7f8;border-bottom:1px solid #e8e8e8;font-weight:600;cursor:pointer}
.sp-dot{width:12px;height:12px;border-radius:50%;background:#bbb;flex:none}
.sp-dot.ok{background:#2e9e4f}.sp-dot.warn{background:#e8a317}.sp-dot.bad{background:#d8453b}
.sp-b{padding:16px}.sp-b.sp-closed{display:none}
.sp-sec{margin-bottom:16px}.sp-sec>label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
.sp input[type=text],.sp textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d6d6d6;border-radius:6px;font:inherit;font-size:14px}
.sp textarea{min-height:64px;resize:vertical}
.sp-bar{height:5px;border-radius:3px;background:#eee;margin-top:5px;overflow:hidden}
.sp-bar i{display:block;height:100%;width:0;background:#bbb;transition:width .15s}
.sp-bar i.ok{background:#2e9e4f}.sp-bar i.warn{background:#e8a317}.sp-bar i.bad{background:#d8453b}
.sp-cnt{font-size:12px;color:#777;margin-top:3px}
.sp-prev{border:1px solid #e6e6e6;border-radius:8px;padding:14px;background:#fff;max-width:620px}
.sp-prev.m{max-width:380px}
.sp-url{font-size:12px;color:#4d5156;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-t{font-size:20px;line-height:1.3;color:#1a0dab;margin:2px 0;font-family:Arial,sans-serif}
.sp-d{font-size:14px;line-height:1.5;color:#4d5156;font-family:Arial,sans-serif}
.sp-tg{display:inline-flex;gap:0;margin-bottom:8px}.sp-tg button{border:1px solid #d6d6d6;background:#fff;padding:4px 12px;font-size:12px;cursor:pointer}
.sp-tg button.on{background:#1a73e8;color:#fff;border-color:#1a73e8}
.sp-an h4{margin:12px 0 6px;font-size:13px}.sp-an ul{list-style:none;margin:0;padding:0}
.sp-an li{display:flex;gap:8px;font-size:13px;line-height:1.45;margin:4px 0}.sp-an li:before{content:'';width:10px;height:10px;border-radius:50%;margin-top:4px;flex:none;background:#bbb}
.sp-an li.ok:before{background:#2e9e4f}.sp-an li.warn:before{background:#e8a317}.sp-an li.bad:before{background:#d8453b}
.sp-row{display:flex;gap:8px}.sp-mini{border:1px solid #d6d6d6;background:#fff;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer}
.sp-adv{border-top:1px dashed #ddd;padding-top:12px}.sp-adv summary{cursor:pointer;font-weight:600;font-size:13px;margin-bottom:10px}
`;
  document.head.appendChild(s);
}

// ---------- DOM del pannello ----------
function build(id){
  const el=document.getElementById(id);if(!el)return;
  css();
  el.innerHTML=`<div class="sp">
  <div class="sp-h"><span class="sp-dot" data-r="dot"></span><span>SEO &mdash; ottimizzazione per Google</span><span style="margin-left:auto;font-weight:400;font-size:12px;color:#777" data-r="sum"></span></div>
  <div class="sp-b">
   <div class="sp-sec"><label>Anteprima nei risultati di Google</label>
     <div class="sp-tg"><button type="button" data-v="d" class="on">Desktop</button><button type="button" data-v="m">Mobile</button></div>
     <div class="sp-prev" data-r="prev"><div class="sp-url" data-r="pu"></div><div class="sp-t" data-r="pt"></div><div class="sp-d" data-r="pd"></div></div></div>
   <div class="sp-sec"><label>Parola chiave principale</label><input type="text" data-k="seo_kw" placeholder="es. la frase che un cliente cerca su Google">
     <div class="sp-cnt">La frase con cui vuoi essere trovato su Google. Una sola per pagina.</div></div>
   <div class="sp-sec"><label>Titolo SEO</label><input type="text" data-k="seo_title" placeholder="Se vuoto usa il titolo della pagina">
     <div class="sp-bar"><i data-r="tb"></i></div><div class="sp-cnt" data-r="tc"></div></div>
   <div class="sp-sec"><label>Meta description</label><textarea data-k="seo_description" placeholder="Riassunto che appare sotto il titolo su Google (120-160 caratteri)"></textarea>
     <div class="sp-bar"><i data-r="db"></i></div>
     <div class="sp-row" style="margin-top:4px;align-items:center"><div class="sp-cnt" data-r="dc" style="flex:1"></div><button type="button" class="sp-mini" data-r="gen">Genera dal testo</button></div></div>
   <details class="sp-adv"><summary>Avanzate</summary>
     <div class="sp-sec"><label><input type="checkbox" data-k="noindex" style="margin-right:6px">Nascondi questa pagina a Google (noindex)</label></div>
     <div class="sp-sec"><label>URL canonico (opzionale)</label><input type="text" data-k="canonical" placeholder="https://... solo se esiste una versione principale altrove"></div>
     <div class="sp-sec"><label>Immagine per i social (Facebook, WhatsApp)</label><div class="sp-row"><input type="text" id="${id}-img" data-k="seo_image" placeholder="https://... (se vuoto usa quella del sito)"><button type="button" class="sp-mini" data-r="pick">Sfoglia</button></div></div>
   </details>
   <div class="sp-an" data-r="an"></div>
  </div></div>`;
  const root=el.firstElementChild, st={el:root,ctx:null,view:'d'};
  P[id]=st;
  const r=n=>root.querySelector('[data-r="'+n+'"]');
  st.r=r;
  root.querySelector('.sp-h').onclick=()=>root.querySelector('.sp-b').classList.toggle('sp-closed');
  root.querySelectorAll('.sp-tg button').forEach(b=>b.onclick=()=>{st.view=b.dataset.v;root.querySelectorAll('.sp-tg button').forEach(x=>x.classList.toggle('on',x===b));refresh(id);});
  root.querySelectorAll('[data-k]').forEach(i=>i.addEventListener('input',()=>refresh(id)));
  r('gen').onclick=()=>{const c=st.ctx?st.ctx():{};const t=strip(c.body);if(!t)return;
    root.querySelector('[data-k="seo_description"]').value=t.length>155?t.slice(0,155).replace(/\s+\S*$/,'')+'...':t;refresh(id);};
  r('pick').onclick=()=>{if(typeof apriSelettoreImmagini==='function')apriSelettoreImmagini(id+'-img','posts');};
  return st;
}

// ---------- analisi ----------
function analyse(v,c){
  const out=[], add=(l,t)=>out.push({l,t});
  const kw=(v.seo_kw||'').trim(), kws=wordsOf(kw);
  const has=t=>kws.length>0&&kws.every(w=>norm(t).includes(stem(w)));
  const body=c.body||'', txt=strip(body), W=wordsOf(txt), n=W.length;
  const title=(v.seo_title||c.title||'').trim(), desc=(v.seo_description||'').trim();
  const slug=slugify(c.slug||c.title||'');
  // titolo e descrizione
  if(!title)add('bad','Manca il titolo.');
  else if(title.length<30)add('warn','Titolo SEO corto ('+title.length+' caratteri): punta a 30-60.');
  else if(title.length>60)add('warn','Titolo SEO lungo ('+title.length+'): Google lo taglia oltre 60 caratteri.');
  else add('ok','Lunghezza del titolo SEO ottima.');
  if(!desc)add('bad','Manca la meta description: Google ne sceglie una a caso dal testo.');
  else if(desc.length<120)add('warn','Meta description corta ('+desc.length+'): punta a 120-160 caratteri.');
  else if(desc.length>160)add('warn','Meta description lunga ('+desc.length+'): viene tagliata oltre 160.');
  else add('ok','Lunghezza della meta description ottima.');
  // parola chiave
  if(!kws.length)add('bad','Imposta la parola chiave principale: senza non posso valutare il resto.');
  else{
    add(has(title)?'ok':'bad',has(title)?'La parola chiave e\' nel titolo.':'La parola chiave non e\' nel titolo SEO.');
    if(has(title)&&norm(title).indexOf(stem(kws[0]))>12)add('warn','Meglio mettere la parola chiave all\'inizio del titolo.');
    add(has(desc)?'ok':'warn',has(desc)?'La parola chiave e\' nella meta description.':'Inserisci la parola chiave nella meta description.');
    const first=strip((body.match(/<p[\s\S]*?<\/p>/i)||[body.split(/\n{2,}/)[0]||''])[0]);
    add(has(first)?'ok':'warn',has(first)?'La parola chiave e\' nel primo paragrafo.':'Usa la parola chiave nel primo paragrafo.');
    const hs=(body.match(/<h[2-4][\s\S]*?<\/h[2-4]>/gi)||[]).concat(body.match(/^#{2,4}\s.+$/gm)||[]);
    if(hs.length)add(hs.some(h=>has(strip(h)))?'ok':'warn',hs.some(h=>has(strip(h)))?'La parola chiave e\' in un sottotitolo.':'Metti la parola chiave in almeno un sottotitolo (H2/H3).');
    add(slug&&kws.every(w=>slug.includes(stem(w))||slug.includes(w))?'ok':'warn',slug&&kws.every(w=>slug.includes(stem(w))||slug.includes(w))?'La parola chiave e\' nell\'indirizzo (slug).':'La parola chiave non e\' nello slug.');
    const occ=n?norm(txt).split(norm(kw)).length-1:0, dens=n?occ*kws.length/n*100:0;
    if(!n)add('bad','Nessun testo da analizzare.');
    else if(dens<0.5)add('warn','Parola chiave usata '+occ+' volte (densita\' '+dens.toFixed(1)+'%): ripetila un po\' di piu\'.');
    else if(dens>2.5)add('warn','Parola chiave ripetuta troppo ('+occ+' volte, '+dens.toFixed(1)+'%): rischi di sembrare spam.');
    else add('ok','Densita\' della parola chiave corretta ('+occ+' volte).');
  }
  // contenuto
  if(n<300)add(n<100?'bad':'warn','Testo di '+n+' parole: per posizionarti ne servono almeno 300.');
  else add('ok','Lunghezza del testo buona ('+n+' parole).');
  const subs=(body.match(/<h[2-4]/gi)||[]).length+(body.match(/^#{2,4}\s/gm)||[]).length;
  if(n>300)add(subs?'ok':'warn',subs?'Il testo usa sottotitoli.':'Aggiungi sottotitoli (H2/H3) per spezzare il testo.');
  const links=(body.match(/<a\s[^>]*href=["']([^"']+)/gi)||[]).map(a=>a.replace(/^[\s\S]*href=["']/,''))
    .concat((body.match(/\]\(([^)]+)\)/g)||[]).map(a=>a.slice(2,-1)));
  const ext=links.filter(h=>/^https?:\/\//i.test(h)&&h.indexOf(location.host)<0).length, int=links.length-ext;
  add(int?'ok':'warn',int?'Ci sono link interni.':'Aggiungi almeno un link interno ad altre pagine del sito.');
  if(n>300)add(ext?'ok':'warn',ext?'Ci sono link verso altri siti.':'Un link verso una fonte esterna aiuta la credibilita\'.');
  const imgs=(body.match(/<img\b[^>]*>/gi)||[]), mdimgs=(body.match(/!\[[^\]]*\]\([^)]*\)/g)||[]);
  const noalt=imgs.filter(i=>!/alt=["'][^"']+["']/i.test(i)).length+mdimgs.filter(i=>/^!\[\]/.test(i)).length;
  if(imgs.length+mdimgs.length===0)add('warn','Nessuna immagine nel testo: aggiungine almeno una.');
  else add(noalt?'bad':'ok',noalt?noalt+' immagine/i senza testo alternativo (alt).':'Tutte le immagini hanno il testo alternativo.');
  if(kws.length&&imgs.length+mdimgs.length)add(has(imgs.concat(mdimgs).join(' '))?'ok':'warn',has(imgs.concat(mdimgs).join(' '))?'La parola chiave e\' nell\'alt di un\'immagine.':'Metti la parola chiave nell\'alt di un\'immagine.');
  // leggibilita'
  const sents=txt.split(/[.!?]+\s/).filter(s=>s.trim());
  if(sents.length>3){const lg=sents.filter(s=>wordsOf(s).length>20).length, pc=lg/sents.length*100;
    add(pc>25?'warn':'ok',pc>25?Math.round(pc)+'% delle frasi supera 20 parole: accorciale (consigliato max 25%).':'Lunghezza delle frasi buona.');}
  if(v.noindex)add('warn','Pagina nascosta a Google (noindex): non comparira\' nei risultati.');
  return out;
}

// ---------- refresh ----------
function vals(id){
  const st=P[id],o={};if(!st)return o;
  st.el.querySelectorAll('[data-k]').forEach(i=>{o[i.dataset.k]=i.type==='checkbox'?i.checked:i.value.trim();});
  return o;
}
function refresh(id){
  const st=P[id];if(!st)return;
  const c=st.ctx?st.ctx():{}, v=vals(id), r=st.r;
  const site=(document.title||'').replace(/^.*?[-|]\s*/,'')||location.hostname;
  const title=v.seo_title||(c.title?c.title+' - '+site:site), desc=v.seo_description||strip(c.body).slice(0,155);
  const base=location.href.replace(/\/admin\/.*$/,'').replace(/^https?:\/\//,'');
  const slug=slugify(c.slug||c.title||'');
  const m=st.view==='m';
  r('prev').classList.toggle('m',m);
  r('pu').textContent=base.replace(/\//g,' › ')+(slug?' › '+slug:'');
  const tl=60, dl=m?120:160;
  r('pt').textContent=title.length>tl?title.slice(0,tl-1)+'…':title;
  r('pd').textContent=desc.length>dl?desc.slice(0,dl-1)+'…':(desc||'Nessuna descrizione.');
  const tn=(v.seo_title||'').length, dn=desc===v.seo_description?desc.length:(v.seo_description||'').length;
  const bar=(el,len,lo,hi)=>{el.style.width=Math.min(100,len/hi*100)+'%';el.className=len===0?'bad':(len<lo||len>hi)?'warn':'ok';};
  bar(r('tb'),tn||title.length,30,60);bar(r('db'),dn,120,160);
  r('tc').textContent=(tn?tn:title.length+' (automatico)')+' / 60 caratteri';
  r('dc').textContent=dn+' / 160 caratteri';
  const res=analyse(v,c);
  const grp=(l,h)=>{const a=res.filter(x=>x.l===l);return a.length?'<h4>'+h+' ('+a.length+')</h4><ul>'+a.map(x=>'<li class="'+l+'">'+esc(x.t)+'</li>').join('')+'</ul>':'';};
  r('an').innerHTML=grp('bad','Problemi')+grp('warn','Miglioramenti')+grp('ok','Ottimo');
  const nb=res.filter(x=>x.l==='bad').length,nw=res.filter(x=>x.l==='warn').length;
  r('dot').className='sp-dot '+(nb?'bad':nw?'warn':'ok');
  r('sum').textContent=nb?nb+' problemi':nw?nw+' da migliorare':'tutto ok';
}

// ---------- API pubblica ----------
function get(id){return vals(id);}
function set(id,o){
  const st=P[id];if(!st)return;o=o||{};
  st.el.querySelectorAll('[data-k]').forEach(i=>{const x=o[i.dataset.k];if(i.type==='checkbox')i.checked=(x===true||x==='true');else i.value=x==null?'':x;});
  refresh(id);
}
// legge i campi SEO da un front matter (testo con o senza ---)
function read(fm){
  const o={};fm=String(fm||'');
  KEYS.forEach(k=>{const m=fm.match(new RegExp('^'+k+':\\s*(.*)$','m'));if(!m)return;
    let s=m[1].trim();if(k==='noindex'){o[k]=/^true$/i.test(s);return;}
    s=s.replace(/^"([\s\S]*)"$/,'$1').replace(/^'([\s\S]*)'$/,'$1');o[k]=unq(s);});
  return o;
}
// righe front matter da scrivere (vuote = omesse)
function lines(id){
  const v=vals(id);let s='';
  ['seo_title','seo_description','seo_kw','canonical','seo_image'].forEach(k=>{if(v[k])s+=k+': '+q(v[k])+'\n';});
  if(v.noindex)s+='noindex: true\n';
  return s;
}
// toglie i campi SEO vecchi da un front matter completo (---...---) e aggiunge quelli del pannello in fondo
function patch(fm,id){
  let t=String(fm||'');
  KEYS.forEach(k=>{t=t.replace(new RegExp('^'+k+':.*\\n?','gm'),'');});
  return t.replace(/\n?---\s*$/,'\n'+lines(id)+'---');
}
function mount(id,ctx){const st=build(id);if(!st)return;st.ctx=ctx;
  // ricalcola quando l'utente scrive titolo/testo nel resto dell'editor
  let t;document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('.sp'))return;clearTimeout(t);t=setTimeout(()=>refresh(id),400);});
  refresh(id);}

window.SeoPanel={get,set,read,lines,patch,refresh,mount,q};

function init(){
  const g=i=>{const e=document.getElementById(i);return e?e.value:'';};
  mount('seo-art',()=>({title:g('titolo'),slug:g('titolo'),image:g('teaser'),body:(typeof getCorpo==='function'?(()=>{try{return getCorpo();}catch(e){return '';}})():'')}));
  mount('seo-pag',()=>({title:g('pag-titolo'),slug:(window._paginaSlug&&window._paginaSlug!=='home'?window._paginaSlug:g('pag-permalink').replace(/\//g,'')||g('pag-titolo')),
    body:(()=>{try{return (typeof _pagBlocchi!=='undefined'?_pagBlocchi:[]).map(b=>(b&&b.html)||'').join('\n');}catch(e){return '';}})()}));
  mount('seo-prod',()=>({title:g('prod-titolo'),slug:g('prod-titolo'),image:g('prod-immagine'),body:g('prod-description')+'\n\n'+g('prod-corpo')}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
