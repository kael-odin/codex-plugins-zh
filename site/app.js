const MARKET_URL = 'https://github.com/kael-odin/codex-plugins-zh.git';
const GUIDE_URL = 'https://github.com/kael-odin/codex-plugins-zh/blob/main/docs/setup-guide.md';

// Counts are never hardcoded in this file: STATS is filled from the loaded
// datasets, and dist/index.html gets its {{TOKEN}} counts from the same numbers
// (tools/build-site.mjs). Add a plugin upstream and every number follows.
const STATS = { plugins: 0, apps: 0, total: 0, translated: 0 };

const I18N = {
  zh: {
    title: 'Codex 官方插件 · 中文导航',
    subtitle: () => `全量 ${fmt(STATS.total)} 项目 · 无损汉化 · 每日更新`,
    docTitle: () => `Codex 官方插件中文市场 · 全量 ${fmt(STATS.total)} 项目导航`,
    searchPh: '例如：做表格、查邮件、幻灯片、英伟达、Notion...',
    clear: '清空',
    cats: '快速分类',
    all: '全部',
    quick: { all: '全部', plugin: '插件', app: '应用与连接器' },
    kindPlugin: '插件',
    kindApp: '应用/连接器',
    summary: (n, p, a) =>
      `找到 ${n} 项（插件 ${p} · 应用与连接器 ${a}）· 插件已译 ${STATS.translated}/${STATS.plugins} · 数据每日自动同步`,
    noResults: '没有匹配的项目——换个说法，或点「清空」重来。',
    onlyZh: '只看已译',
    intro: '简介',
    detail: '详细介绍',
    enOriginal: '英文原文',
    prompts: '上手示例',
    skills: '包含技能',
    links: '链接',
    upstream: '在 openai/plugins 查看源码 ↗',
    snapshotSource: '在本仓库查看快照原文 ↗',
    website: '打开官方网站 ↗',
    apiList: 'API 清单',
    hasMcp: 'MCP 连接器',
    translated: '已译',
    originUpstream: '上游',
    originSnapshot: '快照',
    snapshot: '数据快照',
    installTitle: '把中文市场加进 Codex',
    installSteps: ['Codex 里打开 设置 → 插件 → 添加市场', '粘贴下方地址，点击复制', '重开会话，出现「Codex 官方插件 · 中文版」'],
    copy: '复制市场地址',
    copied: '已复制 ✓',
    guide: '完整安装 / 冗余清理指南 →',
    installHint: 'API-key 登录用户：App 自带的「Built by OpenAI · 50 个插件」请保留，两个市场并存互不影响。',
    footerLegal: '插件内容与商标归 OpenAI 及各自权利人所有；应用目录数据来自 Source-blip 中文导航（2026-07 快照），译文仅供参考，与英文原文冲突时以英文原文为准。',
    appNotice: '这是 ChatGPT 应用/连接器：不能安装进 Codex 市场，此处仅作中文导航。请通过官方网站在 ChatGPT 中使用。',
    close: '关闭详情',
    themeLabel: '切换深浅主题',
    statusAll: '全部状态',
    catAll: '全部分类',
    sortDefault: '推荐排序',
    sortAz: '名称 A → Z',
    sortZa: '名称 Z → A',
    loadFailed: '数据加载失败（catalog.json）——请刷新重试。',
  },
  en: {
    title: 'Codex Official Plugins · Chinese Navigator',
    subtitle: () => `${fmt(STATS.total)} items · lossless Chinese edition · daily updates`,
    docTitle: () => `Codex Official Plugins, in Chinese · ${fmt(STATS.total)} Items Navigator`,
    searchPh: 'e.g. spreadsheet, email, slides, NVIDIA, Notion...',
    clear: 'Clear',
    cats: 'Categories',
    all: 'All',
    quick: { all: 'All', plugin: 'Plugins', app: 'Apps & connectors' },
    kindPlugin: 'Plugin',
    kindApp: 'App/Connector',
    summary: (n, p, a) =>
      `${n} items (${p} plugins · ${a} apps & connectors) · ${STATS.translated}/${STATS.plugins} plugins translated · synced daily`,
    noResults: 'Nothing matched — try another word, or hit “Clear”.',
    onlyZh: 'Translated only',
    intro: 'Intro',
    detail: 'Details',
    enOriginal: 'English original',
    prompts: 'Starter prompts',
    skills: 'Skills',
    links: 'Links',
    upstream: 'View source on openai/plugins ↗',
    snapshotSource: 'View snapshot source in this repo ↗',
    website: 'Open official website ↗',
    apiList: 'API catalog',
    hasMcp: 'MCP connector',
    translated: 'Translated',
    originUpstream: 'upstream',
    originSnapshot: 'snapshot',
    snapshot: 'Snapshot',
    installTitle: 'Add the Chinese marketplace to Codex',
    installSteps: ['Open Settings → Plugins → Add marketplace in Codex', 'Paste the URL below and copy', 'Start a new session — “Codex 官方插件 · 中文版” appears'],
    copy: 'Copy marketplace URL',
    copied: 'Copied ✓',
    guide: 'Full setup & cleanup guide →',
    installHint: 'API-key users: keep the built-in “Built by OpenAI · 50 plugins” — both marketplaces coexist.',
    footerLegal: 'Plugin content and trademarks belong to OpenAI and their respective owners. Apps dataset from Source-blip (2026-07 snapshot); translations are informational.',
    appNotice: 'This is a ChatGPT app/connector — it cannot be installed into a Codex marketplace; this entry is navigation only. Use it in ChatGPT via the official website.',
    close: 'Close details',
    themeLabel: 'Toggle dark mode',
    statusAll: 'All statuses',
    catAll: 'All categories',
    sortDefault: 'Recommended',
    sortAz: 'Name A → Z',
    sortZa: 'Name Z → A',
    loadFailed: 'Could not load catalog.json — please reload.',
  },
};

const QUICK = ['all', 'plugin', 'app'];
const SORTS = ['default', 'az', 'za'];
// Filter state round-trips through the URL hash, so a filtered view (or a single
// plugin's detail) is a shareable link instead of something to re-type.
const state = { q: '', cat: null, quick: 'plugin', status: '', sort: 'default', onlyZh: false, lang: 'zh', theme: 'light', selected: null };
let CATALOG = null;
let APPS = [];
let ALIASES = {};
let ITEMS = [];

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
    status: null,
    badges: [
      { text: T.kindPlugin, cls: 'kind' },
      { text: p.origin === 'snapshot' ? T.originSnapshot : T.originUpstream, cls: '' },
      ...(p.inApi ? [{ text: T.apiList, cls: 'warn' }] : []),
      ...(p.hasMcp ? [{ text: T.hasMcp, cls: '' }] : []),
      ...(p.hasZh ? [{ text: T.translated, cls: 'ok' }] : []),
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
    status: a.status ?? null,
    badges: [
      { text: T.kindApp, cls: 'kind' },
      ...(a.status ? [{ text: a.status, cls: a.status === '可安装' ? 'ok' : '' }] : []),
      ...(state.lang === 'zh' && a.iconStatus ? [{ text: a.iconStatus, cls: '' }] : []),
    ],
    search: [a.en, a.zh, a.plain, a.enDesc, a.category, a.kind, a.status, ...(a.keywords ?? [])],
  }));
  ITEMS = [...plugins, ...apps];
  // a category that only exists in the other dataset (or a hand-edited link to a
  // category that no longer exists) must not silently show an empty grid
  if (state.cat && !ITEMS.some((it) => it.category === state.cat)) state.cat = null;
}

function match(it) {
  if (state.quick === 'plugin' && it.type !== 'plugin') return false;
  if (state.quick === 'app' && it.type !== 'app') return false;
  if (state.status && it.status !== state.status) return false;
  if (state.onlyZh && it.type === 'plugin') {
    const p = CATALOG.plugins.find((x) => x.name === it.key);
    if (p && !p.hasZh) return false;
  }
  if (state.cat && it.category !== state.cat) return false;
  if (!state.q) return true;
  const q = norm(state.q);
  return it.search.some((v) => norm(v).includes(q));
}

function sorted(list) {
  const byName = (a, b) => (a.zh || a.en).localeCompare(b.zh || b.en, 'zh-Hans-CN');
  if (state.sort === 'az') return [...list].sort(byName);
  if (state.sort === 'za') return [...list].sort((a, b) => byName(b, a));
  return list;
}

function iconHTML(it, size) {
  const s = size ? `style="width:${size}px;height:${size}px"` : '';
  if (it.icon) {
    return `<img class="icon" loading="lazy" ${s} src="${esc(it.icon)}" alt="${esc(it.zh)}"
      onerror="this.classList.add('hide');this.nextElementSibling.classList.remove('hide')">
      <div class="tile hide" ${s} >${esc(it.initial)}</div>`;
  }
  return `<div class="tile" ${s}>${esc(it.initial)}</div>`;
}

function badgesHTML(it) {
  return `<div class="badges">${it.badges
    .map((b) => `<span class="badge ${b.cls || ''}">${esc(b.text)}</span>`)
    .join('')}</div>`;
}

function tileBg(it) { return `background:${esc(it.color)}`; }

function renderRail() {
  const T = t();
  const counts = new Map();
  for (const it of ITEMS) {
    if (state.quick === 'plugin' && it.type !== 'plugin') continue;
    if (state.quick === 'app' && it.type !== 'app') continue;
    if (state.status && it.status !== state.status) continue;
    counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  }
  const cats = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = [...counts.values()].reduce((x, y) => x + y, 0);
  const items = [{ key: null, label: T.all, count: total }].concat(cats.map(([label, count]) => ({ key: label, label, count })));
  $('#rail').innerHTML = items
    .map((c) => `<button class="side-btn ${state.cat === c.key ? 'active' : ''}" data-cat="${esc(c.key ?? '')}">
        <span>${esc(c.label)}</span><span>${fmt(c.count)}</span></button>`)
    .join('');
  // category select keeps in sync with rail
  const sel = $('#f-cat');
  const cur = state.cat ?? '';
  sel.innerHTML = `<option value="">${esc(T.catAll)}</option>` +
    cats.map(([label, count]) => `<option value="${esc(label)}"${label === cur ? ' selected' : ''}>${esc(label)} (${count})</option>`).join('');
}

function renderPills() {
  const T = t();
  const defs = [['all', T.quick.all], ['plugin', `${T.quick.plugin} ${fmt(STATS.plugins)}`], ['app', `${T.quick.app} ${fmt(STATS.apps)}`]];
  $('#pills').innerHTML = defs
    .map(([k, label]) => `<button class="quick-btn ${state.quick === k ? 'active' : ''}" data-k="${k}">${esc(label)}</button>`)
    .join('');
}

function renderGrid() {
  const T = t();
  const list = sorted(ITEMS.filter(match));
  const grid = $('#grid');
  if (!list.length) {
    grid.innerHTML = `<p style="padding:40px 4px;opacity:.65;font-size:14px">${esc(T.noResults)}</p>`;
  } else {
    grid.innerHTML = list
      .map(
        (it) => `<div class="card ${state.selected === it.type + ':' + it.key ? 'selected' : ''}" data-type="${it.type}" data-key="${esc(it.key)}" role="button" tabindex="0">
        ${iconHTML(it)}
        <h3>${esc(it.zh)}</h3>
        <div class="en">${esc(it.en)}</div>
        <p class="desc">${esc(it.desc)}</p>
        ${badgesHTML(it)}
      </div>`,
      )
      .join('');
    // selection is DOM state, not markup: re-rendering 1,694 cards to move one
    // highlight is what made every click feel heavy
    if (state.selected) cardEl(state.selected)?.classList.add('selected');
  }
  const pCount = list.filter((i) => i.type === 'plugin').length;
  $('#count').textContent = T.summary(fmt(list.length), fmt(pCount), fmt(list.length - pCount));
}

const cardEl = (sel) => {
  const [type, ...rest] = sel.split(':');
  const key = rest.join(':');
  return $(`#grid .card[data-type="${type}"][data-key="${CSS.escape(key)}"]`);
};

function installHTML() {
  const T = t();
  return `<div class="block">
    <strong>${esc(T.installTitle)}</strong>
    <div class="install">
      <ol>${T.installSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <button class="copybtn" data-copy>${esc(MARKET_URL)} — ${esc(T.copy)}</button>
      <div class="notice">${esc(T.installHint)}</div>
      <p style="margin:12px 0 0"><a href="${GUIDE_URL}" target="_blank" rel="noopener">${esc(T.guide)}</a></p>
    </div>
  </div>`;
}

function detailHTML(it) {
  const T = t();
  const head = `<div style="display:flex;gap:16px;align-items:flex-start">
      ${iconHTML(it, 80)}
      <div style="min-width:0">
        <h2>${esc(it.zh)}</h2>
        <div class="detail-en">${esc(it.en)}</div>
      </div>
    </div>
    <div class="badges" style="margin-top:12px">${it.badges.map((b) => `<span class="badge ${b.cls || ''}">${esc(b.text)}</span>`).join('')}</div>`;
  if (it.type === 'app') {
    const app = APPS.find((a) => a.id === it.key) ?? {};
    return `${head}
      <div class="notice">${esc(T.appNotice)}</div>
      <div class="block"><strong>${esc(T.intro)}</strong><div class="detail-desc">${esc(it.long)}</div>
      ${it.longEn ? `<details><summary style="cursor:pointer;font-size:13px">${esc(T.enOriginal)}</summary><div class="original detail-desc">${esc(it.longEn)}</div></details>` : ''}</div>
      <div class="block"><strong>${esc(T.links)}</strong>
        ${app.installUrl ? `<a class="link" href="${esc(app.installUrl)}" target="_blank" rel="noopener">${esc(T.website)}</a>` : ''}
        <button class="copybtn" data-copy>${esc(MARKET_URL)} — ${esc(T.copy)}</button>
      </div>`;
  }
  const p = CATALOG.plugins.find((x) => x.name === it.key);
  const prompts = state.lang === 'en' && p.promptsEn?.length ? p.promptsEn : p.prompts;
  return `${head}
    <div class="block"><strong>${esc(T.intro)}</strong><div class="detail-desc">${esc(it.desc)}</div></div>
    <div class="block"><strong>${esc(T.detail)}</strong><div class="detail-desc">${esc(it.long)}</div>
      ${p.longEn ? `<details><summary style="cursor:pointer;font-size:13px">${esc(T.enOriginal)}</summary><div class="original detail-desc">${esc(p.longEn)}</div></details>` : ''}</div>
    ${prompts.length ? `<div class="block"><strong>${esc(T.prompts)}</strong><ul style="margin:6px 0;padding-left:18px">${prompts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${p.skillsCount ? `<div class="block"><strong>${esc(T.skills)}（${p.skillsCount}）</strong><div class="badges">${p.skills.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div></div>` : ''}
    <div class="block"><strong>${esc(T.links)}</strong>
      <a class="link" href="${esc(p.upstreamUrl)}" target="_blank" rel="noopener">${esc(p.origin === 'snapshot' ? T.snapshotSource : T.upstream)}</a>
      <button class="copybtn" data-copy>${esc(MARKET_URL)} — ${esc(T.copy)}</button>
    </div>`;
}

function renderPane() {
  const it = ITEMS.find((x) => state.selected === x.type + ':' + x.key);
  $('#detailpane').innerHTML = `
    <button class="detail-close" id="dclose">${esc(t().close)}</button>
    ${it ? detailHTML(it) : installHTML()}`;
  bindCopy($('#detailpane'));
  $('#dclose').addEventListener('click', closeDetail);
}

function maybeShowDrawer() {
  if (!window.matchMedia('(min-width: 1121px)').matches) document.body.classList.add('detail-open');
}

function openDetail(type, key) {
  const prev = $('#grid').querySelector('.card.selected');
  if (prev) prev.classList.remove('selected');
  state.selected = type + ':' + key;
  cardEl(state.selected)?.classList.add('selected');
  renderPane();
  maybeShowDrawer();
  writeUrlState();
}

function closeDetail() {
  document.body.classList.remove('detail-open');
  if (!state.selected) return;
  state.selected = null;
  const cur = $('#grid').querySelector('.card.selected');
  if (cur) cur.classList.remove('selected');
  renderPane();
  writeUrlState();
}

function bindCopy(root) {
  root.querySelectorAll('.copybtn[data-copy]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const old = btn.textContent;
      if (!(await copyText(MARKET_URL))) return;
      btn.textContent = t().copied;
      setTimeout(() => (btn.textContent = old), 1600);
    }),
  );
}

// navigator.clipboard needs a secure context; the install flow hinges on this
// button, so fall back to the old selection trick when it is unavailable.
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function applyI18nStatic() {
  const T = t();
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const v = T[el.dataset.i18n];
    if (v === undefined) continue;
    el.textContent = typeof v === 'function' ? v() : v;
  }
  for (const el of document.querySelectorAll('[data-i18n-aria]')) {
    const v = T[el.dataset.i18nAria];
    if (typeof v === 'string') el.setAttribute('aria-label', v);
  }
  $('#q').placeholder = T.searchPh;
  $('#lang').textContent = state.lang === 'zh' ? 'English' : '中文';
  document.title = T.docTitle();
  const st = $('#f-status');
  const cur = state.status;
  const statuses = [...new Set(APPS.map((a) => a.status).filter(Boolean))];
  st.innerHTML = `<option value="">${esc(T.statusAll)}</option>` +
    statuses.map((s) => `<option value="${esc(s)}"${s === cur ? ' selected' : ''}>${esc(s)}</option>`).join('');
  const sort = $('#f-sort');
  [T.sortDefault, T.sortAz, T.sortZa].forEach((label, i) => { sort.options[i].text = label; });
  // a shared link can carry a sort the control has to show, else the grid and
  // the dropdown disagree about what is being displayed
  sort.value = state.sort;
  const meta = $('#meta');
  meta.textContent = new Date(CATALOG.generatedAt).toLocaleDateString(state.lang === 'zh' ? 'zh-CN' : 'en-US');
  const appSnapshots = [...new Set(APPS.map((a) => a.snapshot).filter(Boolean))];
  meta.title = [
    `openai/plugins @ ${(CATALOG.upstream?.sha ?? '').slice(0, 9)} (${CATALOG.generatedAt?.slice(0, 10) ?? '?'})`,
    CATALOG.snapshot ? `curated snapshot @ ${String(CATALOG.snapshot.commitDate ?? '').slice(0, 10)}` : null,
    ...appSnapshots,
  ].filter(Boolean).join('\n');
}

// ---- URL state -------------------------------------------------------------
function readUrlState() {
  if (!location.hash) return;
  const p = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (p.has('q')) state.q = p.get('q');
  if (QUICK.includes(p.get('quick'))) state.quick = p.get('quick');
  if (p.has('cat')) state.cat = p.get('cat') || null;
  if (p.has('status')) state.status = p.get('status');
  if (SORTS.includes(p.get('sort'))) state.sort = p.get('sort');
  if (p.has('z')) state.onlyZh = p.get('z') === '1';
  if (p.has('lang')) state.lang = p.get('lang') === 'en' ? 'en' : 'zh';
  if (p.has('d')) state.selected = p.get('d');
}

function writeUrlState() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.quick !== 'plugin') p.set('quick', state.quick);
  if (state.cat) p.set('cat', state.cat);
  if (state.status) p.set('status', state.status);
  if (state.sort !== 'default') p.set('sort', state.sort);
  if (state.onlyZh) p.set('z', '1');
  if (state.lang !== 'zh') p.set('lang', state.lang);
  if (state.selected) p.set('d', state.selected);
  const hash = p.toString();
  const url = (hash ? `#${hash}` : location.pathname + location.search);
  // replaceState, not pushState: a shareable link is the point, a history entry
  // per keystroke is not.
  try {
    history.replaceState(null, '', url);
  } catch { /* file:// */ }
}

// ---- render orchestration --------------------------------------------------
function render() { // cheap: filter/sort/selection only
  renderGrid();
  writeUrlState();
}

function renderAll() { // structural: data, language or filter-mode change
  buildItems();
  applyI18nStatic();
  renderRail();
  renderPills();
  renderGrid();
  renderPane();
  writeUrlState();
}

async function getJson(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return fallback;
  }
}

async function init() {
  const [catalog, apps, aliases] = await Promise.all([
    getJson('./catalog.json', null),
    getJson('./apps-zh.json', []),
    getJson('./plugin-aliases.json', {}),
  ]);
  if (!catalog) {
    document.querySelector('main .controls')?.remove();
    $('#grid').innerHTML = I18N.zh.loadFailed;
    return;
  }
  CATALOG = catalog;
  APPS = Array.isArray(apps) ? apps : [];
  ALIASES = aliases ?? {};
  STATS.plugins = CATALOG.total ?? 0;
  STATS.apps = APPS.length;
  STATS.total = STATS.plugins + STATS.apps;
  STATS.translated = CATALOG.translated ?? 0;

  state.theme = localStorage.getItem('czh-theme') ?? 'light';
  state.lang = localStorage.getItem('czh-lang') ?? 'zh';
  readUrlState(); // a shared link wins over the stored preference
  document.documentElement.dataset.theme = state.theme;
  $('#theme').textContent = state.theme === 'light' ? '🌙' : '☀️';
  $('#q').value = state.q;
  $('#onlyzh').checked = state.onlyZh;

  // Delegated listeners survive the innerHTML re-renders these containers get.
  $('#grid').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card) openDetail(card.dataset.type, card.dataset.key);
  });
  $('#grid').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    openDetail(card.dataset.type, card.dataset.key);
  });
  $('#rail').addEventListener('click', (e) => {
    const btn = e.target.closest('.side-btn');
    if (!btn) return;
    state.cat = btn.dataset.cat || null;
    renderAll();
  });
  $('#pills').addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-btn');
    if (!btn) return;
    state.quick = btn.dataset.k;
    state.cat = null;
    renderAll();
  });

  // Our own state writes use replaceState, which fires no event: this only runs
  // when the hash is changed from outside — a link pasted into an open tab.
  window.addEventListener('hashchange', () => {
    // the new link is the whole view state, not just the params it happens to name
    Object.assign(state, { q: '', cat: null, quick: 'plugin', status: '', sort: 'default', onlyZh: false, selected: null });
    readUrlState();
    $('#q').value = state.q;
    $('#onlyzh').checked = state.onlyZh;
    renderAll();
  });

  let qTimer;
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    clearTimeout(qTimer);
    qTimer = setTimeout(render, 120); // 1,694 cards per keystroke otherwise
  });
  $('#clear').addEventListener('click', () => {
    state.q = ''; state.cat = null; state.status = ''; state.sort = 'default'; state.onlyZh = false; state.quick = 'all'; state.selected = null;
    $('#q').value = ''; $('#onlyzh').checked = false;
    document.body.classList.remove('detail-open');
    renderAll();
  });
  $('#onlyzh').addEventListener('change', (e) => { state.onlyZh = e.target.checked; renderAll(); });
  $('#f-cat').addEventListener('change', (e) => { state.cat = e.target.value || null; renderAll(); });
  $('#f-status').addEventListener('change', (e) => { state.status = e.target.value; renderAll(); });
  $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
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
  $('#backdrop').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

  renderAll();
  if (state.selected) maybeShowDrawer();
}
init();
