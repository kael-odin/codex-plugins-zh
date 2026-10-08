// Translation ledger manager for interface strings.
//
// Sidecar format: i18n/zh/<plugin>.json
//   { "<hash16 of exact source text>": { "zh": "...", "field": "...",
//     "source": "seed|api", "verified": bool, "model": "..." } }
// Keying by source hash means an upstream reword automatically retires the
// old translation — stale zh can never be applied to changed text.
//
// Usage:
//   node tools/translate.mjs                    # dry-run inventory
//   node tools/translate.mjs --seed <cloneDir>  # adopt zh from a reference clone (e.g. echobird/codex-plugins)
//   node tools/translate.mjs --execute          # translate pending strings via OpenAI-compatible API
//                                               #   env: GLM_API_KEY (required), GLM_BASE_URL, GLM_MODEL
//   node tools/translate.mjs --deep             # also collect SKILL.md frontmatter descriptions (seed only for now)
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, UPSTREAM_DIR, I18N_DIR,
  readJson, writeJson, textKey, hasCJK,
} from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const deep = flag('--deep');

function parseFrontmatterDescription(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  let capture = false;
  let buf = [];
  for (const line of lines) {
    if (capture) {
      if (/^\S+\s*:/.test(line)) break;
      buf.push(line.trim());
      continue;
    }
    const dm = line.match(/^description:\s*(.*)$/);
    if (!dm) continue;
    const rest = dm[1].trim();
    if (rest === '>' || rest === '|' || rest === '') { capture = true; continue; }
    return rest.replace(/^["']|["']$/g, '') || null;
  }
  const v = buf.join(' ').trim();
  return v || null;
}

function collect() {
  const entries = [];
  const pdir = path.join(UPSTREAM_DIR, 'plugins');
  for (const name of fs.readdirSync(pdir)) {
    const mf = path.join(pdir, name, '.codex-plugin', 'plugin.json');
    if (!fs.existsSync(mf)) continue;
    let iface;
    try {
      iface = JSON.parse(fs.readFileSync(mf, 'utf8')).interface ?? {};
    } catch {
      continue;
    }
    for (const field of ['displayName', 'shortDescription', 'longDescription']) {
      if (typeof iface[field] === 'string' && iface[field].trim()) {
        entries.push({ plugin: name, field, text: iface[field] });
      }
    }
    if (Array.isArray(iface.defaultPrompt)) {
      iface.defaultPrompt.forEach((s, idx) => {
        if (typeof s === 'string' && s.trim()) entries.push({ plugin: name, field: 'defaultPrompt', idx, text: s });
      });
    }
    if (deep) {
      const sdir = path.join(pdir, name, 'skills');
      if (!fs.existsSync(sdir)) continue;
      for (const sk of fs.readdirSync(sdir)) {
        const sf = path.join(sdir, sk, 'SKILL.md');
        if (!fs.existsSync(sf)) continue;
        const desc = parseFrontmatterDescription(fs.readFileSync(sf, 'utf8'));
        if (desc) entries.push({ plugin: name, field: `skill:${sk}`, text: desc });
      }
    }
  }
  return entries;
}

const sidePath = (pname) => path.join(I18N_DIR, `${pname}.json`);
const loadSide = (pname) => readJson(sidePath(pname), {});
const saveSide = (pname, side) => writeJson(sidePath(pname), side);

const entries = collect();
let have = 0;
for (const e of entries) if (loadSide(e.plugin)[textKey(e.text)]?.zh) have++;
console.log(`[translate] strings: ${entries.length}, translated: ${have}, pending: ${entries.length - have}`);

// ---- --seed: adopt zh strings from a reference clone (unverified: their
// snapshot may lag upstream, so seeded entries are marked verified:false)
const seedDir = opt('--seed');
if (seedDir) {
  if (!fs.existsSync(path.join(seedDir, 'plugins'))) {
    console.error(`[translate] --seed ${seedDir} does not look like a plugins clone`);
    process.exit(1);
  }
  let adopted = 0;
  const byPlugin = new Map();
  for (const e of entries) {
    if (!byPlugin.has(e.plugin)) byPlugin.set(e.plugin, []);
    byPlugin.get(e.plugin).push(e);
  }
  for (const [pname, list] of byPlugin) {
    const refMf = path.join(seedDir, 'plugins', pname, '.codex-plugin', 'plugin.json');
    let refIface = null;
    if (fs.existsSync(refMf)) {
      try { refIface = JSON.parse(fs.readFileSync(refMf, 'utf8')).interface ?? {}; } catch { refIface = null; }
    }
    const side = loadSide(pname);
    let dirty = false;
    for (const e of list) {
      const key = textKey(e.text);
      if (side[key]?.zh) continue;
      let cand = null;
      if (e.field.startsWith('skill:')) {
        const sf = path.join(seedDir, 'plugins', pname, 'skills', e.field.slice(6), 'SKILL.md');
        if (fs.existsSync(sf)) cand = parseFrontmatterDescription(fs.readFileSync(sf, 'utf8'));
      } else if (refIface) {
        cand = e.field === 'defaultPrompt'
          ? (refIface.defaultPrompt ?? [])[e.idx ?? -1]
          : refIface[e.field];
      }
      if (typeof cand === 'string' && hasCJK(cand)) {
        side[key] = { zh: cand, field: e.field, source: 'seed', verified: false, seededFrom: path.basename(seedDir) };
        adopted++;
        dirty = true;
      }
    }
    if (dirty) saveSide(pname, side);
  }
  console.log(`[translate] seed adopted: ${adopted}`);
}

// ---- --execute: translate pending strings via an OpenAI-compatible endpoint
if (flag('--execute')) {
  const key = process.env.GLM_API_KEY;
  if (!key) { console.error('[translate] GLM_API_KEY not set'); process.exit(1); }
  const base = (process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '');
  const model = process.env.GLM_MODEL ?? 'glm-4.5-flash';
  const pending = entries.filter((e) => !loadSide(e.plugin)[textKey(e.text)]?.zh);
  console.log(`[translate] API pending: ${pending.length} (model ${model})`);
  const SYS =
    '你是软件插件市场的本地化译者。把用户给出的 JSON 字符串数组里的每一条英文译成简体中文，' +
    '返回一个等长的 JSON 字符串数组。规则：品牌名与产品名保留英文；接口名、命令、路径、URL、代码片段保留原文；' +
    'prompt 示例译成自然的中文口语；不要解释，只输出 JSON 数组。';
  for (let i = 0; i < pending.length; i += 12) {
    const batch = pending.slice(i, i + 12);
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYS },
          { role: 'user', content: JSON.stringify(batch.map((b) => b.text)) },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[translate] API ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    const data = await res.json();
    let out = data.choices?.[0]?.message?.content ?? '[]';
    out = out.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
    let arr = [];
    try { arr = JSON.parse(out); } catch { console.error('[translate] unparseable batch, skipped'); }
    batch.forEach((b, j) => {
      const zh = arr[j];
      if (typeof zh !== 'string' || !hasCJK(zh)) return;
      const side = loadSide(b.plugin);
      side[textKey(b.text)] = { zh, field: b.field, source: 'api', verified: true, model };
      saveSide(b.plugin, side);
    });
    console.log(`  batch ${Math.floor(i / 12) + 1}/${Math.ceil(pending.length / 12)} done`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

if (!seedDir && !flag('--execute')) {
  console.log('[translate] dry-run only. Use --seed <dir> and/or --execute to fill the ledger.');
}
