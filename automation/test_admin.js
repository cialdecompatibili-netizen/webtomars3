// automation/test_admin.js - SMOKE TEST DELL'ADMIN (senza browser, senza token, senza rete).
// USO (dalla radice del sito):  node automation/test_admin.js [lingua]      es. node automation/test_admin.js en
// COSA FA: carica admin/index.html con TUTTI i js, finge le risposte dell'API GitHub leggendo i file locali e controlla che:
//   1) nessuno script sollevi errori all'avvio (es. "SeoPanel is not defined" = admin bloccato, categorie sparite)
//   2) le categorie compaiano nell'elenco e nel menu a tendina dell'articolo
// Esce con codice 1 se qualcosa non va: lanciarlo PRIMA di ogni push che tocca admin/.
// REQUISITO: jsdom. Se manca:  cd <cartella qualsiasi> && npm install jsdom  e impostare JSDOM_DIR (di default cerca in
//   ../../claudetemp/chk/node_modules e in ./node_modules).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let JSDOM, VirtualConsole;
for (const d of [process.env.JSDOM_DIR, path.join(ROOT, 'node_modules'), path.join(ROOT, '..', '..', 'claudetemp', 'chk', 'node_modules')].filter(Boolean)) {
  try { ({ JSDOM, VirtualConsole } = require(path.join(d, 'jsdom'))); break; } catch (e) {}
}
if (!JSDOM) { console.log('jsdom non trovato: installa con "npm install jsdom" o imposta JSDOM_DIR'); process.exit(2); }

let html = fs.readFileSync(path.join(ROOT, 'admin/index.html'), 'utf8');
// i <script src="js/x.js"> diventano inline (stesso ordine della pagina vera)
html = html.replace(/<script src="(js\/[^"?]+)[^"]*"><\/script>/g, (m, p) =>
  '<script>' + fs.readFileSync(path.join(ROOT, 'admin', p), 'utf8').replace(/<\/script>/g, '<\\/script>') + '</script>');

const errori = [], richieste = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errori.push(String((e.detail && e.detail.message) || e.message || e).split('\n')[0]));
const dom = new JSDOM(html, {
  url: 'https://utente.github.io/repo/admin/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.localStorage.setItem('gh_token', 'ghp_test');
    if (process.argv[2]) w.localStorage.setItem('cms_admin_lang', process.argv[2]);
    w.atob = s => Buffer.from(s, 'base64').toString('binary'); w.btoa = s => Buffer.from(s, 'binary').toString('base64');
    w.fetch = async (url, opt) => {            // finta API GitHub contents: legge dal disco
      const m = String(url).match(/repos\/[^\/]+\/[^\/]+\/contents\/?([^?]*)/);
      if (!m) return new Response('{}', { status: 200 });
      const p = decodeURIComponent(m[1]).replace(/\/$/, ''); richieste.push(((opt && opt.method) || 'GET') + ' ' + p);
      const fp = path.join(ROOT, p);
      if (!fs.existsSync(fp)) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      if (fs.statSync(fp).isDirectory()) return new Response(JSON.stringify(fs.readdirSync(fp).map(n => ({ name: n, path: (p ? p + '/' : '') + n, type: fs.statSync(path.join(fp, n)).isDirectory() ? 'dir' : 'file', sha: 's' + n }))), { status: 200 });
      return new Response(JSON.stringify({ name: path.basename(p), path: p, sha: 'sha1', content: fs.readFileSync(fp).toString('base64') }), { status: 200 });
    };
  }
});
setTimeout(() => {
  const d = dom.window.document, opts = [...d.getElementById('categorie').options].map(o => o.value).filter(Boolean);
  const listaOk = /wp-list|cat-row/.test((d.getElementById('lista-categorie') || {}).innerHTML || '');
  if (!richieste.some(r => /_data\/categorie\.json/.test(r))) errori.push('categorie.json mai richiesto: l\'avvio dell\'admin si e\' bloccato prima');
  if (!opts.length) errori.push('menu categorie dell\'articolo vuoto');
  if (!listaOk) errori.push('elenco in admin > Categorie vuoto');
  console.log('categorie nel menu:', opts.join(', ') || '(nessuna)');
  if (errori.length) { console.log('\nERRORI:\n - ' + errori.join('\n - ')); process.exit(1); }
  console.log('ADMIN OK (nessun errore di avvio)'); process.exit(0);
}, 3500);
