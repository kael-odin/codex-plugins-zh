const MARKET_URL = 'https://github.com/kael-odin/codex-plugins-zh.git';
const GUIDE_URL = 'https://github.com/kael-odin/codex-plugins-zh/blob/main/docs/setup-guide.md';

const I18N = {
  zh: {
    title: 'Codex 官方插件 · 中文导航',
    subtitle: '全量 1,694+ 项目 · 无损汉化 · 每日更新',
    searchPh: '例如：做表格、PPT、控制电脑、查邮件、英伟达、Notion...',
    clear: '清空',
    cats: '快速分类',
    all: '全部',
    quick: { all: '全部', plugin: '插件', app: '应用与连接器' },
    kindPlugin: '插件',
    kindApp: '应用/连接器',
    summary: (n, p, a, t) => `找到 ${n} 项（插件 ${p} · 应用与连接器 ${a}）· 插件已译 ${t}/189 · 数据每日自动同步`,
    intro: '简介',
    detail: '详细介绍',
    enOriginal: '英文原文',
    prompts: '上手示例',
    skills: '包含技能',
    links: '链接',
    upstream: '在 openai/plugins 查看源码 ↗',
    website: '打开官方网站 ↗',
    mainList: '主清单',
    apiList: 'API 清单',
    hasMcp: 'MCP 连接器',
    hasApp: 'App',
    translated: '已译',
    untranslated: '未译',
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
    close: '关闭详情',
    statusAll: '全部状态',
    catAll: '全部分类',
    sortDefault: '推荐排序',
  },
  en: {
    title: 'Codex Official Plugins · Chinese Navigator',
    subtitle: '1,694+ items · lossless Chinese edition · daily updates',
    searchPh: 'e.g. spreadsheet, PPT, browser control, email, NVIDIA, Notion...',
    clear: 'Clear',
    cats: 'Categories',
    all: 'All',
    quick: { all: 'All', plugin: 'Plugins', app: 'Apps & connectors' },
    kindPlugin: 'Plugin',
    kindApp: 'App/Connector',
    summary: (n, p, a, t) => `${n} items (${p} plugins · ${a} apps & connectors) · ${t}/189 plugins translated · synced daily`,
    intro: 'Intro',
    detail: 'Details',
    enOriginal: 'English original',
    prompts: 'Starter prompts',
    skills: 'Skills',
    links: 'Links',
    upstream: 'View source on openai/plugins ↗',
    website: 'Open official website ↗',
    mainList: 'Main catalog',
    apiList: 'API catalog',
    hasMcp: 'MCP connector',
    hasApp: 'App',
    translated: 'Translated',
    untranslated: 'Not translated',
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
    close: 'Close details',
    statusAll: 'All statuses',
    catAll: 'All categories',
    sortDefault: 'Recommended',
  },
};

const state = { q: '', cat: null, quick: 'all', status: '', sort: 'default', onlyZh: false, lang: 'zh', theme: 'light', selected: null };
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
  $('#rail').querySelectorAll('.side-btn').forEach((el) =>
    el.addEventListener('click', () => {
      state.cat = el.dataset.cat || null;
      renderAll();
    }),
  );
  // category select keeps in sync with rail
  const sel = $('#f-cat');
  const cur = state.cat ?? '';
  sel.innerHTML = `<option value="">${esc(t().catAll)}</option>` +
    cats.map(([label, count]) => `<option value="${esc(label)}"${label === cur ? ' selected' : ''}>${esc(label)} (${count})</option>`).join('');
}

function renderPills() {
  const T = t();
  const defs = [['all', T.quick.all], ['plugin', `${T.quick.plugin} ${fmt(CATALOG.total)}`], ['app', `${T.quick.app} ${fmt(APPS.length)}`]];
  $('#pills').innerHTML = defs
    .map(([k, label]) => `<button class="quick-btn ${state.quick === k ? 'active' : ''}" data-k="${k}">${esc(label)}</button>`)
    .join('');
  $('#pills').querySelectorAll('.quick-btn').forEach((el) =>
    el.addEventListener('click', () => {
      state.quick = el.dataset.k;
      state.cat = null;
      renderAll();
    }),
  );
}

function renderGrid() {
  const T = t();
  const list = sorted(ITEMS.filter(match));
  $('#grid').innerHTML = list
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
  $('#grid').querySelectorAll('.card').forEach((el) => {
    const key = el.dataset.type + ':' + el.dataset.key;
    const open = () => openDetail(el.dataset.type, el.dataset.key);
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  });
  const pCount = list.filter((i) => i.type === 'plugin').length;
  $('#count').textContent = T.summary(fmt(list.length), fmt(pCount), fmt(list.length - pCount), `${CATALOG.translated}`);
}

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
    return `${head}
      <div class="block"><strong>${esc(T.intro)}</strong><div class="detail-desc">${esc(it.long)}</div>
      ${it.longEn ? `<details><summary style="cursor:pointer;font-size:13px">${esc(T.enOriginal)}</summary><div class="original detail-desc">${esc(it.longEn)}</div></details>` : ''}</div>
      <div class="block"><strong>${esc(T.links)}</strong>
        ${it.installUrl ? `<a class="link" href="${esc(it.installUrl)}" target="_blank" rel="noopener">${esc(T.website)}</a>` : ''}
        <button class="copybtn" data-copy>${esc(MARKET_URL)} — ${esc(T.copy)}</button>
      </div>`;
  }
  const p = CATALOG.plugins.find((x) => x.name === it.key);
  const prompts = state.lang === 'en' && p.promptsEn?.length ? p.promptsEn : p.prompts;
  return `${head}
    <div class="block"><strong>${esc(T.intro)}</strong><div class="detail-desc">${esc(state.lang === 'zh' ? p.shortZh || T.enOriginal && p.shortEn : p.shortEn || p.shortZh)}</div></div>
    <div class="block"><strong>${esc(T.detail)}</strong><div class="detail-desc">${esc(state.lang === 'zh' ? p.longZh || p.longEn : p.longEn || p.longZh)}</div>
      ${p.longEn ? `<details><summary style="cursor:pointer;font-size:13px">${esc(T.enOriginal)}</summary><div class="original detail-desc">${esc(p.longEn)}</div></details>` : ''}</div>
    ${prompts.length ? `<div class="block"><strong>${esc(T.prompts)}</strong><ul style="margin:6px 0;padding-left:18px">${prompts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${p.skillsCount ? `<div class="block"><strong>${esc(T.skills)}（${p.skillsCount}）</strong><div class="badges">${p.skills.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div></div>` : ''}
    <div class="block"><strong>${esc(T.links)}</strong>
      <a class="link" href="${esc(p.upstreamUrl)}" target="_blank" rel="noopener">${esc(T.upstream)}</a>
      <button class="copybtn" data-copy>${esc(MARKET_URL)} — ${esc(T.copy)}</button>
    </div>`;
}

function renderPane() {
  const it = ITEMS.find((x) => state.selected === x.type + ':' + x.key);
  $('#detailpane').innerHTML = `
    <button class="detail-close" id="dclose">${esc(t().close)}</button>
    ${it ? detailHTML(it) : installHTML()}`;
  bindCopy($('#detailpane'));
  $('#dclose').addEventListener('click', closeDrawer);
}

function openDetail(type, key) {
  state.selected = type + ':' + key;
  renderGrid();
  renderPane();
  if (!window.matchMedia('(min-width: 1121px)').matches) {
    document.body.classList.add('detail-open');
  }
}

function closeDrawer() {
  document.body.classList.remove('detail-open');
}

function bindCopy(root) {
  root.querySelectorAll('.copybtn[data-copy]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(MARKET_URL);
      const old = btn.textContent;
      btn.textContent = t().copied;
      setTimeout(() => (btn.textContent = old), 1600);
    }),
  );
}

function applyI18nStatic() {
  const T = t();
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = T[el.dataset.i18n] ?? el.textContent;
  $('#q').placeholder = T.searchPh;
  $('#lang').textContent = state.lang === 'zh' ? 'English' : '中文';
  document.title = state.lang === 'zh'
    ? 'Codex 官方插件中文市场 · 全量 1,694 项目导航'
    : 'Codex Official Plugins, in Chinese · 1,694 Items Navigator';
  const st = $('#f-status');
  const cur = state.status;
  const statuses = [...new Set(APPS.map((a) => a.status).filter(Boolean))];
  st.innerHTML = `<option value="">${esc(T.statusAll)}</option>` +
    statuses.map((s) => `<option value="${esc(s)}"${s === cur ? ' selected' : ''}>${esc(s)}</option>`).join('');
  const sort = $('#f-sort');
  sort.options[0].text = T.sortDefault;
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
  $('#clear').addEventListener('click', () => {
    state.q = ''; state.cat = null; state.status = ''; state.sort = 'default'; state.onlyZh = false; state.quick = 'all';
    $('#q').value = ''; $('#onlyzh').checked = false;
    renderAll();
  });
  $('#onlyzh').addEventListener('change', (e) => { state.onlyZh = e.target.checked; renderGrid(); });
  $('#f-cat').addEventListener('change', (e) => { state.cat = e.target.value || null; renderAll(); });
  $('#f-status').addEventListener('change', (e) => { state.status = e.target.value; renderAll(); });
  $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
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
  $('#backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  renderAll();
}
init();
