import type { RegionName } from '../regions';

/**
 * What the empty frame is made of (spec §4, sett DESIGN.md "The shell"): which sett element stands in
 * each region, and the fixed labels of the rail and of the bottom panel. Structure only: no session,
 * no finding, no count. Anything that needs one waits for fixtures-for-ui (#5).
 */
export type RailView = 'sessions' | 'files' | 'findings';

export const RAIL_VIEWS: readonly { readonly value: RailView; readonly label: string }[] = [
    { value: 'sessions', label: 'Sessions' },
    { value: 'files', label: 'Files' },
    { value: 'findings', label: 'Findings' },
];

export const DEFAULT_RAIL_VIEW: RailView = 'sessions';

export const PANEL_TABS: readonly { readonly value: string; readonly label: string }[] = [
    { value: 'findings', label: 'Findings' },
    { value: 'checks', label: 'Checks' },
    { value: 'terminal', label: 'Terminal' },
    { value: 'whatsnew', label: "What's new" },
];

/** the sett element each host widget holds; the left pane always opens with the scope line (rule 3) */
export const REGION_ELEMENT: Readonly<Record<RegionName, string>> = {
    bar: 'sett-selector',
    left: 'sett-scope-line',
    inspector: 'sett-inspector',
    panel: 'sett-bottom-panel',
};

/** the view under the scope line; sett v0.4.0 has no Findings view for the left pane (FINDINGS F-10) */
export const LEFT_VIEW_ELEMENT: Readonly<Record<RailView, string | undefined>> = {
    sessions: 'sett-sessions-view',
    files: 'sett-files-view',
    findings: undefined,
};

export const isRailView = (value: unknown): value is RailView =>
    RAIL_VIEWS.some(v => v.value === value);
