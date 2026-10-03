import '@tau-rs/sett';
import type { RegionName } from '../regions';
import { CENTRE_ELEMENT, LEFT_VIEW_ELEMENT, PANEL_TABS, RAIL_VIEWS, RailView } from './frame';

/**
 * Builds the empty frame out of sett elements. Every attribute and slot used here is in sett's
 * custom-elements.json (v0.4.0). Nothing is drawn locally: what sett lacks is a FINDINGS.md row.
 */
const el = (tag: string, attrs: Record<string, string> = {}, children: Node[] = []): HTMLElement => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) {
        node.setAttribute(name, value);
    }
    node.append(...children);
    return node;
};

const text = (value: string): Text => document.createTextNode(value);

/** the bar: the scope selector on `main`. Brand, repo, chips and Ask need data or an element sett lacks (F-9). */
const mountBar = (host: HTMLElement): void => {
    host.replaceChildren(el('sett-selector', { scope: 'main' }));
};

/** the left pane: the scope line first (rule 3), then the view the rail picked */
export const mountLeft = (host: HTMLElement, view: RailView): void => {
    const tag = LEFT_VIEW_ELEMENT[view];
    if (view === 'files' && tag) {
        host.replaceChildren(el(tag, {}, [el('sett-scope-line', { scope: 'main', slot: 'scope' })]));
        return;
    }
    host.replaceChildren(el('sett-scope-line', { scope: 'main' }), ...(tag ? [el(tag)] : []));
};

/** the inspector with no selection: no heading, no state, no verbs */
const mountInspector = (host: HTMLElement): void => {
    host.replaceChildren(el('sett-inspector'));
};

/**
 * the bottom panel: its four tabs, no counts, no bodies. The panel reports (`sett-select`,
 * `sett-toggle`); the shell sets `active` and `closed` (arch-shell-contribution.ts).
 */
export const createPanel = (): HTMLElement =>
    el('sett-bottom-panel', { active: PANEL_TABS[0].value, closed: '' },
        PANEL_TABS.map(tab => el('sett-panel-tab', { slot: 'tabs', value: tab.value }, [text(tab.label)])));

/** the frame around the centre: idle, the only state there is with no session */
export const createFrame = (): HTMLElement => el(CENTRE_ELEMENT, { state: 'idle' });

export const mountRegion = (region: Exclude<RegionName, 'panel'>, host: HTMLElement, view: RailView): void => {
    switch (region) {
        case 'bar': return mountBar(host);
        case 'left': return mountLeft(host, view);
        case 'inspector': return mountInspector(host);
    }
};

/** the activity rail: three labelled items. sett ships no glyph for them (F-11), so the label stands alone. */
export const createRail = (active: RailView): HTMLElement =>
    el('sett-activity-rail', { 'aria-label': 'Views' }, RAIL_VIEWS.map(view =>
        el('sett-rail-item', { value: view.value, ...(view.value === active ? { active: '' } : {}) }, [text(view.label)])));

export const markRail = (rail: HTMLElement, active: RailView, closed: boolean): void => {
    rail.toggleAttribute('closed', closed);
    for (const item of Array.from(rail.children)) {
        item.toggleAttribute('active', item.getAttribute('value') === active);
    }
};
