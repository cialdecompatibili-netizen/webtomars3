// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: date e front matter. `date` si scrive UNA volta (pubblicazione), `last_modified_at` a ogni salvataggio. Pagine e prodotti usano created_at, MAI date (seo.html la prenderebbe per un articolo). Auto.extra conserva i campi che l'editor non conosce. Espone window.Auto.
// AUTOMATICI DELL'ADMIN (lavorano in background, senza campi da compilare)
// 1) DATE: l'articolo conserva la data di pubblicazione (campo `date`, scritto una volta); ad ogni salvataggio
//    l'admin scrive `last_modified_at` (articoli, pagine, prodotti). Pagine e prodotti hanno anche `created_at`
//    (NON `date`: seo.html userebbe `date` per marcare la pagina come articolo).
// 2) FRONT MATTER CONSERVATO: salvando un articolo i campi che l'editor non conosce (ref, permalink, author...)
//    non si perdono piu' (Auto.extra). lang/locale/tr/tr_hash/sitemap li gestisce lingua-admin.js.
// 3) REDIRECT 301: cambiando permalink di una pagina o categoria di un articolo, il vecchio indirizzo viene
//    rimandato al nuovo da un file in redirect/ (layout _layouts/redirect.html: meta refresh + canonical, come
//    jekyll-redirect-from ma senza plugin). Sezione admin > Redirect per vederli/aggiungerli/toglierli.
// Dipende da index.html: REPO, tok, enc, dec, showMsg, startDeployPolling.
// NON TOCCARE: formato dei file redirect/*.html (permalink + redirect_to): li legge/scrive RD.list/RD.add.
(function(){
'use strict';
const API=()=>'https://api.github.com/repos/'+REPO+'/contents/';
const H=j=>{const h={'Authorization':'token '+tok()};if(j)h['Content-Type']='application/json';return h;};
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const nowIso=()=>new Date().toISOString().replace(/\.\d{3}Z$/,'Z');

// ---------- date e front matter ----------
// aggiunge last_modified_at (e created_at se manca e created=true) in fondo a un front matter completo ---...---
function stamp(fm,created){
  let t=String(fm||'').replace(/^last_modified_at:.*\n?/gm,'');
  let add='last_modified_at: '+nowIso()+'\n';
  if(created&&!/^created_at:/m.test(t))add='created_at: '+nowIso()+'\n'+add;
  return t.replace(/\n?---\s*$/,'\n'+add+'---');
}
// campi gestiti dall'editor articoli o da lingua-admin: tutti gli altri si conservano
const HANDLED=new Set(['layout','title','date','excerpt','header','categories','tags','seo_title','seo_description','seo_kw','noindex','canonical','seo_image','last_modified_at','lang','locale','tr','tr_hash','sitemap']);
function extra(fm){
  const keep=[];let skip=false;
  String(fm||'').split(/\r?\n/).forEach(l=>{
    const m=l.match(/^([A-Za-z_][\w-]*):/);
    if(m){skip=HANDLED.has(m[1]);if(!skip)keep.push(l);}
    else if(!skip&&keep.length&&(/^\s/.test(l)||/^-\s/.test(l)))keep.push(l);
  });
  return keep.length?keep.join('\n')+'\n':'';
}

// ---------- redirect ----------
const RDIR='redirect';
const norm=p=>{p=String(p||'').trim();if(!p)return '';if(/^https?:\/\//i.test(p))return p;if(p[0]!=='/')p='/'+p;if(!/\.[a-z0-9]+$/i.test(p)&&p.slice(-1)!=='/')p+='/';return p;};
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h).toString(36);};
const fname=from=>((from.replace(/^\/|\/$/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')||'home').toLowerCase());
const stub=(from,to)=>'---\nlayout: redirect\npermalink: "'+from+'"\nredirect_to: "'+to+'"\nsitemap: false\nnoindex: true\n---\n';
async function put(path,msg,content,sha){
  const b={message:msg,content:enc(content)};if(sha)b.sha=sha;
  return fetch(API()+path,{method:'PUT',headers:H(1),body:JSON.stringify(b)});
}
async function del(path,sha,msg){
  return fetch(API()+path,{method:'DELETE',headers:H(1),body:JSON.stringify({message:msg,sha})});
}
async function list(){
  const r=await fetch(API()+RDIR,{headers:H()});
  if(r.status===404)return [];
  if(!r.ok)throw new Error('GitHub '+r.status);
  const files=(await r.json()).filter(f=>f.type==='file'&&/\.html$/.test(f.name));
  const out=await Promise.all(files.map(async f=>{
    const x=await fetch(API()+f.path,{headers:H()});if(!x.ok)return null;
    const j=await x.json(),t=dec(j.content);
    const g=k=>{const m=t.match(new RegExp('^'+k+':\\s*"?([^"\\n]+?)"?\\s*$','m'));return m?m[1]:'';};
    return {path:f.path,sha:j.sha,from:g('permalink'),to:g('redirect_to')};
  }));
  return out.filter(x=>x&&x.from);
}
// add(from,to): il contenuto di `from` ora sta in `to`. Ritorna true/false. Mai lancia.
async function add(from,to){
  try{
    from=norm(from);to=norm(to);
    if(!from||!to||from===to||/^https?:/i.test(from))return false;
    const all=await list();
    // 1) il nuovo indirizzo e' di nuovo "vivo": toglie un eventuale vecchio redirect che parte da li' (evita cicli)
    for(const r of all.filter(r=>r.from===to)){await del(r.path,r.sha,'Redirect: rimosso '+r.from);}
    // 2) accorcia le catene: chi puntava a `from` ora punta a `to`
    for(const r of all.filter(r=>r.to===from&&r.from!==to)){
      const x=await put(r.path,'Redirect: '+r.from+' -> '+to,stub(r.from,to),r.sha);if(!x.ok)return false;
    }
    // 3) crea/aggiorna il redirect from -> to
    let name=fname(from),path=RDIR+'/'+name+'.html',sha;
    const ex=all.find(r=>r.from===from);
    if(ex){path=ex.path;sha=ex.sha;}
    else{ // stesso nome file ma permalink diverso: suffisso
      const g=await fetch(API()+path,{headers:H()});
      if(g.ok){const j=await g.json();if(!new RegExp('permalink:\\s*"?'+from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"?\\s*$','m').test(dec(j.content))){path=RDIR+'/'+name+'-'+hash(from)+'.html';}else sha=j.sha;}
    }
    const r=await put(path,'Redirect: '+from+' -> '+to,stub(from,to),sha);
    return r.ok;
  }catch(e){console.warn('RD.add',e);return false;}
}
// articolo che cambia categoria: URL = /categoria/slug/ (solo se _config.yml ha permalink /:categories/:title/)
async function articolo(path,co,cn){
  try{
    if(!/^_posts\//.test(path)||!co||!cn||co===cn)return;
    const r=await fetch(API()+'_config.yml',{headers:H()});if(!r.ok)return;
    const pm=dec((await r.json()).content).match(/^permalink:\s*(\S+)/m);
    if(!pm||pm[1].replace(/["']/g,'')!=='/:categories/:title/')return;
    const slug=path.replace(/^_posts\//,'').replace(/^\d{4}-\d{2}-\d{2}-/,'').replace(/\.(html|md|markdown)$/,'');
    const ok=await add('/'+co+'/'+slug+'/','/'+cn+'/'+slug+'/');
    if(!ok)showMsg('msg-art','\u26A0\uFE0F Salvato, ma il redirect dal vecchio indirizzo non e\' stato creato: aggiungilo in Redirect.','err');
  }catch(e){console.warn('Auto.articolo',e);}
}

// ---------- sezione admin > Redirect ----------
const RD={cache:[],add,list,
  async carica(){
    if(!tok())return;
    showMsg('msg-rd','\u23F3 Carico...','ok');
    try{RD.cache=await list();RD.cache.sort((a,b)=>a.from.localeCompare(b.from));showMsg('msg-rd','','');}
    catch(e){showMsg('msg-rd','\u274C '+e.message,'err');}
    RD.render();
  },
  render(){
    const el=document.getElementById('lista-rd');if(!el)return;
    el.innerHTML=RD.cache.length?RD.cache.map((r,i)=>'<div class="list-row"><span style="font-size:13px;word-break:break-all"><code>'+esc(r.from)+'</code> &rarr; <code>'+esc(r.to)+'</code></span><button class="btn btn-danger btn-sm" onclick="RD.togli('+i+')">Elimina</button></div>').join(''):'<span style="color:#bbb;font-size:13px">Nessun redirect.</span>';
  },
  async aggiungi(){
    const f=document.getElementById('rd-from'),t=document.getElementById('rd-to');
    if(!f.value.trim()||!t.value.trim())return showMsg('msg-rd','\u26A0\uFE0F Compila vecchio e nuovo indirizzo.','err');
    if(norm(f.value)===norm(t.value))return showMsg('msg-rd','\u26A0\uFE0F I due indirizzi sono uguali.','err');
    showMsg('msg-rd','\u23F3 Salvo...','ok');
    const ok=await add(f.value,t.value);
    if(!ok)return showMsg('msg-rd','\u274C Non riuscito (controlla token e indirizzi).','err');
    f.value='';t.value='';
    if(typeof startDeployPolling==='function')startDeployPolling();
    await RD.carica();showMsg('msg-rd','\u2705 Redirect creato.','ok');
  },
  async togli(i){
    const r=RD.cache[i];if(!r||!confirm('Eliminare il redirect '+r.from+' -> '+r.to+'?'))return;
    const x=await del(r.path,r.sha,'Elimina redirect '+r.from);
    if(!x.ok)return showMsg('msg-rd','\u274C Eliminazione non riuscita.','err');
    if(typeof startDeployPolling==='function')startDeployPolling();
    RD.carica();
  }
};
window.RD=RD;
window.Auto={nowIso,stamp,extra,normPath:norm,articolo};

function mountUi(){
  if(document.getElementById('page-redirect'))return;
  const lingue=document.getElementById('page-lingue'),nav=document.querySelector('.nav-item[onclick*="\'lingue\'"]');
  if(!lingue||!nav)return;
  const b=document.createElement('button');b.className='nav-item';
  b.setAttribute('onclick',"showPage('redirect',this);RD.carica()");
  b.innerHTML='<span class="icon">&#8618;</span>Redirect';
  nav.parentNode.insertBefore(b,nav.nextSibling);
  const p=document.createElement('div');p.className='page';p.id='page-redirect';
  p.innerHTML='<div class="card"><div class="card-title">&#8618; Redirect 301</div>'
   +'<p style="font-size:13px;color:#777;margin:0 0 14px">Quando cambi l\'indirizzo di una pagina o la categoria di un articolo, il vecchio link porta da solo al nuovo: Google e i link esterni non si rompono. Si creano in automatico; qui li vedi, ne aggiungi o li togli.</p>'
   +'<div class="grid2"><div class="field"><label>Vecchio indirizzo</label><input type="text" id="rd-from" placeholder="/vecchia-pagina/"></div>'
   +'<div class="field"><label>Nuovo indirizzo</label><input type="text" id="rd-to" placeholder="/nuova-pagina/"></div></div>'
   +'<div class="btn-group"><button class="btn btn-primary" onclick="RD.aggiungi()">Aggiungi redirect</button><button class="btn btn-secondary" onclick="RD.carica()">Aggiorna</button></div>'
   +'<div class="msg" id="msg-rd"></div><div id="lista-rd" style="margin-top:14px"></div></div>';
  lingue.parentNode.appendChild(p);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountUi);else mountUi();
})();
