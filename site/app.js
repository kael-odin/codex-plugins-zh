const state = { q: '', cat: null, onlyZh: false };
let CATALOG = null;
let activePlugin = null;

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => (s ?? '').toLowerCase();

function colorFor(p) {
  if (p.brandColor) return p.brandColor;
  let h = 0;
  for (const c of p.name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 45% 45%)`;
}

function match(p) {
  if (p.missing) return false;
  if (state.cat && p.category !== state.cat) return false;
  if (state.onlyZh && !p.hasZh) return false;
  if (!state.q) return true;
  const q = norm(state.q);
  return [p.name, p.displayName, p.shortZh, p.shortEn, p.longZh, p.longEn, p.category, p.categoryZh]
    .some((v) => norm(v).includes(q));
}

function renderChips() {
  const box = $('#cats');
  const chips = [{ en: null, zh: '全部', count: CATALOG.total }]
    .concat(CATALOG.categories.map((c) => ({ ...c, key: c.en })));
  box.innerHTML = chips
    .map((c) => {
      const active = (c.en ?? null) === state.cat;
      return `<button class="chip ${active ? 'active' : ''}" data-cat="${esc(c.en ?? '')}">${esc(c.zh)} · ${c.count}</button>`;
    })
    .join('');
  box.querySelectorAll('.chip').forEach((el) =>
    el.addEventListener('click', () => {
      state.cat = el.dataset.cat || null;
      renderAll();
    }),
  );
}

function card(p) {
  const initial = esc((p.displayName || p.name)[0].toUpperCase());
  return `<div class="card" data-name="${esc(p.name)}">
    <div class="tile" style="background:${esc(colorFor(p))}">${initial}</div>
    <div style="min-width:0">
      <h3>${esc(p.displayName)}</h3>
      <p class="desc">${esc(p.shortZh || p.shortEn)}</p>
      <div class="meta">
        <span class="badge">${esc(p.categoryZh)}</span>
        ${p.skillsCount ? `<span class="badge">${p.skillsCount} 技能</span>` : ''}
        ${p.hasMcp ? '<span class="badge">MCP</span>' : ''}
        ${p.inApi ? '<span class="badge api">API 版</span>' : ''}
        ${p.hasZh ? '<span class="badge zh">已译</span>' : ''}
      </div>
    </div>
  </div>`;
}

function renderGrid() {
  const list = CATALOG.plugins.filter(match);
  $('#grid').innerHTML = list.map(card).join('');
  $('#grid').querySelectorAll('.card').forEach((el) =>
    el.addEventListener('click', () => openModal(el.dataset.name)),
  );
  $('#count').textContent = `显示 ${list.length} / ${CATALOG.total} 个插件 · 已译 ${CATALOG.translated} 个 · 上游 ${CATALOG.upstream.sha.slice(0, 9)}`;
}

function renderAll() {
  renderChips();
  renderGrid();
}

function openModal(name) {
  const p = CATALOG.plugins.find((x) => x.name === name);
  if (!p) return;
  activePlugin = p;
  $('#detail').innerHTML = `
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:6px">
      <div class="tile" style="background:${esc(colorFor(p))};width:52px;height:52px;font-size:22px">${esc(p.displayName[0].toUpperCase())}</div>
      <div>
        <h2>${esc(p.displayName)}</h2>
        <div class="en-name">${esc(p.name)} · ${esc(p.categoryZh)} (${esc(p.category)})</div>
      </div>
    </div>
    <div class="meta" style="margin-bottom:8px">
      ${p.inMain ? '<span class="badge">主清单</span>' : ''}
      ${p.inApi ? '<span class="badge api">API 清单</span>' : ''}
      ${p.hasMcp ? '<span class="badge">MCP 连接器</span>' : ''}
      ${p.hasApp ? '<span class="badge">App</span>' : ''}
      ${p.hasZh ? '<span class="badge zh">已译</span>' : '<span class="badge">未译</span>'}
    </div>
    <h4>简介</h4>
    <p style="margin:4px 0">${esc(p.shortZh || '（暂无译文）')}</p>
    ${p.shortEn ? `<div class="en-block">${esc(p.shortEn)}</div>` : ''}
    <h4>详细介绍</h4>
    <p style="margin:4px 0;white-space:pre-wrap">${esc(p.longZh || '（暂无译文，见英文原文）')}</p>
    ${p.longEn ? `<details><summary style="cursor:pointer;color:var(--dim);font-size:13px">英文原文</summary><div class="en-block">${esc(p.longEn)}</div></details>` : ''}
    ${p.prompts.length ? `<h4>上手示例</h4><ul>${p.prompts.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${p.skillsCount ? `<h4>包含技能（${p.skillsCount}）</h4><div class="chips">${p.skills.map((s) => `<span class="badge">${esc(s)}</span>`).join('')}</div>` : ''}
    <h4>链接</h4>
    <p><a href="${esc(p.upstreamUrl)}" target="_blank" rel="noopener">上游源码（openai/plugins）↗</a></p>
  `;
  $('#modal').classList.remove('hidden');
}

async function init() {
  CATALOG = await (await fetch('./catalog.json')).json();
  $('#meta').textContent = new Date(CATALOG.generatedAt).toLocaleDateString('zh-CN');
  $('#q').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    renderGrid();
  });
  $('#onlyzh').addEventListener('change', (e) => {
    state.onlyZh = e.target.checked;
    renderGrid();
  });
  document.querySelectorAll('.copy').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const text = document.querySelector(btn.dataset.copy).textContent;
      await navigator.clipboard.writeText(text);
      btn.textContent = '已复制 ✓';
      setTimeout(() => (btn.textContent = '复制'), 1600);
    }),
  );
  $('#close').addEventListener('click', () => $('#modal').classList.add('hidden'));
  $('#modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#modal').classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#modal').classList.add('hidden');
  });
  renderAll();
}
init();
