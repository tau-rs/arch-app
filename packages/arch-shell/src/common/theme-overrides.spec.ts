import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// design/theme.json is the semantic layer over sett's tokens: it may point at a token, never state a colour.
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i;

test('design/theme.json holds semantic overrides only, never a raw colour', () => {
    const theme = JSON.parse(readFileSync(join(__dirname, '../../../../design/theme.json'), 'utf8'));
    assert.equal(typeof theme.overrides, 'object');
    for (const [key, value] of Object.entries(theme.overrides)) {
        assert.equal(typeof value, 'string', `${key} names a sett token`);
        assert.doesNotMatch(value as string, RAW_COLOUR, `${key} is a raw colour`);
    }
});
