// !!! LEGACY: questo file NON e' caricato da admin/index.html. La logica vera e' nello script inline di index.html
// (e le liste in js/wp-elenchi.js). Modificare qui non ha alcun effetto.
// ===== ARTICOLI =====

let _editorMode='visuale';
let _categorie=[];
let _catSha=null;

function fmt(cmd){document.getElementById('vis-editor').focus();document.execCommand(cmd,false,null);}
function fmtBlock(tag){if(!tag)return;document.getElementById('vis-editor').focus();document.execCommand('formatBlock',false,tag);}
function insertLink(){
  const url=prompt('URL del link:');if(!url)return;
  document.getElementById('vis-editor').focus();document.execCommand('createLink',false,url);
}
function setEditor(mode){
  _editorMode=mode;
  document.getElementById('btn-visuale').classList.toggle('active',mode==='visuale');
  document.getElementById('btn-markdown').classList.toggle('active',mode==='markdown');
  if(mode==='visuale'){
    const html=document.getElementById('corpo').value;
    if(html)document.getElementById('vis-editor').innerHTML=html;
    document.getElementById('quill-box').style.display='block';
    document.getElementById('corpo').style.display='none';
  } else {
    document.getElementById('corpo').value=document.getElementById('vis-editor').innerHTML;
    document.getElementById('quill-box').style.display='none';
    document.getElementById('corpo').style.display='block';
  }
}
// Aggiunge righe vuote tra i tag block-level così kramdown li riconosce come HTML
// e non li tratta (escapandoli) come testo normale.
function formatHtmlForKramdown(html){
  if(!html)return html;
  const blockTags='div|p|ul|ol|li|h1|h2|h3|h4|h5|h6|table|blockquote|pre|section|article|figure';
  let out=html
    .replace(new RegExp(`(?!^)<(${blockTags})(\\s[^>]*)?>`,'g'),'\n\n<$1$2>')
    .replace(new RegExp(`</(${blockTags})>`,'g'),'</$1>\n\n');
  out=out.replace(/\n{3,}/g,'\n\n').trim();
  return out;
}
function getCorpo(){
  if(_editorMode==='visuale')return formatHtmlForKramdown(document.getElementById('vis-editor').innerHTML);
  return document.getElementById('corpo').value;
}
function setCorpo(html){
  const isLegacyMd=html&&!html.trim().startsWith('<')&&html.includes('\n');
  const content=isLegacyMd?legacyMdToHtml(html):html;
  document.getElementById('corpo').value=content;
  document.getElementById('vis-editor').innerHTML=content;
}
function slugify(s){return s.toLowerCase().replace(/[àáâ]/g,'a').replace(/[èéê]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');}
function buildContent(){
  const titolo=document.getElementById('titolo').value.trim();
  const data=document.getElementById('data').value;
  const cat=document.getElementById('categorie').value;
  const tags=document.getElementById('tags').value.split(',').map(s=>s.trim()).filter(Boolean);
  const excerpt=document.getElementById('excerpt').value.trim();
  const teaser=document.getElementById('teaser').value.trim();
  const corpo=getCorpo();
  let fm=`---\nlayout: single\ntitle: "${titolo}"\ndate: ${data}\n`;
  if(excerpt)fm+=`excerpt: "${excerpt}"\n`;
  if(teaser)fm+=`header:\n  teaser: "${teaser}"\n`;
  if(cat)fm+=`categories:\n  - ${cat}\n`;
  if(tags.length)fm+=`tags:\n${tags.map(t=>`  - ${t}`).join('\n')}\n`;
  return fm+`---\n\n${corpo}`;
}
function anteprima(){
  document.getElementById('preview-content').textContent=buildContent();
  document.getElementById('preview-box').style.display='block';
  document.getElementById('preview-box').scrollIntoView({behavior:'smooth'});
}
function nuovoArticolo(){
  ['titolo','excerpt','teaser','tags','corpo'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('categorie').value='';
  document.getElementById('data').value=new Date().toISOString().split('T')[0];
  document.getElementById('preview-box').style.display='none';
  window._editSha=null;window._editPath=null;
  document.getElementById('msg-art').style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
}
async function pubblica(){
  if(!tok())return showMsg('msg-art','⚠️ Token mancante.','err');
  const titolo=document.getElementById('titolo').value.trim();
  if(!titolo)return showMsg('msg-art','⚠️ Titolo obbligatorio.','err');
  const data=document.getElementById('data').value;
  const slug=slugify(titolo);
  const path=window._editPath||`_posts/${data}-${slug}.md`;
  showMsg('msg-art','⏳ Pubblicazione...','');
  const res=await ghPut(path,`Pubblica: ${titolo}`,buildContent(),window._editSha||undefined);
  const j=await res.json();
  if(res.ok){window._editSha=j.content.sha;window._editPath=path;showMsg('msg-art','✅ Pubblicato! Live in ~60s.','ok');caricaLista();}
  else showMsg('msg-art','❌ '+j.message,'err');
}
async function caricaLista(){
  if(!tok())return;
  document.getElementById('lista-articoli').innerHTML='<span style="color:#bbb;font-size:13px">⏳ Caricamento...</span>';
  const res=await ghGet('_posts');if(!res.ok)return;
  const files=await res.json();
  document.getElementById('lista-articoli').innerHTML=files.reverse().map(f=>`
    <div class="list-row">
      <span>${f.name.replace(/\.md$/,'')}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm" onclick="modificaArticolo('${f.path}')">✏️ Modifica</button>
        <button class="btn btn-danger btn-sm" onclick="eliminaArticolo('${f.path}','${f.sha}','${f.name}')">🗑️ Elimina</button>
      </div>
    </div>`).join('');
}
async function modificaArticolo(path){
  const res=await ghGet(path);if(!res.ok)return;
  const d=await res.json();
  const content=dec(d.content);
  const fm=content.match(/^---\n([\s\S]*?)\n---/);
  const corpo=content.replace(/^---[\s\S]*?---\n\n?/,'');
  const meta=fm?fm[1]:'';
  const get=(k)=>{const m=meta.match(new RegExp(`^${k}:\\s*"?(.+?)"?\\s*$`,'m'));return m?m[1].trim():'';}
  document.getElementById('titolo').value=get('title');
  document.getElementById('data').value=get('date').slice(0,10)||new Date().toISOString().split('T')[0];
  document.getElementById('excerpt').value=get('excerpt');
  document.getElementById('teaser').value=(meta.match(/teaser:\s*"?(.+?)"?\s*$/m)||[])[1]||'';
  const tagsM=meta.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
  document.getElementById('tags').value=tagsM?tagsM[1].split('\n').filter(l=>l.trim()).map(l=>l.replace(/^\s+-\s+/,'')).join(', '):'';
  const catM=meta.match(/^categories:\s*\n\s+-\s+(.+)$/m);
  document.getElementById('categorie').value=catM?catM[1].trim():'';
  setCorpo(corpo);
  window._editSha=d.sha;window._editPath=path;
  window.scrollTo({top:0,behavior:'smooth'});
}
async function eliminaArticolo(path,sha,nome){
  if(!confirm(`Eliminare "${nome}"?`))return;
  if(!tok())return;
  const res=await ghDelete(path,sha,`Elimina: ${nome}`);
  if(res.ok){showMsg('msg-art','✅ Eliminato!','ok');caricaLista();}
}

// CATEGORIE ARTICOLI
async function caricaCategorie(){
  const res=await ghGet('_data/categorie.json');
  if(res.ok){const d=await res.json();_catSha=d.sha;_categorie=JSON.parse(dec(d.content));}
  else _categorie=[{nome:'tecnica',descrizione:'Articoli tecnici, guide e tutorial'}];
  renderCategorie();renderSelect();
}
function renderCategorie(){
  const el=document.getElementById('lista-categorie');
  el.innerHTML=_categorie.map((c,i)=>`
    <div class="cat-row">
      <div style="display:flex;gap:8px;margin-bottom:6px;align-items:center">
        <div style="display:flex;flex-direction:column;gap:2px">
          <button class="btn btn-secondary btn-sm" style="padding:1px 7px;font-size:11px;line-height:1" onclick="catSu(${i})" ${i===0?"disabled":""}>▲</button>
          <button class="btn btn-secondary btn-sm" style="padding:1px 7px;font-size:11px;line-height:1" onclick="catGiu(${i})" ${i===_categorie.length-1?"disabled":""}>▼</button>
        </div>
        <input type="text" value="${c.nome}" onchange="_categorie[${i}].nome=this.value;renderSelect()" style="font-weight:600;flex:1">
        <button class="btn btn-danger btn-sm" onclick="_categorie.splice(${i},1);renderCategorie();renderSelect()">🗑</button>
      </div>
      <div style="font-size:11px;color:#aaa;margin-bottom:4px">Descrizione (supporta HTML)</div>
      <div contenteditable="true" data-cat-idx="${i}" onblur="_categorie[this.dataset.catIdx].descrizione=this.innerHTML"
        style="min-height:48px;border:1px solid #e0e0e0;border-radius:6px;padding:8px 10px;font-size:13px;line-height:1.6;background:#fafafa;outline:none">${c.descrizione||''}</div>
    </div>`).join('');
}
function renderSelect(){
  const sel=document.getElementById('categorie');const cur=sel.value;
  sel.innerHTML='<option value="">— Seleziona —</option>';
  _categorie.forEach(c=>{const o=document.createElement('option');o.value=c.nome;o.textContent=c.nome;if(c.nome===cur)o.selected=true;sel.appendChild(o);});
}
function aggiungiCategoria(){
  const nome=document.getElementById('cat-nome').value.trim();if(!nome)return;
  if(!_categorie.find(c=>c.nome===nome))_categorie.push({nome,descrizione:''});
  document.getElementById('cat-nome').value='';renderCategorie();renderSelect();
}
function catSu(i){if(i===0)return;var t=_categorie.splice(i,1)[0];_categorie.splice(i-1,0,t);renderCategorie();renderSelect();}
function catGiu(i){if(i===_categorie.length-1)return;var t=_categorie.splice(i,1)[0];_categorie.splice(i+1,0,t);renderCategorie();renderSelect();}
async function salvaCategorie(){
  if(!tok())return showMsg('msg-cat','⚠️ Token mancante.','err');
  showMsg('msg-cat','⏳ Salvataggio...','');
  const res=await ghPut('_data/categorie.json','Aggiorna categorie',JSON.stringify(_categorie,null,2),_catSha);
  const j=await res.json();
  if(res.ok){_catSha=j.content.sha;showMsg('msg-cat','✅ Categorie salvate!','ok');}
  else showMsg('msg-cat','❌ '+j.message,'err');
}
