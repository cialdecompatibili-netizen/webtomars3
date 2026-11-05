// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: admin > Lingue (rilevamento cartelle, Nuova lingua, Clona, Elimina, normalizzazione). lgHash() DEVE restare identico a lg_hash() in automation/traduzioni_sync.py e allinea_hash.py. Dettagli: docs/MULTILINGUA.md.
// ===== LINGUE (multilingua) =====
// Modello: lingua base (default_lang) + traduzioni collegate dallo stesso `ref`.
// Pagine/articoli della lingua L (diversa dalla base) stanno in <L>/ (pagine) e <L>/_posts (articoli).
// Flag nel front matter: tr: copia | tradotto | da_aggiornare ; tr_hash = hash del testo base quando e' stato tradotto.
// Una sola commit per operazione (Git Data API). Vedi CLAUDE.md "PIANO MULTILINGUA".

const LG = { base: 'it', langs: ['it'], names: { it: 'Italiano', en: 'English', de: 'Deutsch', fr: 'Fran\u00e7ais', es: 'Espa\u00f1ol' }, docs: {}, branch: 'main', tree: [], blobs: {} };
const LG_SKIP = ['404.md', 'categories-redirect.md', 'cat-list.md', 'category-archive.md', 'tag-archive.md', 'year-archive.md'];
const LG_DATA = ['navigation.yml', 'sottomenu.yml', 'shop_nav.yml'];

async function lgApi(path, opt) {
  // Se fetch stesso fallisce ("Failed to fetch": rete, blocco annunci, token con caratteri strani) dice QUALE chiamata.
  let r;
  // NB: path vuoto = la repo stessa. Niente "/" finale: GitHub risponde con un redirect senza header CORS e il
  // browser lo vede come "Failed to fetch" (era la causa dell'errore "chiamata GitHub "repo" non riuscita").
  try { r = await fetch('https://api.github.com/repos/' + REPO + (path ? '/' + path : ''), Object.assign({ headers: { 'Authorization': 'token ' + String(tok()).trim(), 'Content-Type': 'application/json' } }, opt || {})); }
  catch (e) { throw new Error('chiamata GitHub "' + (path || 'repo') + '" non riuscita (' + e.message + '): controlla connessione, estensioni che bloccano, token in admin > Token'); }
  if (!r.ok) throw new Error(path + ' -> ' + r.status + (r.status === 401 ? ' (token non valido: rifallo in admin > Token)' : r.status === 403 ? ' (limite GitHub o token senza permessi: riprova tra qualche minuto)' : ''));
  return r.json();
}
async function lgTree() {
  const repo = await lgApi('');
  LG.branch = repo.default_branch;
  const ref = await lgApi('git/ref/heads/' + LG.branch);
  LG.headSha = ref.object.sha;
  const commit = await lgApi('git/commits/' + LG.headSha);
  LG.baseTree = commit.tree.sha;
  const t = await lgApi('git/trees/' + LG.baseTree + '?recursive=1');
  LG.tree = t.tree.filter(x => x.type === 'blob');
}
async function lgText(sha) {
  if (LG.blobs[sha] !== undefined) return LG.blobs[sha];
  const b = await lgApi('git/blobs/' + sha);
  LG.blobs[sha] = dec(b.content);
  return LG.blobs[sha];
}
function lgFile(path) { return LG.tree.find(x => x.path === path); }
async function lgReadPath(path) { const f = lgFile(path); return f ? lgText(f.sha) : null; }

function lgSplit(t) { const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/); return m ? { fm: m[1], body: m[2] } : { fm: '', body: t }; }
function lgGet(fm, k) { const m = fm.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; }
function lgSet(fm, k, v) { const re = new RegExp('^' + k + ':.*$', 'm'); const line = k + ': ' + v; return re.test(fm) ? fm.replace(re, line) : (fm ? fm + '\n' : '') + line; }
function lgDel(fm, k) { return fm.replace(new RegExp('^' + k + ':.*\\r?\\n?', 'mg'), ''); }
function lgHash(s) { s = (s || '').replace(/\r/g, '').trim(); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function lgEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function lgPathsFor(lang) {
  const base = lang === LG.base;
  const out = [];
  LG.tree.forEach(f => {
    const p = f.path;
    if (base) {
      if (p === 'index.html') out.push({ path: p, kind: 'home' });
      else if (/^_pages\/[^\/]+\.md$/.test(p) && !LG_SKIP.includes(p.split('/')[1])) out.push({ path: p, kind: 'page' });
      else if (/^_posts\/(?:.+\/)?[^\/]+\.md$/.test(p)) out.push({ path: p, kind: 'post' });
    } else {
      if (p === lang + '/index.html') out.push({ path: p, kind: 'home' });
      else if (new RegExp('^' + lang + '/[^/]+\\.md$').test(p)) out.push({ path: p, kind: 'page' });
      else if (new RegExp('^' + lang + '/_posts/[^/]+\\.md$').test(p)) out.push({ path: p, kind: 'post' });
    }
  });
  return out;
}
function lgRefFrom(item, fm) {
  const r = lgGet(fm, 'ref'); if (r) return r;
  const fn = item.path.split('/').pop();
  if (item.kind === 'home') return 'home';
  if (item.kind === 'post') return fn.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  return fn.replace(/\.md$/, '');
}
async function lgPool(items, fn, n) {
  const res = []; let i = 0;
  await Promise.all(Array.from({ length: n || 8 }, async () => { while (i < items.length) { const k = i++; res[k] = await fn(items[k]); } }));
  return res;
}
async function lgLoadDocs() {
  await lgTree();
  const cfg = (await lgReadPath('_config.yml')) || '';
  const bm = cfg.match(/^default_lang:\s*(\S+)/m); LG.base = bm ? bm[1].replace(/["']/g, '') : 'it';
  const lm = cfg.match(/^languages:\s*\[([^\]]*)\]/m); LG.langs = lm ? lm[1].split(',').map(s => s.trim().replace(/["']/g, '')).filter(Boolean) : [LG.base];
  if (!LG.langs.includes(LG.base)) LG.langs.unshift(LG.base);
  // RILEVAMENTO AUTOMATICO: la lingua e' la CARTELLA. Ogni cartella-lingua nella repo (es. "de/" clonata a mano)
  // diventa una lingua anche se non e' in `languages:` del config; una lingua del config senza piu' cartella
  // (cartella rinominata/cancellata) sparisce. La registrazione nei file la fa lgNormalizza().
  const det = lgDetect();
  LG.orphans = LG.langs.filter(c => c !== LG.base && !det.includes(c));
  LG.detected = det.filter(c => !LG.langs.includes(c));
  LG.langs = LG.langs.filter(c => !LG.orphans.includes(c)).concat(LG.detected);
  const lyml = await lgReadPath('_data/languages.yml');
  if (lyml) { const re = /^([a-z-]+):\s*\r?\n\s+name:\s*(.+)$/gm; let m; while ((m = re.exec(lyml))) LG.names[m[1]] = m[2].trim().replace(/["']/g, ''); }
  LG.docs = {};
  for (const lang of LG.langs) {
    const items = lgPathsFor(lang);
    const loaded = await lgPool(items, async it => {
      const t = await lgReadPath(it.path); const s = lgSplit(t || '');
      return { lang, path: it.path, kind: it.kind, sha: lgFile(it.path).sha, fm: s.fm, body: s.body, text: t, ref: lgRefFrom(it, s.fm), title: lgGet(s.fm, 'title') || lgRefFrom(it, s.fm), tr: lgGet(s.fm, 'tr'), trHash: lgGet(s.fm, 'tr_hash'), hash: lgHash(s.body) };
    });
    LG.docs[lang] = {}; loaded.forEach(d => { LG.docs[lang][d.ref] = d; });
  }
}

// ---- RILEVAMENTO + NORMALIZZAZIONE AUTOMATICA DELLE LINGUE (clono la cartella, rinomino, e' fatta) ----
// Una lingua = cartella alla radice "xx" o "xx-yy" con index.html / *.md / _posts, oppure _data/i18n/xx/.
function lgDetect() {
  const found = {};
  LG.tree.forEach(f => {
    let m = f.path.match(/^([a-z]{2}(?:-[a-z]{2})?)\/(?:index\.html$|_posts\/|[^\/]+\.md$)/);
    if (!m) m = f.path.match(/^_data\/i18n\/([a-z]{2}(?:-[a-z]{2})?)\//);
    if (m && m[1] !== LG.base) found[m[1]] = 1;
  });
  return Object.keys(found);
}
// blocco `defaults:` del config per una lingua (lang/locale/layout + permalink articoli /xx/...)
function lgScope(code) {
  return '  - scope:\n      path: "' + code + '"\n    values:\n      lang: ' + code + '\n      locale: ' + code + '\n  - scope:\n      path: "' + code + '"\n      type: pages\n    values:\n      layout: single\n  - scope:\n      path: "' + code + '"\n      type: posts\n    values:\n      layout: single\n      permalink: /:categories/:title/\n';
}
// Rende coerente con la CARTELLA tutto il resto: config (languages + defaults), languages.yml, ui-text.yml,
// `lang`/`locale`/`permalink` nel front matter dei file della cartella, url in _data/i18n/xx/.
// Idempotente: committa SOLO se qualcosa cambia (una sola commit). Ritorna il numero di file aggiornati.
async function lgNormalizza() {
  const others = LG.langs.filter(l => l !== LG.base);
  const entries = [];
  const put = async (path, content) => { const old = await lgReadPath(path); if (old !== content) entries.push({ path, content }); };
  const langRe = /^\/([a-z]{2}(?:-[a-z]{2})?)\//;
  // 1) config: elenco lingue = cartelle reali + blocco defaults per ogni lingua che non ce l'ha
  let cfg = await lgReadPath('_config.yml');
  if (cfg) {
    cfg = cfg.replace(/^languages:.*$/m, 'languages: [' + [LG.base].concat(others).join(', ') + ']');
    others.forEach(code => { if (!new RegExp('path:\\s*["\']' + code + '["\']').test(cfg)) cfg = cfg.replace(/^(  # LANG-DEFAULTS[^\r\n]*\r?\n)/m, '$1' + lgScope(code)); });
    await put('_config.yml', cfg);
  }
  // 2) nome lingua (selettore) e testi interfaccia (copia del blocco `en:` come punto di partenza)
  let lyml = await lgReadPath('_data/languages.yml');
  if (lyml !== null) {
    others.forEach(code => { if (!new RegExp('^' + code + ':', 'm').test(lyml)) lyml = lyml.replace(/\s+$/, '') + '\n' + code + ':\n  name: ' + (LG.names[code] || code.toUpperCase()) + '\n'; });
    await put('_data/languages.yml', lyml);
  }
  let ui = await lgReadPath('_data/ui-text.yml');
  if (ui) {
    others.forEach(code => { if (!new RegExp('^' + code + ':', 'm').test(ui)) { const blk = lgUiBlock(ui, code); if (blk) ui = ui.replace(/\s+$/, '') + '\n\n' + blk; } });
    await put('_data/ui-text.yml', ui);
  }
  // 3) file della cartella: lang/locale e permalink devono dire la lingua della cartella (dopo un clone dicono quella vecchia)
  for (const code of others) {
    const files = LG.tree.filter(f => f.path.startsWith(code + '/') && /\.(md|html)$/.test(f.path));
    await lgPool(files, async f => {
      const s = lgSplit(await lgText(f.sha)); if (!s.fm) return;
      let fm = s.fm;
      if (lgGet(fm, 'lang') !== code) fm = lgSet(fm, 'lang', code);
      if (lgGet(fm, 'locale') !== code) fm = lgSet(fm, 'locale', code);
      const pl = lgGet(fm, 'permalink'); const pm = pl.match(langRe);
      if (pm && pm[1] !== code) fm = lgSet(fm, 'permalink', pl.replace(langRe, '/' + code + '/'));
      if (fm !== s.fm) entries.push({ path: f.path, content: '---\n' + fm.replace(/\s+$/, '') + '\n---\n' + s.body });
    }, 6);
    // 4) url dei menu/blocchi tradotti: /vecchia-lingua/... -> /code/...
    const dfiles = LG.tree.filter(f => f.path.startsWith('_data/i18n/' + code + '/'));
    await lgPool(dfiles, async f => {
      const t = await lgText(f.sha);
      const n = t.replace(/(url:\s*["']?)\/([a-z]{2}(?:-[a-z]{2})?)\//g, (all, a, l) => (l !== code && (LG.langs.includes(l) || LG.orphans.includes(l) || LG.names[l])) ? a + '/' + code + '/' : all);
      if (n !== t) entries.push({ path: f.path, content: n });
    }, 6);
  }
  if (!entries.length) return 0;
  await lgCommit(entries, 'Multilingua: lingue rilevate dalle cartelle registrate (' + others.join(', ') + ')');
  return entries.length;
}

function lgStato(lang, ref) {
  if (lang === LG.base) return LG.docs[lang][ref] ? 'originale' : 'manca';
  const d = LG.docs[lang][ref]; if (!d) return 'manca';
  const b = LG.docs[LG.base][ref];
  if (d.tr === 'copia') return 'copia';
  if (d.tr === 'da_aggiornare') return 'da_aggiornare';
  if (b && d.trHash && d.trHash !== b.hash) return 'da_aggiornare';
  return 'tradotto';
}

// ---- costruzione di una copia in un'altra lingua ----
function lgBuildDoc(src, dst, srcLang) {
  let fm = src.fm;
  const srcPerm = lgGet(fm, 'permalink');
  ['permalink', 'lang', 'locale', 'ref', 'tr', 'tr_hash', 'redirect_from', 'sitemap'].forEach(k => { fm = lgDel(fm, k); });
  fm = fm.replace(/\s+$/, '');
  const fn = src.path.split('/').pop();
  let path, perm = null;
  if (src.kind === 'home') { path = dst + '/index.html'; perm = '/' + dst + '/'; }
  else if (src.kind === 'page') {
    path = dst + '/' + fn;
    let p = srcPerm || '/' + fn.replace(/\.md$/, '') + '/';
    if (srcLang !== LG.base) p = p.replace(new RegExp('^/' + srcLang + '/'), '/');
    perm = '/' + dst + (p.startsWith('/') ? p : '/' + p);
  } else { path = dst + '/_posts/' + fn; }
  fm = lgSet(fm, 'ref', src.ref); fm = lgSet(fm, 'lang', dst); fm = lgSet(fm, 'locale', dst);
  fm = lgSet(fm, 'tr', 'copia'); fm = lgSet(fm, 'sitemap', 'false'); fm = lgSet(fm, 'tr_hash', lgHash(lgBaseBody(src)));
  if (perm) fm = lgSet(fm, 'permalink', perm);
  return { path, content: '---\n' + fm + '\n---\n' + src.body };
}
function lgBaseBody(src) { const b = LG.docs[LG.base] && LG.docs[LG.base][src.ref]; return b ? b.body : src.body; }
// se l'origine non ha `ref`, lo aggiungiamo (serve a collegare le versioni)
function lgAddRef(src) {
  if (lgGet(src.fm, 'ref')) return null;
  return { path: src.path, content: '---\n' + lgSet(src.fm, 'ref', src.ref) + '\n---\n' + src.body };
}

async function lgCommit(entries, message) {
  const tree = [];
  await lgPool(entries, async e => {
    // e.del = true -> cancella il file (sha:null nella Git Data API)
    if (e.del) { tree.push({ path: e.path, mode: '100644', type: 'blob', sha: null }); return; }
    const b = await lgApi('git/blobs', { method: 'POST', body: JSON.stringify({ content: e.content, encoding: 'utf-8' }) });
    tree.push({ path: e.path, mode: '100644', type: 'blob', sha: b.sha });
  }, 6);
  const t = await lgApi('git/trees', { method: 'POST', body: JSON.stringify({ base_tree: LG.baseTree, tree }) });
  const c = await lgApi('git/commits', { method: 'POST', body: JSON.stringify({ message, tree: t.sha, parents: [LG.headSha] }) });
  await lgApi('git/refs/heads/' + LG.branch, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
}

function lgYmlUrls(txt, src, dst) {
  if (src === LG.base) return txt.replace(/(url:\s*["']?)\/(?!\/)/g, '$1/' + dst + '/');
  return txt.replace(new RegExp('(url:\\s*["\']?)/' + src + '/', 'g'), '$1/' + dst + '/');
}
function lgUiBlock(ui, code) {
  const m = ui.match(/^en:[^\n]*\n(?:(?![^\s#\n]).*\n?)*/m);
  if (!m) return '';
  return m[0].replace(/^en:[^\n]*/, code + ':').replace(/\s+$/, '') + '\n';
}

async function lgNuova() {
  const code = document.getElementById('lg-code').value.trim().toLowerCase();
  const src = document.getElementById('lg-src').value;
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(code)) return showMsg('msg-lingue', 'Codice non valido (es. en, de, fr)', 'err');
  if (LG.langs.includes(code)) return showMsg('msg-lingue', 'Lingua gia\' presente', 'err');
  try {
    showMsg('msg-lingue', 'Clono da ' + src + '...', 'ok');
    await lgLoadDocs();
    const entries = []; const seen = {};
    const add = e => { if (e && !seen[e.path]) { seen[e.path] = 1; entries.push(e); } };
    Object.values(LG.docs[src]).forEach(d => {
      add(lgBuildDoc(d, code, src));
      if (src === LG.base) add(lgAddRef(d));
    });
    for (const f of LG_DATA) {
      const sp = src === LG.base ? '_data/' + f : '_data/i18n/' + src + '/' + f;
      const t = await lgReadPath(sp);
      if (t) add({ path: '_data/i18n/' + code + '/' + f, content: lgYmlUrls(t, src, code) });
    }
    let ui = await lgReadPath('_data/ui-text.yml');
    if (ui && !new RegExp('^' + code + ':', 'm').test(ui)) { const blk = lgUiBlock(ui, code); if (blk) add({ path: '_data/ui-text.yml', content: ui.replace(/\s+$/, '') + '\n\n' + blk }); }
    let lyml = await lgReadPath('_data/languages.yml');
    if (lyml !== null && !new RegExp('^' + code + ':', 'm').test(lyml)) add({ path: '_data/languages.yml', content: lyml.replace(/\s+$/, '') + '\n' + code + ':\n  name: ' + (LG.names[code] || code.toUpperCase()) + '\n' });
    let cfg = await lgReadPath('_config.yml');
    cfg = cfg.replace(/^languages:.*$/m, 'languages: [' + LG.langs.concat([code]).join(', ') + ']');
    const scope = lgScope(code); // blocco defaults: stessa funzione usata da lgNormalizza
    cfg = cfg.replace(/^(  # LANG-DEFAULTS[^\r\n]*\r?\n)/m, '$1' + scope);
    add({ path: '_config.yml', content: cfg });
    await lgCommit(entries, 'Multilingua: nuova lingua ' + code + ' clonata da ' + src);
    showMsg('msg-lingue', 'Lingua ' + code + ' creata (' + entries.length + ' file). Il sito si aggiorna tra 1-2 minuti: tutte le pagine sono "copia" da tradurre.', 'ok');
    caricaLingue(true);
  } catch (e) { showMsg('msg-lingue', 'Errore: ' + e.message, 'err'); }
}

// ELIMINA una lingua: cancella la cartella xx/ e _data/i18n/xx/ e la toglie da config (languages + defaults).
// Non tocca la lingua base. Una sola commit: se ci ripensi basta ripristinarla da GitHub (Revert).
async function lgElimina(code) {
  if (code === LG.base) return showMsg('msg-lingue', 'La lingua base non si elimina.', 'err');
  if (!confirm('Eliminare la lingua "' + (LG.names[code] || code) + '" (' + code + ')? Si cancellano la cartella ' + code + '/ e i suoi testi.')) return;
  try {
    showMsg('msg-lingue', 'Elimino ' + code + '...', 'ok');
    await lgLoadDocs();
    const entries = LG.tree.filter(f => f.path.indexOf(code + '/') === 0 || f.path.indexOf('_data/i18n/' + code + '/') === 0).map(f => ({ path: f.path, del: true }));
    let cfg = await lgReadPath('_config.yml');
    if (cfg) {
      const rest = LG.langs.filter(l => l !== code);
      cfg = cfg.replace(/^languages:.*$/m, 'languages: [' + rest.join(', ') + ']');
      // toglie i blocchi `- scope: path: "xx"` scritti da lgScope (righe successive indentate di 4+ spazi)
      cfg = cfg.replace(new RegExp('^  - scope:[ \\t]*\\r?\\n[ ]{6}path:[ \\t]*["\']' + code + '["\'][ \\t]*\\r?\\n(?:[ ]{4,}.*(?:\\r?\\n|$))*', 'mg'), '');
      entries.push({ path: '_config.yml', content: cfg });
    }
    if (!entries.length) throw new Error('niente da eliminare');
    await lgCommit(entries, 'Multilingua: eliminata lingua ' + code);
    showMsg('msg-lingue', 'Lingua ' + code + ' eliminata (' + entries.length + ' file). Il sito si aggiorna tra 1-2 minuti.', 'ok');
    LG.normTried = true;
    caricaLingue(true);
  } catch (e) { showMsg('msg-lingue', 'Errore: ' + e.message, 'err'); }
}
// CLONA: precompila il modulo "Nuova lingua" con questa lingua come origine
function lgClona(code) {
  document.getElementById('lg-src').value = code;
  const i = document.getElementById('lg-code'); i.value = ''; i.focus();
  showMsg('msg-lingue', 'Scrivi il codice della nuova lingua (es. de) e premi "Crea lingua": clona da ' + code + '.', 'ok');
}

async function lgCreaCopia(dst, ref) {
  try {
    showMsg('msg-lingue', 'Creo la copia...', 'ok');
    await lgLoadDocs();
    let src = LG.docs[LG.base][ref]; if (!src) throw new Error('originale non trovato');
    const entries = [lgBuildDoc(src, dst, LG.base)]; const r = lgAddRef(src); if (r) entries.push(r);
    await lgCommit(entries, 'Multilingua: copia ' + ref + ' in ' + dst);
    showMsg('msg-lingue', 'Copia creata in ' + dst + '.', 'ok'); caricaLingue(true);
  } catch (e) { showMsg('msg-lingue', 'Errore: ' + e.message, 'err'); }
}
async function lgSegna(lang, ref) {
  try {
    const d = LG.docs[lang][ref]; const b = LG.docs[LG.base][ref];
    let fm = lgDel(lgSet(lgSet(d.fm, 'tr', 'tradotto'), 'tr_hash', lgHash(b ? b.body : d.body)), 'sitemap').replace(/\s+$/, '');
    await lgCommit([{ path: d.path, content: '---\n' + fm + '\n---\n' + d.body }], 'Multilingua: ' + ref + ' (' + lang + ') segnata come tradotta');
    showMsg('msg-lingue', 'Segnata come tradotta.', 'ok'); caricaLingue(true);
  } catch (e) { showMsg('msg-lingue', 'Errore: ' + e.message, 'err'); }
}

async function caricaLingue(force) {
  const box = document.getElementById('lg-tab');
  if (!tok()) { box.innerHTML = '<span style="color:#c62828">Serve il token GitHub (voce Token).</span>'; return; }
  box.innerHTML = '<span style="color:#999">Carico...</span>';
  try {
    await lgLoadDocs();
    // AUTOMATICO: cartelle-lingua nuove/rinominate/clonate vengono registrate (config, nomi, front matter, url)
    // una volta per sessione; se e' tutto gia' a posto non committa nulla.
    if (!LG.normTried) {
      LG.normTried = true;
      try {
        const n = await lgNormalizza();
        if (n) { await lgLoadDocs(); showMsg('msg-lingue', 'Lingue rilevate dalle cartelle e registrate (' + n + ' file aggiornati). Il sito si aggiorna tra 1-2 minuti.', 'ok'); }
      } catch (e) { console.warn('lgNormalizza', e); showMsg('msg-lingue', 'Registrazione automatica lingue non riuscita (' + e.message + '). La tabella funziona comunque.', 'err'); }
    }
    const sel = document.getElementById('lg-src'); sel.innerHTML = LG.langs.map(l => '<option value="' + l + '">' + lgEsc(LG.names[l] || l) + ' (' + l + ')</option>').join('');
    document.getElementById('lg-codes').innerHTML = Object.keys(LG.names).filter(k => !LG.langs.includes(k)).map(k => '<option value="' + k + '">' + lgEsc(LG.names[k]) + '</option>').join('');
    // ELENCO LINGUE (una riga per lingua = una cartella): bandiera, nome, avanzamento traduzioni, Clona, Elimina.
    // Bandiera: assets/images/flags/xx.svg (se manca il file l'immagine si nasconde da sola).
    const baseRefs = Object.values(LG.docs[LG.base]).filter(d => ['home', 'page', 'post'].includes(d.kind));
    let h = '<div style="display:flex;flex-direction:column;gap:8px">';
    LG.langs.forEach(l => {
      const isBase = l === LG.base;
      const ok = isBase ? baseRefs.length : baseRefs.filter(b => lgStato(l, b.ref) === 'tradotto').length;
      const stato = isBase ? 'Lingua base (alla radice)' : ok + ' / ' + baseRefs.length + ' contenuti tradotti';
      h += '<div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid #e5e5e5;border-radius:6px;flex-wrap:wrap">'
        + '<img src="../assets/images/flags/' + lgEsc(l) + '.svg" alt="" style="width:28px;height:20px;object-fit:cover;border-radius:2px" onerror="this.style.display=\'none\'">'
        + '<div style="flex:1;min-width:140px"><strong>' + lgEsc(LG.names[l] || l) + '</strong> <span style="color:#888">(' + lgEsc(l) + ')</span><div style="font-size:12px;color:#777">' + lgEsc(stato) + '</div></div>'
        + '<button class="btn btn-secondary btn-sm" onclick="lgClona(\'' + l + '\')">Clona</button>'
        + (isBase ? '' : ' <button class="btn btn-secondary btn-sm" style="color:#c62828" onclick="lgElimina(\'' + l + '\')">Elimina</button>')
        + '</div>';
    });
    box.innerHTML = h + '</div>';
  } catch (e) { box.innerHTML = '<span style="color:#c62828">Errore: ' + lgEsc(e.message) + '</span>'; }
}
