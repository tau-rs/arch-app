import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { join } from 'node:path';
import { FixtureResponder, METHOD_NOT_FOUND } from './responder';
import { loadState, listStates } from './load';

const example = loadState(join(__dirname, '..', 'test', 'example-state'));

test('loadState reads one response per method and the events in order', () => {
    assert.equal(example.name, 'example-state');
    assert.deepEqual(Object.keys(example.responses), ['initialize', 'ping']);
    assert.deepEqual(example.events.map(e => e.name), ['tick', 'tick']);
    assert.deepEqual(listStates(join(__dirname, '..', 'test')), ['example-state']);
});

test('a method with a response file gets that file as its result', () => {
    const r = new FixtureResponder(example);
    assert.deepEqual(JSON.parse(r.handle(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }))!), { jsonrpc: '2.0', id: 1, result: 'pong' });
    assert.deepEqual(JSON.parse(r.handle(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize' }))!).result, { engineVersion: 'fake-0.0.0', schemaVersion: '0.1' });
});

test('a method without a file is -32601, never an invented result', () => {
    const r = new FixtureResponder(example);
    const reply = JSON.parse(r.handle(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'views.get' }))!);
    assert.equal(reply.error.code, METHOD_NOT_FOUND);
    assert.match(reply.error.message, /views\.get/);
    assert.equal('result' in reply, false);
});

test('notifications and garbage get no answer', () => {
    const r = new FixtureResponder(example);
    assert.equal(r.handle(JSON.stringify({ jsonrpc: '2.0', method: 'ping' })), undefined);
    assert.equal(r.handle('not json'), undefined);
});
