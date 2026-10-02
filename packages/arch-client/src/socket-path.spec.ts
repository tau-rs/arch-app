import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { hash8, socketPathFor } from './socket-path';

test('the same repo root always gives the same path, a trailing slash included', () => {
    const env = { platform: 'darwin', uid: 501 };
    assert.equal(socketPathFor('/Users/me/code/orderly', env), socketPathFor('/Users/me/code/orderly/', env));
    assert.notEqual(socketPathFor('/Users/me/code/orderly', env), socketPathFor('/Users/me/code/other', env));
});

test('platform conventions: runtime dir, /tmp per user, named pipe on Windows', () => {
    const h = hash8('/repo');
    assert.equal(socketPathFor('/repo', { platform: 'linux', uid: 1000, runtimeDir: '/run/user/1000/' }), `/run/user/1000/arch/${h}.sock`);
    assert.equal(socketPathFor('/repo', { platform: 'darwin', uid: 501 }), `/tmp/arch-501/${h}.sock`);
    assert.equal(socketPathFor('C:\\repo', { platform: 'win32', uid: 'me' }), `\\\\.\\pipe\\arch-me-${hash8('C:\\repo')}`);
});

test('the path stays well under the 104-character socket limit for any repo root', () => {
    const long = '/Users/' + 'x'.repeat(300) + '/repo';
    assert.ok(socketPathFor(long, { platform: 'darwin', uid: 501 }).length < 40);
});
