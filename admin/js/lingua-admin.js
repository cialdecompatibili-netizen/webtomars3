// GUIDA-SVILUPPO: caricato da admin/index.html con <script src> in fondo, DOPO lo script inline. Usa le globali definite li' (tok, ghGet, ghPut, dec, showMsg, REPO, startDeployPolling): non chiamarlo a livello globale prima del load.
// Dopo ogni modifica incrementa il ?v= del suo <script> in admin/index.html (cache del browser) e prova con `node automation/test_admin.js` (nessun errore di avvio, categorie visibili). Regole generali: CLAUDE.md / docs/ERRORI_NOTI.md.
// QUI: lingua di lavoro dell'admin. Intercetta window.fetch e rimappa i path (xx/_posts, xx/*.md, _data/i18n/xx/*) solo se lingua != base e sezione attiva. Nuovi file da mappare: aggiungili in mappa(), NON riscrivere path dentro index.html.

// =====================================================================================
// LINGUA DI LAVORO DELL'ADMIN  (selettore in alto, come WPML / Polylang)
// -------------------------------------------------------------------------------------
// COSA FA: nella barra in alto compare un selettore lingua. Scegliendo "English":
//   - Articoli    -> leggono/scrivono  en/_posts/
//   - Pagine      -> leggono/scrivono  en/*.md   (blocchi in _data/i18n/en/blocks_*.json)
//   - Home        -> blocchi in _data/i18n/en/blocks_home.json
//   - Menu        -> _data/i18n/en/navigation.yml, sottomenu.yml, shop_nav.yml
// Gli editor sono GLI STESSI della lingua base: nessun codice duplicato.
//
// COME FUNZIONA (importante se tocchi qui): NON riscrive index.html. Intercetta window.fetch
// e, SOLO quando la lingua scelta non e' la base E la sezione attiva e' Articoli/Pagine/Menu,
// traduce i path "italiani" (_posts, _pages, _data/navigation.yml ...) in quelli della lingua.
//   - GET di un file lingua che non esiste (menu/blocchi): parte dalla copia della lingua base
//     (sha=null => il salvataggio lo CREA). Nei menu gli url diventano /xx/...
//   - PUT di articoli/pagine nella cartella lingua: aggiusta il front matter (lang, locale,
//     permalink /xx/..., ref, tr: tradotto + tr_hash) cosi' la tabella Lingue li vede "Tradotti".
// Dipende da lingue.js (lgSplit, lgGet, lgSet, lgDel, lgHash) e da index.html (REPO, tok, enc, dec,
// _tabCaricato, caricaLista, caricaPagine, caricaMenu, tornaListaArticoli, tornaPagine).
// Lingua base = default_lang di _config.yml: li' NIENTE cambia (il wrapper non fa nulla).
// =====================================================================================
(function () {
  const ADM = window.ADM = { base: 'it', lang: localStorage.getItem('cms_admin_lang') || '', langs: [], names: { it: 'Italiano', en: 'English', de: 'Deutsch', fr: 'Fran\u00e7ais', es: 'Espa\u00f1ol' }, ready: false };
  const SEZIONI = ['articoli', 'pagine', 'menu'];          // sezioni che seguono la lingua scelta
  const API = () => 'https://api.github.com/repos/' + REPO + '/contents/';
  const HDR = () => ({ headers: { 'Authorization': 'token ' + tok() } });
  const _fetch = window.fetch.bind(window);

  // true solo se: lingua non base + sezione attiva tra quelle che seguono la lingua
  function attivo() {
    if (!ADM.lang || ADM.lang === ADM.base) return false;
    const a = document.querySelector('.page.active');
    return !!a && SEZIONI.includes(a.id.replace(/^page-/, ''));
  }

  // path "della lingua base" -> path della lingua scelta (null = non toccare)
  function mappa(p) {
    const L = ADM.lang;
    if (p === '_posts' || p.startsWith('_posts/')) return { path: L + '/' + p };
    if (p === '_pages') return { path: L };                                   // elenco: cartella della lingua
    if (p.startsWith('_pages/')) return { path: L + '/' + p.slice(7) };
    const m = p.match(/^_data\/(navigation\.yml|sottomenu\.yml|shop_nav\.yml|blocks_[^\/]+\.json)$/);
    if (m) return { path: '_data/i18n/' + L + '/' + m[1], fallback: p };       // fallback = copia dalla base se manca
    return null;
  }

  // Front matter di un articolo/pagina salvato nella cartella lingua: lo allinea al sistema multilingua.
  async function sistemaPut(path, opt) {
    const L = ADM.lang;
    if (!new RegExp('^' + L + '/(?!_data/).+\\.(md|html)$').test(path)) return opt;
    const body = JSON.parse(opt.body);
    const s = lgSplit(dec(body.content)); if (!s.fm) return opt;
    let fm = s.fm;
    fm = lgSet(fm, 'lang', L); fm = lgSet(fm, 'locale', L);
    const pl = lgGet(fm, 'permalink');
    if (pl && !pl.startsWith('/' + L + '/')) fm = lgSet(fm, 'permalink', '/' + L + (pl.startsWith('/') ? pl : '/' + pl));
    // ref esistente (mai perderlo: collega le traduzioni) e contropartita nella lingua base
    const rel = path.slice(L.length + 1);
    const basePath = rel.startsWith('_posts/') ? rel : '_pages/' + rel;
    let ref = lgGet(fm, 'ref');
    if (!ref && body.sha) { const re = await _fetch(API() + path, HDR()); if (re.ok) ref = lgGet(lgSplit(dec((await re.json()).content)).fm, 'ref'); }
    const rb = await _fetch(API() + basePath, HDR());
    if (rb.ok) {
      const b = lgSplit(dec((await rb.json()).content));
      if (!ref) ref = lgGet(b.fm, 'ref') || rel.replace(/^_posts\//, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.(md|html)$/, '');
      fm = lgSet(fm, 'tr', 'tradotto'); fm = lgSet(fm, 'tr_hash', lgHash(b.body)); fm = lgDel(fm, 'sitemap');   // scritto da te = tradotto
    }
    if (ref) fm = lgSet(fm, 'ref', ref);
    body.content = enc('---\n' + fm.replace(/\s+$/, '') + '\n---\n' + s.body);
    return Object.assign({}, opt, { body: JSON.stringify(body) });
  }

  window.fetch = async function (url, opt) {
    if (typeof url !== 'string' || !attivo()) return _fetch(url, opt);
    const m = url.match(/^(https:\/\/api\.github\.com\/repos\/[^\/]+\/[^\/]+\/contents\/)([^?]*)(\?.*)?$/);
    if (!m) return _fetch(url, opt);
    const map = mappa(m[2]);
    if (!map) return _fetch(url, opt);
    const method = ((opt && opt.method) || 'GET').toUpperCase();
    const q = m[3] || '';
    if (method === 'GET') {
      const r = await _fetch(m[1] + map.path + q, opt);
      if (r.status === 404 && map.fallback) {                       // file lingua assente: parti dalla copia della base
        const rb = await _fetch(m[1] + map.fallback + q, opt);
        if (!rb.ok) return r;
        const j = await rb.json(); let t = dec(j.content);
        if (/navigation|sottomenu|shop_nav/.test(map.fallback)) t = t.replace(/(url:\s*["']?)\/(?!\/)/g, '$1/' + ADM.lang + '/');
        j.content = enc(t); j.sha = null; j.path = map.path;        // sha null => il salvataggio crea il file
        return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return r;
    }
    if (method === 'PUT') { try { opt = await sistemaPut(map.path, opt); } catch (e) { console.warn('lingua-admin PUT', e); } }
    return _fetch(m[1] + map.path + q, opt);
  };

  // ---------- selettore in barra ----------
  function aggiornaStile() {
    const sel = document.getElementById('adm-lang'), b = document.getElementById('adm-lang-badge');
    if (!sel) return;
    const altra = ADM.lang && ADM.lang !== ADM.base;
    sel.style.background = altra ? '#f59e0b' : 'rgba(255,255,255,.12)'; sel.style.color = altra ? '#1a1a2e' : '#fff';
    b.textContent = altra ? 'Stai modificando: ' + (ADM.names[ADM.lang] || ADM.lang) + ' (Articoli, Pagine, Home, Menu)' : '';
  }
  function cambia(v) {
    ADM.lang = (v === ADM.base) ? '' : v;
    localStorage.setItem('cms_admin_lang', ADM.lang);
    aggiornaStile();
    try { ['pagine', 'menu'].forEach(k => { delete _tabCaricato[k]; }); } catch (e) {}
    localStorage.removeItem('cms_cache_posts');
    // chiude gli editor aperti: cosi' non si salva per sbaglio nella lingua sbagliata
    try { tornaListaArticoli(); } catch (e) {}
    try { tornaPagine(); } catch (e) {}
    const a = document.querySelector('.page.active'), id = a ? a.id.replace(/^page-/, '') : '';
    if (id === 'pagine') caricaPagine(); else if (id === 'menu') caricaMenu();
  }
  async function init() {
    if (ADM.ready || !tok() || !document.querySelector('.topbar')) return;
    ADM.ready = true;
    try {
      const cfg = await _fetch(API() + '_config.yml', HDR());
      if (cfg.ok) { const m = dec((await cfg.json()).content).match(/^default_lang:\s*(\S+)/m); if (m) ADM.base = m[1].replace(/["']/g, ''); }
      const root = await _fetch(API(), HDR());                       // lingue = cartelle xx / xx-yy alla radice
      const dirs = root.ok ? (await root.json()).filter(f => f.type === 'dir' && /^[a-z]{2}(-[a-z]{2})?$/.test(f.name)).map(f => f.name) : [];
      const ly = await _fetch(API() + '_data/languages.yml', HDR());
      if (ly.ok) { const re = /^([a-z-]+):\s*\r?\n\s+name:\s*(.+)$/gm; const t = dec((await ly.json()).content); let m; while ((m = re.exec(t))) ADM.names[m[1]] = m[2].trim().replace(/["']/g, ''); }
      ADM.langs = [ADM.base].concat(dirs.filter(d => d !== ADM.base));
    } catch (e) { ADM.ready = false; return; }
    if (ADM.langs.length < 2) { ADM.lang = ''; return; }              // una sola lingua: niente selettore
    if (ADM.lang && !ADM.langs.includes(ADM.lang)) ADM.lang = '';
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;align-items:center;gap:10px';
    box.innerHTML = '<select id="adm-lang" title="Lingua dei contenuti che stai modificando" style="border:0;border-radius:4px;padding:3px 8px;font-size:13px;font-weight:600;cursor:pointer">'
      + ADM.langs.map(l => '<option value="' + l + '"' + ((ADM.lang || ADM.base) === l ? ' selected' : '') + ' style="color:#000">\uD83C\uDF10 ' + (ADM.names[l] || l) + '</option>').join('')
      + '</select><span id="adm-lang-badge" style="font-size:12px;color:#f59e0b"></span>';
    const bar = document.querySelector('.topbar'); bar.insertBefore(box, bar.children[1] || null);
    document.getElementById('adm-lang').onchange = e => cambia(e.target.value);
    aggiornaStile();
    // se avevo gia' una lingua salvata e sono su una sezione che la segue, ricarico l'elenco
    if (ADM.lang) { try { caricaLista(); } catch (e) {} }
  }
  // il token puo' arrivare dopo (onboarding): riprova finche' non parte
  init(); const t = setInterval(() => { if (ADM.ready) clearInterval(t); else init(); }, 1500);
})();
