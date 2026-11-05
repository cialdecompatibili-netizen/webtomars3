// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: dashboard in SOLA LETTURA (nessun commit): stato deploy, attivita', salute SEO di _servizi/_progetti. Espone window.dashShow / dashGo.
// Dashboard (prima voce del menu): riepilogo del sito, stato del deploy, attivita' e salute SEO dei servizi.
// Usa le funzioni globali di index.html: tok, ghGet, dec, REPO.
(function(){
const $=id=>document.getElementById(id);
const h=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const BASE=location.origin+location.pathname.replace(/\/admin\/?.*$/,'/');
const NASCOSTE=/^(404|cat-list|categoria|categories-redirect|category-archive|tag-archive|year-archive|test-|shop)/;
let ultimo=0,inCorso=false;

const css=`
.dsh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}
.dsh-w{background:#fff;border:1px solid var(--wp-line,#c3c4c7);box-shadow:0 1px 1px rgba(0,0,0,.04)}
.dsh-w h3{font-size:14px;font-weight:600;padding:10px 16px;border-bottom:1px solid #f0f0f1;margin:0}
.dsh-b{padding:14px 16px;font-size:13px;line-height:1.6}
.dsh-wide{grid-column:1/-1}
.dsh-glance{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px}
.dsh-glance a{color:#2271b1;cursor:pointer;text-decoration:none;font-size:13px}
.dsh-glance a:hover{color:#135e96}
.dsh-glance b{font-size:20px;font-weight:600;margin-right:4px;color:#1d2327}
.dsh-st{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600}
.dsh-d{width:11px;height:11px;border-radius:50%;background:#dcdcde;flex:none}
.dsh-d.ok{background:#00a32a}.dsh-d.run{background:#dba617}.dsh-d.ko{background:#d63638}
.dsh-m{color:#646970;font-size:12px;margin-top:4px}
.dsh-links{display:flex;gap:14px;margin-top:12px;flex-wrap:wrap}
.dsh-links a{color:#2271b1;cursor:pointer;text-decoration:none}.dsh-links a:hover{text-decoration:underline}
.dsh-q{display:flex;gap:8px;flex-wrap:wrap}
.dsh-act{list-style:none;margin:0;padding:0}
.dsh-act li{display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #f6f7f7}
.dsh-act li:last-child{border:none}
.dsh-act time{color:#646970;font-size:12px;white-space:nowrap;min-width:78px}
.dsh-bar{height:6px;background:#f0f0f1;border-radius:3px;overflow:hidden;margin:8px 0 14px}
.dsh-bar i{display:block;height:100%;background:#00a32a;transition:width .3s}
.dsh-seo{list-style:none;margin:0;padding:0}
.dsh-seo li{padding:8px 0;border-top:1px solid #f0f0f1;display:flex;gap:12px;align-items:baseline;justify-content:space-between}
.dsh-seo a{color:#2271b1;cursor:pointer;font-weight:600;text-decoration:none}.dsh-seo a:hover{text-decoration:underline}
.dsh-seo span{color:#646970;font-size:12px;text-align:right}
.dsh-v{color:#646970;font-size:13px}
@media (max-width:900px){.dsh-grid{grid-template-columns:1fr}.dsh-glance{grid-template-columns:repeat(2,1fr)}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function ago(iso){
  const s=(Date.now()-new Date(iso).getTime())/1000;
  if(s<90)return 'adesso'; if(s<3600)return Math.round(s/60)+' min fa'; if(s<86400)return Math.round(s/3600)+(Math.round(s/3600)===1?' ora fa':' ore fa');
  if(s<172800)return 'ieri'; if(s<2592000)return Math.round(s/86400)+' giorni fa';
  return new Date(iso).toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
}
function go(id){
  const b=[...document.querySelectorAll('.nav-item')].find(x=>{const o=x.getAttribute('onclick')||'';return o.includes("'"+id+"'")||(id==='foto'&&o.includes('fotoShow'));});
  if(b)b.click(); return b;
}
window.dashGo=go;
window.dashNuovo=function(k){ if(go(k)&&window.collNuovo)window.collNuovo(k); };
window.dashModifica=function(path){ if(go('servizi')&&window.collModifica)window.collModifica('servizi',path); };

function build(){return `<div class="page" id="page-dashboard">
  <div class="page-title">Dashboard</div>
  <div class="dsh-grid">
    <section class="dsh-w"><h3>Panoramica</h3><div class="dsh-b" id="dsh-glance"><span class="dsh-v">Caricamento…</span></div></section>
    <section class="dsh-w"><h3>Stato del sito</h3><div class="dsh-b" id="dsh-status"><span class="dsh-v">Caricamento…</span></div></section>
    <section class="dsh-w"><h3>Azioni rapide</h3><div class="dsh-b dsh-q">
      <button class="btn btn-primary" onclick="dashGo('articoli')">Scrivi un articolo</button>
      <button class="btn btn-secondary" onclick="dashNuovo('servizi')">Nuovo servizio</button>
      <button class="btn btn-secondary" onclick="dashNuovo('progetti')">Nuovo progetto</button>
      <button class="btn btn-secondary" onclick="dashGo('foto')">Carica foto</button></div></section>
    <section class="dsh-w"><h3>Attività recente</h3><div class="dsh-b" id="dsh-act"><span class="dsh-v">Caricamento…</span></div></section>
    <section class="dsh-w dsh-wide"><h3>Salute SEO dei servizi</h3><div class="dsh-b" id="dsh-seo"><span class="dsh-v">Caricamento…</span></div></section>
  </div></div>`;}

function init(){
  const main=document.querySelector('main.main'), side=document.querySelector('nav.sidebar'); if(!main||!side)return;
  main.insertAdjacentHTML('afterbegin',build());
  side.insertAdjacentHTML('afterbegin','<button class="nav-item" id="nav-dashboard" onclick="dashShow(this)"><span class="icon">🏠</span>Dashboard</button>');
}
window.dashShow=function(btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  $('page-dashboard').classList.add('active'); btn.classList.add('active'); carica();
};

async function lista(dir){ try{const r=await ghGet(dir); return r.ok?(await r.json()).filter(f=>f.type==='file'):[];}catch(e){return [];} }

async function carica(forza){
  if(inCorso||(!forza&&Date.now()-ultimo<45000))return; inCorso=true; ultimo=Date.now();
  if(!tok()){
    const m='<span class="dsh-v">Per vedere i dati inserisci il token GitHub nella sezione <a style="color:#2271b1;cursor:pointer" onclick="dashGo(\'token\')">Token</a>.</span>';
    ['glance','status','act','seo'].forEach(x=>$('dsh-'+x).innerHTML=m); inCorso=false; return;
  }
  try{
    const [posts,pages,servizi,progetti,foto]=await Promise.all([lista('_posts'),lista('_pages'),lista('_servizi'),lista('_progetti'),
      ghGet('_data/foto.yml').then(r=>r.ok?r.json():null).then(d=>d?(dec(d.content).match(/^- f:/gm)||[]).length:0).catch(()=>0)]);
    const nPag=pages.filter(f=>/\.(md|html)$/.test(f.name)&&!NASCOSTE.test(f.name)).length;
    const G=[['articoli',posts.filter(f=>/\.(md|html)$/.test(f.name)).length,'Articoli'],['pagine',nPag,'Pagine'],['servizi',servizi.filter(f=>f.name.endsWith('.md')).length,'Servizi'],['progetti',progetti.filter(f=>f.name.endsWith('.md')).length,'Progetti'],['foto',foto,'Foto']];
    $('dsh-glance').innerHTML='<div class="dsh-glance">'+G.map(x=>'<a onclick="dashGo(\''+x[0]+'\')"><b>'+x[1]+'</b>'+x[2]+'</a>').join('')+'</div>'
      +'<div class="dsh-m" style="margin-top:14px">'+h(location.hostname)+'</div>';
  }catch(e){$('dsh-glance').innerHTML='<span class="dsh-v">Non riesco a leggere i dati.</span>';}

  fetch('https://api.github.com/repos/'+REPO+'/actions/runs?branch=main&per_page=1',{headers:{Authorization:'token '+tok()}}).then(r=>r.json()).then(d=>{
    const r=(d.workflow_runs||[])[0]; let cl='',t='Nessun deploy trovato';
    if(r){ if(r.status!=='completed'){cl='run';t='Aggiornamento in corso…';} else if(r.conclusion==='success'){cl='ok';t='Il sito è online e aggiornato';} else {cl='ko';t='L’ultimo aggiornamento non è andato a buon fine';} }
    $('dsh-status').innerHTML='<div class="dsh-st"><i class="dsh-d '+cl+'"></i>'+t+'</div>'+(r?'<div class="dsh-m">Ultimo aggiornamento '+ago(r.updated_at)+'</div>':'')
      +'<div class="dsh-links"><a href="'+BASE+'" target="_blank" rel="noopener">Apri il sito</a>'+(r?'<a href="'+h(r.html_url)+'" target="_blank" rel="noopener">Dettagli del deploy</a>':'')+'<a onclick="dashRefresh()">Aggiorna</a></div>';
  }).catch(()=>{$('dsh-status').innerHTML='<span class="dsh-v">Stato non disponibile.</span>';});

  fetch('https://api.github.com/repos/'+REPO+'/commits?per_page=7',{headers:{Authorization:'token '+tok()}}).then(r=>r.json()).then(d=>{
    $('dsh-act').innerHTML=Array.isArray(d)&&d.length?'<ul class="dsh-act">'+d.map(c=>'<li><time>'+ago(c.commit.author.date)+'</time><span>'+h(c.commit.message.split('\n')[0].slice(0,90))+'</span></li>').join('')+'</ul>':'<span class="dsh-v">Nessuna attività.</span>';
  }).catch(()=>{$('dsh-act').innerHTML='<span class="dsh-v">Attività non disponibile.</span>';});

  try{ await seo(); }catch(e){$('dsh-seo').innerHTML='<span class="dsh-v">Non riesco a leggere i servizi.</span>';}
  inCorso=false;
}
window.dashRefresh=function(){carica(true);};

async function seo(){
  const files=(await lista('_servizi')).filter(f=>f.name.endsWith('.md'));
  if(!files.length){$('dsh-seo').innerHTML='<span class="dsh-v">Nessun servizio ancora.</span>';return;}
  const rows=await Promise.all(files.map(async f=>{
    try{
      const d=await (await ghGet(f.path)).json(), raw=dec(d.content).replace(/\r\n/g,'\n'), m=raw.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/); if(!m)return null;
      const g=n=>{const x=m[1].match(new RegExp('^'+n+':[ \\t]*"?(.*?)"?[ \\t]*$','m'));return x?x[1]:'';};
      const words=(m[2].replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g,' ').replace(/[#*_`>\[\]()!]/g,' ').match(/[A-Za-zÀ-ÿ0-9']+/g)||[]).length;
      const is=[]; if(!g('focus_keyword'))is.push('manca la parola chiave');
      const sd=g('seo_description'); if(!sd)is.push('manca la descrizione SEO'); else if(sd.length<120||sd.length>155)is.push('descrizione SEO di '+sd.length+' caratteri');
      const sT=g('seo_title'); if(!sT)is.push('manca il titolo SEO'); else if(sT.length>60)is.push('titolo SEO troppo lungo');
      if(words<300)is.push('testo di '+words+' parole');
      return {path:f.path,title:g('title')||f.name.replace('.md',''),is};
    }catch(e){return null;}
  }));
  const ok=rows.filter(Boolean), bad=ok.filter(x=>x.is.length).sort((a,b)=>b.is.length-a.is.length), good=ok.length-bad.length, pct=ok.length?Math.round(good/ok.length*100):0;
  $('dsh-seo').innerHTML='<div><b>'+good+' di '+ok.length+'</b> servizi senza problemi</div><div class="dsh-bar"><i style="width:'+pct+'%"></i></div>'
    +(bad.length?'<ul class="dsh-seo">'+bad.slice(0,8).map(x=>'<li><a onclick="dashModifica(\''+h(x.path)+'\')">'+h(x.title)+'</a><span>'+h(x.is.join(' · '))+'</span></li>').join('')+'</ul>'+(bad.length>8?'<div class="dsh-m">e altri '+(bad.length-8)+'</div>':''):'<div class="dsh-v">Tutto in ordine.</div>');
}

init();
window.addEventListener('load',()=>setTimeout(()=>{const b=$('nav-dashboard');if(b)window.dashShow(b);},60));
})();
