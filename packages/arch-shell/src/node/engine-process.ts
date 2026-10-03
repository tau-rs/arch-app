import { connect, Socket } from 'node:net';
import { accessSync, constants, existsSync, unlinkSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { EngineState, EngineStatus } from '../common/engine-protocol';

/**
 * The engine host's core (seed design, choice 5), free of Theia so it is tested against the fake
 * engine: discovery, attach before spawn, spawn through an injected spawner, readiness by
 * connect + initialize, restart until the 5th crash in 3 minutes, SIGTERM then SIGKILL.
 */
export interface Discovery {
    /** the `arch.engine.path` preference */
    preference?: string;
    /** ARCH_BIN */
    env?: string;
    /** PATH; already the login shell's in the electron target (fix-path) */
    pathVar?: string;
    /** the slot the packaged app fills (milestone 6) */
    bundled?: string;
    platform?: string;
    /** the identity probe; real exec by default, replaceable in tests */
    identify?: Identify;
}

export interface Resolved { binary: string; source: 'preference' | 'env' | 'path' | 'bundled'; version: string }

/**
 * `arch` is also the name of a macOS and GNU coreutils utility, so a candidate is trusted only if
 * `<binary> --version` prints `arch <semver>` (FINDINGS F-8). Returns the version, or the reason.
 */
export type Identify = (binary: string) => { version: string } | { reason: string };

export const ENGINE_VERSION_LINE = /^arch\s+v?(\d+\.\d+\.\d+\S*)/;

export const identifyWithExec: Identify = binary => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { execFileSync } = require('node:child_process') as typeof import('node:child_process');
        const out = execFileSync(binary, ['--version'], { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        const m = ENGINE_VERSION_LINE.exec(out);
        return m ? { version: m[1] } : { reason: `not the arch engine (--version printed: ${out.split('\n')[0].slice(0, 60) || 'nothing'})` };
    } catch (e) {
        return { reason: `not the arch engine (--version failed: ${(e as Error).message.split('\n')[0].slice(0, 60)})` };
    }
};

const executable = (p: string | undefined): boolean => {
    if (!p) { return false; }
    try { accessSync(p, constants.X_OK); return true; } catch { return false; }
};

/** first hit wins: preference → ARCH_BIN → PATH → bundled; otherwise the list of where it looked */
export const resolveBinary = (d: Discovery): Resolved | { looked: string[] } => {
    const looked: string[] = [];
    const identify = d.identify ?? identifyWithExec;
    const names = d.platform === 'win32' ? ['arch.exe', 'arch.cmd', 'arch'] : ['arch'];
    const tryOne = (p: string | undefined, source: Resolved['source']): Resolved | undefined => {
        if (!p) { return undefined; }
        if (!executable(p)) { looked.push(`${source}: ${p} (not found or not executable)`); return undefined; }
        const id = identify(p);
        if ('reason' in id) { looked.push(`${source}: ${p} ${id.reason}`); return undefined; }
        looked.push(`${source}: ${p} (arch ${id.version})`);
        return { binary: p, source, version: id.version };
    };
    const direct = tryOne(d.preference, 'preference') ?? tryOne(d.env, 'env');
    if (direct) { return direct; }
    const dirs = (d.pathVar ?? '').split(delimiter).filter(Boolean);
    for (const dir of dirs) {
        for (const n of names) {
            const p = join(dir, n);
            if (!executable(p)) { continue; }
            const hit = tryOne(p, 'path');
            if (hit) { return hit; }
        }
    }
    if (!looked.some(l => l.startsWith('path:'))) { looked.push(`path: no arch in ${dirs.length} directories`); }
    return tryOne(d.bundled, 'bundled') ?? { looked };
};

export interface SpawnedProcess {
    pid: number;
    onExit(listener: (code: number | null, signal: string | null) => void): void;
    kill(signal: 'SIGTERM' | 'SIGKILL'): void;
}

/** the port the process layer spawns through: Theia's RawProcessFactory in the app, child_process in tests */
export interface Spawner {
    spawn(binary: string, args: string[], cwd: string): SpawnedProcess;
}

export interface EngineProcessOptions {
    repoRoot: string;
    socketPath: string;
    discovery: Discovery;
    spawner: Spawner;
    clientSchemaVersion: string;
    /** connect + initialize must answer within this long after spawn; default 10 s */
    readyTimeoutMs?: number;
    /** vscode-languageclient's numbers: restart 4 times, give up at the 5th crash within the window */
    maxRestarts?: number;
    restartWindowMs?: number;
    killGraceMs?: number;
    onFrame?: (frame: string) => void;
    onStatus?: (status: EngineStatus) => void;
}

const INIT_ID = 'arch-host-initialize';

export class EngineProcess {
    private socket?: Socket;
    private child?: SpawnedProcess;
    private crashes: number[] = [];
    private stopping = false;
    private buffer = '';
    private _status: EngineStatus = { state: 'idle' };

    constructor(private readonly o: EngineProcessOptions) { }

    get status(): EngineStatus { return this._status; }

    /** attach to a running engine, else resolve the binary and spawn; resolves when the status settles */
    async start(): Promise<EngineStatus> {
        this.stopping = false;
        if (await this.tryAttach()) { return this._status; }
        const resolved = resolveBinary(this.o.discovery);
        if ('looked' in resolved) {
            return this.set({ state: 'not-found', looked: resolved.looked, detail: 'no arch binary: set arch.engine.path, ARCH_BIN, or put arch on PATH' });
        }
        return this.spawn(resolved.binary);
    }

    send(frame: string): void {
        if (this.socket && !this.socket.destroyed) { this.socket.write(frame + '\n'); }
    }

    async stop(): Promise<void> {
        this.stopping = true;
        this.socket?.destroy();
        this.socket = undefined;
        const child = this.child;
        this.child = undefined;
        if (child) {
            await new Promise<void>(resolve => {
                const timer = setTimeout(() => child.kill('SIGKILL'), this.o.killGraceMs ?? 5000);
                child.onExit(() => { clearTimeout(timer); resolve(); });
                child.kill('SIGTERM');
            });
        }
        this.set({ state: 'idle' });
    }

    private set(patch: Partial<EngineStatus> & { state: EngineState }): EngineStatus {
        this._status = { repoRoot: this.o.repoRoot, socketPath: this.o.socketPath, binary: this._status.binary, restarts: this.crashes.length, ...patch };
        this.o.onStatus?.(this._status);
        return this._status;
    }

    private async tryAttach(): Promise<boolean> {
        if (process.platform !== 'win32' && !existsSync(this.o.socketPath)) { return false; }
        const ok = await this.connectAndHandshake(true);
        if (!ok && process.platform !== 'win32') {
            try { unlinkSync(this.o.socketPath); } catch { /* a stale socket nobody listens on */ }
        }
        return ok;
    }

    private async spawn(binary: string): Promise<EngineStatus> {
        this.set({ state: 'spawning', binary });
        const child = this.o.spawner.spawn(binary, ['serve'], this.o.repoRoot);
        this.child = child;
        child.onExit((code, signal) => this.onChildExit(child, code, signal));
        const deadline = Date.now() + (this.o.readyTimeoutMs ?? 10_000);
        while (Date.now() < deadline && this.child === child) {
            if (await this.connectAndHandshake(false)) { return this._status; }
            if (this._status.state === 'failed') { await this.stop(); return this.set({ state: 'failed', binary, detail: this._status.detail }); }
            await new Promise(r => setTimeout(r, 100));
        }
        if (this.child === child) {
            await this.stop();
            return this.set({ state: 'failed', binary, detail: `the engine did not answer initialize within ${this.o.readyTimeoutMs ?? 10_000} ms` });
        }
        return this._status;
    }

    private onChildExit(child: SpawnedProcess, code: number | null, signal: string | null): void {
        if (this.child !== child || this.stopping) { return; }
        this.child = undefined;
        this.socket?.destroy();
        this.socket = undefined;
        const now = Date.now();
        const window = this.o.restartWindowMs ?? 3 * 60_000;
        this.crashes = this.crashes.filter(t => now - t <= window).concat(now);
        if (this.crashes.length > (this.o.maxRestarts ?? 4)) {
            this.set({ state: 'failed', detail: `the engine crashed ${this.crashes.length} times in the last ${Math.round(window / 60_000)} minutes (exit ${code ?? signal}); not restarting` });
            return;
        }
        this.set({ state: 'crashed', detail: `exit ${code ?? signal}` });
        void this.spawn(this._status.binary!);
    }

    private connectAndHandshake(attached: boolean): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const socket = connect(this.o.socketPath);
            socket.setEncoding('utf8');
            let settled = false;
            const done = (ok: boolean) => { if (!settled) { settled = true; resolve(ok); } };
            socket.once('error', () => { socket.destroy(); done(false); });
            socket.once('connect', () => {
                this.socket = socket;
                this.buffer = '';
                socket.on('data', (chunk: string) => this.onData(chunk, attached, done));
                socket.on('close', () => { if (this.socket === socket) { this.socket = undefined; } done(false); });
                socket.write(JSON.stringify({ jsonrpc: '2.0', id: INIT_ID, method: 'initialize', params: { client: 'arch-app', schemaVersion: this.o.clientSchemaVersion } }) + '\n');
            });
        });
    }

    private onData(chunk: string, attached: boolean, done: (ok: boolean) => void): void {
        this.buffer += chunk;
        let nl: number;
        while ((nl = this.buffer.indexOf('\n')) >= 0) {
            const line = this.buffer.slice(0, nl).trim();
            this.buffer = this.buffer.slice(nl + 1);
            if (!line) { continue; }
            let msg: { id?: unknown; result?: { engineVersion?: string; schemaVersion?: string }; error?: { message: string } } | undefined;
            try { msg = JSON.parse(line) as typeof msg; } catch { msg = undefined; }
            if (msg && msg.id === INIT_ID) {
                if (msg.error) {
                    this.set({ state: 'failed', detail: `initialize refused: ${msg.error.message}` });
                    done(false);
                } else {
                    this.set({ state: 'ready', attached, engineVersion: msg.result?.engineVersion, schemaVersion: msg.result?.schemaVersion, clientSchemaVersion: this.o.clientSchemaVersion });
                    done(true);
                }
                continue;
            }
            this.o.onFrame?.(line);
        }
    }
}

/** plain child_process spawner, for tests and the browser dev target */
export const nodeSpawner = (): Spawner => ({
    spawn(binary, args, cwd) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { spawn } = require('node:child_process') as typeof import('node:child_process');
        const child = spawn(binary, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
        return {
            pid: child.pid ?? -1,
            onExit: l => { child.once('exit', (code, signal) => l(code, signal)); child.once('error', () => l(null, 'ENOENT')); },
            kill: s => { child.kill(s); },
        };
    },
});
