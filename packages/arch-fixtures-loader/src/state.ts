/**
 * One fixture state (FINDINGS F-7): the result the engine would return for each method, and the
 * notifications it would send, in order. Pure data, so the responder runs in a page and in Node.
 *
 *   fixtures-for-ui/<state>/responses/<method>.json
 *   fixtures-for-ui/<state>/events.jsonl        {"name","params","delayMs"?} per line
 */
export interface FixtureEvent {
    name: string;
    params?: unknown;
    /** wait this long before this event, for stories that show motion; 0 by default */
    delayMs?: number;
}

export interface FixtureState {
    name: string;
    responses: Record<string, unknown>;
    events: FixtureEvent[];
}

export const emptyState = (name = 'empty'): FixtureState => ({ name, responses: {}, events: [] });
