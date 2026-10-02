/**
 * The port the generated client talks through (seed design, choice 4): frames in, frames out,
 * nothing about the engine's API. Adapters: the Theia channel bridge (engine host, #2) and the
 * fixtures responder (#4). A frame is one JSON-RPC 2.0 message, already serialised.
 */
export interface EngineTransport {
    send(frame: string): void;
    onFrame(listener: (frame: string) => void): Disposable;
    /** fires when the far side goes away; pending calls are rejected */
    onClose?(listener: (reason: string) => void): Disposable;
}

export interface Disposable {
    dispose(): void;
}

/** an in-memory pair of transports, each the other's far side; for tests and the in-page fixtures mode */
export const loopback = (): [EngineTransport, EngineTransport] => {
    const make = (peer: { listeners: Set<(f: string) => void> }) => {
        const own = { listeners: new Set<(f: string) => void>() };
        const t: EngineTransport = {
            send: frame => { for (const l of peer.listeners) { l(frame); } },
            onFrame: l => { own.listeners.add(l); return { dispose: () => own.listeners.delete(l) }; },
        };
        return { t, own };
    };
    const a = { listeners: new Set<(f: string) => void>() };
    const b = { listeners: new Set<(f: string) => void>() };
    const ta: EngineTransport = { send: f => { for (const l of b.listeners) { l(f); } }, onFrame: l => { a.listeners.add(l); return { dispose: () => a.listeners.delete(l) }; } };
    const tb: EngineTransport = { send: f => { for (const l of a.listeners) { l(f); } }, onFrame: l => { b.listeners.add(l); return { dispose: () => b.listeners.delete(l) }; } };
    void make;
    return [ta, tb];
};
