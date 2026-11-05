// !!! LEGACY: questo file NON e' caricato da admin/index.html. La logica vera e' nello script inline di index.html.
// Modificare qui non ha alcun effetto. Tenuto solo come riferimento storico (si puo' cancellare).
// ===== CORE — utils, API GitHub, navigazione =====

function detectRepo(){
  const h=location.hostname;
  const p=location.pathname;
  const match=h.match(/^([^.]+)\.github\.io$/);
  if(!match)return localStorage.getItem('cms_repo')||'';
  const user=match[1];
  const parts=p.split('/').filter(Boolean);
  const repo=(parts.length>1 && parts[0]!=='admin')?parts[0]:'';
  return repo?`${user}/${repo}`:`${user}/${user}.github.io`;
}
const REPO=detectRepo();

(function(){
  const base=location.origin+location.pathname.replace(/\/admin\/?.*$/,'/');
  document.getElementById('topbar-site-link').href=base;
  document.getElementById('topbar-admin-link').href=base+'admin/';
  document.getElementById('topbar-deploy-link').href=`https://github.com/${REPO}/actions`;
})();

function tok(){return localStorage.getItem('gh_token');}
function enc(s){return btoa(unescape(encodeURIComponent(s)));}
function dec(s){return decodeURIComponent(escape(atob(s.replace(/\n/g,''))));}
function showMsg(id,txt,cls){const m=document.getElementById(id);m.textContent=txt;m.className='msg '+cls;}
async function ghGet(path){return fetch(`https://api.github.com/repos/${REPO}/contents/${path}`,{headers:{'Authorization':`token ${tok()}`}});}
async function ghPut(path,msg,content,sha){
  const body={message:msg,content:enc(content)};if(sha)body.sha=sha;
  return fetch(`https://api.github.com/repos/${REPO}/contents/${path}`,{method:'PUT',headers:{'Authorization':`token ${tok()}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
async function ghDelete(path,sha,msg){
  return fetch(`https://api.github.com/repos/${REPO}/contents/${path}`,{
    method:'DELETE',headers:{'Authorization':`token ${tok()}`,'Content-Type':'application/json'},
    body:JSON.stringify({message:msg||`Elimina ${path}`,sha})
  });
}

function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
}

function legacyMdToHtml(md){
  return md
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm,'<li>$1</li>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');
}

// TOKEN
function salvaToken(){
  const t=document.getElementById('token-input').value.trim();
  if(!t)return;
  localStorage.setItem('gh_token',t);
  showMsg('msg-token','✅ Token salvato!','ok');
  document.getElementById('token-input').value='';
}
function cancellaToken(){localStorage.removeItem('gh_token');showMsg('msg-token','🗑 Token rimosso.','ok');}
function toggleToken(){const i=document.getElementById('token-input');i.type=i.type==='password'?'text':'password';}
