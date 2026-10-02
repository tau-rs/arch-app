import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { join } from 'node:path';
import { createClient, JsonRpcError } from '@tau-rs/arch-client';
import { fixturesTransport } from './transport';
import { loadState } from './load';

const example = loadState(join(__dirname, '..', 'test', 'example-state'));
type M = { initialize: { params: undefined; result: { engineVersion: string; schemaVersion: string } }; ping: { params: undefined; result: string } };
type E = { tick: { at: number } };

test('the generated client, fed by fixtures, calls and subscribes through the same code path', async () => {
    const client = createClient<M, E>(fixturesTransport(example, { honourDelays: false }));
    const ticks: number[] = [];
    client.on('tick', p => ticks.push(p.at));
    assert.equal((await client.call('initialize', undefined)).schemaVersion, '0.1');
    assert.equal(await client.call('ping', undefined), 'pong');
    await new Promise(r => setTimeout(r, 10));
    assert.deepEqual(ticks, [1, 2]);
});

test('events replay once, after the first answered request, not before', async () => {
    const t = fixturesTransport(example, { honourDelays: false });
    const frames: string[] = [];
    t.onFrame(f => frames.push(f));
    await new Promise(r => setTimeout(r, 5));
    assert.deepEqual(frames, []);
    t.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }));
    t.send(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' }));
    await new Promise(r => setTimeout(r, 10));
    assert.equal(frames.filter(f => JSON.parse(f).method === 'tick').length, 2);
});

test('an unknown method surfaces as the JSON-RPC error through the client', async () => {
    const client = createClient<{ nope: { params: undefined; result: never } }, E>(fixturesTransport(example));
    await assert.rejects(client.call('nope', undefined), (e: JsonRpcError) => e.rpc.code === -32601);
});
