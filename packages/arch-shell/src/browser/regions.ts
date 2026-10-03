/**
 * The spec §4 regions of the frame, and the Theia ApplicationShell area each one lives in
 * (seed design, choice 3): the shell stays Theia's; arch fills its areas.
 *
 *   bar        → top      the one bar (scope selector, chips, Ask)
 *   left       → left     the rail's active view, with the scope line on top
 *   inspector  → right    about the selection
 *   panel      → bottom   Findings · Checks · Terminal · What's new
 *
 * bar, left and inspector are host widgets added to their area. The panel is not: it is the bottom
 * area itself, held by `sett-bottom-panel` (arch-application-shell.ts), under the same `arch.panel` id.
 * The center is Theia's main area inside `sett-frame`: editors open there by themselves, and the
 * Map becomes a pinned widget in milestone 2. The status bar is Theia's StatusBar service, drawn by
 * `sett-status-bar`.
 */
export type RegionName = 'bar' | 'left' | 'inspector' | 'panel';
export type TheiaArea = 'top' | 'left' | 'right' | 'bottom';

export interface Region {
    readonly name: RegionName;
    readonly area: TheiaArea;
    /** the widget's title: Theia's model of the area, never drawn */
    readonly label: string;
    readonly closable: false;
}

export const REGIONS: readonly Region[] = [
    { name: 'bar', area: 'top', label: 'arch', closable: false },
    { name: 'left', area: 'left', label: 'Sessions', closable: false },
    { name: 'inspector', area: 'right', label: 'Inspector', closable: false },
    { name: 'panel', area: 'bottom', label: 'Findings', closable: false },
];

export const HOST_FACTORY_ID = 'arch.host';

export const hostId = (name: RegionName): string => `arch.${name}`;

/** the regions that are a host widget in their area */
export type HostedRegionName = Exclude<RegionName, 'panel'>;
export const HOSTED_REGIONS = REGIONS.filter(
    (r): r is Region & { name: HostedRegionName } => r.name !== 'panel');

export const regionOf = (id: string): Region | undefined =>
    REGIONS.find(r => hostId(r.name) === id);
