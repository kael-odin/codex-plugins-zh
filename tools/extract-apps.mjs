// Extract the bilingual 1699-item dataset (items + inline base64 icons) from
// Source-blip's single-file catalog app and convert it into our data model.
//
//   node tools/extract-apps.mjs <path-to-index.html>
//
// Writes:
//   data/apps-zh.json      slim dataset (plugins filtered out — they live in our catalog)
//   site/appicons/<id>.<ext>   decoded icon files, referenced from the JSON
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_DIR } from './lib.mjs';

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('[extract-apps] usage: node tools/extract-apps.mjs <index.html>');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const arrStart = html.indexOf('const ITEMS=[');
if (arrStart < 0) { console.error('[extract-apps] const ITEMS not found'); process.exit(1); }
const from = arrStart + 'const ITEMS='.length;
const end = html.indexOf('];', from);
const items = JSON.parse(html.slice(from, end + 1));
console.log(`[extract-apps] source items: ${items.length}`);

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif' };
const iconsDir = path.join(ROOT, 'site', 'appicons');
fs.mkdirSync(iconsDir, { recursive: true });

const apps = [];
const aliases = {};
let iconCount = 0;
let iconBytes = 0;
for (const it of items) {
  let icon = null;
  if (typeof it.icon === 'string' && it.icon.startsWith('data:image/')) {
    const m = it.icon.match(/^data:([^;]+);base64,(.*)$/s);
    if (m) {
      const ext = EXT[m[1]] ?? 'png';
      const buf = Buffer.from(m[2], 'base64');
      const file = `appicons/${it.id}.${ext}`;
      fs.writeFileSync(path.join(ROOT, 'site', file), buf);
      icon = file;
      iconCount++;
      iconBytes += buf.length;
    }
  }
  const shortKeywords = [...new Set((it.keywords ?? []).filter((k) => typeof k === 'string' && k.length > 0 && k.length <= 24))].slice(0, 12);
  if (it.kind === '可安装插件' || it.kind === '已安装插件') {
    // plugins live in our catalog — keep only their Chinese search aliases
    const pname = it.sourceId?.includes('@') ? it.sourceId.split('@')[0] : it.id.replace(/^plugin-/, '');
    aliases[pname] = [...new Set([it.cn, ...shortKeywords].filter((k) => k && k.length <= 24))].slice(0, 14);
    continue;
  }
  apps.push({
    id: it.id,
    en: it.en,
    zh: it.cn,
    category: it.category,
    kind: it.kind,
    status: it.status,
    version: it.version ?? null,
    plain: it.plain ?? '',
    enDesc: it.originalDescription ?? '',
    installUrl: it.installUrl ?? null,
    sourceId: it.sourceId ?? null,
    keywords: shortKeywords,
    icon,
    iconStatus: it.iconStatus ?? null,
    snapshot: 'source-blip 2026-07-15',
  });
}

apps.sort((a, b) => a.en.localeCompare(b.en));
const out = path.join(DATA_DIR, 'apps-zh.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(out, JSON.stringify(apps, null, 0) + '\n', 'utf8');
fs.writeFileSync(path.join(DATA_DIR, 'plugin-aliases.json'), JSON.stringify(aliases, null, 0) + '\n', 'utf8');
console.log(`[extract-apps] apps: ${apps.length}, icons: ${iconCount} (${(iconBytes / 1048576).toFixed(1)} MB), plugin aliases: ${Object.keys(aliases).length} -> ${out}`);
