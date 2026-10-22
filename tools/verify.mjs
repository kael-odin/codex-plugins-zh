// Two-provenance lossless verifier.
//   upstream part (plugins in openai/plugins manifests) — vs .upstream,
//     whitelist: plugin.json interface.* ; manifests: name/interface + appended entries
//   snapshot part (extras merged from .seed) — byte-identical vs .seed
//   .claude-plugin/marketplace.json — generated owned file (no upstream
//     counterpart), drift-checked against the Codex manifest and the plugin
//     manifests whose zh text it repeats
// Any divergence fails the run (exit 1).
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, UPSTREAM_DIR, DATA_DIR, readJson, writeJson, walkFiles, git, sourceDate,
} from './lib.mjs';

const SEED_DIR = path.join(ROOT, process.env.SEED_DIR ?? '.seed');
const MANIFESTS = new Set([
  '.agents/plugins/marketplace.json',
  '.agents/plugins/api_marketplace.json',
]);

const stable = (v) => {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = stable(v[k]);
    return o;
  }
  return v;
};
const sameJson = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

function loadNames(baseDir, file) {
  const p = path.join(baseDir, '.agents', 'plugins', file);
  if (!fs.existsSync(p)) return new Set();
  return new Set(JSON.parse(fs.readFileSync(p, 'utf8')).plugins.map((x) => x.name));
}
const upstreamNames = new Set([
  ...loadNames(UPSTREAM_DIR, 'marketplace.json'),
  ...loadNames(UPSTREAM_DIR, 'api_marketplace.json'),
]);
const seedNames = new Set([
  ...loadNames(SEED_DIR, 'marketplace.json'),
  ...loadNames(SEED_DIR, 'api_marketplace.json'),
]);

// ---- gather publish files
const pub = new Map();
for (const sub of ['plugins', '.agents']) {
  for (const rel of walkFiles(path.join(ROOT, sub), sub)) pub.set(rel, path.join(ROOT, rel));
}

const divergences = [];
let upstreamBytes = 0;
let seedBytes = 0;
let whitelisted = 0;

function checkManifest(rel) {
  const ours = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const upstreamFile = rel.endsWith('api_marketplace.json') ? 'api_marketplace.json' : 'marketplace.json';
  const upEntries = new Map(
    JSON.parse(fs.readFileSync(path.join(UPSTREAM_DIR, '.agents', 'plugins', upstreamFile), 'utf8'))
      .plugins.map((x) => [x.name, x]),
  );
  const seedEntries = fs.existsSync(path.join(SEED_DIR, '.agents', 'plugins', upstreamFile))
    ? new Map(
        JSON.parse(fs.readFileSync(path.join(SEED_DIR, '.agents', 'plugins', upstreamFile), 'utf8'))
          .plugins.map((x) => [x.name, x]),
      )
    : new Map();
  let upstreamEntries = 0;
  let extraEntries = 0;
  // category is whitelist-owned (zh remap via glossary) — exclude from entry equality
  const stripCat = (e) => { const c = { ...e }; delete c.category; return c; };
  for (const entry of ours.plugins) {
    if (upEntries.has(entry.name)) {
      if (!sameJson(stripCat(entry), stripCat(upEntries.get(entry.name)))) {
        divergences.push({ rel, kind: 'manifest-upstream-entry-changed', extra: entry.name });
      } else upstreamEntries++;
    } else if (seedEntries.has(entry.name)) {
      if (!sameJson(stripCat(entry), stripCat(seedEntries.get(entry.name)))) {
        divergences.push({ rel, kind: 'manifest-snapshot-entry-changed', extra: entry.name });
      } else extraEntries++;
    } else {
      divergences.push({ rel, kind: 'manifest-unknown-entry', extra: entry.name });
    }
  }
  if (typeof ours.name !== 'string' || typeof ours.interface?.displayName !== 'string') {
    divergences.push({ rel, kind: 'manifest-missing-zh-identity' });
  }
  return { upstreamEntries, extraEntries };
}

let manifestStats = { upstreamEntries: 0, extraEntries: 0 };
const seenDirs = new Map(); // plugin dir -> provenance

for (const rel of [...pub.keys()].sort()) {
  const p = pub.get(rel);
  if (MANIFESTS.has(rel)) {
    const s = checkManifest(rel);
    manifestStats.upstreamEntries = Math.max(manifestStats.upstreamEntries, s.upstreamEntries);
    manifestStats.extraEntries = Math.max(manifestStats.extraEntries, s.extraEntries);
    continue;
  }
  if (rel.startsWith('.agents/')) {
    const src = path.join(UPSTREAM_DIR, rel);
    if (!fs.existsSync(src)) { divergences.push({ rel, kind: 'extra-not-in-upstream' }); continue; }
    if (fs.readFileSync(p).equals(fs.readFileSync(src))) upstreamBytes++;
    else divergences.push({ rel, kind: 'content-diff-vs-upstream' });
    continue;
  }
  const dirName = rel.match(/^plugins\/([^/]+)\/(.*)$/);
  if (!dirName) { divergences.push({ rel, kind: 'unexpected-path' }); continue; }
  const dir = dirName[1];
  const inner = dirName[2];
  seenDirs.set(dir, true);
  // physical-first provenance: whichever source actually has the plugin dir
  // is the ground truth for it (manifest membership can lag on both sides)
  let base;
  let mode;
  if (fs.existsSync(path.join(UPSTREAM_DIR, 'plugins', dir))) {
    base = path.join(UPSTREAM_DIR, 'plugins', dir);
    mode = 'upstream';
  } else if (fs.existsSync(path.join(SEED_DIR, 'plugins', dir))) {
    base = path.join(SEED_DIR, 'plugins', dir);
    mode = 'seed';
  } else {
    divergences.push({ rel, kind: 'orphan-in-publish' });
    continue;
  }
  const src = path.join(base, inner);
  if (!fs.existsSync(src)) { divergences.push({ rel, kind: `extra-not-in-${mode}` }); continue; }
  if (mode === 'upstream' && inner === '.codex-plugin/plugin.json') {
    whitelisted++;
    const a = JSON.parse(fs.readFileSync(p, 'utf8'));
    const b = JSON.parse(fs.readFileSync(src, 'utf8'));
    const aRest = { ...a };
    const bRest = { ...b };
    delete aRest.interface;
    delete bRest.interface;
    if (!sameJson(aRest, bRest)) divergences.push({ rel, kind: 'changed-outside-whitelist' });
  } else if (mode === 'seed' && inner === '.codex-plugin/plugin.json') {
    // snapshot manifests get the same narrow allowance: interface.category may be
    // zh-remapped; every other field (incl. the seed's own zh copy) stays strict
    whitelisted++;
    const stripCat = (f) => {
      const m = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (m.interface) delete m.interface.category;
      return m;
    };
    if (!sameJson(stripCat(p), stripCat(src))) {
      divergences.push({ rel, kind: 'changed-outside-whitelist' });
    }
  } else if (fs.readFileSync(p).equals(fs.readFileSync(src))) {
    if (mode === 'upstream') upstreamBytes++; else seedBytes++;
  } else {
    divergences.push({ rel, kind: mode === 'upstream' ? 'content-diff-vs-upstream' : 'content-diff-vs-seed' });
  }
}

// every expected dir must be present
for (const name of seedNames) {
  if (!seenDirs.has(name) && fs.existsSync(path.join(SEED_DIR, 'plugins', name))) {
    divergences.push({ rel: `plugins/${name}/`, kind: 'missing-from-publish' });
  }
}

// Generated file with no upstream counterpart: the Claude Code marketplace.
// It is derived from two sources — the Codex manifest (entry set, name,
// category) and each plugin's own .codex-plugin/plugin.json (.codex-plugin
// interface text, which is what Claude Code never reads) — so it must not drift
// from either.
const CLAUDE_MANIFEST = '.claude-plugin/marketplace.json';
let claudeEntries = 0;
{
  const p = path.join(ROOT, CLAUDE_MANIFEST);
  if (!fs.existsSync(p)) {
    divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-file-missing' });
  } else {
    const cm = JSON.parse(fs.readFileSync(p, 'utf8'));
    const mainM = JSON.parse(fs.readFileSync(path.join(ROOT, '.agents', 'plugins', 'marketplace.json'), 'utf8'));
    const mainEntries = new Map(mainM.plugins.map((e) => [e.name, e]));
    if (typeof cm.name !== 'string' || !cm.name || cm.name !== mainM.name) {
      divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-name-mismatch' });
    }
    if (typeof cm.owner?.name !== 'string') divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-missing-owner' });
    if (typeof cm.description !== 'string' || !cm.description.trim()) {
      divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-missing-description' });
    }
    const seen = new Set();
    for (const e of cm.plugins ?? []) {
      seen.add(e.name);
      const m = mainEntries.get(e.name);
      if (!m) { divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-unknown-entry', extra: e.name }); continue; }
      if (e.source !== `./plugins/${e.name}`) {
        divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-source-drift', extra: e.name });
      }
      if (e.category !== m.category) {
        divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-category-drift', extra: e.name });
      }
      const mf = path.join(ROOT, 'plugins', e.name, '.codex-plugin', 'plugin.json');
      if (!fs.existsSync(mf)) {
        divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-entry-without-plugin-dir', extra: e.name });
        continue;
      }
      const iface = JSON.parse(fs.readFileSync(mf, 'utf8')).interface ?? {};
      // same field compose picks: the concise one, not the paragraph-length
      // longDescription Claude would have to render on a card
      const want = (iface.shortDescription || iface.longDescription || '').trim();
      if (!want) divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-entry-without-description', extra: e.name });
      else if (e.description !== want) {
        divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-description-drift', extra: e.name });
      }
      claudeEntries++;
    }
    for (const name of mainEntries.keys()) {
      if (fs.existsSync(path.join(ROOT, 'plugins', name, '.codex-plugin', 'plugin.json')) && !seen.has(name)) {
        divergences.push({ rel: CLAUDE_MANIFEST, kind: 'owned-entry-dropped', extra: name });
      }
    }
  }
}

const report = {
  // data date, not generation time — the report is a function of the tree it
  // checked, so re-running it locally never dirties the working copy.
  generatedAt: sourceDate(UPSTREAM_DIR),
  upstreamSha: git(UPSTREAM_DIR, 'rev-parse', 'HEAD'),
  filesChecked: pub.size,
  byteIdentical: { upstream: upstreamBytes, snapshot: seedBytes },
  whitelistedChecked: whitelisted,
  manifests: manifestStats,
  claudeMarketplaceEntries: claudeEntries,
  divergences,
  status: divergences.length ? 'fail' : 'pass',
};
// always written: it records which sha/seed this tree was verified against, and
// with a deterministic generatedAt an unchanged tree produces an unchanged file.
writeJson(path.join(DATA_DIR, 'quality-report.json'), report);
console.log(
  `[verify] ${report.status.toUpperCase()} — ${pub.size} files | upstream bytes: ${upstreamBytes}, ` +
    `snapshot bytes: ${seedBytes}, whitelisted: ${whitelisted}, ` +
    `manifest entries: ${manifestStats.upstreamEntries} upstream + ${manifestStats.extraEntries} snapshot | ` +
    `claude manifest: ${claudeEntries} entries | ` +
    `${divergences.length} divergences`,
);
for (const d of divergences.slice(0, 30)) console.log(`  - ${d.kind}: ${d.rel}${d.extra ? ` (${d.extra})` : ''}`);
if (divergences.length) process.exit(1);
