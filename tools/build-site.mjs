// Build the static site into dist/ (site assets + data/catalog.json).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_DIR } from './lib.mjs';

const dist = path.join(ROOT, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const f of ['index.html', 'style.css', 'app.js']) {
  fs.copyFileSync(path.join(ROOT, 'site', f), path.join(dist, f));
}
fs.copyFileSync(path.join(DATA_DIR, 'catalog.json'), path.join(dist, 'catalog.json'));
console.log('[build-site] dist/ ready');
