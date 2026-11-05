// Pannello Foto (stile libreria media di WordPress).
// Carichi le foto, scegli il tipo di lavoro (o lo indovina dal nome), e compaiono da sole in Galleria e nei Servizi.
// Come funziona: la foto va in assets/foto/<nome>.jpg e una riga in _data/foto.yml (la usano ex-galleria e ex-lista).
// Usa le funzioni globali di index.html: tok, ghGet, dec, showMsg, startDeployPolling, REPO.
(function(){
const DIR='assets/foto', YML='_data/foto.yml', MAXW=1800;
// GUIDA-SVILUPPO: TEMI = tipi di foto tra cui scegliere in admin > Foto ([slug, etichetta]). 'team' e' il tema di RISERVA: le pagine che non hanno foto del loro tema mostrano queste.
// Per un nuovo sito aggiungi qui i tuoi temi (es. ['cucina','Cucina']): la galleria crea da sola i bottoni filtro dai temi presenti in _data/foto.yml.
// KW = parole nel NOME del file che fanno indovinare il tema in automatico (slug: 'parola1|parola2'), facoltativo.
const TEMI=[['team','Generale']];
const KW={};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
const attr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
const slug=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\.[a-z0-9]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const base=location.origin+location.pathname.replace(/\/admin\/?.*$/,'/');
let items=[], header='', queue=[];

function indovina(nome){const n=nome.toLowerCase();return TEMI.map(t=>t[0]).filter(k=>new RegExp(KW[k]).test(n));}
function chips(sel,prefix,i){return TEMI.map(([k,l])=>`<label style="display:inline-flex;align-items:center;gap:3px;margin:2px 8px 2px 0;font-size:12px"><input type="checkbox" ${sel.includes(k)?'checked':''} onchange="fotoTema('${prefix}',${i},'${k}',this.checked)">${l}</label>`).join('');}

function parse(txt){
  txt=txt.replace(/\r\n/g,'\n'); const i=txt.indexOf('- f:'); header=i>0?txt.slice(0,i):'';
  items=(i<0?'':txt.slice(i)).split(/\n(?=- f:)/).map(b=>{
    const g=r=>{const m=b.match(r);return m?m[1]:'';};
    return {f:g(/f:\s*"([^"]*)"/),cap:g(/cap:\s*"((?:[^"\\]|\\.)*)"/).replace(/\\"/g,'"'),t:g(/t:\s*\[([^\]]*)\]/).split(',').map(s=>s.trim()).filter(Boolean),w:+g(/w:\s*(\d+)/)||0,h:+g(/h:\s*(\d+)/)||0};
  }).filter(x=>x.f);
}
function serial(){
  return header+items.map(x=>`- f: "${x.f}"\n  cap: "${esc(x.cap)}"\n  t: [${x.t.join(', ')}]\n  team: ${x.t.includes('team')}\n  w: ${x.w}\n  h: ${x.h}`).join('\n')+'\n';
}
async function leggi(){
  const r=await ghGet(YML); if(!r.ok)return null; const d=await r.json(); parse(dec(d.content)); return d.sha;
}
async function scrivi(msg){ // rilegge sempre lo sha piu' recente, cosi' non si pesta nessuno
  const r=await ghGet(YML), d=r.ok?await r.json():null;
  const body={message:msg,content:btoa(unescape(encodeURIComponent(serial())))}; if(d)body.sha=d.sha;
  return fetch(`https://api.github.com/repos/${REPO}/contents/${YML}`,{method:'PUT',headers:{'Authorization':`token ${tok()}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
async function putRaw(path,msg,b64){
  let sha; const e=await ghGet(path); if(e.ok)sha=(await e.json()).sha;
  const body={message:msg,content:b64}; if(sha)body.sha=sha;
  return fetch(`https://api.github.com/repos/${REPO}/contents/${path}`,{method:'PUT',headers:{'Authorization':`token ${tok()}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
async function ridimensiona(file){
  const bmp=await createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>createImageBitmap(file));
  const k=Math.min(1,MAXW/bmp.width), w=Math.round(bmp.width*k), h=Math.round(bmp.height*k);
  const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(bmp,0,0,w,h);
  return {w,h,b64:c.toDataURL('image/jpeg',.82).split(',')[1],prev:c.toDataURL('image/jpeg',.4)};
}

function build(){return `<div class="page" id="page-foto">
  <div class="page-title">&#128247; Foto e galleria</div>
  <div class="card"><div class="card-title">Carica foto</div>
    <p style="font-size:13px;color:#777;margin-bottom:10px">Trascina o scegli una o piu' foto. Scegli il tipo di lavoro (se il nome del file lo dice, lo indovino io): compaiono da sole in <b>Galleria</b> e nei <b>Servizi</b>, senza altro da fare. Le foto vengono ridimensionate e ottimizzate in automatico.</p>
    <input type="file" id="foto-file" accept="image/*" multiple onchange="fotoScegli(this.files)">
    <div id="foto-coda" style="margin-top:14px"></div>
    <div id="msg-foto" class="msg"></div>
  </div>
  <div class="card"><div class="card-title" style="display:flex;justify-content:space-between">Foto pubblicate <span><button class="btn btn-primary btn-sm" onclick="fotoSalva()">Salva modifiche</button> <button class="btn btn-secondary btn-sm" onclick="fotoCarica()">Aggiorna</button></span></div>
    <div id="foto-lista"><em style="color:#bbb;font-size:13px">Caricamento...</em></div></div>
</div>`;}

function init(){
  const main=document.querySelector('main.main'); if(!main)return;
  const shop=[...document.querySelectorAll('.nav-label')].find(e=>e.textContent.trim()==='Impostazioni');
  main.insertAdjacentHTML('beforeend',build());
  if(shop)shop.insertAdjacentHTML('beforebegin','<div class="nav-label">Media</div><button class="nav-item" onclick="fotoShow(this)"><span class="icon">&#128247;</span>Foto e galleria</button>');
}
window.fotoShow=function(btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  $('page-foto').classList.add('active'); btn.classList.add('active'); fotoCarica();
};
window.fotoCarica=async function(){
  const el=$('foto-lista'); if(!tok()){el.innerHTML='<em style="color:#bbb">Token mancante.</em>';return;}
  const sha=await leggi(); if(sha===null){el.innerHTML='<em style="color:#bbb">Nessuna foto ancora.</em>';return;}
  disegna();
};
function disegna(){
  $('foto-lista').innerHTML=items.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px">`+items.map((x,i)=>`<div style="border:1px solid #e6e6ee;border-radius:10px;padding:8px;background:#fff">
    <img src="${base}${DIR}/${x.f}.jpg" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;display:block">
    <input type="text" value="${attr(x.cap)}" onchange="fotoCap(${i},this.value)" style="width:100%;margin:6px 0;font-size:12px" placeholder="Didascalia">
    <div>${chips(x.t,'l',i)}</div>
    <button class="btn btn-secondary btn-sm" style="margin-top:6px" onclick="fotoElimina(${i})">Elimina</button></div>`).join('')+'</div>':'<em style="color:#bbb">Nessuna foto.</em>';
}
window.fotoTema=function(p,i,k,on){const a=p==='l'?items[i].t:queue[i].t; const j=a.indexOf(k); if(on&&j<0)a.push(k); if(!on&&j>=0)a.splice(j,1);};
window.fotoCap=function(i,v){items[i].cap=v;};
window.fotoSalva=async function(){
  showMsg('msg-foto','Salvataggio...',''); const r=await scrivi('Foto: temi e didascalie');
  if(r.ok){showMsg('msg-foto','Salvato!','ok');startDeployPolling();}else showMsg('msg-foto','Errore: '+(await r.json()).message,'err');
};
window.fotoElimina=async function(i){
  const x=items[i]; if(!confirm('Eliminare questa foto dal sito?')||!tok())return;
  const e=await ghGet(`${DIR}/${x.f}.jpg`);
  if(e.ok){const d=await e.json(); await fetch(`https://api.github.com/repos/${REPO}/contents/${DIR}/${x.f}.jpg`,{method:'DELETE',headers:{'Authorization':`token ${tok()}`,'Content-Type':'application/json'},body:JSON.stringify({message:`Elimina foto ${x.f}`,sha:d.sha})});}
  items.splice(i,1); const r=await scrivi('Foto: eliminata '+x.f);
  if(r.ok){startDeployPolling();disegna();}else showMsg('msg-foto','Errore: '+(await r.json()).message,'err');
};
window.fotoScegli=async function(files){
  queue=[]; const box=$('foto-coda'); box.innerHTML='<em style="color:#999;font-size:13px">Preparo le foto...</em>';
  for(const f of [...files]){ if(!/^image\//.test(f.type))continue; const r=await ridimensiona(f); const n=slug(f.name)||'foto';
    queue.push({name:n,cap:n.replace(/-/g,' ').replace(/^./,c=>c.toUpperCase()),t:indovina(n),w:r.w,h:r.h,b64:r.b64,prev:r.prev}); }
  box.innerHTML=queue.length?queue.map((q,i)=>`<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px"><img src="${q.prev}" style="width:110px;border-radius:6px"><div style="flex:1"><input type="text" value="${attr(q.cap)}" onchange="fotoQCap(${i},this.value)" style="width:100%;font-size:13px"><div>${chips(q.t,'q',i)}</div></div></div>`).join('')+'<button class="btn btn-primary" onclick="fotoCaricaTutte()">Carica '+queue.length+' foto</button>':'';
};
window.fotoQCap=function(i,v){queue[i].cap=v;};
window.fotoCaricaTutte=async function(){
  if(!tok()){showMsg('msg-foto','Token mancante','err');return;}
  await leggi(); const usati=new Set(items.map(x=>x.f)); let n=0;
  for(const q of queue){
    let nome=q.name,k=2; while(usati.has(nome))nome=q.name+'-'+k++;
    showMsg('msg-foto',`Carico ${++n}/${queue.length}...`,'');
    const r=await putRaw(`${DIR}/${nome}.jpg`,`Foto: ${nome}`,q.b64);
    if(!r.ok){showMsg('msg-foto','Errore: '+(await r.json()).message,'err');return;}
    usati.add(nome); items.push({f:nome,cap:q.cap,t:q.t.length?q.t:['team'],w:q.w,h:q.h});
  }
  const tot=queue.length, r=await scrivi(`Foto: aggiunte ${tot}`);
  if(r.ok){showMsg('msg-foto',`${tot} foto caricate: appaiono in Galleria e Servizi dopo il deploy.`,'ok');queue=[];$('foto-coda').innerHTML='';$('foto-file').value='';startDeployPolling();disegna();}
  else showMsg('msg-foto','Errore: '+(await r.json()).message,'err');
};
const prevMap={};
window.FOTOLIB={
  prev:prevMap,
  async lista(){ if(!tok())return []; await leggi(); return items.map(x=>Object.assign({},x)); },
  url:n=>base+DIR+'/'+n+'.jpg',
  liquid:n=>"{{ '/"+DIR+"/"+n+".jpg' | relative_url }}",
  async carica(file){
    if(!tok())throw new Error('Token mancante');
    const r=await ridimensiona(file), n0=slug(file.name)||'foto';
    await leggi(); const usati=new Set(items.map(x=>x.f)); let nome=n0,k=2; while(usati.has(nome))nome=n0+'-'+k++;
    const p=await putRaw(DIR+'/'+nome+'.jpg','Foto: '+nome,r.b64); if(!p.ok)throw new Error((await p.json()).message);
    const t=indovina(n0), it={f:nome,cap:n0.replace(/-/g,' ').replace(/^./,c=>c.toUpperCase()),t:t.length?t:['team'],w:r.w,h:r.h};
    items.push(it); const w=await scrivi('Foto: aggiunta '+nome); if(!w.ok)throw new Error((await w.json()).message);
    prevMap[nome]=r.prev; startDeployPolling(); return Object.assign({},it);
  }
};
init();
})();
