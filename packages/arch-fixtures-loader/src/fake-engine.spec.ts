import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { join } from 'node:path';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { startFakeEngine } from './fake-engine';
import { loadState } from './load';

const example = loadState(join(__dirname, '..', 'test', 'example-state'));
const sock = () => join(mkdtempSync(join(tmpdir(), 'fake-arch-')), 'e.sock');

const talk = (path: string, requests: object[], expectLines: number): Promise<object[]> => new Promise((resolve, reject) => {
    const lines: object[] = [];
    let buf = '';
    const s = connect(path);
    s.setEncoding('utf8');
    s.on('connect', () => { for (const r of requests) { s.write(JSON.stringify(r) + '\n'); } });
    s.on('data', (chunk: string) => {
        buf += chunk;
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) { lines.push(JSON.parse(buf.slice(0, nl))); buf = buf.slice(nl + 1); }
        if (lines.length >= expectLines) { s.end(); resolve(lines); }
    });
    s.on('error', reject);
});

test('the fake engine answers initialize and ping over a local socket, then replays events', async () => {
    const engine = await startFakeEngine(example, sock());
    try {
        const lines = await talk(engine.socketPath, [{ jsonrpc: '2.0', id: 1, method: 'initialize' }, { jsonrpc: '2.0', id: 2, method: 'ping' }], 4);
        const byId = Object.fromEntries(lines.filter((l: any) => l.id !== undefined).map((l: any) => [l.id, l.result]));
        assert.equal(byId[1].schemaVersion, '0.1');
        assert.equal(byId[2], 'pong');
        assert.deepEqual(lines.filter((l: any) => l.method === 'tick').map((l: any) => l.params.at), [1, 2]);
        assert.equal(engine.connections, 1);
    } finally { await engine.close(); }
});

test('a stale socket file from a previous run is replaced, not an error', async () => {
    const path = sock();
    writeFileSync(path, '');
    const engine = await startFakeEngine(example, path);
    assert.ok(existsSync(path));
    await engine.close();
});
