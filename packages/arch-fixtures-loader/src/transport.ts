import type { Disposable, EngineTransport } from '@tau-rs/arch-client';
import { FixtureResponder } from './responder';
import { FixtureState } from './state';

export interface FixturesTransportOptions {
    /** replay events with their delays (stories showing motion) or all at once (tests); default: honour delays */
    honourDelays?: boolean;
}

/**
 * The in-page adapter: an EngineTransport the generated client talks to, answered by the responder.
 * Events replay once, in order, after the client's first request has been answered: that first
 * request is the `initialize` handshake, and a real engine sends nothing before it.
 */
export const fixturesTransport = (state: FixtureState, options: FixturesTransportOptions = {}): EngineTransport => {
    const responder = new FixtureResponder(state);
    const listeners = new Set<(frame: string) => void>();
    const deliver = (frame: string) => { for (const l of listeners) { l(frame); } };
    let replayed = false;
    const replay = async () => {
        if (replayed) { return; }
        replayed = true;
        for (const e of responder.events) {
            const delay = options.honourDelays === false ? 0 : (e.delayMs ?? 0);
            await new Promise(r => setTimeout(r, delay));
            deliver(FixtureResponder.eventFrame(e));
        }
    };
    return {
        send: frame => {
            const reply = responder.handle(frame);
            if (reply === undefined) { return; }
            queueMicrotask(() => { deliver(reply); void replay(); });
        },
        onFrame: (l): Disposable => { listeners.add(l); return { dispose: () => listeners.delete(l) }; },
    };
};
