import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const UPSTREAM_DIR = path.join(ROOT, '.upstream');
export const DATA_DIR = path.join(ROOT, 'data');
export const I18N_DIR = path.join(ROOT, 'i18n', 'zh');

export function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    if (fallback !== undefined) return fallback;
    throw new Error(`cannot read JSON ${p}: ${e.message}`);
  }
}

export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

// Short hash of the exact source text — the sidecar key. If upstream rewords a
// string, the hash changes and the old translation is automatically retired.
export function textKey(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
}

export function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

// The date every generated artifact is stamped with: the committer date of the
// source commit we built from — never the wall clock. A sync that finds nothing
// new must rewrite byte-identical files, otherwise the daily job commits
// timestamp-only churn (and "no changes since last sync" is unreachable).
export function sourceDate(cwd) {
  return git(cwd, 'log', '-1', '--format=%cI');
}

export function toPosix(p) {
  return p.replace(/\\/g, '/');
}

export function hasCJK(s) {
  return /[\u4e00-\u9fff]/.test(s);
}

export function walkFiles(dir, prefix = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkFiles(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

// Choose the icon file a plugin exposes, in the site's stable preference
// order: manifest-named icons first (composerIcon/logo), then the conventional
// assets/* names; SVG wins when small, otherwise the smallest raster. Last
// resort is site/appicons/<name>.* (favicon backfill for the few plugins that
// ship no icon at all). Shared by build-site.mjs (dist/icons/<name><ext>) and
// compose.mjs (absolute Pages URL in the Claude marketplace manifest), so the
// site tile and the store icon can never disagree.
export function choosePluginIcon(pluginDir, extraRels = []) {
  if (!fs.existsSync(pluginDir)) return null;
  const rel = (s) => (s ? path.join(pluginDir, s.replace(/^\.\//, '')) : null);
  const usable = [
    ...extraRels.map(rel),
    ...['assets/icon.svg', 'assets/logo.svg', 'assets/icon.png', 'assets/logo.png', 'assets/logo-dark.png'].map(rel),
  ].filter(Boolean).filter((f) => fs.existsSync(f));
  const svgs = usable.filter((f) => f.endsWith('.svg') && fs.statSync(f).size < 200 * 1024);
  if (svgs.length) return svgs[0];
  if (usable.length) {
    const under = usable.filter((f) => !f.endsWith('.svg') && fs.statSync(f).size < 400 * 1024);
    const pool = under.length ? under : usable;
    return pool.sort((a, b) => fs.statSync(a).size - fs.statSync(b).size)[0];
  }
  const appicons = path.join(ROOT, 'site', 'appicons');
  if (fs.existsSync(appicons)) {
    const base = path.basename(pluginDir);
    const hit = fs.readdirSync(appicons).find(
      (f) => f.startsWith(`${base}.`) || f.startsWith(`plugin-${base}.`),
    );
    if (hit) return path.join(appicons, hit);
  }
  return null;
}
