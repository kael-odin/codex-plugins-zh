const MARKET_URL = 'https://github.com/kael-odin/codex-plugins-zh.git';
const GUIDE_URL = 'https://github.com/kael-odin/codex-plugins-zh/blob/main/docs/setup-guide.md';

const I18N = {
  zh: {
    title: 'Codex 官方插件 · 中文导航',
    subtitle: '全量 1,697+ 项目 · 无损汉化 · 每日更新',
    searchPh: '搜索：做表格 / figma / 查邮件 / 控制电脑 / 销售 / 英伟达 …',
    clear: '清空',
    cats: '快速分类',
    all: '全部',
    quick: { all: '全部', plugin: '插件', app: '应用与连接器' },
    kindPlugin: '插件',
    kindApp: '应用/连接器',
    found: (x, y) => `显示 ${x} / ${y} 个项目`,
    split: (p, a) => `插件 ${p} · 应用与连接器 ${a}`,
    zhCount: (n) => `插件已译 ${n}`,
    intro: '简介',
    detail: '详细介绍',
    prompts: '上手示例',
    skills: (n) => `包含技能（${n}）`,
    links: '链接',
    upstream: '上游源码（openai/plugins）↗',
    website: '官方网站 ↗',
    mainList: '主清单',
    apiList: 'API 清单',
    hasMcp: 'MCP 连接器',
    hasApp: 'App',
    translated: '已译',
    untranslated: '未译',
    noneZh: '（暂无译文，见英文原文）',
    enOriginal: '英文原文',
    snapshot: '数据快照',
    originUpstream: '上游',
    originSnapshot: '快照',
    installTitle: '把中文市场加进 Codex',
    installSteps: ['Codex 里打开 设置 → 插件 → 添加市场', '粘贴下方地址（带复制按钮）', '重开会话，出现「Codex 官方插件 · 中文版」'],
    copy: '复制',
    copied: '已复制 ✓',
    guide: '完整安装 / 冗余清理指南 →',
    installHint: 'API-key 登录用户：App 自带的「Built by OpenAI · 50 个插件」请保留，两者并存互不影响。',
    footerLegal: '插件内容与商标归 OpenAI 及各自权利人所有；应用目录数据来自 Source-blip 中文导航（2026-07 快照），译文仅供参考。',
    close: '关闭',
  },
  en: {
    title: 'Codex Official Plugins · Chinese Navigator',
    subtitle: '1,697+ items · lossless Chinese edition · daily updates',
    searchPh: 'Search: spreadsheet / figma / email / sales / NVIDIA …',
    clear: 'Clear',
    cats: 'Categories',
    all: 'All',
    quick: { all: 'All', plugin: 'Plugins', app: 'Apps & connectors' },
    kindPlugin: 'Plugin',
    kindApp: 'App/Connector',
    found: (x, y) => `Showing ${x} of ${y} items`,
    split: (p, a) => `${p} plugins · ${a} apps & connectors`,
    zhCount: (n) => `${n} plugins translated`,
    intro: 'Intro',
    detail: 'Details',
    prompts: 'Starter prompts',
    skills: (n) => `Skills (${n})`,
    links: 'Links',
    upstream: 'Upstream source (openai/plugins) ↗',
    website: 'Official website ↗',
    mainList: 'Main catalog',
    apiList: 'API catalog',
    hasMcp: 'MCP connector',
    hasApp: 'App',
    translated: 'Translated',
    untranslated: 'Not translated',
    noneZh: '(No Chinese yet — see English below)',
    enOriginal: 'English original',
    snapshot: 'Snapshot',
    originUpstream: 'upstream',
    originSnapshot: 'snapshot',
    installTitle: 'Add the Chinese marketplace to Codex',
    installSteps: ['Open Settings → Plugins → Add marketplace in Codex', 'Paste the URL below (copy button provided)', 'Start a new session — “Codex 官方插件 · 中文版” appears'],
    copy: 'Copy',
    copied: 'Copied ✓',
    guide: 'Full setup & cleanup guide →',
    installHint: 'API-key users: keep the built-in “Built by OpenAI · 50 plugins” — both marketplaces coexist.',
    footerLegal: 'Plugin content and trademarks belong to OpenAI and their respective owners. Apps dataset from Source-blip (2026-07 snapshot); translations are informational.',
    close: 'Close',
  },
};

const state = { q: '', cat: null, quick: 'all', onlyZh: false, lang: 'zh', theme: 'light', selected: null };
let CATALOG = null;
let APPS = [];
let ALIASES = {};
let ITEMS = []; // unified view

const $ = (s) => document.querySelector(s);
const t = () => I18N[state.lang];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => (s ?? '').toLowerCase();
const fmt = (n) => n.toLocaleString('en-US');

function colorFor(key, brandColor) {
  if (brandColor) return brandColor;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 45%)`;
}

function buildItems() {
  const T = t();
  const plugins = CATALOG.plugins.filter((p) => !p.missing).map((p) => ({
    type: 'plugin',
    key: p.name,
    icon: p.icon,
    color: colorFor(p.name, p.brandColor),
    initial: (p.displayName || p.name)[0].toUpperCase(),
    zh: p.displayName,
    en: p.name,
    desc: state.lang === 'zh' ? p.shortZh || p.shortEn : p.shortEn || p.shortZh,
    long: state.lang === 'zh' ? p.longZh || p.longEn : p.longEn || p.longZh,
    longEn: p.longEn,
    category: state.lang === 'zh' ? p.categoryZh : p.category,
    badges: [
      T.kindPlugin,
      p.origin === 'snapshot' ? T.originSnapshot : T.originUpstream,
      ...(p.hasMcp ? [T.hasMcp] : []),
      ...(p.inApi ? [T.apiList] : []),
    ],
    search: [p.name, p.displayName, p.shortZh, p.shortEn, p.longZh, p.longEn, p.category, p.categoryZh, ...(ALIASES[p.name] ?? [])],
  }));
  const apps = APPS.map((a) => ({
    type: 'app',
    key: a.id,
    icon: a.icon,
    color: colorFor(a.id, null),
    initial: (a.en || a.zh)[0].toUpperCase(),
    zh: a.zh,
    en: a.en,
    desc: state.lang === 'zh' ? a.plain : a.enDesc || a.plain,
    long: state.lang === 'zh' ? a.plain : a.enDesc || a.plain,
    longEn: a.enDesc,
    category: a.category,
    badges: [T.kindApp, a.status, ...(a.iconStatus ? [a.iconStatus] : [])],
    search: [a.en, a.zh, a.plain, a.enDesc, a.category, a.kind, a.status, ...(a.keywords ?? [])],
  }));
  ITEMS = [...plugins, ...apps];
}

function match(it) {
  if (state.quick === 'plugin' && it.type !== 'plugin') return false;
  if (state.quick === 'app' && it.type !== 'app') return false;
  if (state.onlyZh && it.type === 'plugin') {
    const p = CATALOG.plugins.find((x) => x.name === it.key);
    if (p && !p.hasZh) return false;
  }
  if (state.cat && it.category !== state.cat) return false;
  if (!state.q) return true;
  const q = norm(state.q);
  return it.search.some((v) => norm(v).includes(q));
}

function iconHTML(it, size = 52) {
  if (it.icon) {
    return `<img class="picon" loading="lazy" style="width:${size}px;height:${size}px" src="${esc(it.icon)}" alt="${esc(it.zh)}"
      onerror="this.classList.add('hide');this.nextElementSibling.classList.remove('hide')">
      <div class="tile hide" style="background:${esc(it.color)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${esc(it.initial)}</div>`;
  }
  return `<div class="tile" style="background:${esc(it.color)};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px">${esc(it.initial)}</div>`;
}

function badgesHTML(it) {
  return `<div class="meta">${it.badges.map((b, i) => {
    let cls = 'badge';
    if (it.type === 'plugin' && i === 0) cls = 'badge b-kind';
    if (it.type === 'app' && i === 0) cls = 'badge b-app';
    if (b === t().translated) cls = 'badge b-zh';
    if (b === t().apiList) cls = 'badge b-api';
    return `<span class="${cls}">${esc(b)}</span>`;
  }).join('')}</div>`;
}

function renderRail() {
  const T = t();
  const counts = new Map();
  for (const it of ITEMS) {
    if (state.quick === 'plugin' && it.type !== 'plugin') continue;
    if (state.quick === 'app' && it.type !== 'app') continue;
    counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  }
  const cats = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = ITEMS.filter((it) => (state.quick === 'all' || (state.quick === 'plugin' ? it.type === 'plugin' : it.type === 'app'))).length;
  const items = [{ key: null, label: T.all, count: total }].concat(cats.map(([label, count]) => ({ key: label, label, count })));
  $('#rail').innerHTML = items
    .map((c) => `<button class="rail-item ${state.cat === c.key ? 'active' : ''}" data-cat="${esc(c.key ?? '')}">
        <span>${esc(c.label)}</span><span class="n">${fmt(c.count)}</span></button>`)
    .join('');
  $('#rail').querySelectorAll('.rail-item').forEach((el) =>
    el.addEventListener('click', () => {
      state.cat = el.dataset.cat || null;
      renderAll();
    }),
  );
}

function renderPills() {
  const T = t();
  const defs = [['all', T.quick.all], ['plugin', `${T.quick.plugin} ${fmt(CATALOG.total)}`], ['app', `${T.quick.app} ${fmt(APPS.length)}`]];
  $('#pills').innerHTML = defs
    .map(([k, label]) => `<button class="pill ${state.quick === k ? 'active' : ''}" data-k="${k}">${esc(label)}</button>`)
    .join('');
  $('#pills').querySelectorAll('.pill').forEach((el) =>
    el.addEventListener('click', () => {
      state.quick = el.dataset.k;
      state.cat = null;
      renderAll();
    }),
  );
}

function renderGrid() {
  const T = t();
  const list = ITEMS.filter(match);
  $('#grid').innerHTML = list
    .map(
      (it) => `<div class="card ${state.selected === it.type + ':' + it.key ? 'selected' : ''}" data-type="${it.type}" data-key="${esc(it.key)}" role="button" tabindex="0">
        ${iconHTML(it)}
        <h3>${esc(it.type === 'app' ? it.zh : it.zh)}</h3>
        <div class="en">${esc(it.en)}</div>
        <p class="desc">${esc(it.desc)}</p>
        ${badgesHTML(it)}
      </div>`,
    )
    .join('');
  $('#grid').querySelectorAll('.card').forEach((el) => {
    const key = el.dataset.type + ':' + el.dataset.key;
    const open = () => {
      if (window.matchMedia('(min-width: 1101px)').matches) {
        state.selected = key;
        renderGrid();
        renderPane();
      } else {
        openModal(el.dataset.type, el.dataset.key);
      }
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  });
  const pCount = list.filter((i) => i.type === 'plugin').length;
  const aCount = list.length - pCount;
  $('#count').textContent =
    `${T.found(list.length, ITEMS.length)} · ${T.split(fmt(pCount), fmt(aCount))} · ${T.zhCount(CATALOG.translated)}`;
}

function installHTML() {
  const T = t();
  return `<div class="install">
    <div class="install-title">${esc(T.installTitle)}</div>
    <ol>${T.installSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="urlrow"><code>${MARKET_URL}</code><button class="copy" data-copy>${esc(T.copy)}</button></div>
    <p style="font-size:12px;color:var(--dim)">${esc(T.installHint)}</p>
    <a href="${GUIDE_URL}" target="_blank" rel="noopener">${esc(T.guide)}</a>
  </div>`;
}

function detailHTML(it) {
  const T = t();
  if (it.type === 'app') {
    return `<div class="headrow">
        ${iconHTML(it, 56)}
        <div style="min-width:0">
          <h2>${esc(it.zh)}</h2>
          <div class="en-name">${esc(it.en)} · ${esc(it.category)}</div>
        </div>
      </div>
      ${badgesHTML(it)}
      <h4>${esc(T.intro)}</h4>
      <p style="margin:4px 0;white-space:pre-wrap">${esc(it.long)}</p>
      ${it.longEn ? `<details><summary style="cursor:pointer;color:var(--dim);font-size:13px">${esc(T.enOriginal)}</summary><div class="en-block">${esc(it.longEn)}</div></details>` : ''}
      <h4>${esc(T.links)}</h4>
      <p>${it.installUrl ? `<a href="${esc(it.installUrl)}" target="_blank" rel="noopener">${esc(T.website)}</a><br>` : ''}<button class="copy" data-copy>${esc(T.copy)} ${esc(MARKET_URL)}</button></p>`;
  }
  const p = CATALOG.plugins.find((x) => x.name === it.key);
  return `<div class="headrow">
      ${iconHTML(it, 56)}
      <div style="min-width:0">
        <h2>${esc(p.displayName)}</h2>
        <div class="en-name">${esc(p.name)} · ${esc(state.lang === 'zh' ? p.categoryZh : p.category)} · ${esc(p.origin === 'snapshot' ? T.originSnapshot : T.originUpstream)}</div>
      </div>
    </div>
    <div class="meta" style="margin-bottom:8px">
      ${p.inMain ? `<span class="badge">${T.mainList}</span>` : ''}
      ${p.inApi ? `<span class="badge b-api">${T.apiList}</span>` : ''}
      ${p.hasMcp ? `<span class="badge">${T.hasMcp}</span>` : ''}
      ${p.hasApp ? `<span class="badge">${T.hasApp}</span>` : ''}
      ${p.hasZh ? `<span class="badge b-zh">${T.translated}</span>` : `<span class="badge">${T.untranslated}</span>`}
    </div>
    <h4>${esc(T.intro)}</h4>
    <p style="margin:4px 0">${esc(state.lang === 'zh' ? p.shortZh || T.noneZh : p.shortEn || p.shortZh)}</p>
    <h4>${esc(T.detail)}</h4>
    <p style="margin:4px 0;white-space:pre-wrap">${esc(state.lang === 'zh' ? p.longZh || T.noneZh : p.longEn || p.longZh)}</p>
    ${p.longEn ? `<details><summary style="cursor:pointer;color:var(--dim);font-size:13px">${esc(T.enOriginal)}</summary><div class="en-block">${esc(p.longEn)}</div></details>` : ''}
    ${(state.lang === 'en' && p.promptsEn?.length ? p.promptsEn : p.prompts).length ? `<h4>${esc(T.prompts)}</h4><ul>${(state.lang === 'en' && p.promptsEn?.length ? p.promptsEn : p.prompts).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${p.skillsCount ? `<h4>${esc(T.skills(p.skillsCount))}</h4><div class="meta">${p.skills.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div>` : ''}
    <h4>${esc(T.links)}</h4>
    <p><a href="${esc(p.upstreamUrl)}" target="_blank" rel="noopener">${esc(T.upstream)}</a></p>
    <p><button class="copy" data-copy>${esc(T.copy)} ${esc(MARKET_URL)}</button></p>`;
}

function renderPane() {
  const it = ITEMS.find((x) => state.selected === x.type + ':' + x.key);
  $('#detailpane').innerHTML = it ? detailHTML(it) : installHTML();
  bindCopy($('#detailpane'));
}

function bindCopy(root) {
  root.querySelectorAll('.copy[data-copy]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(MARKET_URL);
      const old = btn.textContent;
      btn.textContent = t().copied;
      setTimeout(() => (btn.textContent = old), 1600);
    }),
  );
}

function openModal(type, key) {
  const it = ITEMS.find((x) => x.type === type && x.key === key);
  if (!it) return;
  $('#detail').innerHTML = detailHTML(it);
  bindCopy($('#detail'));
  $('#modal').classList.remove('hidden');
}

function applyI18nStatic() {
  const T = t();
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = T[el.dataset.i18n] ?? el.textContent;
  $('#q').placeholder = T.searchPh;
  $('#lang').textContent = state.lang === 'zh' ? 'English' : '中文';
  document.title = state.lang === 'zh'
    ? 'Codex 官方插件中文市场 · 全量 1,697+ 项目导航'
    : 'Codex Official Plugins, in Chinese · 1,697+ Items Navigator';
}

function renderAll() {
  buildItems();
  applyI18nStatic();
  renderRail();
  renderPills();
  renderGrid();
  renderPane();
}

async function init() {
  [CATALOG, APPS, ALIASES] = await Promise.all([
    (await fetch('./catalog.json')).json(),
    (await fetch('./apps-zh.json')).json().catch(() => []),
    (await fetch('./plugin-aliases.json')).json().catch(() => ({})),
  ]);
  state.theme = localStorage.getItem('czh-theme') ?? 'light';
  state.lang = localStorage.getItem('czh-lang') ?? 'zh';
  document.documentElement.dataset.theme = state.theme;
  $('#theme').textContent = state.theme === 'light' ? '🌙' : '☀️';
  $('#meta').textContent = new Date(CATALOG.generatedAt).toLocaleDateString(state.lang === 'zh' ? 'zh-CN' : 'en-US');

  $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); renderGrid(); });
  $('#clear').addEventListener('click', () => { state.q = ''; $('#q').value = ''; renderGrid(); });
  $('#onlyzh').addEventListener('change', (e) => { state.onlyZh = e.target.checked; renderGrid(); });
  $('#lang').addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('czh-lang', state.lang);
    renderAll();
  });
  $('#theme').addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('czh-theme', state.theme);
    document.documentElement.dataset.theme = state.theme;
    $('#theme').textContent = state.theme === 'light' ? '🌙' : '☀️';
  });
  $('#close').addEventListener('click', () => $('#modal').classList.add('hidden'));
  $('#modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#modal').classList.add('hidden'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal').classList.add('hidden'); });

  renderAll();
}
init();
