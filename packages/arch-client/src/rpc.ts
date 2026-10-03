import { Disposable, EngineTransport } from './transport';

/** JSON-RPC 2.0 framing over a transport: request/response correlation and notifications. No method names live here. */
export interface RpcError { code: number; message: string; data?: unknown }

export class JsonRpcError extends Error {
    constructor(readonly method: string, readonly rpc: RpcError) {
        super(`${method}: ${rpc.message} (${rpc.code})`);
    }
}

interface Pending { method: string; resolve: (v: unknown) => void; reject: (e: Error) => void }

export class JsonRpc {
    private nextId = 1;
    private readonly pending = new Map<number, Pending>();
    private readonly listeners = new Map<string, Set<(params: unknown) => void>>();
    private readonly subscriptions: Disposable[] = [];

    constructor(private readonly transport: EngineTransport) {
        this.subscriptions.push(transport.onFrame(frame => this.receive(frame)));
        if (transport.onClose) {
            this.subscriptions.push(transport.onClose(reason => this.rejectAll(`transport closed: ${reason}`)));
        }
    }

    request(method: string, params?: unknown): Promise<unknown> {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { method, resolve, reject });
            this.transport.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
        });
    }

    notify(method: string, params?: unknown): void {
        this.transport.send(JSON.stringify({ jsonrpc: '2.0', method, params }));
    }

    on(method: string, listener: (params: unknown) => void): Disposable {
        let set = this.listeners.get(method);
        if (!set) { set = new Set(); this.listeners.set(method, set); }
        set.add(listener);
        return { dispose: () => { set.delete(listener); } };
    }

    dispose(): void {
        for (const s of this.subscriptions) { s.dispose(); }
        this.rejectAll('client disposed');
    }

    private receive(frame: string): void {
        let msg: { id?: number; method?: string; params?: unknown; result?: unknown; error?: RpcError };
        try { msg = JSON.parse(frame) as typeof msg; } catch { return; } // a frame that is not JSON is not for us
        if (typeof msg.id === 'number' && msg.method === undefined) {
            const p = this.pending.get(msg.id);
            if (!p) { return; }
            this.pending.delete(msg.id);
            if (msg.error) { p.reject(new JsonRpcError(p.method, msg.error)); } else { p.resolve(msg.result); }
            return;
        }
        if (msg.method !== undefined && msg.id === undefined) {
            for (const l of this.listeners.get(msg.method) ?? []) { l(msg.params); }
        }
    }

    private rejectAll(reason: string): void {
        for (const [id, p] of this.pending) {
            this.pending.delete(id);
            p.reject(new Error(`${p.method}: ${reason}`));
        }
    }
}
