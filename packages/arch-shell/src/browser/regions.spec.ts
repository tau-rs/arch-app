import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { HOSTED_REGIONS, REGIONS, hostId, regionOf, type Region } from './regions';

test('the four regions map onto four distinct Theia areas, as the seed design fixes them', () => {
    const areas = REGIONS.map(r => r.area);
    assert.deepEqual(areas, ['top', 'left', 'right', 'bottom']);
    assert.equal(new Set(areas).size, REGIONS.length);
});

test('host ids are stable and namespaced: arch.<region>', () => {
    assert.deepEqual(REGIONS.map(r => hostId(r.name)), ['arch.bar', 'arch.left', 'arch.inspector', 'arch.panel']);
});

test('bar, left and inspector are host widgets; the panel is the bottom area itself (#14)', () => {
    assert.deepEqual(HOSTED_REGIONS.map(r => r.name), ['bar', 'left', 'inspector']);
});

test('regionOf resolves a host id back to its region and rejects anything else', () => {
    const inspector: Region | undefined = regionOf('arch.inspector');
    assert.equal(inspector?.area, 'right');
    assert.equal(regionOf('arch.map'), undefined);
    assert.equal(regionOf('inspector'), undefined);
});

test('no host is closable: the frame never loses a region', () => {
    for (const r of REGIONS) { assert.equal(r.closable, false); }
});
