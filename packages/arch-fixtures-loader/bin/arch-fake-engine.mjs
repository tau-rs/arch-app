#!/usr/bin/env node
// A fake `arch serve` (seed design, choice 9): answers from a fixture state on the engine's socket
// convention, so the Theia backend can spawn it exactly as it will spawn the real engine.
//
//   arch-fake-engine serve [--state <dir>] [--socket <path>] [--repo <root>]
//   default state: the first state under packages/arch-fixtures-loader/fixtures-for-ui, else the
//   built-in example; default socket: socketPathFor(repo = cwd)
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { userInfo } from 'node:os';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { loadState, listStates, startFakeEngine } = require('../lib/index.js');
const { socketPathFor } = require('@tau-rs/arch-client');

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (flag, dflt) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : dflt);
if (argv[0] !== 'serve') { console.error('usage: arch-fake-engine serve [--state <dir>] [--socket <path>] [--repo <root>]'); process.exit(2); }

const synced = join(here, '..', 'fixtures-for-ui');
const defaultState = listStates(synced)[0] ? join(synced, listStates(synced)[0]) : join(here, '..', 'test', 'example-state');
const stateDir = resolve(opt('--state', defaultState));
if (!existsSync(stateDir)) { console.error(`arch-fake-engine: no such state ${stateDir}`); process.exit(1); }
const repo = resolve(opt('--repo', process.cwd()));
const socketPath = opt('--socket', socketPathFor(repo, { platform: process.platform, uid: userInfo().uid, runtimeDir: process.env.XDG_RUNTIME_DIR }));

const engine = await startFakeEngine(loadState(stateDir), socketPath);
console.log(`arch-fake-engine: state ${stateDir} on ${engine.socketPath}`);
const stop = () => engine.close().then(() => process.exit(0));
process.on('SIGINT', stop); process.on('SIGTERM', stop);
