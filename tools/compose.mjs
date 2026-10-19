// Compose the publish tree (repo root) from THREE sources:
//   .upstream  — github.com/openai/plugins (authoritative, lossless-verified)
//   .seed      — full-catalog snapshot (cnb.cool echobird/codex-plugins, 192 entries)
//                supplies plugins the git repo does not ship (remote-curated set)
//   i18n/zh    — translation ledger for the upstream part
//
// Provenance is explicit: data/full-catalog.json records which plugin came from
// where; tools/verify.mjs checks upstream files against .upstream and snapshot
// files against .seed. Intentional divergence is confined to the whitelist:
//   - .agents/plugins/{marketplace,api_marketplace}.json → name/interface + appended entries
//   - plugins/*/.codex-plugin/plugin.json (upstream only) → interface.* only
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ROOT, UPSTREAM_DIR, DATA_DIR, I18N_DIR,
  readJson, writeJson, textKey, git, toPosix, hasCJK, walkFiles, sourceDate,
} from './lib.mjs';

const cfg = readJson(path.join(ROOT, 'config', 'zh-marketplace.json'));
const glossary = readJson(path.join(ROOT, 'config', 'glossary.json'), {});
const diff = readJson(path.join(DATA_DIR, 'diff.json'));
const SEED_DIR = path.join(ROOT, process.env.SEED_DIR ?? '.seed');

// 1) prune what upstream deleted since last sync
for (const rel of diff.files.removed ?? []) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) fs.rmSync(p, { force: true });
}
for (const name of diff.plugins.removed ?? []) {
  fs.rmSync(path.join(ROOT, 'plugins', name), { recursive: true, force: true });
  console.log(`[compose] removed plugin: ${name}`);
}

// 2) materialize the two upstream subtrees over the publish tree
execFileSync(
  'bash',
  ['-c', `git -C '${toPosix(UPSTREAM_DIR)}' archive HEAD -- .agents plugins | tar -x -C '${toPosix(ROOT)}'`],
);
console.log('[compose] materialized .agents + plugins from upstream');

// 3) marketplace-level overrides (owned files)
const mfDir = path.join(ROOT, '.agents', 'plugins');
const manifestPaths = {
  main: path.join(mfDir, 'marketplace.json'),
  api: path.join(mfDir, 'api_marketplace.json'),
};
for (const [k, mcfg] of [['main', cfg.marketplace], ['api', cfg.apiMarketplace]]) {
  const m = JSON.parse(fs.readFileSync(manifestPaths[k], 'utf8'));
  m.name = mcfg.name;
  m.interface = { ...(m.interface ?? {}), displayName: mcfg.displayName };
  writeJson(manifestPaths[k], m);
}

// 4) merge snapshot extras from .seed (the full curated catalog)
const seedAvailable = fs.existsSync(path.join(SEED_DIR, '.agents', 'plugins', 'marketplace.json'));
const extras = { merged: 0, names: [], snapshot: null };
if (seedAvailable) {
  const seedMf = {
    main: JSON.parse(fs.readFileSync(path.join(SEED_DIR, '.agents', 'plugins', 'marketplace.json'), 'utf8')),
    api: JSON.parse(fs.readFileSync(path.join(SEED_DIR, '.agents', 'plugins', 'api_marketplace.json'), 'utf8')),
  };
  const ours = {
    main: JSON.parse(fs.readFileSync(manifestPaths.main, 'utf8')),
    api: JSON.parse(fs.readFileSync(manifestPaths.api, 'utf8')),
  };
  const have = {
    main: new Set(ours.main.plugins.map((p) => p.name)),
    api: new Set(ours.api.plugins.map((p) => p.name)),
  };
  const toMerge = new Map();
  for (const key of ['main', 'api']) {
    for (const entry of seedMf[key].plugins) {
      if (!have[key].has(entry.name)) {
        (toMerge.get(entry.name) ?? toMerge.set(entry.name, []).get(entry.name)).push({ key, entry });
      }
    }
  }
  for (const [name, placements] of toMerge) {
    const srcDir = path.join(SEED_DIR, 'plugins', name);
    const dstDir = path.join(ROOT, 'plugins', name);
    // upstream is authoritative whenever it physically ships the plugin —
    // seed must never overwrite it (seed's catalog lists those too, but its
    // copy can be older/translated). Refresh only true seed-only plugins.
    const upstreamPhysical = fs.existsSync(path.join(UPSTREAM_DIR, 'plugins', name));
    if (!upstreamPhysical && fs.existsSync(srcDir)) {
      if (process.env.DEBUG_SEED) console.log(`[compose] cpSync seed->publish: ${name}`);
      fs.cpSync(srcDir, dstDir, { recursive: true, force: true });
    }
    for (const { key, entry } of placements) ours[key].plugins.push(entry);
    extras.names.push(name);
    extras.merged++;
  }
  for (const key of ['main', 'api']) writeJson(manifestPaths[key], ours[key]);
  let seedDate = null;
  try { seedDate = git(SEED_DIR, 'log', '-1', '--format=%ci'); } catch { seedDate = null; }
  extras.snapshot = { repo: cfg.seedRepo, commitDate: seedDate, entries: seedMf.main.plugins.length };
  console.log(`[compose] snapshot extras merged: ${extras.merged} (seed has ${seedMf.main.plugins.length} entries @ ${seedDate ?? 'unknown date'})`);

// 4b) orphan sweep: a publish plugin dir must exist in a source (upstream or
// seed). Anything else is a stale leftover and gets pruned.
let pruned = 0;
const pdir = path.join(ROOT, 'plugins');
for (const name of fs.readdirSync(pdir)) {
  const inUpstream = fs.existsSync(path.join(UPSTREAM_DIR, 'plugins', name));
  const inSeedDir = fs.existsSync(path.join(SEED_DIR, 'plugins', name));
  if (!inUpstream && !inSeedDir) {
    fs.rmSync(path.join(pdir, name), { recursive: true, force: true });
    pruned++;
    console.log(`[compose] pruned orphan plugin dir: ${name}`);
  }
}
if (pruned) console.log(`[compose] orphans pruned: ${pruned}`);
} else {
  console.log('[compose] WARNING: .seed not found — publishing upstream-only catalog');
}

// 4b) Chinese categories — the manifest category field and plugin.json
// interface.category are whitelist-owned, so the Codex UI shows 中文分类.
const mapCat = (c) => glossary[c] ?? c;
for (const key of ['main', 'api']) {
  const m = JSON.parse(fs.readFileSync(manifestPaths[key], 'utf8'));
  for (const entry of m.plugins) if (entry.category) entry.category = mapCat(entry.category);
  writeJson(manifestPaths[key], m);
}
for (const name of fs.readdirSync(path.join(ROOT, 'plugins'))) {
  const mf = path.join(ROOT, 'plugins', name, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(mf)) continue;
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (m.interface?.category) {
    m.interface.category = mapCat(m.interface.category);
    writeJson(mf, m);
  }
}
console.log('[compose] categories mapped to zh');

// 4c) purge seed-era leftovers inside upstream-physical plugin dirs
// (cpSync merges never delete, so files that only exist in the seed copy
// would otherwise linger forever inside upstream directories)
let purgedFiles = 0;
const upPluginsDir = path.join(UPSTREAM_DIR, 'plugins');
const pdir = path.join(ROOT, 'plugins');
const pruneEmpty = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pruneEmpty(p);
  }
  if (fs.readdirSync(dir).length === 0) fs.rmSync(dir, { recursive: true, force: true });
};
for (const name of fs.readdirSync(pdir)) {
  const dstBase = path.join(pdir, name);
  if (!fs.existsSync(dstBase)) continue;
  const upDir = path.join(upPluginsDir, name);
  if (!fs.existsSync(upDir)) continue; // seed-only dir — managed by the seed merge
  const upFiles = new Set(walkFiles(upDir, name));
  for (const rel of walkFiles(dstBase, name)) {
    if (!upFiles.has(rel)) {
      fs.rmSync(path.join(ROOT, 'plugins', rel), { force: true });
      purgedFiles++;
    }
  }
  pruneEmpty(dstBase);
}
if (purgedFiles) console.log(`[compose] purged leftover files in upstream dirs: ${purgedFiles}`);

// 5) per-plugin interface overrides from sidecars (upstream part)
let applied = 0;
for (const name of fs.readdirSync(path.join(ROOT, 'plugins'))) {
  const mf = path.join(ROOT, 'plugins', name, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(mf)) continue;
  const side = readJson(path.join(I18N_DIR, `${name}.json`), null);
  if (!side) continue;
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  if (!m.interface) continue;
  const before = applied;
  for (const field of ['shortDescription', 'longDescription']) {
    const src = m.interface[field];
    if (typeof src === 'string') {
      const hit = side[textKey(src)];
      if (hit?.zh) { m.interface[field] = hit.zh; applied++; }
    }
  }
  if (Array.isArray(m.interface.defaultPrompt)) {
    m.interface.defaultPrompt = m.interface.defaultPrompt.map((s) => {
      if (typeof s !== 'string') return s;
      const hit = side[textKey(s)];
      if (hit?.zh) { applied++; return hit.zh; }
      return s;
    });
  }
  if (applied > before) writeJson(mf, m);
}
console.log(`[compose] interface translations applied: ${applied}`);

// 6) site catalog — zh from the publish tree, en straight from upstream (or seed for extras)
const upstreamNames = new Set();
for (const k of ['main', 'api']) {
  const m = JSON.parse(fs.readFileSync(path.join(UPSTREAM_DIR, '.agents', 'plugins', k === 'main' ? 'marketplace.json' : 'api_marketplace.json'), 'utf8'));
  for (const p of m.plugins) upstreamNames.add(p.name);
}
const mains = JSON.parse(fs.readFileSync(manifestPaths.main, 'utf8'));
const apis = JSON.parse(fs.readFileSync(manifestPaths.api, 'utf8'));
// English categories come from the source manifests (the publish tree now carries zh)
const catOf = new Map();
for (const f of ['marketplace.json', 'api_marketplace.json']) {
  const m = JSON.parse(fs.readFileSync(path.join(UPSTREAM_DIR, '.agents', 'plugins', f), 'utf8'));
  for (const p of m.plugins) catOf.set(p.name, p.category);
}
if (seedAvailable) {
  for (const f of ['marketplace.json', 'api_marketplace.json']) {
    const m = JSON.parse(fs.readFileSync(path.join(SEED_DIR, '.agents', 'plugins', f), 'utf8'));
    for (const p of m.plugins) if (!catOf.has(p.name)) catOf.set(p.name, p.category);
  }
}
const inMain = new Set(mains.plugins.map((p) => p.name));
const inApi = new Set(apis.plugins.map((p) => p.name));
const allNames = [...new Set([...inMain, ...inApi])].sort();

// Snapshot-origin plugins do NOT exist on upstream's git tree, so linking them
// to openai/plugins/tree/main/plugins/<name> is a guaranteed 404. Point those at
// our own publish tree, which tools/verify.mjs proves byte-identical to .seed.
const sourceUrl = (name, origin) => (origin === 'upstream'
  ? `${cfg.upstreamRepo}/tree/main/plugins/${name}`
  : `${cfg.repo}/tree/main/plugins/${name}`);

const plugins = [];
const missing = [];
for (const name of allNames) {
  const dir = path.join(ROOT, 'plugins', name);
  const origin = upstreamNames.has(name) ? 'upstream' : 'snapshot';
  const upMf = origin === 'upstream'
    ? path.join(UPSTREAM_DIR, 'plugins', name, '.codex-plugin', 'plugin.json')
    : path.join(SEED_DIR, 'plugins', name, '.codex-plugin', 'plugin.json');
  const mf = path.join(dir, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(mf) || !fs.existsSync(upMf)) {
    missing.push(name);
    plugins.push({
      name, origin, inMain: inMain.has(name), inApi: inApi.has(name), missing: true,
      displayName: name, shortZh: '', shortEn: '', longZh: '', longEn: '',
      hasZh: false, prompts: [], promptsEn: [], category: catOf.get(name) ?? 'Other',
      categoryZh: glossary[catOf.get(name) ?? ''] ?? catOf.get(name) ?? 'Other',
      brandColor: null, developerName: 'OpenAI', skills: [], skillsCount: 0,
      hasMcp: false, hasApp: false, icon: null, version: null,
      upstreamUrl: sourceUrl(name, origin),
    });
    continue;
  }
  const pubM = JSON.parse(fs.readFileSync(mf, 'utf8'));
  const upM = JSON.parse(fs.readFileSync(upMf, 'utf8'));
  const pub = pubM.interface ?? {};
  const up = upM.interface ?? {};
  const sdir = path.join(dir, 'skills');
  const skills = fs.existsSync(sdir)
    ? fs.readdirSync(sdir).filter((f) => fs.existsSync(path.join(sdir, f, 'SKILL.md')))
    : [];
  const shortZh = pub.shortDescription ?? '';
  const longZh = pub.longDescription ?? '';
  plugins.push({
    name,
    origin,
    inMain: inMain.has(name),
    inApi: inApi.has(name),
    missing: false,
    displayName: pub.displayName ?? name,
    shortZh, shortEn: up.shortDescription ?? '',
    longZh, longEn: up.longDescription ?? '',
    hasZh: hasCJK(shortZh) || hasCJK(longZh),
    prompts: Array.isArray(pub.defaultPrompt) ? pub.defaultPrompt : [],
    promptsEn: Array.isArray(up.defaultPrompt) ? up.defaultPrompt : [],
    category: catOf.get(name) ?? 'Other',
    categoryZh: glossary[catOf.get(name) ?? ''] ?? catOf.get(name) ?? 'Other',
    brandColor: pub.brandColor ?? null,
    developerName: pub.developerName ?? 'OpenAI',
    skills, skillsCount: skills.length,
    hasMcp: fs.existsSync(path.join(dir, '.mcp.json')),
    hasApp: fs.existsSync(path.join(dir, '.app.json')),
    icon: pub.composerIcon ?? pub.logo ?? null,
    version: pubM.version ?? null,
    upstreamUrl: sourceUrl(name, origin),
  });
}

const catCount = new Map();
for (const p of plugins) {
  if (p.missing) continue;
  catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
}
const catalog = {
  generatedAt: sourceDate(UPSTREAM_DIR),
  upstream: { repo: cfg.upstreamRepo, sha: git(UPSTREAM_DIR, 'rev-parse', 'HEAD') },
  snapshot: extras.snapshot,
  marketplace: { ...cfg.marketplace, cloneUrl: cfg.cloneUrl ?? null },
  apiMarketplace: cfg.apiMarketplace,
  categories: [...catCount.entries()]
    .map(([en, count]) => ({ en, zh: glossary[en] ?? en, count }))
    .sort((a, b) => b.count - a.count),
  originCounts: {
    upstream: plugins.filter((p) => p.origin === 'upstream' && !p.missing).length,
    snapshot: plugins.filter((p) => p.origin === 'snapshot' && !p.missing).length,
  },
  translated: plugins.filter((p) => !p.missing && p.hasZh).length,
  total: plugins.filter((p) => !p.missing).length,
  plugins,
};
writeJson(path.join(DATA_DIR, 'catalog.json'), catalog);
writeJson(path.join(DATA_DIR, 'full-catalog.json'), {
  generatedAt: catalog.generatedAt,
  upstream: { entries: upstreamNames.size, sha: catalog.upstream.sha },
  snapshot: extras.snapshot,
  extras: extras.names.sort(),
});
// syncedAt stays put while the upstream sha is unchanged, so a no-op sync
// rewrites this file byte-identically and the CI step commits nothing.
const prevSha = readJson(path.join(DATA_DIR, 'last-sha.json'), null);
writeJson(path.join(DATA_DIR, 'last-sha.json'), {
  sha: diff.to,
  syncedAt: prevSha?.sha === diff.to && prevSha.syncedAt ? prevSha.syncedAt : catalog.generatedAt,
});

console.log(
  `[compose] catalog: ${catalog.total} plugins ` +
    `(upstream ${catalog.originCounts.upstream} + snapshot ${catalog.originCounts.snapshot}), ` +
    `${catalog.translated} zh, missing dirs: ${missing.length ? missing.join(', ') : 'none'}`,
);
