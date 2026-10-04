import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { engineStatusText } from './engine-protocol';

test('the status bar words carry a state and never a verb', () => {
    assert.equal(engineStatusText({ state: 'not-found' }), 'engine · not found');
    assert.equal(engineStatusText({ state: 'crashed', restarts: 2 }), 'engine · crashed, restarting (2)');
});

test('ready shows both versions and the ADR 0034 §4 reading; the state stays ready whatever it is', () => {
    const ready = (schemaVersion: string, clientSchemaVersion: string, compatibility: 'ok' | 'compatible' | 'older-engine' | 'incompatible' | 'unknown') =>
        engineStatusText({ state: 'ready', engineVersion: '0.3.0', schemaVersion, clientSchemaVersion, compatibility });
    assert.equal(ready('0.1.0', '0.1.0', 'ok'), 'engine · 0.3.0 · schema 0.1.0');
    assert.equal(ready('0.2.0', '0.1.0', 'compatible'), 'engine · 0.3.0 · schema 0.2.0');
    assert.equal(ready('0.1.0', '0.2.0', 'older-engine'), 'engine · 0.3.0 · schema 0.1.0 < client 0.2.0');
    assert.equal(ready('1.0.0', '0.1.0', 'incompatible'), 'engine · 0.3.0 · schema 1.0.0 ≠ client 0.1.0');
    assert.equal(ready('0.1', '0.1.0', 'unknown'), 'engine · 0.3.0 · schema 0.1 ≠ client 0.1.0');
});
