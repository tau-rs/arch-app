import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { Emitter, Event } from '@theia/core/lib/common';
import { ServiceConnectionProvider } from '@theia/core/lib/browser/messaging/service-connection-provider';
import type { Disposable, EngineTransport as EngineTransportPort } from '@tau-rs/arch-client';
import { ENGINE_BRIDGE_PATH, EngineBridge, EngineBridgeClient, EngineOpenOptions, EngineStatus } from '../../common/engine-protocol';

/**
 * The frontend end of the opaque bridge (choice 4), carried over Theia's own frontend–backend
 * channel: frames out, frames in, and the engine's status. Parses nothing.
 */
@injectable()
export class EngineConnection {

    @inject(ServiceConnectionProvider)
    protected readonly connectionProvider!: ServiceConnectionProvider;

    protected bridge!: EngineBridge;
    protected readonly frameEmitter = new Emitter<string>();
    protected readonly statusEmitter = new Emitter<EngineStatus>();

    readonly onFrame: Event<string> = this.frameEmitter.event;
    readonly onStatus: Event<EngineStatus> = this.statusEmitter.event;
    status: EngineStatus = { state: 'idle' };

    @postConstruct()
    protected init(): void {
        const client: EngineBridgeClient = {
            onFrame: frame => { this.frameEmitter.fire(frame); },
            onStatus: status => { this.status = status; this.statusEmitter.fire(status); },
        };
        this.bridge = this.connectionProvider.createProxy<EngineBridge>(ENGINE_BRIDGE_PATH, client);
    }

    async open(repoRoot: string, options?: EngineOpenOptions): Promise<EngineStatus> {
        const status = await this.bridge.open(repoRoot, options);
        this.status = status;
        this.statusEmitter.fire(status);
        return status;
    }

    send(frame: string): void { void this.bridge.send(frame); }
}

export const EngineTransport = Symbol('EngineTransport');

/** what the generated client is bound to: the connection seen as a transport */
@injectable()
export class ChannelTransport implements EngineTransportPort {
    @inject(EngineConnection)
    protected readonly connection!: EngineConnection;

    send(frame: string): void { this.connection.send(frame); }
    onFrame(listener: (frame: string) => void): Disposable { return this.connection.onFrame(listener); }
}
