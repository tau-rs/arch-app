import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { REGIONS } from '../regions';
import {
    CENTRE_ELEMENT, DEFAULT_RAIL_VIEW, LEFT_VIEW_ELEMENT, PANEL_TABS, RAIL_VIEWS, REGION_ELEMENT, STATUS_ELEMENT, STATUS_ITEMS,
    isPanelTab, isRailView,
} from './frame';

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
    for (const tag of [...Object.values(LEFT_VIEW_ELEMENT), CENTRE_ELEMENT, STATUS_ELEMENT]) {
        if (tag) { assert.match(tag, /^sett-/); }
    }
});

test('the status bar shows states only: the engine, after the scope item (rule 8)', () => {
    assert.deepEqual(STATUS_ITEMS, ['arch.engine']);
});

test('isPanelTab accepts the four tabs and rejects anything else', () => {
    assert.equal(isPanelTab('terminal'), true);
    assert.equal(isPanelTab('problems'), false);
    assert.equal(isPanelTab(undefined), false);
});

test('isRailView accepts the three views and rejects anything else', () => {
    assert.equal(isRailView('files'), true);
    assert.equal(isRailView('map'), false);
    assert.equal(isRailView(undefined), false);
});
