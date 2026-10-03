import { FixtureEvent, FixtureState } from './state';

/** JSON-RPC 2.0, the standard code for a method the engine does not have */
export const METHOD_NOT_FOUND = -32601;
export const INVALID_REQUEST = -32600;

/**
 * Answers JSON-RPC frames from a fixture state and never invents data: a method with a response
 * file gets that file as its result; any other method gets -32601, exactly as a real engine would.
 * Pure: frame in, frame out. Events are the state's list, for the adapters to replay.
 */
export class FixtureResponder {
    constructor(readonly state: FixtureState) { }

    /** the response frame for a request frame; undefined for a notification (nothing to answer) or garbage */
    handle(frame: string): string | undefined {
        let msg: { id?: number | string; method?: string };
        try { msg = JSON.parse(frame) as typeof msg; } catch { return undefined; }
        if (msg.id === undefined) { return undefined; }
        if (typeof msg.method !== 'string') {
            return JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: INVALID_REQUEST, message: 'Invalid Request' } });
        }
        if (!Object.prototype.hasOwnProperty.call(this.state.responses, msg.method)) {
            return JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: METHOD_NOT_FOUND, message: `Method not found: ${msg.method} (fixture state ${this.state.name})` } });
        }
        return JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: this.state.responses[msg.method] });
    }

    get events(): readonly FixtureEvent[] { return this.state.events; }

    /** the notification frame for one event */
    static eventFrame(e: FixtureEvent): string {
        return JSON.stringify({ jsonrpc: '2.0', method: e.name, params: e.params });
    }
}
