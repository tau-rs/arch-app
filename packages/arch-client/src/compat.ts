/**
 * The app's reading of the engine's schema version against the one this client was generated from
 * (ADR 0034 §4). A status, never a refusal: the engine always answers `initialize`, and comparing
 * the versions is the client's job. A break moves the major even at 0.x.
 */
export type SchemaCompatibility =
    | 'ok'            // the same version
    | 'compatible'    // same major, engine minor at least the client's: it only added things
    | 'older-engine'  // same major, engine minor older: methods added later answer -32601
    | 'incompatible'  // different major: nothing past initialize is called
    | 'unknown';      // a version that is not semver (`none` when no schema is pinned)

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export const schemaCompatibility = (client: string | undefined, engine: string | undefined): SchemaCompatibility => {
    if (client !== undefined && client === engine) { return 'ok'; }
    const c = SEMVER.exec(client ?? '');
    const e = SEMVER.exec(engine ?? '');
    if (!c || !e) { return 'unknown'; }
    if (c[1] !== e[1]) { return 'incompatible'; }
    return Number(e[2]) >= Number(c[2]) ? 'compatible' : 'older-engine';
};
