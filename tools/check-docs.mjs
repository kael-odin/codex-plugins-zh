// Verify the hand-typed numbers in the docs against the data they describe.
//
// Every count in README.md and assets/readme/hero.svg sits next to a
// machine-generated dataset, and nothing else stops the two from drifting
// apart: a sync that brings 1,700 items leaves the docs still promising 1,694.
// Each check pins one documented number — matched by the words around it, not
// by position — to a value read out of data/. A phrase that no longer matches
// is a FAILURE as well: rewording the docs must not be allowed to quietly
// retire a check.
//
// Deliberately NOT checked (no machine-readable source — external facts, so
// they are stale-but-true statements rather than drift): the ~194-item remote
// curated directory, the App's built-in 50-plugin `openai-api-curated` market,
// and the snapshot dates of the third-party datasets.
//
// Run tools/build-site.mjs first: data/site-stats.json is what it writes.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DATA_DIR, readJson } from './lib.mjs';

const catalog = readJson(path.join(DATA_DIR, 'catalog.json'));
const apps = readJson(path.join(DATA_DIR, 'apps-zh.json'));
const stats = readJson(path.join(DATA_DIR, 'site-stats.json'));
const report = readJson(path.join(DATA_DIR, 'quality-report.json'));
const mainMarket = readJson(path.join(ROOT, '.agents', 'plugins', 'marketplace.json'));
const apiMarket = readJson(path.join(ROOT, '.agents', 'plugins', 'api_marketplace.json'));

// installable plugins (the 3 manifests whose dir never made it into either
// source are listed but not counted as shippable anywhere in the docs)
const live = catalog.plugins.filter((p) => !p.missing);

// the category union the site's rail actually offers
const categories = new Set([
  ...catalog.plugins.map((p) => p.categoryZh),
  ...apps.map((a) => a.category),
].filter(Boolean)).size;

const facts = {
  plugins: stats.plugins,
  apps: stats.apps,
  total: stats.total,
  pluginIcons: stats.pluginIcons,
  appIcons: stats.appIcons,
  translated: catalog.translated,
  categories,
  files: report.filesChecked,
  divergences: report.divergences.length,
  upstreamFiles: report.byteIdentical.upstream,
  snapshotFiles: report.byteIdentical.snapshot,
  upstreamEntries: report.manifests.upstreamEntries,
  snapshotEntries: report.manifests.extraEntries,
  manifestEntries: mainMarket.plugins.length,
  claudeEntries: report.claudeMarketplaceEntries,
  snapshotManifestEntries: catalog.snapshot.entries,
  upstreamLive: live.filter((p) => p.origin === 'upstream').length,
  snapshotLive: live.filter((p) => p.origin === 'snapshot').length,
};

// A doc that says one number where the data says another is the bug this file
// exists for; a doc whose phrase vanished is the bug that hides the first one.
const DOCS = [
  ['README.md', [
    [/全量 ([\d,]+) 项目/, [facts.total]],
    [/：\*\*([\d,]+) 个官方插件/, [facts.plugins]],
    [/（([\d,]+)，权威实时）/, [facts.upstreamLive]],
    [/（\+([\d,]+)，含 ChatGPT/, [facts.snapshotLive]],
    [/与 ([\d,]+) 个官方图标，MIT/, [facts.appIcons]],
    [/合计 \*\*([\d,]+) 个项目\*\*/, [facts.total]],
    [/（([\d,]+) 个插件真实图标 \+ ([\d,]+) 个应用图标）/, [facts.pluginIcons, facts.appIcons]],
    [/([\d,]+) 个文件 ([\d,]+) 分歧/, [facts.files, facts.divergences]],
    [/分类侧栏（全部 ([\d,]+)）/, [facts.total]],
    [/（([\d,]+) 条清单 \/ ([\d,]+) 个可装插件/, [facts.manifestEntries, facts.plugins]],
    [/（Claude 清单 ([\d,]+) 条）/, [facts.claudeEntries]],
    [/#[^\n]*（上游 git 上的 ([\d,]+) 条）/, [facts.upstreamEntries]],
    [/\| ([\d,]+) 插件 \/ ([\d,]+) 清单条目 \|/, [facts.upstreamLive, facts.upstreamEntries]],
    [/\+([\d,]+) 插件（合计 ([\d,]+) 条目）/, [facts.snapshotLive, facts.snapshotManifestEntries]],
    [/([\d,]+) 应用\/连接器 \+ ([\d,]+) 图标 \+ 中文别名/, [facts.apps, facts.appIcons]],
    [/([\d,]+) 个文件\*\*逐字节一致\*\*/, [facts.upstreamFiles]],
    [/([\d,]+) 个文件对快照源/, [facts.snapshotFiles]],
    [/([\d,]+) 条上游条目原样保留 \+ ([\d,]+) 条快照条目/, [facts.upstreamEntries, facts.snapshotEntries]],
    [/市场仓 ([\d,]+) 插件/, [facts.plugins]],
    [/导航站 ([\d,]+) 项目/, [facts.total]],
    [/([\d,]+) 真实图标/, [facts.appIcons]],
    [/([\d,]+) 个中文分类/, [facts.categories]],
    [/git 上只有 ([\d,]+) 个，你却有 ([\d,]+) 个/, [facts.upstreamLive, facts.plugins]],
  ]],
  ['assets/readme/hero.svg', [
    [/全量 ([\d,]+) 项目（([\d,]+) 插件 \+ ([\d,]+) 应用）/, [facts.total, facts.plugins, facts.apps]],
    [/>([\d,]+) 插件<\/text>/, [facts.plugins]],
    [/([\d,]+) 全中文化<\/text>/, [facts.translated]],
    [/([\d,]+) 官方图标<\/text>/, [facts.pluginIcons]],
    [/无损校验 ([\d,]+) 分歧/, [facts.divergences]],
    [/verify: ([\d,]+) files/, [facts.files]],
  ]],
];

const num = (s) => Number(s.replace(/,/g, ''));
let checked = 0;
const failures = [];
for (const [file, checks] of DOCS) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const [re, want] of checks) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    const found = [...text.matchAll(g)];
    if (!found.length) {
      failures.push(`${file}: no line matches ${re} — the sentence was reworded; update the pattern, don't drop the check`);
      continue;
    }
    for (const m of found) {
      const got = m.slice(1).map(num);
      if (got.length !== want.length || got.some((v, i) => v !== want[i])) {
        failures.push(`${file}: "${m[0].trim()}" says ${got.join('+')}, data says ${want.join('+')}`);
      } else checked++;
    }
  }
}

// The search box advertises example words, and an advertised word that matches
// nothing is a dead end the user walks into on their first try — the placeholders
// used to say "PPT" and "控制电脑", neither of which matched a single item.
// corpus mirrors the fields app.js searches (buildItems()'s search arrays).
const aliases = readJson(path.join(DATA_DIR, 'plugin-aliases.json'), {});
const corpus = [
  ...live.flatMap((p) => [
    p.name, p.displayName, p.shortZh, p.shortEn, p.longZh, p.longEn, p.category, p.categoryZh,
    ...(aliases[p.name] ?? []),
  ]),
  ...apps.flatMap((a) => [a.en, a.zh, a.plain, a.enDesc, a.category, a.kind, a.status, ...(a.keywords ?? [])]),
].filter(Boolean).map((s) => String(s).toLowerCase());

const appJs = fs.readFileSync(path.join(ROOT, 'site', 'app.js'), 'utf8');
const placeholders = [...appJs.matchAll(/searchPh: '([^']+)'/g)].map((m) => m[1]);
if (placeholders.length !== 2) {
  failures.push(`site/app.js: expected one searchPh per language, found ${placeholders.length}`);
}
let words = 0;
for (const ph of placeholders) {
  for (const word of ph.replace(/^(例如：|e\.g\.\s*)/, '').replace(/\.\.\.$/, '').split(/[、,]/)) {
    const w = word.trim().toLowerCase();
    if (!w) continue;
    if (corpus.some((f) => f.includes(w))) words++;
    else failures.push(`site/app.js: search example "${word.trim()}" matches no item in the datasets`);
  }
}

// The site never hand-types a count either: dist/index.html substitutes the
// {{TOKEN}} counts (tools/build-site.mjs) and app.js fills STATS from the loaded
// datasets, so a count written as a literal in either source file is a number
// nothing keeps true — and the checks above cannot see it, since they read the
// README and the hero only. That is not hypothetical: the Claude Code install
// notice shipped with a hardcoded plugin count, which the next sync would have
// left behind.
//
// Numbers below three digits are exempt on purpose: the ones that matter here
// are catalog and file sizes, while a two-digit count in prose is an external
// fact (the App's built-in 50-plugin `openai-api-curated` market) that no
// dataset in this repo can confirm.
const EXEMPT = [];
for (const file of ['site/index.html', 'site/app.js']) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const m of text.matchAll(/([\d][\d,]{2,}) (个|条|项目|插件|应用|图标|文件|分歧)/g)) {
    if (EXEMPT.some((re) => re.test(m[0]))) continue;
    failures.push(`${file}: hand-typed "${m[0]}" — counts come from {{TOKEN}} (build-site) or STATS (app.js), never from a literal`);
  }
}

if (failures.length) {
  console.error(`[check-docs] FAIL — ${failures.length} stale claim(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `[check-docs] PASS — ${checked} documented numbers match the data and ${words} search examples ` +
    `hit real items (${facts.total} items, ${facts.files} verified files, 0 divergences)`,
);
