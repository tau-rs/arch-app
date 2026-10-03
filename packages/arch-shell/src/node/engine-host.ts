import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { RawProcessFactory } from '@theia/process/lib/node';
import { userInfo } from 'node:os';
import { join } from 'node:path';
import { SCHEMA_VERSION, socketPathFor } from '@tau-rs/arch-client';
import { EngineOpenOptions, EngineStatus } from '../common/engine-protocol';
import { EngineProcess, Spawner } from './engine-process';

export interface EngineListener {
    onFrame(frame: string): void;
    onStatus(status: EngineStatus): void;
}

/**
 * One engine per opened repo, shared by every frontend connection (two windows on one repo share
 * one engine). Spawns through Theia's process manager so the backend's exit takes the engine with
 * it, and stops every engine on backend shutdown.
 */
@injectable()
export class EngineHost implements BackendApplicationContribution {

    @inject(RawProcessFactory)
    protected readonly processFactory!: RawProcessFactory;

    @inject(ILogger)
    protected readonly logger!: ILogger;

    protected readonly engines = new Map<string, EngineProcess>();
    protected readonly listeners = new Map<string, Set<EngineListener>>();

    async open(repoRoot: string, listener: EngineListener, options: EngineOpenOptions = {}): Promise<EngineStatus> {
        let set = this.listeners.get(repoRoot);
        if (!set) { set = new Set(); this.listeners.set(repoRoot, set); }
        set.add(listener);
        const existing = this.engines.get(repoRoot);
        if (existing) { return existing.status; }
        const socketPath = socketPathFor(repoRoot, { platform: process.platform, uid: userInfo().uid, runtimeDir: process.env.XDG_RUNTIME_DIR });
        const engine = new EngineProcess({
            repoRoot, socketPath,
            discovery: { preference: options.binaryPath, env: process.env.ARCH_BIN, pathVar: process.env.PATH, bundled: bundledSlot(), platform: process.platform },
            spawner: this.spawner(),
            clientSchemaVersion: SCHEMA_VERSION,
            onFrame: frame => { for (const l of set) { l.onFrame(frame); } },
            onStatus: status => { void this.logger.info(`arch engine [${repoRoot}]: ${status.state}${status.detail ? ` (${status.detail})` : ''}`); for (const l of set) { l.onStatus(status); } },
        });
        this.engines.set(repoRoot, engine);
        return engine.start();
    }

    send(repoRoot: string, frame: string): void {
        this.engines.get(repoRoot)?.send(frame);
    }

    status(repoRoot: string | undefined): EngineStatus {
        return (repoRoot && this.engines.get(repoRoot)?.status) || { state: 'idle' };
    }

    forget(repoRoot: string | undefined, listener: EngineListener): void {
        if (repoRoot) { this.listeners.get(repoRoot)?.delete(listener); }
    }

    async onStop(): Promise<void> {
        await Promise.all([...this.engines.values()].map(e => e.stop()));
        this.engines.clear();
    }

    protected spawner(): Spawner {
        return {
            spawn: (binary, args, cwd) => {
                const raw = this.processFactory({ command: binary, args, options: { cwd, stdio: ['ignore', 'inherit', 'inherit'] } });
                return {
                    pid: raw.pid,
                    onExit: l => { raw.onExit(e => l(e.code ?? null, e.signal ?? null)); raw.onError(() => l(null, 'ENOENT')); },
                    kill: s => raw.kill(s),
                };
            },
        };
    }
}

/** the slot the packaged app fills (milestone 6): <resources>/bin/arch next to the backend */
const bundledSlot = (): string | undefined => {
    const resources = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    return resources ? join(resources, 'bin', process.platform === 'win32' ? 'arch.exe' : 'arch') : undefined;
};
