// Lossless verifier: the publish tree must be byte-identical to .upstream
// except for the whitelist. Any divergence fails the run (exit 1).
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, UPSTREAM_DIR, DATA_DIR, readJson, writeJson, walkFiles, git,
} from './lib.mjs';

// Files we own outright (marketplace name/displayName) or partially
// (plugin.json interface.*). Everything else must be byte-identical.
const OWNED = new Set([
  '.agents/plugins/marketplace.json',
  '.agents/plugins/api_marketplace.json',
]);

function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = stable(v[k]);
    return o;
  }
  return v;
}
const sameJson = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

const pub = new Map();
const src = new Map();
for (const sub of ['plugins', '.agents']) {
  for (const rel of walkFiles(path.join(ROOT, sub), sub)) pub.set(rel, path.join(ROOT, rel));
  for (const rel of walkFiles(path.join(UPSTREAM_DIR, sub), sub)) src.set(rel, path.join(UPSTREAM_DIR, rel));
}

const union = [...new Set([...pub.keys(), ...src.keys()])].sort();
const divergences = [];
let byteIdentical = 0;
let whitelistedChecked = 0;

for (const rel of union) {
  const p = pub.get(rel);
  const s = src.get(rel);
  if (!p) { divergences.push({ rel, kind: 'missing-in-publish' }); continue; }
  if (!s) { divergences.push({ rel, kind: 'extra-not-in-upstream' }); continue; }
  if (OWNED.has(rel) || rel.endsWith('/.codex-plugin/plugin.json')) {
    whitelistedChecked++;
    const a = JSON.parse(fs.readFileSync(p, 'utf8'));
    const b = JSON.parse(fs.readFileSync(s, 'utf8'));
    const allowed = rel.endsWith('plugin.json') ? ['interface'] : ['name', 'interface'];
    const aRest = { ...a };
    const bRest = { ...b };
    for (const k of allowed) { delete aRest[k]; delete bRest[k]; }
    if (!sameJson(aRest, bRest)) divergences.push({ rel, kind: 'changed-outside-whitelist' });
  } else if (fs.readFileSync(p).equals(fs.readFileSync(s))) {
    byteIdentical++;
  } else {
    divergences.push({ rel, kind: 'content-diff' });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  upstreamSha: git(UPSTREAM_DIR, 'rev-parse', 'HEAD'),
  filesChecked: union.length,
  byteIdentical,
  whitelistedChecked,
  divergences,
  status: divergences.length ? 'fail' : 'pass',
};
writeJson(path.join(DATA_DIR, 'quality-report.json'), report);
console.log(
  `[verify] ${report.status.toUpperCase()} — ${union.length} files checked, ` +
    `${byteIdentical} byte-identical, ${whitelistedChecked} whitelisted, ` +
    `${divergences.length} divergences`,
);
for (const d of divergences.slice(0, 30)) console.log(`  - ${d.kind}: ${d.rel}`);
if (divergences.length) process.exit(1);
