/**
 * The contract between the frontend and the backend's engine host (seed design, choice 4): an
 * opaque bridge. Frames cross it byte for byte; the only structured thing is the engine's status.
 */
export const ENGINE_BRIDGE_PATH = '/services/arch/engine';

/** the lifecycle of the engine for one repo (choice 5) */
export type EngineState =
    | 'idle'          // no repo opened yet
    | 'not-found'     // no binary in any of the four places
    | 'spawning'      // process started, socket not answering yet
    | 'ready'         // connected, initialize answered (spawned or attached)
    | 'crashed'       // exited; a restart is coming
    | 'failed';       // gave up: timeout, refused handshake, or 5 crashes in 3 minutes

export interface EngineStatus {
    state: EngineState;
    repoRoot?: string;
    socketPath?: string;
    binary?: string;
    /** where discovery looked, for the Checks row when not found */
    looked?: string[];
    engineVersion?: string;
    schemaVersion?: string;
    /** the schema version the client was generated from */
    clientSchemaVersion?: string;
    /** true when we connected to an engine that was already running */
    attached?: boolean;
    detail?: string;
    restarts?: number;
}

export interface EngineOpenOptions {
    /** the `arch.engine.path` preference, when set */
    binaryPath?: string;
}

export interface EngineBridgeClient {
    onFrame(frame: string): void;
    onStatus(status: EngineStatus): void;
}

export interface EngineBridge {
    open(repoRoot: string, options?: EngineOpenOptions): Promise<EngineStatus>;
    send(frame: string): Promise<void>;
    status(): Promise<EngineStatus>;
}

/** the status bar's words (ADR 23: a state, never a dialog); counts and states only, no verbs */
export const engineStatusText = (s: EngineStatus): string => {
    switch (s.state) {
        case 'ready': return s.clientSchemaVersion !== undefined && s.schemaVersion !== s.clientSchemaVersion
            ? `engine · schema ${s.schemaVersion} ≠ client ${s.clientSchemaVersion}`
            : `engine · ${s.engineVersion ?? 'ready'}`;
        case 'spawning': return 'engine · starting';
        case 'crashed': return `engine · crashed, restarting (${s.restarts ?? 0})`;
        case 'failed': return 'engine · failed';
        case 'not-found': return 'engine · not found';
        default: return 'engine · idle';
    }
};
