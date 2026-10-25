// Build the static site into dist/ (site assets + catalog with resolved icons
// + the ChatGPT apps dataset with its official icons).
//
// dist/index.html is NOT a copy: site/index.html carries {{TOKEN}} placeholders
// for every user-visible count, and they are filled in here from the datasets so
// the SEO/no-JS copy can never drift from the data it describes.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_DIR, readJson, writeJson, choosePluginIcon } from './lib.mjs';

const dist = path.join(ROOT, 'dist');
// GitHub Pages project-site base. The 404 redirect must be root-absolute:
// a relative "./" resolves against the *broken* deep path and 404s again.
const SITE_BASE = '/codex-plugins-zh/';

const fail = (msg) => {
  console.error(`[build-site] FAIL — ${msg}`);
  process.exit(1);
};

const catalog = readJson(path.join(DATA_DIR, 'catalog.json'));
const apps = readJson(path.join(DATA_DIR, 'apps-zh.json'), []);

// A build that silently drops the apps dataset (or every icon) still "succeeds",
// and ships a site whose headline count is a lie. Refuse instead.
if (!catalog.total) fail('catalog.json has no plugins — run tools/compose.mjs first');
if (!apps.length) fail('data/apps-zh.json missing or empty — the 1,505-entry apps section would vanish');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, '.nojekyll'), '', 'utf8');
fs.writeFileSync(
  path.join(dist, '404.html'),
  `<!doctype html><meta charset="utf-8"><title>404</title>` +
    `<meta http-equiv="refresh" content="0; url=${SITE_BASE}">` +
    `<p><a href="${SITE_BASE}">→ 回到插件导航首页</a></p>`,
  'utf8',
);
fs.writeFileSync(path.join(dist, 'robots.txt'), ['User-agent: *', 'Allow: /', ''].join(String.fromCharCode(10)), 'utf8');
for (const f of ['style.css', 'app.js']) {
  fs.copyFileSync(path.join(ROOT, 'site', f), path.join(dist, f));
}
if (fs.existsSync(path.join(ROOT, 'site', 'og.png'))) {
  fs.copyFileSync(path.join(ROOT, 'site', 'og.png'), path.join(dist, 'og.png'));
}

const iconsDir = path.join(dist, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

let withIcon = 0;

for (const p of catalog.plugins) {
  const dir = path.join(ROOT, 'plugins', p.name);
  if (p.missing || !fs.existsSync(dir)) continue;
  // p.icon here is still compose's manifest-relative path (composerIcon/logo)
  // when present; choosePluginIcon adds the conventional assets/* names and the
  // site/appicons favicon backfill, preferring SVG then the smallest raster.
  const chosen = choosePluginIcon(dir, p.icon ? [p.icon] : []);
  if (chosen) {
    const target = `icons/${p.name}${path.extname(chosen)}`;
    fs.copyFileSync(chosen, path.join(dist, target));
    p.icon = target;
    withIcon++;
  } else {
    p.icon = null;
  }
}
if (!withIcon) fail('no plugin icon resolved — plugins/ looks empty or unrecognised');

catalog.iconCount = withIcon;
writeJson(path.join(dist, 'catalog.json'), catalog);

// apps dataset + its icons + plugin zh aliases
fs.copyFileSync(path.join(DATA_DIR, 'apps-zh.json'), path.join(dist, 'apps-zh.json'));
if (fs.existsSync(path.join(DATA_DIR, 'plugin-aliases.json'))) {
  fs.copyFileSync(path.join(DATA_DIR, 'plugin-aliases.json'), path.join(dist, 'plugin-aliases.json'));
}
const appiconsDir = path.join(ROOT, 'site', 'appicons');
if (fs.existsSync(appiconsDir)) {
  fs.cpSync(appiconsDir, path.join(dist, 'appicons'), { recursive: true });
}
const appIcons = fs.existsSync(appiconsDir) ? fs.readdirSync(appiconsDir).length : 0;

const stats = {
  plugins: catalog.total,
  apps: apps.length,
  total: catalog.total + apps.length,
  pluginIcons: withIcon,
  appIcons,
};
writeJson(path.join(DATA_DIR, 'site-stats.json'), stats);

// index.html: fill the count placeholders (README numbers and this file's
// assertions both read data/site-stats.json — one source, no hand-typed totals)
const fmt = (n) => n.toLocaleString('en-US');
let html = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8');
for (const [key, value] of Object.entries({
  TOTAL: stats.total, PLUGINS: stats.plugins, APPS: stats.apps, PLUGIN_ICONS: stats.pluginIcons,
})) {
  html = html.replaceAll(`{{${key}}}`, fmt(value));
}
const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) fail(`unfilled placeholder(s) in site/index.html: ${[...new Set(leftover)].join(', ')}`);
fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8');

console.log(
  `[build-site] dist/ ready — ${stats.plugins} plugins (${stats.pluginIcons} icons) ` +
    `+ ${fmt(stats.apps)} apps (${fmt(stats.appIcons)} icons) = ${fmt(stats.total)} items`,
);
