import { Disposable, EngineTransport } from './transport';
import { JsonRpc } from './rpc';

/** shapes the generator fills in (src/generated): one entry per method and per event of the published schema */
export interface MethodMap { [name: string]: { params: unknown; result: unknown } }
export interface EventMap { [name: string]: unknown }

/** typed calls and subscriptions over the generated maps; knows no method name itself */
export class ArchClient<M extends MethodMap, E extends EventMap> {
    constructor(readonly rpc: JsonRpc) { }

    call<K extends keyof M & string>(method: K, params: M[K]['params']): Promise<M[K]['result']> {
        return this.rpc.request(method, params);
    }

    on<K extends keyof E & string>(event: K, listener: (payload: E[K]) => void): Disposable {
        return this.rpc.on(event, p => listener(p as E[K]));
    }

    dispose(): void { this.rpc.dispose(); }
}

export const createClient = <M extends MethodMap, E extends EventMap>(transport: EngineTransport): ArchClient<M, E> =>
    new ArchClient<M, E>(new JsonRpc(transport));
