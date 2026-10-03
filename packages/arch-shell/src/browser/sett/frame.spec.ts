import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { REGIONS } from '../regions';
import { DEFAULT_RAIL_VIEW, LEFT_VIEW_ELEMENT, PANEL_TABS, RAIL_VIEWS, REGION_ELEMENT, isRailView } from './frame';

test('the rail is Sessions · Files · Findings, in that order (DESIGN.md "The shell" rule 2)', () => {
    assert.deepEqual(RAIL_VIEWS.map(v => v.label), ['Sessions', 'Files', 'Findings']);
    assert.equal(DEFAULT_RAIL_VIEW, 'sessions');
});

test('the bottom panel is Findings · Checks · Terminal · What\'s new, nothing else (rule 7)', () => {
    assert.deepEqual(PANEL_TABS.map(t => t.label), ['Findings', 'Checks', 'Terminal', "What's new"]);
});

test('every region and every left view names a sett element, never a local one', () => {
    for (const region of REGIONS) {
        assert.match(REGION_ELEMENT[region.name], /^sett-/);
    }
    for (const tag of Object.values(LEFT_VIEW_ELEMENT)) {
        if (tag) { assert.match(tag, /^sett-/); }
    }
});

test('isRailView accepts the three views and rejects anything else', () => {
    assert.equal(isRailView('files'), true);
    assert.equal(isRailView('map'), false);
    assert.equal(isRailView(undefined), false);
});
