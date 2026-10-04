import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { schemaCompatibility } from './compat';

test('the ADR 0034 §4 table: app pinned × engine → the app\'s reading', () => {
    assert.equal(schemaCompatibility('0.1.0', '0.1.0'), 'ok');
    assert.equal(schemaCompatibility('0.1.0', '0.2.0'), 'compatible');
    assert.equal(schemaCompatibility('0.2.0', '0.1.0'), 'older-engine');
    assert.equal(schemaCompatibility('0.1.0', '1.0.0'), 'incompatible');
    assert.equal(schemaCompatibility('1.0.0', '0.9.0'), 'incompatible');
});

test('a patch is wording only, either way; pre-release and build suffixes do not move the reading', () => {
    assert.equal(schemaCompatibility('0.1.0', '0.1.3'), 'compatible');
    assert.equal(schemaCompatibility('0.1.3', '0.1.0'), 'compatible');
    assert.equal(schemaCompatibility('0.1.0', '0.2.0-rc.1+abc'), 'compatible');
});

test('a version that is not semver is unknown unless both sides say the same thing', () => {
    assert.equal(schemaCompatibility('none', '0.1.0'), 'unknown');
    assert.equal(schemaCompatibility('0.1.0', '0.1'), 'unknown');
    assert.equal(schemaCompatibility('0.1.0', undefined), 'unknown');
    assert.equal(schemaCompatibility('1', '1'), 'ok');
});
