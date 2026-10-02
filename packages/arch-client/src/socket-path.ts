/**
 * The engine's socket convention (seed design, choice 5; tau-rs/arch#7): derived from the repo
 * root so the engine and every client resolve the same path without passing it around.
 *   Linux: $XDG_RUNTIME_DIR/arch/<hash8>.sock · elsewhere: /tmp/arch-<uid>/<hash8>.sock
 *   Windows: \\.\pipe\arch-<uid>-<hash8>
 * TMPDIR is deliberately not used: nix-shell and direnv give every shell a different one.
 * Pure: the environment is passed in, so it runs in a page and in Node alike.
 */
export interface SocketEnv {
    platform: string;
    uid: number | string;
    runtimeDir?: string;
}

/** FNV-1a 32-bit, hex, 8 chars: short, deterministic, keeps the path under the 104-char limit */
export const hash8 = (s: string): string => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
};

export const socketPathFor = (repoRoot: string, env: SocketEnv): string => {
    const h = hash8(repoRoot.replace(/[\\/]+$/, ''));
    if (env.platform === 'win32') { return `\\\\.\\pipe\\arch-${env.uid}-${h}`; }
    if (env.runtimeDir) { return `${env.runtimeDir.replace(/\/+$/, '')}/arch/${h}.sock`; }
    return `/tmp/arch-${env.uid}/${h}.sock`;
};
