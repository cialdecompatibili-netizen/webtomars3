// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: elenchi Articoli/Pagine/Categorie e libreria media (window.FOTOLIB, definita in foto.js). Con una lingua di lavoro diversa dalla base i path sono rimappati da lingua-admin.js (fetch intercettato): NON scrivere qui path per lingua.

// Articoli, Pagine e Categorie in stile WordPress: elenchi a tabella con miniatura, ricerca, paginazione e azioni rapide.
// Libreria media per foto in evidenza e foto nel testo. Usa le funzioni globali di index.html e window.openMediaLib / window.FOTOLIB.
(function(){
const $=id=>document.getElementById(id);
const h=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BASE=location.origin+location.pathname.replace(/\/admin\/?.*$/,'/');
const st=document.createElement('style');
st.textContent='.wp-pag{display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:10px;font-size:13px;color:#646970}.wp-pag .hint{margin:0 auto 0 0}.wp-ce{min-height:34px;border:1px solid #8c8f94;border-radius:4px;padding:6px 8px;font-size:13px;line-height:1.5;background:#fff;outline:none}.wp-ce:focus{border-color:#2271b1;box-shadow:0 0 0 1px #2271b1}.wp-list td input[type=text]{width:100%}.wp-ud button{padding:0 6px;min-height:20px;line-height:1.4;font-size:11px}.wp-tp{display:flex;align-items:center;gap:10px;margin-top:8px}.wp-tp div{width:96px;height:64px;background:#f0f0f1;border:1px solid #c3c4c7;overflow:hidden;display:flex;align-items:center;justify-content:center;color:#a7aaad;font-size:11px}.wp-tp img{width:100%;height:100%;object-fit:cover;display:block}#vis-editor img{max-width:100%;height:auto}';
document.head.appendChild(st);

function thumb(u){if(!u||/\{\{|\{%/.test(u))return '';return /^(https?:)?\/\//.test(u)?u:BASE+u.replace(/^\//,'');}
function fmOf(raw){const m=raw.replace(/\r\n/g,'\n').match(/^---\n([\s\S]*?)\n---/);return m?m[1]:'';}
function gv(f,k){const x=f.match(new RegExp('^'+k+':[ \\t]*"?(.*?)"?[ \\t]*$','m'));return x?x[1].replace(/\\"/g,'"'):'';}

// Le miniature/metadati si leggono a gruppi di 6 richieste alla volta (con 200-500 voci per pagina non si sparano tutte insieme: limite API GitHub).
async function metaQueue(arr,fn){const q=arr.slice();await Promise.all(Array.from({length:Math.min(6,q.length)},async()=>{while(q.length){await fn(q.shift());}}));}

// Elenco generico: ricerca, paginazione (voci per pagina = Impostazioni > Elementi per pagina), miniature caricate a pagina.
function lista(c){
  const S={files:c.files,q:'',pg:0,meta:{}}, el=$(c.el);
  el.innerHTML='<input type="search" class="wp-search" placeholder="'+h(c.ph)+'"><div class="wp-tab"></div><div class="wp-pag"></div>';
  const inp=el.querySelector('input'), tab=el.querySelector('.wp-tab'), pag=el.querySelector('.wp-pag'), PP=(window.getPerPage?getPerPage():(c.pp||20));
  function filt(){const t=S.q.toLowerCase().trim();return S.files.filter(f=>!t||(f.name+' '+((S.meta[f.path]||{}).title||'')).toLowerCase().includes(t));}
  function draw(){
    const L=filt(), np=Math.max(1,Math.ceil(L.length/PP)); if(S.pg>=np)S.pg=np-1;
    const P=L.slice(S.pg*PP,S.pg*PP+PP);
    tab.innerHTML='<table class="wp-list"><thead><tr>'+c.heads.map(x=>'<th'+(x===''?' class="wp-th"':'')+'>'+x+'</th>').join('')+'</tr></thead><tbody>'+(S.q?'':(c.pre||''))+P.map(f=>'<tr data-p="'+h(f.path)+'">'+c.row(f,S.meta[f.path]||null)+'</tr>').join('')+(!P.length&&S.q?'<tr><td colspan="'+c.heads.length+'">Nessun risultato.</td></tr>':'')+'</tbody></table>';
    pag.innerHTML='<span class="hint">'+L.length+(L.length===1?' elemento':' elementi')+'</span>'+(np>1?'<button class="btn btn-secondary btn-sm" '+(S.pg?'':'disabled')+' data-d="-1">‹</button><span>Pagina '+(S.pg+1)+' di '+np+'</span><button class="btn btn-secondary btn-sm" '+(S.pg<np-1?'':'disabled')+' data-d="1">›</button>':'');
    pag.querySelectorAll('button').forEach(b=>b.onclick=()=>{S.pg+=+b.dataset.d;draw();});
    metaQueue(P.filter(f=>!S.meta[f.path]),async f=>{
      let m={};
      try{const r=await ghGet(f.path);if(r.ok){m=c.meta(dec((await r.json()).content));}}catch(e){}
      S.meta[f.path]=m;
      const tr=[...tab.querySelectorAll('tbody tr')].find(x=>x.dataset.p===f.path); if(tr)tr.innerHTML=c.row(f,m);
    });
  }
  inp.oninput=()=>{S.q=inp.value;S.pg=0;draw();};
  draw();
}

// ---------- ARTICOLI ----------
window.caricaLista=async function(){
  if(!tok())return; const el=$('lista-articoli'); if(!el)return;
  if(!el.querySelector('table'))el.innerHTML='<em style="color:#646970;font-size:13px">Caricamento...</em>';
  let res; try{res=await ghGet('_posts');}catch(e){el.innerHTML='<em style="color:#646970;font-size:13px">Errore di rete.</em>';return;}
  if(!res.ok){el.innerHTML='<em style="color:#646970;font-size:13px">Nessun articolo ancora.</em>';return;}
  const files=(await res.json()).filter(f=>/\.(md|html)$/.test(f.name)).sort((a,b)=>b.name.localeCompare(a.name));
  if(!files.length){el.innerHTML='<em style="color:#646970;font-size:13px">Nessun articolo ancora.</em>';return;}
  lista({el:'lista-articoli',files,ph:'Cerca articoli',heads:['','Titolo','Categoria','Data'],
    meta:raw=>{const f=fmOf(raw),t=f.match(/^[ \t]+teaser:[ \t]*"?(.*?)"?[ \t]*$/m),c=f.match(/^categories:[ \t]*\n[ \t]+-[ \t]*(.+)$/m);return {title:gv(f,'title'),teaser:t?t[1]:'',cat:c?c[1].trim():''};},
    row:(f,m)=>{
      const nome=f.name.replace(/\.(md|html)$/,''), title=(m&&m.title)||nome.slice(11).replace(/-/g,' '), th=m?thumb(m.teaser):'', p=h(f.path);
      return '<td class="wp-th"><div>'+(th?'<img loading="lazy" alt="" src="'+h(th)+'">':'')+'</div></td>'
       +'<td><a class="wp-t" onclick="modificaArticolo(\''+p+'\')">'+h(title)+'</a><div class="wp-ra"><a onclick="modificaArticolo(\''+p+'\')">Modifica</a> | <a class="del" onclick="eliminaArticolo(\''+p+'\',\''+f.sha+'\',\''+h(f.name)+'\')">Elimina</a></div></td>'
       +'<td class="wp-n">'+h(m?m.cat:'')+'</td><td class="wp-n">'+h(f.name.slice(0,10))+'</td>';}
  });
};

// ---------- PAGINE ----------
window.caricaPagine=async function(){
  if(!tok())return; const el=$('lista-pagine'); if(!el)return;
  let res; try{res=await ghGet('_pages');}catch(e){return;} if(!res.ok)return;
  const sys=typeof PAGINE_SISTEMA!=='undefined'?PAGINE_SISTEMA:[];
  const files=(await res.json()).filter(f=>f.type==='file'&&/\.(md|html)$/.test(f.name)&&!sys.includes(f.name)&&f.name!=='index.html').sort((a,b)=>a.name.localeCompare(b.name));
  lista({el:'lista-pagine',files,ph:'Cerca pagine',heads:['Titolo','Indirizzo'],pp:30,
    pre:'<tr><td><a class="wp-t" onclick="modificaPaginaBox(\'home\',null)">Home</a> <span class="wp-n">— pagina principale</span><div class="wp-ra"><a onclick="modificaPaginaBox(\'home\',null)">Modifica</a> | <a href="'+BASE+'" target="_blank" rel="noopener">Visualizza</a></div></td><td class="wp-n">/</td></tr>',
    meta:raw=>{const f=fmOf(raw);return {title:gv(f,'title'),perm:gv(f,'permalink')};},
    row:(f,m)=>{
      const slug=f.name.replace(/\.(md|html)$/,''), title=(m&&m.title)||slug, perm=(m&&m.perm)||'/'+slug+'/', p=h(f.path);
      return '<td><a class="wp-t" onclick="modificaPaginaBox(\''+h(slug)+'\',\''+p+'\')">'+h(title)+'</a><div class="wp-ra"><a onclick="modificaPaginaBox(\''+h(slug)+'\',\''+p+'\')">Modifica</a> | <a class="del" onclick="eliminaPagina(\''+p+'\',\''+f.sha+'\',\''+h(f.name)+'\')">Elimina</a> | <a href="'+h(BASE+perm.replace(/^\//,''))+'" target="_blank" rel="noopener">Visualizza</a></div></td><td class="wp-n">'+h(perm)+'</td>';}
  });
};

// ---------- CATEGORIE ----------
window.renderCategorie=function(){
  const el=$('lista-categorie'); if(!el||typeof _categorie==='undefined')return;
  el.innerHTML='<table class="wp-list"><thead><tr><th style="width:60px">Ordine</th><th style="width:30%">Nome</th><th>Descrizione</th><th style="width:80px"></th></tr></thead><tbody>'
   +_categorie.map((c,i)=>'<tr><td class="wp-ud"><button class="btn btn-secondary" onclick="catSu('+i+')" '+(i===0?'disabled':'')+'>▲</button> <button class="btn btn-secondary" onclick="catGiu('+i+')" '+(i===_categorie.length-1?'disabled':'')+'>▼</button></td>'
     +'<td><input type="text" value="'+h(c.nome)+'" onchange="_categorie['+i+'].nome=this.value;renderSelect()" style="font-weight:600"></td>'
     +'<td><div class="wp-ce" contenteditable="true" data-i="'+i+'" onblur="_categorie[this.dataset.i].descrizione=this.innerHTML">'+(c.descrizione||'')+'</div></td>'
     +'<td class="wp-ra" style="visibility:visible"><a class="del" onclick="if(confirm(\'Eliminare la categoria?\')){_categorie.splice('+i+',1);renderCategorie();renderSelect();}">Elimina</a></td></tr>').join('')
   +'</tbody></table><div class="hint" style="margin-top:8px">'+_categorie.length+(_categorie.length===1?' categoria':' categorie')+'. Ricorda di premere «Salva categorie».</div>';
};

// ---------- FOTO NEGLI ARTICOLI ----------
function prevT(){
  const i=$('teaser'); if(!i)return; let b=$('wp-tp'); if(!b)return;
  const u=thumb(i.value.trim());
  b.querySelector('div').innerHTML=u?'<img alt="" src="'+h(u)+'">':'Nessuna foto';
  b.querySelector('.wp-rm').style.display=u?'':'none';
}
function imgHtml(it,alt){return '<img src="'+h(window.FOTOLIB.url(it.f))+'" alt="'+h(alt||it.cap||'')+'" style="max-width:100%;height:auto">';}
function initArt(){
  const t=$('teaser'); if(!t||!window.openMediaLib||!window.FOTOLIB)return;
  const btn=t.parentNode.querySelector('button');
  if(btn){btn.textContent='Scegli foto';btn.title='Libreria foto';btn.removeAttribute('onclick');btn.onclick=()=>window.openMediaLib({mode:'pick',onSelect:it=>{t.value=window.FOTOLIB.url(it.f);prevT();}});}
  const box=document.createElement('div'); box.className='wp-tp'; box.id='wp-tp';
  box.innerHTML='<div>Nessuna foto</div><button type="button" class="btn btn-secondary btn-sm wp-rm">Rimuovi</button>';
  t.parentNode.parentNode.appendChild(box);
  box.querySelector('.wp-rm').onclick=()=>{t.value='';prevT();};
  t.addEventListener('input',prevT); prevT();
  const ma=window.modificaArticolo; window.modificaArticolo=async function(p){await ma(p);prevT();};
  const an=window.apriNuovoArticolo; window.apriNuovoArticolo=function(){an();prevT();};
  // barra dell'editor visuale: aggiungi foto, incolla e trascina
  const ed=$('vis-editor'), tb=document.querySelector('#quill-box .vis-toolbar');
  if(ed&&tb){
    const b=document.createElement('button'); b.type='button'; b.textContent='Foto'; b.title='Aggiungi foto dalla libreria'; b.style.minWidth='auto';
    b.onmousedown=e=>e.preventDefault();
    b.onclick=()=>{const s=getSelection(), rg=s.rangeCount&&ed.contains(s.getRangeAt(0).commonAncestorContainer)?s.getRangeAt(0).cloneRange():null;
      window.openMediaLib({mode:'insert',onSelect:(it,alt)=>{ed.focus(); if(rg){s.removeAllRanges();s.addRange(rg);} document.execCommand('insertHTML',false,imgHtml(it,alt));}});};
    tb.appendChild(b);
    const up=async files=>{for(const f of files){try{showMsg('msg-art','Carico la foto...','ok');const it=await window.FOTOLIB.carica(f);ed.focus();document.execCommand('insertHTML',false,imgHtml(it));showMsg('msg-art','Foto inserita. Sarà online dopo la pubblicazione.','ok');}catch(err){showMsg('msg-art','Errore: '+err.message,'err');}}};
    const imgs=l=>[...(l||[])].filter(x=>/^image\//.test(x.type));
    ed.addEventListener('paste',e=>{const f=imgs(e.clipboardData&&e.clipboardData.files);if(!f.length)return;e.preventDefault();up(f);});
    ed.addEventListener('drop',e=>{const f=imgs(e.dataTransfer&&e.dataTransfer.files);if(!f.length)return;e.preventDefault();up(f);});
  }
}
initArt();
})();
