#!/usr/bin/env node
// Sync one pinned external input (seed design, choices 6 and 8): a lock file names a repo, a
// commit and a path; this fetches exactly that. A file is fetched raw; a folder is a blobless
// sparse clone of that folder only. `commit: "none"` means nothing is pinned yet: say so, exit 0.
//
//   node scripts/sync-pinned.mjs <lock.json> <destination> [--kind file|folder]
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const [lockPath, dest, ...rest] = process.argv.slice(2);
if (!lockPath || !dest) {
    console.error('usage: sync-pinned.mjs <lock.json> <destination> [--kind file|folder]');
    process.exit(2);
}
const kind = rest.includes('--kind') ? rest[rest.indexOf('--kind') + 1] : 'file';
const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const stamp = resolve(dest) + '.synced.json';

if (!lock.commit || lock.commit === 'none') {
    console.log(`sync: nothing pinned yet in ${lockPath} (commit: none); skipping`);
    process.exit(0);
}
if (existsSync(stamp) && JSON.parse(readFileSync(stamp, 'utf8')).commit === lock.commit && existsSync(dest)) {
    console.log(`sync: ${dest} already at ${lock.repo}@${lock.commit.slice(0, 8)}`);
    process.exit(0);
}

if (kind === 'file') {
    const url = `https://raw.githubusercontent.com/${lock.repo}/${lock.commit}/${lock.path}`;
    const res = await fetch(url);
    if (!res.ok) { console.error(`sync: ${url} → ${res.status}`); process.exit(1); }
    mkdirSync(dirname(resolve(dest)), { recursive: true });
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
} else {
    const work = join(tmpdir(), `sync-${lock.repo.replace('/', '-')}-${lock.commit.slice(0, 8)}`);
    rmSync(work, { recursive: true, force: true });
    const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    git('clone', '--quiet', '--filter=blob:none', '--no-checkout', `https://github.com/${lock.repo}.git`, work);
    git('-C', work, 'sparse-checkout', 'set', lock.path);
    git('-C', work, 'checkout', '--quiet', lock.commit);
    rmSync(dest, { recursive: true, force: true });
    cpSync(join(work, lock.path), dest, { recursive: true });
    rmSync(work, { recursive: true, force: true });
}
writeFileSync(stamp, JSON.stringify({ repo: lock.repo, commit: lock.commit, path: lock.path, at: new Date().toISOString() }, null, 2) + '\n');
console.log(`sync: ${dest} ← ${lock.repo}@${lock.commit.slice(0, 8)}:${lock.path}`);
