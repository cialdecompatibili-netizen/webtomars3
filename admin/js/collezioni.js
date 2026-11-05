// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: pannelli Servizi e Progetti. La configurazione sta nell'oggetto C (cartella, nome, campo di ordinamento). Una nuova collection = nuova voce in C + `collections:` in _config.yml + un layout/lista (ex-lista.html).
// Pannelli Servizi e Progetti (collection _servizi / _progetti). Stessa logica di Prodotti, ma generica.
// Usa le funzioni globali di index.html: tok, ghGet, ghPut, dec, showMsg, startDeployPolling, REPO.
(function(){
const C={
  servizi:{dir:'_servizi',nome:'Servizio',plur:'Servizi',icon:'🛠',ord:'ordine',ordLabel:'Ordine (1 = primo)'},
  progetti:{dir:'_progetti',nome:'Progetto',plur:'Progetti',icon:'🏗',ord:'importance',ordLabel:'Importanza (1 = primo)'}
};
const st={servizi:{path:null},progetti:{path:null}};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
const slug=t=>t.toLowerCase().replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');

function build(k){
  const c=C[k];
  return `<div class="page" id="page-${k}">
  <div class="page-title">${c.icon} ${c.plur}</div>
  <div id="c-${k}-lista-view">
    <div style="margin-bottom:16px"><button class="btn btn-primary" onclick="collNuovo('${k}')">✚ Nuovo ${c.nome.toLowerCase()}</button></div>
    <div class="card"><div class="card-title" style="display:flex;justify-content:space-between">${c.plur} pubblicati <button class="btn btn-secondary btn-sm" onclick="collCarica('${k}')">↻ Aggiorna</button></div>
    <div id="c-${k}-lista"><em style="color:#bbb;font-size:13px">Caricamento...</em></div></div>
  </div>
  <div id="c-${k}-editor-view" style="display:none">
    <div style="margin-bottom:16px"><button class="btn btn-secondary" onclick="collTorna('${k}')">← Torna a ${c.plur.toLowerCase()}</button></div>
    <div class="card"><div class="card-title" id="c-${k}-titolo-ed">Nuovo ${c.nome.toLowerCase()}</div>
      <div class="field"><label>Titolo *</label><input type="text" id="c-${k}-title"></div>
      <div class="grid2">
        <div class="field"><label>${c.ordLabel}</label><input type="number" id="c-${k}-ord" placeholder="1"></div>
        <div class="field"><label>Mostra in home</label><select id="c-${k}-home"><option value="true">Sì</option><option value="false">No</option></select></div>
      </div>
      <div class="field"><label>Descrizione breve <span class="hint" style="display:inline">mostrata nella card in home</span></label><input type="text" id="c-${k}-desc"></div>
      <div class="field"><label>Titolo SEO <span class="hint" style="display:inline">titolo per Google, max 60 caratteri</span></label><input type="text" id="c-${k}-seot"></div>
      <div class="field"><label>Descrizione SEO <span class="hint" style="display:inline">testo sotto il titolo su Google, max 155 caratteri</span></label><input type="text" id="c-${k}-seod"></div>
      <div class="field"><label>Domande frequenti <span class="hint" style="display:inline">una per riga, nel formato: Domanda | Risposta</span></label><textarea class="sm" id="c-${k}-faq" style="min-height:140px"></textarea></div>
      <div class="field"><label>Testo completo (Markdown)</label><textarea class="sm" id="c-${k}-corpo" style="min-height:260px"></textarea></div>
      <div class="btn-group"><button class="btn btn-primary" onclick="collSalva('${k}')">💾 Salva ${c.nome.toLowerCase()}</button></div>
      <div class="msg" id="c-${k}-msg"></div>
    </div>
  </div>
</div>`;
}

function init(){
  const main=document.querySelector('main.main'); if(!main)return;
  const shop=[...document.querySelectorAll('.nav-label')].find(e=>e.textContent.trim()==='Impostazioni');
  let nav='<div class="nav-label">Servizi e lavori svolti</div>';
  for(const k in C){
    main.insertAdjacentHTML('beforeend',build(k));
    nav+=`<button class="nav-item" onclick="collShow('${k}',this)"><span class="icon">${C[k].icon}</span>${C[k].plur}</button>`;
  }
  if(shop)shop.insertAdjacentHTML('beforebegin',nav);
}

window.collShow=function(k,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  $('page-'+k).classList.add('active'); btn.classList.add('active');
  collTorna(k);
};
window.collCarica=async function(k){
  const el=$(`c-${k}-lista`), vuoto=`<em style="color:#646970;font-size:13px">Nessun ${C[k].nome.toLowerCase()} ancora.</em>`;
  if(!tok()){el.innerHTML='<em style="color:#646970;font-size:13px">Token mancante.</em>';return;}
  let res; try{res=await ghGet(C[k].dir);}catch(e){el.innerHTML='<em style="color:#646970;font-size:13px">Errore di rete.</em>';return;}
  if(!res.ok){el.innerHTML=vuoto;return;}
  const files=(await res.json()).filter(f=>f.name.endsWith('.md'));
  if(!files.length){el.innerHTML=vuoto;return;}
  el.innerHTML='<em style="color:#646970;font-size:13px">Caricamento...</em>';
  const base=location.origin+location.pathname.replace(/\/admin\/?.*$/,'/');
  const rows=await Promise.all(files.map(async f=>{
    const nome=f.name.replace('.md','');
    try{
      const r=await ghGet(f.path), d=await r.json(), raw=dec(d.content).replace(/\r\n/g,'\n');
      const fm=(raw.match(/^---\n([\s\S]+?)\n---/)||[])[1]||'';
      const g=n=>{const x=fm.match(new RegExp('^'+n+':[ \\t]*"?(.*?)"?[ \\t]*$','m'));return x?x[1].replace(/\\"/g,'"'):'';};
      return {f,nome,title:g('title')||nome,foto:g('foto'),ord:parseInt(g(C[k].ord))||99,home:g('in_home')!=='false'};
    }catch(e){return {f,nome,title:nome,foto:'',ord:99,home:true};}
  }));
  rows.sort((a,b)=>a.ord-b.ord||a.title.localeCompare(b.title));
  const h=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const L=window.FOTOLIB;
  el.innerHTML=`<input type="search" class="wp-search" placeholder="Cerca ${C[k].plur.toLowerCase()}" oninput="collFiltra(this)">
  <table class="wp-list"><thead><tr><th class="wp-th"></th><th>Titolo</th><th>${k==='servizi'?'Ordine':'Importanza'}</th><th>In home</th></tr></thead><tbody>`+
  rows.map(x=>`<tr data-q="${h((x.title+' '+x.nome).toLowerCase())}"><td class="wp-th"><div>${x.foto&&L?`<img loading="lazy" alt="" src="${L.url(x.foto)}">`:''}</div></td>
    <td><a class="wp-t" onclick="collModifica('${k}','${x.f.path}')">${h(x.title)}</a>
    <div class="wp-ra"><a onclick="collModifica('${k}','${x.f.path}')">Modifica</a> | <a class="del" onclick="collElimina('${k}','${x.f.path}','${x.f.sha}')">Elimina</a> | <a href="${base}${k}/${x.nome}/" target="_blank" rel="noopener">Visualizza</a></div></td>
    <td class="wp-n">${x.ord===99?'–':x.ord}</td><td class="wp-n">${x.home?'Sì':'No'}</td></tr>`).join('')+
  `</tbody></table><div class="hint" style="margin-top:8px">${rows.length} ${rows.length===1?C[k].nome.toLowerCase():C[k].plur.toLowerCase()}</div>`;
};
window.collFiltra=function(inp){
  const t=inp.value.toLowerCase().trim();
  inp.parentNode.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=!t||tr.dataset.q.includes(t)?'':'none';});
};

window.collTorna=function(k){
  $(`c-${k}-editor-view`).style.display='none'; $(`c-${k}-lista-view`).style.display='block'; collCarica(k);
};
function vista(k,titolo){
  $(`c-${k}-titolo-ed`).textContent=titolo;
  $(`c-${k}-lista-view`).style.display='none'; $(`c-${k}-editor-view`).style.display='block';
  showMsg(`c-${k}-msg`,'',''); window.scrollTo({top:0,behavior:'smooth'});
}
window.collNuovo=function(k){
  ['title','ord','desc','seot','seod','faq','corpo'].forEach(f=>$(`c-${k}-${f}`).value=''); $(`c-${k}-home`).value='true'; ['fkw','foto','chips'].forEach(x=>{if($(`c-${k}-${x}`))$(`c-${k}-${x}`).value='';});
  st[k].path=null; vista(k,'Nuovo '+C[k].nome.toLowerCase());
};
window.collModifica=async function(k,path){
  const res=await ghGet(path); if(!res.ok)return;
  const raw=dec((await res.json()).content).replace(/\r\n/g,'\n');
  const fm=raw.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/); if(!fm)return;
  const m={}; fm[1].split('\n').forEach(l=>{const x=l.match(/^(\w+):\s*"?(.*?)"?\s*$/); if(x)m[x[1]]=x[2].replace(/\\"/g,'"');});
  $(`c-${k}-title`).value=m.title||''; $(`c-${k}-ord`).value=m[C[k].ord]||'';
  $(`c-${k}-home`).value=m.in_home==='false'?'false':'true';
  $(`c-${k}-desc`).value=m.description||m.excerpt||''; $(`c-${k}-corpo`).value=fm[2].trim();
  $(`c-${k}-seot`).value=m.seo_title||''; $(`c-${k}-seod`).value=m.seo_description||''; if($(`c-${k}-fkw`))$(`c-${k}-fkw`).value=m.focus_keyword||''; if($(`c-${k}-foto`))$(`c-${k}-foto`).value=m.foto||''; if($(`c-${k}-chips`)){let ch=[];try{ch=JSON.parse(m.chips||'[]');}catch(x){} $(`c-${k}-chips`).value=ch.join(', ');}
  {const fq=[],re=/^[ \t]+-[ \t]+q:[ \t]*"(.*)"[ \t]*\n[ \t]+a:[ \t]*"(.*)"[ \t]*$/gm;let z;while((z=re.exec(fm[1]))){fq.push(z[1].replace(/\\"/g,'"')+' | '+z[2].replace(/\\"/g,'"'));} $(`c-${k}-faq`).value=fq.join('\n');}
  st[k].path=path; vista(k,'Modifica '+C[k].nome.toLowerCase());
};
window.collSalva=async function(k){
  const c=C[k],msg=`c-${k}-msg`;
  if(!tok())return showMsg(msg,'⚠️ Token mancante.','err');
  const titolo=$(`c-${k}-title`).value.trim(); if(!titolo)return showMsg(msg,'⚠️ Titolo obbligatorio.','err');
  const ord=$(`c-${k}-ord`).value.trim()||'99', home=$(`c-${k}-home`).value, desc=$(`c-${k}-desc`).value.trim(), corpo=$(`c-${k}-corpo`).value.trim();
  const seot=$(`c-${k}-seot`).value.trim(), seod=$(`c-${k}-seod`).value.trim(), faqT=$(`c-${k}-faq`).value, fkw=($(`c-${k}-fkw`)?$(`c-${k}-fkw`).value.trim():''), foto=($(`c-${k}-foto`)?$(`c-${k}-foto`).value.trim():''), chips=($(`c-${k}-chips`)?$(`c-${k}-chips`).value.split(',').map(s=>s.trim()).filter(Boolean):[]);
  const path=st[k].path||`${c.dir}/${slug(titolo)}.md`;
  let sha,extra=[];
  if(st[k].path){ // modifica: tengo gli altri campi del frontmatter (date, categories, ecc.)
    const r=await ghGet(path); if(r.ok){const d=await r.json(); sha=d.sha;
      const fm=dec(d.content).replace(/\r\n/g,'\n').match(/^---\n([\s\S]+?)\n---/);
      if(fm){let inFaq=false;extra=fm[1].split('\n').filter(l=>{if(/^faq:/.test(l)){inFaq=true;return false;} if(inFaq&&/^\s/.test(l))return false; inFaq=false; return !/^(title|description|seo_title|seo_description|focus_keyword|foto|chips|ordine|importance|in_home|layout):/.test(l);});}}
  }
  if(!st[k].path&&k==='servizi')extra=['categories:','  - servizi'];
  const faqL=faqT.split('\n').map(s=>s.trim()).filter(s=>s.includes('|')).map(s=>{const i=s.indexOf('|');return `  - q: "${esc(s.slice(0,i).trim())}"\n    a: "${esc(s.slice(i+1).trim())}"`;});
  const md=['---','layout: single',`title: "${esc(titolo)}"`,`description: "${esc(desc)}"`,...(seot?[`seo_title: "${esc(seot)}"`]:[]),...(seod?[`seo_description: "${esc(seod)}"`]:[]),...(fkw?[`focus_keyword: "${esc(fkw)}"`]:[]),...(foto?[`foto: "${esc(foto)}"`]:[]),...(chips.length?[`chips: [${chips.map(x=>`"${esc(x)}"`).join(', ')}]`]:[]),`${c.ord}: ${ord}`,`in_home: ${home}`,...(faqL.length?['faq:',...faqL]:[]),...extra,'---',corpo,''].join('\n');
  showMsg(msg,'⏳ Salvataggio...','');
  const res=await ghPut(path,`${c.nome}: ${titolo}`,md,sha);
  if(res.ok){showMsg(msg,`✅ ${c.nome} salvato!`,'ok');startDeployPolling();st[k].path=path;}
  else{const j=await res.json();showMsg(msg,'❌ '+j.message,'err');}
};
window.collElimina=async function(k,path,sha){
  if(!confirm('Eliminare?')||!tok())return;
  const res=await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`,{method:'DELETE',headers:{'Authorization':`token ${tok()}`,'Content-Type':'application/json'},body:JSON.stringify({message:`Elimina ${path}`,sha})});
  if(res.ok){startDeployPolling();collCarica(k);}
};
init();
})();
