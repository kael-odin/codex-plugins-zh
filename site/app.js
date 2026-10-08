const MARKET_URL = 'https://github.com/kael-odin/codex-plugins-zh.git';
const GUIDE_URL = 'https://github.com/kael-odin/codex-plugins-zh/blob/main/docs/setup-guide.md';

const I18N = {
  zh: {
    title: 'Codex 官方插件 · 中文导航',
    subtitle: '自动同步 openai/plugins · 无损汉化 · 每日更新',
    searchPh: '搜索：做表格 / figma / 查邮件 / 控制电脑 / 数据可视化 …',
    clear: '清空',
    cats: '快速分类',
    all: '全部',
    quick: { all: '全部', zh: '已译', mcp: 'MCP 连接器', app: 'App', api: 'API 清单' },
    found: (x, y) => `找到 ${x} / ${y} 个插件`,
    zhCount: (n) => `已译 ${n}`,
    icons: (n) => `官方图标 ${n}`,
    intro: '简介',
    detail: '详细介绍',
    prompts: '上手示例',
    skills: (n) => `包含技能（${n}）`,
    links: '链接',
    upstream: '上游源码（openai/plugins）↗',
    mainList: '主清单',
    apiList: 'API 清单',
    hasMcp: 'MCP 连接器',
    hasApp: 'App',
    translated: '已译',
    untranslated: '未译',
    noneZh: '（暂无译文，见英文原文）',
    enOriginal: '英文原文',
    snapshot: '数据快照',
    installTitle: '把中文市场加进 Codex',
    installSteps: ['Codex 里打开 设置 → 插件 → 添加市场', '粘贴右侧地址，点击复制按钮', '重开会话，出现「Codex 官方插件 · 中文版」'],
    copy: '复制',
    copied: '已复制 ✓',
    guide: '完整安装 / 冗余清理指南 →',
    installHint: 'API-key 登录用户：App 自带的「Built by OpenAI · 50 个插件」请保留，两者并存互不影响。',
    footerLegal: '插件内容与商标归 OpenAI 及各自权利人所有，中文译文仅供参考，与英文原文冲突时以英文原文为准。',
    close: '关闭',
  },
  en: {
    title: 'Codex Official Plugins · Chinese Navigator',
    subtitle: 'Auto-synced from openai/plugins · lossless Chinese edition · daily updates',
    searchPh: 'Search: spreadsheet / figma / email / data visualization …',
    clear: 'Clear',
    cats: 'Categories',
    all: 'All',
    quick: { all: 'All', zh: 'Translated', mcp: 'MCP connector', app: 'App', api: 'API catalog' },
    found: (x, y) => `Showing ${x} of ${y} plugins`,
    zhCount: (n) => `${n} translated`,
    icons: (n) => `${n} official icons`,
    intro: 'Intro',
    detail: 'Details',
    prompts: 'Starter prompts',
    skills: (n) => `Skills (${n})`,
    links: 'Links',
    upstream: 'Upstream source (openai/plugins) ↗',
    mainList: 'Main catalog',
    apiList: 'API catalog',
    hasMcp: 'MCP connector',
    hasApp: 'App',
    translated: 'Translated',
    untranslated: 'Not translated',
    noneZh: '(No Chinese yet — see English below)',
    enOriginal: 'English original',
    snapshot: 'Snapshot',
    installTitle: 'Add the Chinese marketplace to Codex',
    installSteps: ['Open Settings → Plugins → Add marketplace in Codex', 'Paste the URL below (copy button provided)', 'Start a new session — “Codex 官方插件 · 中文版” appears'],
    copy: 'Copy',
    copied: 'Copied ✓',
    guide: 'Full setup & cleanup guide →',
    installHint: 'API-key users: keep the built-in “Built by OpenAI · 50 plugins” — both marketplaces coexist.',
    footerLegal: 'Plugin content and trademarks belong to OpenAI and their respective owners. Chinese translations are informational; English originals prevail.',
    close: 'Close',
  },
};

const state = { q: '', cat: null, quick: 'all', lang: 'zh', theme: 'light', selected: null };
let CATALOG = null;

const $ = (s) => document.querySelector(s);
const t = () => I18N[state.lang];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => (s ?? '').toLowerCase();
const pick = (p, zh, en) => (state.lang === 'zh' ? p[zh] || p[en] : p[en] || p[zh]);

function colorFor(p) {
  if (p.brandColor) return p.brandColor;
  let h = 0;
  for (const c of p.name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 45%)`;
}

function match(p) {
  if (p.missing) return false;
  if (state.cat && p.category !== state.cat) return false;
  if (state.quick === 'zh' && !p.hasZh) return false;
  if (state.quick === 'mcp' && !p.hasMcp) return false;
  if (state.quick === 'app' && !p.hasApp) return false;
  if (state.quick === 'api' && !p.inApi) return false;
  if (!state.q) return true;
  const q = norm(state.q);
  return [p.name, p.displayName, p.shortZh, p.shortEn, p.longZh, p.longEn, p.category, p.categoryZh]
    .some((v) => norm(v).includes(q));
}

function iconHTML(p) {
  const initial = esc((p.displayName || p.name)[0].toUpperCase());
  if (p.icon) {
    return `<img class="picon" loading="lazy" src="${esc(p.icon)}" alt="${esc(p.displayName)}"
      onerror="this.classList.add('hide');this.nextElementSibling.classList.remove('hide')">
      <div class="tile hide" style="background:${esc(colorFor(p))}">${initial}</div>`;
  }
  return `<div class="tile" style="background:${esc(colorFor(p))}">${initial}</div>`;
}

function badgesHTML(p) {
  const T = t();
  return `<div class="meta">
    <span class="badge">${esc(state.lang === 'zh' ? p.categoryZh : p.category)}</span>
    ${p.skillsCount ? `<span class="badge">${p.skillsCount} skills</span>` : ''}
    ${p.hasMcp ? `<span class="badge">${T.hasMcp}</span>` : ''}
    ${p.inApi ? `<span class="badge b-api">${T.apiList}</span>` : ''}
    ${p.hasZh ? `<span class="badge b-zh">${T.translated}</span>` : ''}
  </div>`;
}

function renderRail() {
  const T = t();
  const items = [{ key: null, label: T.all, count: CATALOG.total }]
    .concat(CATALOG.categories.map((c) => ({ key: c.en, label: state.lang === 'zh' ? c.zh : c.en, count: c.count })));
  $('#rail').innerHTML = items
    .map((c) => `<button class="rail-item ${state.cat === c.key ? 'active' : ''}" data-cat="${esc(c.key ?? '')}">
        <span>${esc(c.label)}</span><span class="n">${c.count}</span></button>`)
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
  const defs = [['all', T.quick.all], ['zh', T.quick.zh], ['mcp', T.quick.mcp], ['app', T.quick.app], ['api', T.quick.api]];
  $('#pills').innerHTML = defs
    .map(([k, label]) => `<button class="pill ${state.quick === k ? 'active' : ''}" data-k="${k}">${esc(label)}</button>`)
    .join('');
  $('#pills').querySelectorAll('.pill').forEach((el) =>
    el.addEventListener('click', () => {
      state.quick = el.dataset.k;
      renderPills();
      renderGrid();
    }),
  );
}

function renderGrid() {
  const T = t();
  const list = CATALOG.plugins.filter(match);
  $('#grid').innerHTML = list
    .map(
      (p) => `<div class="card ${state.selected === p.name ? 'selected' : ''}" data-name="${esc(p.name)}" role="button" tabindex="0">
        ${iconHTML(p)}
        <h3>${esc(p.displayName)}</h3>
        <div class="en">${esc(p.name)}</div>
        <p class="desc">${esc(pick(p, 'shortZh', 'shortEn'))}</p>
        ${badgesHTML(p)}
      </div>`,
    )
    .join('');
  $('#grid').querySelectorAll('.card').forEach((el) => {
    const open = () => {
      if (window.matchMedia('(min-width: 1101px)').matches) {
        state.selected = el.dataset.name;
        renderGrid();
        renderPane();
      } else {
        openModal(el.dataset.name);
      }
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  });
  const iconN = list.filter((p) => p.icon).length;
  $('#count').textContent =
    `${T.found(list.length, CATALOG.total)} · ${T.zhCount(CATALOG.translated)} · ${T.icons(iconN)}`;
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

function detailHTML(p) {
  const T = t();
  const zhLong = state.lang === 'zh' ? p.longZh || T.noneZh : p.longZh || '';
  return `<div class="headrow">
      ${iconHTML(p)}
      <div style="min-width:0">
        <h2>${esc(p.displayName)}</h2>
        <div class="en-name">${esc(p.name)} · ${esc(state.lang === 'zh' ? p.categoryZh : p.category)}</div>
      </div>
    </div>
    ${badgesHTML(p)}
    <h4>${esc(T.intro)}</h4>
    <p style="margin:4px 0">${esc(pick(p, 'shortZh', 'shortEn'))}</p>
    <h4>${esc(T.detail)}</h4>
    <p style="margin:4px 0;white-space:pre-wrap">${esc(pick(p, 'longZh', 'longEn') || T.noneZh)}</p>
    ${p.longEn ? `<details><summary style="cursor:pointer;color:var(--dim);font-size:13px">${esc(T.enOriginal)}</summary><div class="en-block">${esc(p.longEn)}</div></details>` : ''}
    ${p.prompts.length ? `<h4>${esc(T.prompts)}</h4><ul>${(state.lang === 'en' && p.promptsEn?.length ? p.promptsEn : p.prompts).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${p.skillsCount ? `<h4>${esc(T.skills(p.skillsCount))}</h4><div class="meta">${p.skills.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div>` : ''}
    <h4>${esc(T.links)}</h4>
    <p><a href="${esc(p.upstreamUrl)}" target="_blank" rel="noopener">${esc(T.upstream)}</a></p>
    <p><button class="copy" data-copy>${esc(T.copy)} ${esc(MARKET_URL)}</button></p>`;
}

function renderPane() {
  const p = state.selected && CATALOG.plugins.find((x) => x.name === state.selected);
  $('#detailpane').innerHTML = p ? detailHTML(p) : installHTML();
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

function openModal(name) {
  const p = CATALOG.plugins.find((x) => x.name === name);
  if (!p) return;
  $('#detail').innerHTML = detailHTML(p);
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
    ? 'Codex 官方插件中文市场 · 无损汉化导航'
    : 'Codex Official Plugins, in Chinese · Lossless Marketplace Navigator';
}

function renderAll() {
  applyI18nStatic();
  renderRail();
  renderPills();
  renderGrid();
  renderPane();
}

async function init() {
  CATALOG = await (await fetch('./catalog.json')).json();
  state.theme = localStorage.getItem('czh-theme') ?? 'light';
  state.lang = localStorage.getItem('czh-lang') ?? 'zh';
  document.documentElement.dataset.theme = state.theme;
  $('#theme').textContent = state.theme === 'light' ? '🌙' : '☀️';
  $('#meta').textContent = new Date(CATALOG.generatedAt).toLocaleDateString(state.lang === 'zh' ? 'zh-CN' : 'en-US');

  $('#q').addEventListener('input', (e) => { state.q = e.target.value.trim(); renderGrid(); });
  $('#clear').addEventListener('click', () => { state.q = ''; $('#q').value = ''; renderGrid(); });
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
