import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadState, startFakeEngine } from '@tau-rs/arch-fixtures-loader';
import { EngineProcess, nodeSpawner, resolveBinary } from './engine-process';
import { EngineStatus } from '../common/engine-protocol';

const loaderDir = resolve(__dirname, '..', '..', '..', 'arch-fixtures-loader');
const exampleState = loadState(join(loaderDir, 'test', 'example-state'));
const tmp = () => mkdtempSync(join(tmpdir(), 'arch-host-'));

/** a stand-in `arch` binary: a script that runs the fake engine on the socket we pass through the env */
const fakeArch = (dir: string, body?: string): string => {
    const p = join(dir, 'arch');
    writeFileSync(p, body ?? `#!/bin/sh\n[ "$1" = "--version" ] && { echo "arch 0.0.0-fake"; exit 0; }\nexec node "${join(loaderDir, 'bin', 'arch-fake-engine.mjs')}" serve --socket "$ARCH_TEST_SOCKET" --state "${join(loaderDir, 'test', 'example-state')}"\n`);
    chmodSync(p, 0o755);
    return p;
};

test('discovery: preference → ARCH_BIN → PATH → bundled, and the list of where it looked', () => {
    const dir = tmp();
    const bin = fakeArch(dir);
    // this checks the order, not the probe: a real exec of a fresh file can exceed the 3 s timeout under load (#19)
    const identify = () => ({ version: '0.0.0-fake' });
    assert.deepEqual(resolveBinary({ preference: bin, identify }), { binary: bin, source: 'preference', version: '0.0.0-fake' });
    assert.deepEqual(resolveBinary({ preference: '/nope/arch', env: bin, identify }), { binary: bin, source: 'env', version: '0.0.0-fake' });
    assert.deepEqual(resolveBinary({ pathVar: `/nope:${dir}`, identify }), { binary: bin, source: 'path', version: '0.0.0-fake' });
    assert.deepEqual(resolveBinary({ pathVar: '/nope', bundled: bin, identify }), { binary: bin, source: 'bundled', version: '0.0.0-fake' });
    const miss = resolveBinary({ preference: '/nope/arch', env: '/nope2/arch', pathVar: '/nope', bundled: '/nope3/arch' });
    assert.ok('looked' in miss && miss.looked.length === 4, JSON.stringify(miss));
});

test('the macOS and coreutils `arch` on PATH is recognised as not the engine (F-8)', () => {
    const dir = tmp();
    fakeArch(dir, '#!/bin/sh\necho "arch (GNU coreutils) 9.4"\n');
    const miss = resolveBinary({ pathVar: dir });
    assert.ok('looked' in miss, JSON.stringify(miss));
    assert.match(miss.looked[0], /path: .*arch not the arch engine \(--version printed: arch \(GNU coreutils\) 9\.4\)/);
    const real = fakeArch(dir);
    const hit = resolveBinary({ env: real });
    assert.ok('binary' in hit && hit.version === '0.0.0-fake', JSON.stringify(hit));
});

test('no binary anywhere → not-found with the places it looked; the app still runs', async () => {
    const dir = tmp();
    const seen: EngineStatus[] = [];
    const p = new EngineProcess({ repoRoot: dir, socketPath: join(dir, 'e.sock'), discovery: { pathVar: '/nope' }, spawner: nodeSpawner(), clientSchemaVersion: 'none', onStatus: s => seen.push(s) });
    const s = await p.start();
    assert.equal(s.state, 'not-found');
    assert.ok(s.looked && s.looked.length >= 1);
    assert.deepEqual(seen.map(x => x.state), ['not-found']);
});

test('attach before spawn: a running engine on the socket is used, nothing is spawned', async () => {
    const dir = tmp();
    const sock = join(dir, 'e.sock');
    const engine = await startFakeEngine(exampleState, sock);
    try {
        let spawned = 0;
        const frames: string[] = [];
        const p = new EngineProcess({ repoRoot: dir, socketPath: sock, discovery: {}, spawner: { spawn: () => { spawned++; throw new Error('must not spawn'); } }, clientSchemaVersion: '0.1', onFrame: f => frames.push(f) });
        const s = await p.start();
        assert.equal(s.state, 'ready');
        assert.equal(s.attached, true);
        assert.equal(s.schemaVersion, '0.1');
        assert.equal(spawned, 0);
        await new Promise(r => setTimeout(r, 30));
        assert.deepEqual(frames.map(f => JSON.parse(f).method), ['tick', 'tick']); // events after the handshake reach the frame listener
        await p.stop();
    } finally { await engine.close(); }
});

test('spawn: the binary is started in the repo, readiness is connect + initialize, frames flow both ways', async () => {
    const dir = tmp();
    const sock = join(dir, 'e.sock');
    process.env.ARCH_TEST_SOCKET = sock;
    const bin = fakeArch(dir);
    const frames: string[] = [];
    const p = new EngineProcess({ repoRoot: dir, socketPath: sock, discovery: { env: bin }, spawner: nodeSpawner(), clientSchemaVersion: 'none', onFrame: f => frames.push(f), readyTimeoutMs: 5000 });
    const s = await p.start();
    assert.equal(s.state, 'ready');
    assert.equal(s.attached, false);
    assert.equal(s.engineVersion, 'fake-0.0.0');
    assert.equal(s.clientSchemaVersion, 'none');
    p.send(JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'ping' }));
    await new Promise(r => setTimeout(r, 50));
    const pong = frames.map(f => JSON.parse(f)).find(m => m.id === 7);
    assert.equal(pong?.result, 'pong');
    await p.stop();
    assert.equal(p.status.state, 'idle');
});

test('a stale socket file is removed, then the engine is spawned', async () => {
    const dir = tmp();
    const sock = join(dir, 'e.sock');
    writeFileSync(sock, '');
    process.env.ARCH_TEST_SOCKET = sock;
    const p = new EngineProcess({ repoRoot: dir, socketPath: sock, discovery: { env: fakeArch(dir) }, spawner: nodeSpawner(), clientSchemaVersion: 'none', readyTimeoutMs: 5000 });
    assert.equal((await p.start()).state, 'ready');
    await p.stop();
});

test('a binary that keeps dying: restart, then give up at the cap with a reason, never a dialog', async () => {
    const dir = tmp();
    const bin = fakeArch(dir, '#!/bin/sh\n[ "$1" = "--version" ] && { echo "arch 0.0.0-fake"; exit 0; }\nexit 3\n');
    const states: string[] = [];
    const p = new EngineProcess({ repoRoot: dir, socketPath: join(dir, 'e.sock'), discovery: { env: bin }, spawner: nodeSpawner(), clientSchemaVersion: 'none', maxRestarts: 2, restartWindowMs: 60_000, readyTimeoutMs: 2000, onStatus: s => states.push(s.state) });
    const s = await p.start();
    await new Promise(r => setTimeout(r, 500));
    assert.equal(p.status.state, 'failed', JSON.stringify(p.status));
    assert.match(p.status.detail!, /crashed 3 times/);
    assert.ok(states.filter(x => x === 'crashed').length === 2, states.join(','));
    void s;
});
