import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { loopback } from './transport';
import { JsonRpc, JsonRpcError } from './rpc';
import { createClient } from './client';

/** a far side that answers like an engine would: by method name, or -32601 */
const farSide = (handlers: Record<string, (params: unknown) => unknown>) => {
    const [near, far] = loopback();
    far.onFrame(frame => {
        const msg = JSON.parse(frame);
        if (msg.id === undefined) { return; }
        const h = handlers[msg.method];
        far.send(JSON.stringify(h
            ? { jsonrpc: '2.0', id: msg.id, result: h(msg.params) }
            : { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } }));
    });
    return { near, far };
};

test('a request is correlated with its response by id', async () => {
    const { near } = farSide({ ping: () => 'pong' });
    const rpc = new JsonRpc(near);
    assert.equal(await rpc.request('ping'), 'pong');
    const [a, b] = await Promise.all([rpc.request('ping'), rpc.request('ping')]);
    assert.deepEqual([a, b], ['pong', 'pong']);
});

test('an unknown method rejects with the JSON-RPC error, method named', async () => {
    const { near } = farSide({});
    const rpc = new JsonRpc(near);
    await assert.rejects(rpc.request('nope'), (e: JsonRpcError) => e instanceof JsonRpcError && e.rpc.code === -32601 && e.method === 'nope');
});

test('a notification from the far side reaches subscribers and nobody else', () => {
    const { near, far } = farSide({});
    const rpc = new JsonRpc(near);
    const seen: unknown[] = [];
    const sub = rpc.on('tick', p => seen.push(p));
    far.send(JSON.stringify({ jsonrpc: '2.0', method: 'tick', params: { at: 1 } }));
    far.send(JSON.stringify({ jsonrpc: '2.0', method: 'other', params: {} }));
    sub.dispose();
    far.send(JSON.stringify({ jsonrpc: '2.0', method: 'tick', params: { at: 2 } }));
    assert.deepEqual(seen, [{ at: 1 }]);
});

test('a frame that is not JSON is ignored, and dispose rejects what is pending', async () => {
    const [near, far] = loopback();
    const rpc = new JsonRpc(near);
    far.send('not json');
    const p = rpc.request('ping');
    rpc.dispose();
    await assert.rejects(p, /ping: client disposed/);
});

test('the typed client forwards calls and events over the generated maps', async () => {
    const { near, far } = farSide({ ping: () => 'pong' });
    type M = { ping: { params: undefined; result: string } };
    type E = { tick: { at: number } };
    const client = createClient<M, E>(near);
    assert.equal(await client.call('ping', undefined), 'pong');
    const got: number[] = [];
    client.on('tick', p => got.push(p.at));
    far.send(JSON.stringify({ jsonrpc: '2.0', method: 'tick', params: { at: 7 } }));
    assert.deepEqual(got, [7]);
});
