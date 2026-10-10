// Build the static site into dist/ (site assets + catalog with resolved icons
// + the ChatGPT apps dataset with its 1699 extracted icons).
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
const appiconsDir = path.join(ROOT, 'site', 'appicons');
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
  // final fallback: the icon extracted from the source-blip dataset (<name>.* or plugin-<name>.*)
  if (!chosen && fs.existsSync(appiconsDir)) {
    const hit = fs.readdirSync(appiconsDir).find((f) => f.startsWith(`${p.name}.`) || f.startsWith(`plugin-${p.name}.`));
    if (hit) chosen = path.join(appiconsDir, hit);
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
fs.writeFileSync(path.join(dist, 'catalog.json'), JSON.stringify(catalog, null, 0), 'utf8');

// claude sister-catalog: prefer a fresh copy from the live claude site, fall
// back to the committed snapshot (data/claude-catalog.json)
const claudeTargets = [
  'https://kael-odin.github.io/claude-plugins-zh/catalog.json',
  path.join(DATA_DIR, 'claude-catalog.json'),
];
let claudeOk = false;
for (const src of claudeTargets) {
  try {
    let text;
    if (src.startsWith('http')) {
      const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      text = await res.text();
    } else {
      text = fs.readFileSync(src, 'utf8');
    }
    const parsed = JSON.parse(text);
    if (!parsed.total) continue;
    fs.writeFileSync(path.join(dist, 'claude.json'), JSON.stringify(parsed, null, 0), 'utf8');
    claudeOk = true;
    break;
  } catch { /* try next source */ }
}

// apps dataset + its icons + plugin zh aliases
if (fs.existsSync(path.join(DATA_DIR, 'apps-zh.json'))) {
  fs.copyFileSync(path.join(DATA_DIR, 'apps-zh.json'), path.join(dist, 'apps-zh.json'));
}
if (fs.existsSync(path.join(DATA_DIR, 'plugin-aliases.json'))) {
  fs.copyFileSync(path.join(DATA_DIR, 'plugin-aliases.json'), path.join(dist, 'plugin-aliases.json'));
}
if (fs.existsSync(appiconsDir)) {
  fs.cpSync(appiconsDir, path.join(dist, 'appicons'), { recursive: true });
}

console.log(`[build-site] dist/ ready — ${catalog.plugins.length} plugins (${withIcon} icons) + apps dataset${claudeOk ? ' + claude catalog' : ' (claude catalog unavailable)'}`);
