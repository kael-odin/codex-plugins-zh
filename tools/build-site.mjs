// Build the static site into dist/ (site assets + catalog with resolved icons).
// Real plugin icons are copied to dist/icons/ — selection prefers small SVGs,
// falls back to the smallest PNG under 400KB, and always degrades gracefully
// to the monogram tile in the UI when nothing usable exists.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_DIR } from './lib.mjs';

const dist = path.join(ROOT, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const f of ['index.html', 'style.css', 'app.js']) {
  fs.copyFileSync(path.join(ROOT, 'site', f), path.join(dist, f));
}
if (fs.existsSync(path.join(ROOT, 'site', 'og.png'))) {
  fs.copyFileSync(path.join(ROOT, 'site', 'og.png'), path.join(dist, 'og.png'));
}

const catalog = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'catalog.json'), 'utf8'));
const iconsDir = path.join(dist, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const BASE_CANDIDATES = ['assets/icon.svg', 'assets/logo.svg', 'assets/icon.png', 'assets/logo.png', 'assets/logo-dark.png'];
let withIcon = 0;

for (const p of catalog.plugins) {
  const dir = path.join(ROOT, 'plugins', p.name);
  if (p.missing || !fs.existsSync(dir)) continue;
  const rel = (s) => (s ? path.join(dir, s.replace(/^\.\//, '')) : null);
  const candidates = [rel(p.icon), ...BASE_CANDIDATES.map(rel)].filter(Boolean);
  const usable = candidates.filter((f) => fs.existsSync(f));
  let chosen = null;
  const svgs = usable.filter((f) => f.endsWith('.svg') && fs.statSync(f).size < 200 * 1024);
  if (svgs.length) chosen = svgs[0];
  else if (usable.length) {
    const under = usable.filter((f) => !f.endsWith('.svg') && fs.statSync(f).size < 400 * 1024);
    const pool = under.length ? under : usable;
    chosen = pool.sort((a, b) => fs.statSync(a).size - fs.statSync(b).size)[0];
  }
  if (chosen) {
    const target = `icons/${p.name}${path.extname(chosen)}`;
    fs.copyFileSync(chosen, path.join(dist, target));
    p.icon = target;
    withIcon++;
  } else {
    p.icon = null;
  }
}

catalog.iconCount = withIcon;
fs.writeFileSync(path.join(dist, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`[build-site] dist/ ready — ${catalog.plugins.length} plugins, ${withIcon} real icons`);
