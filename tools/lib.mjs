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
