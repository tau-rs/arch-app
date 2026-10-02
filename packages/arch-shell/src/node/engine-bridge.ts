import { injectable, inject } from '@theia/core/shared/inversify';
import { RpcServer } from '@theia/core/lib/common';
import { EngineBridge, EngineBridgeClient, EngineOpenOptions, EngineStatus } from '../common/engine-protocol';
import { EngineHost, EngineListener } from './engine-host';

/** one per frontend connection: forwards frames both ways for the repo that connection opened; parses nothing */
@injectable()
export class EngineBridgeImpl implements EngineBridge, RpcServer<EngineBridgeClient> {

    @inject(EngineHost)
    protected readonly host!: EngineHost;

    protected client?: EngineBridgeClient;
    protected repoRoot?: string;
    protected readonly listener: EngineListener = {
        onFrame: frame => this.client?.onFrame(frame),
        onStatus: status => this.client?.onStatus(status),
    };

    setClient(client: EngineBridgeClient | undefined): void { this.client = client; }
    getClient(): EngineBridgeClient | undefined { return this.client; }

    async open(repoRoot: string, options?: EngineOpenOptions): Promise<EngineStatus> {
        this.host.forget(this.repoRoot, this.listener);
        this.repoRoot = repoRoot;
        return this.host.open(repoRoot, this.listener, options);
    }

    async send(frame: string): Promise<void> {
        if (this.repoRoot) { this.host.send(this.repoRoot, frame); }
    }

    async status(): Promise<EngineStatus> {
        return this.host.status(this.repoRoot);
    }

    dispose(): void {
        this.host.forget(this.repoRoot, this.listener);
        this.client = undefined;
    }
}
