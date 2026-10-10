// Sync the .upstream clone of openai/plugins and write data/diff.json
// describing what changed since the last synced commit.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, UPSTREAM_DIR, DATA_DIR, readJson, writeJson, git } from './lib.mjs';

const cfg = readJson(path.join(ROOT, 'config', 'zh-marketplace.json'));

if (!fs.existsSync(path.join(UPSTREAM_DIR, '.git'))) {
  console.log('[sync] cloning upstream (one-time) ...');
  execFileSync('git', ['clone', cfg.upstream, UPSTREAM_DIR], { stdio: 'inherit' });
} else {
  git(UPSTREAM_DIR, 'remote', 'set-url', 'origin', cfg.upstream);
  git(UPSTREAM_DIR, 'fetch', 'origin', '--prune');
}
git(UPSTREAM_DIR, 'remote', 'set-head', 'origin', '-a');
git(UPSTREAM_DIR, 'reset', '--hard', 'origin/HEAD');

const sha = git(UPSTREAM_DIR, 'rev-parse', 'HEAD');
const last = readJson(path.join(DATA_DIR, 'last-sha.json'), null);
let from = last?.sha ?? null;
// force-push guard: if the previous sha is no longer an ancestor, treat as
// first sync (full re-materialize + orphan sweep) instead of a broken diff
if (from) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', from, sha], { cwd: UPSTREAM_DIR });
  } catch {
    console.log(`[sync] previous sha ${from.slice(0, 9)} is not an ancestor (force-push?) — full re-sync`);
    from = null;
  }
}

const diff = {
  from,
  to: sha,
  generatedAt: new Date().toISOString(),
  firstSync: from === null,
  plugins: { added: [], modified: [], removed: [] },
  files: { removed: [] },
};

if (from && from !== sha) {
  const out = git(UPSTREAM_DIR, 'diff', '--name-status', from, sha);
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const [st, file] = line.split('\t');
    const pm = file.match(/^plugins\/([^/]+)(?:\/.*)?$/);
    if (pm) {
      const bucket = st.startsWith('A') ? 'added' : st.startsWith('D') ? 'removed' : 'modified';
      if (!diff.plugins[bucket].includes(pm[1])) diff.plugins[bucket].push(pm[1]);
    }
    if (st.startsWith('D') && (file.startsWith('plugins/') || file.startsWith('.agents/'))) {
      diff.files.removed.push(file);
    }
  }
}

writeJson(path.join(DATA_DIR, 'diff.json'), diff);
console.log(
  `[sync] upstream @ ${sha.slice(0, 9)} (prev ${from ? from.slice(0, 9) : 'first sync'}): ` +
    `+${diff.plugins.added.length} ~${diff.plugins.modified.length} -${diff.plugins.removed.length} plugins, ` +
    `${diff.files.removed.length} files removed`,
);
