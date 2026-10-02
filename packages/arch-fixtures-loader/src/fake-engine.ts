import { createServer, Server, Socket } from 'node:net';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { FixtureResponder } from './responder';
import { FixtureState } from './state';

/**
 * The socket adapter: a fake `arch serve` for Theia dev and the engine-host tests (#2). Frames are
 * newline-delimited JSON-RPC 2.0 on a local socket; events replay once per connection after that
 * connection's first answered request (the initialize handshake). Same responder, same rules.
 */
export interface FakeEngine {
    readonly socketPath: string;
    readonly connections: number;
    close(): Promise<void>;
}

export const startFakeEngine = async (state: FixtureState, socketPath: string): Promise<FakeEngine> => {
    const responder = new FixtureResponder(state);
    if (process.platform !== 'win32') {
        mkdirSync(dirname(socketPath), { recursive: true });
        if (existsSync(socketPath)) { unlinkSync(socketPath); } // a stale socket from a previous run
    }
    let connections = 0;
    const server: Server = createServer((socket: Socket) => {
        connections++;
        let buffer = '';
        let replayed = false;
        const write = (frame: string) => { if (!socket.destroyed) { socket.write(frame + '\n'); } };
        const replay = async () => {
            if (replayed) { return; }
            replayed = true;
            for (const e of responder.events) {
                await new Promise(r => setTimeout(r, e.delayMs ?? 0));
                write(FixtureResponder.eventFrame(e));
            }
        };
        socket.setEncoding('utf8');
        socket.on('data', (chunk: string) => {
            buffer += chunk;
            let nl: number;
            while ((nl = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line) { continue; }
                const reply = responder.handle(line);
                if (reply !== undefined) { write(reply); void replay(); }
            }
        });
        socket.on('error', () => socket.destroy());
    });
    await new Promise<void>((resolve, reject) => server.once('error', reject).listen(socketPath, resolve));
    return {
        socketPath,
        get connections() { return connections; },
        close: () => new Promise<void>(resolve => server.close(() => resolve())),
    };
};
