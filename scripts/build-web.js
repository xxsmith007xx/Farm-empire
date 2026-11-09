// Copies the game's files into www/, the folder Capacitor packages into the app.
// Usage: npm run build   (then `npx cap sync` to copy www/ into the native projects)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'icon.svg', 'css', 'js', 'vendor', 'art'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of INCLUDE) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, item), { recursive: true });
}

// Add the Capacitor runtime and plugin scripts (app build only; the website doesn't need them).
const CAP = [
  ['core', 'dist/capacitor.js'], ['app', 'dist/plugin.js'], ['haptics', 'dist/plugin.js'],
  ['preferences', 'dist/plugin.js'], ['splash-screen', 'dist/plugin.js'], ['status-bar', 'dist/plugin.js']
];
fs.mkdirSync(path.join(out, 'vendor', 'capacitor'), { recursive: true });
const tags = CAP.map(([pkg, file]) => {
  const src = require.resolve('@capacitor/' + pkg + '/' + file, { paths: [root] });
  const name = 'vendor/capacitor/' + pkg + '.js';
  fs.copyFileSync(src, path.join(out, name));
  return '<script src="' + name + '"></script>';
}).join('\n');
const indexPath = path.join(out, 'index.html');
const page = fs.readFileSync(indexPath, 'utf8');
if (!page.includes('<script src="js/native.js"></script>')) throw new Error('index.html must load js/native.js');
fs.writeFileSync(indexPath, page.replace('<script src="js/native.js"></script>', tags + '\n<script src="js/native.js"></script>'));

// Fail loudly if index.html points at a file that didn't get copied.
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(r => !/^(https?:|data:|#)/.test(r));
const missing = refs.filter(r => !fs.existsSync(path.join(out, r)));
if (missing.length) {
  console.error('Missing files referenced by index.html:', missing.join(', '));
  process.exit(1);
}
const art = fs.existsSync(path.join(root, 'js', 'art.js')) ? fs.readFileSync(path.join(root, 'js', 'art.js'), 'utf8') : '';
const artRefs = [...art.matchAll(/src\s*[:=]\s*'([^']+)'/g)].map(m => m[1]).filter(r => !fs.existsSync(path.join(out, r)));
if (artRefs.length) {
  console.error('Missing artwork referenced by js/art.js:', artRefs.join(', '));
  process.exit(1);
}
console.log(`Built www/ (${refs.length} files referenced by index.html, all present)`);
