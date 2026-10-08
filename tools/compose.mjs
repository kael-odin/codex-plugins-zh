// Compose the publish tree (repo root) from .upstream + i18n sidecars.
//
// Intentional divergence from upstream is confined to a whitelist:
//   - .agents/plugins/marketplace.json + api_marketplace.json → name/interface only
//   - plugins/*/.codex-plugin/plugin.json                     → interface.* only
// tools/verify.mjs proves everything else stays byte-identical.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ROOT, UPSTREAM_DIR, DATA_DIR, I18N_DIR,
  readJson, writeJson, textKey, git, toPosix, hasCJK,
} from './lib.mjs';

const cfg = readJson(path.join(ROOT, 'config', 'zh-marketplace.json'));
const glossary = readJson(path.join(ROOT, 'config', 'glossary.json'), {});
const diff = readJson(path.join(DATA_DIR, 'diff.json'));

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

// 4) per-plugin interface overrides from sidecars (short/long + defaultPrompt;
//    displayName stays upstream — brand names should not be translated)
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

// 5) site catalog — zh from the publish tree, en straight from upstream
const upMfDir = path.join(UPSTREAM_DIR, '.agents', 'plugins');
const mains = JSON.parse(fs.readFileSync(manifestPaths.main, 'utf8'));
const apis = JSON.parse(fs.readFileSync(manifestPaths.api, 'utf8'));
const catOf = new Map();
for (const p of mains.plugins) catOf.set(p.name, p.category);
for (const p of apis.plugins) if (!catOf.has(p.name)) catOf.set(p.name, p.category);
const inMain = new Set(mains.plugins.map((p) => p.name));
const inApi = new Set(apis.plugins.map((p) => p.name));
const allNames = [...new Set([...inMain, ...inApi])].sort();

const plugins = [];
const missing = [];
for (const name of allNames) {
  const dir = path.join(ROOT, 'plugins', name);
  const mf = path.join(dir, '.codex-plugin', 'plugin.json');
  const upMf = path.join(UPSTREAM_DIR, 'plugins', name, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(mf) || !fs.existsSync(upMf)) {
    missing.push(name);
    plugins.push({
      name, inMain: inMain.has(name), inApi: inApi.has(name), missing: true,
      displayName: name, shortZh: '', shortEn: '', longZh: '', longEn: '',
      hasZh: false, prompts: [], promptsEn: [], category: catOf.get(name) ?? 'Other',
      categoryZh: glossary[catOf.get(name) ?? 'Other'] ?? catOf.get(name) ?? 'Other',
      brandColor: null, developerName: 'OpenAI', skills: [], skillsCount: 0,
      hasMcp: false, hasApp: false, icon: null,
      upstreamUrl: `${cfg.upstreamRepo}/tree/main/plugins/${name}`,
    });
    continue;
  }
  const pub = JSON.parse(fs.readFileSync(mf, 'utf8')).interface ?? {};
  const up = JSON.parse(fs.readFileSync(upMf, 'utf8')).interface ?? {};
  const sdir = path.join(dir, 'skills');
  const skills = fs.existsSync(sdir)
    ? fs.readdirSync(sdir).filter((f) => fs.existsSync(path.join(sdir, f, 'SKILL.md')))
    : [];
  const shortZh = pub.shortDescription ?? '';
  const longZh = pub.longDescription ?? '';
  plugins.push({
    name,
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
    upstreamUrl: `${cfg.upstreamRepo}/tree/main/plugins/${name}`,
  });
}

const catCount = new Map();
for (const p of plugins) {
  if (p.missing) continue;
  catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
}
const catalog = {
  generatedAt: new Date().toISOString(),
  upstream: { repo: cfg.upstreamRepo, sha: git(UPSTREAM_DIR, 'rev-parse', 'HEAD') },
  marketplace: { ...cfg.marketplace, cloneUrl: cfg.cloneUrl ?? null },
  apiMarketplace: cfg.apiMarketplace,
  categories: [...catCount.entries()]
    .map(([en, count]) => ({ en, zh: glossary[en] ?? en, count }))
    .sort((a, b) => b.count - a.count),
  translated: plugins.filter((p) => !p.missing && p.hasZh).length,
  total: plugins.filter((p) => !p.missing).length,
  plugins,
};
writeJson(path.join(DATA_DIR, 'catalog.json'), catalog);
writeJson(path.join(DATA_DIR, 'last-sha.json'), { sha: diff.to, syncedAt: new Date().toISOString() });

console.log(
  `[compose] catalog: ${catalog.total} plugins (${catalog.translated} zh), ` +
    `missing dirs: ${missing.length ? missing.join(', ') : 'none'}`,
);
