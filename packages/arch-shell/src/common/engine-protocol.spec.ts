import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { engineStatusText } from './engine-protocol';

test('the status bar words carry a state and never a verb', () => {
    assert.equal(engineStatusText({ state: 'not-found' }), 'engine · not found');
    assert.equal(engineStatusText({ state: 'ready', engineVersion: '0.3.0', schemaVersion: '1', clientSchemaVersion: '1' }), 'engine · 0.3.0');
    assert.equal(engineStatusText({ state: 'ready', engineVersion: '0.3.0', schemaVersion: '2', clientSchemaVersion: '1' }), 'engine · schema 2 ≠ client 1');
    assert.equal(engineStatusText({ state: 'crashed', restarts: 2 }), 'engine · crashed, restarting (2)');
});
