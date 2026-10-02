/**
 * The spec §4 regions of the frame, and the Theia ApplicationShell area each one lives in
 * (seed design, choice 3): the shell stays Theia's; arch fills its areas.
 *
 *   bar        → top      the one bar (scope selector, chips, Ask)
 *   left       → left     the rail's active view, with the scope line on top
 *   inspector  → right    about the selection
 *   panel      → bottom   Findings · Checks · Terminal · What's new
 *
 * The center is Theia's main area and needs no host: editors open there by themselves, and the
 * Map becomes a pinned widget in milestone 2. The status bar is Theia's StatusBar service.
 */
export type RegionName = 'bar' | 'left' | 'inspector' | 'panel';
export type TheiaArea = 'top' | 'left' | 'right' | 'bottom';

export interface Region {
    readonly name: RegionName;
    readonly area: TheiaArea;
    /** the tab title Theia shows until the sett composition replaces the chrome */
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

export const regionOf = (id: string): Region | undefined =>
    REGIONS.find(r => hostId(r.name) === id);
