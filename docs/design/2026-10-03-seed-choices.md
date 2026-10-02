# Seed choices · 2026-10-03

The ten decisions that shape `arch-app` before `@tau-rs/sett` lanes A–B are released. Each one: the
decision, why, and the failure the alternative allows. Scope while sett is unreleased: the Theia
skeleton, the engine host, the `arch-client` generator, the fixtures loader. No `sett-*` component is
stubbed. Spec §13 decision *n* is cited as ADR *n* until `arch-design` publishes. Findings live in
`FINDINGS.md`.

## 1 · npm workspaces + lerna, Node 24, Theia IDE layout

`applications/{browser,electron}` and `packages/*`; root `prepare` runs `lerna run prepare`. Theia
builds with npm (eclipse-theia/theia#14481) and requires Node ≥ 24; npm does not order `prepare`
across workspaces, which is why both the Theia generator and the Theia IDE product add lerna. pnpm
is used by no Theia product and failed Electron start in eclipse-theia/theia#11960.
Failure avoided: a bundle that resolves phantom dependencies differently per package.

## 2 · the minimal Theia extension set

core, editor, monaco, filesystem, workspace, terminal, process, preferences, messages, markers;
`electron` in the electron app only. No navigator (arch's Files view replaces it), no scm/git
(arch owns commit · PR · merge, ADR 16–18), no plugin-ext (no plugin host in V1, spec §8; see F-1),
no ai-*, debug, task, search, outline, toolbar. Failure avoided: stock views hidden by command and
brought back by upgrades.

## 3 · Theia's ApplicationShell stays; one host widget per region

bar → top · left → left · inspector → right · panel → bottom; center is Theia's main area;
status bar is Theia's service. A host widget has an id, a title and one DOM node, nothing drawn.
The rail's horizontal labels come later from a renderer rebind on the left tab bar (F-2).
Failure avoided: a custom shell that breaks "open file" and "open terminal", which call
`shell.addWidget(widget, { area })` and never check.

## 4 · the backend spawns the engine; an opaque bridge to the frontend

The Theia backend exists in both targets, so it owns the engine process and forwards JSON-RPC frames
byte for byte over Theia's frontend–backend channel. The generated client runs in the frontend with
a pluggable transport, so Storybook renders the same client from fixtures. Theia forwarded language
servers this way before LSP moved into the VS Code extension host. Failure avoided: a typed Theia
service that is a second hand-written copy of the engine's method set; a renderer connecting to a
network port any local page can reach.

## 5 · binary discovery and lifecycle

Order: preference `arch.engine.path` → `ARCH_BIN` → PATH (Theia's electron target already resolves
the login shell's PATH through `fix-path`) → bundled slot. Attach to an existing socket before
spawning; stale socket unlinked. Spawn through `@theia/process`. Ready = connected and `initialize`
answered with engine and schema version; a schema mismatch is a status, views still served. Restart
until the 5th crash within 3 minutes (vscode-languageclient's default). SIGTERM, then SIGKILL after
5 s. Every failure is a status-bar state and a Checks row, never a dialog (ADR 23). The socket path
is the engine's convention, derived from the repo root (tau-rs/arch#7).

## 6 · schema pinned by repo path and commit; generated client committed

`packages/arch-client/schema/schema.lock.json` = `{ repo, commit, path }`; `npm run schema:sync`
fetches the one file; `npm run generate` writes `src/generated/`; CI fails when regenerating
changes a committed file (sett's own discipline). The only hand-written file is the transport port.
Failure avoided: a schema republished under the same version changing the client with no diff.

## 7 · OpenRPC 1.3 plus `x-arch-events`

Methods with JSON Schema params and results, events as one extension block, `info.version` as the
schema version, an `initialize` method. Recorded upstream on tau-rs/arch#7. Failure avoided: a
home-grown format whose edge cases are settled in chat.

## 8 · fixtures pinned by lock, fetched by sparse clone

`packages/arch-fixtures-loader/fixtures.lock.json` = `{ repo, commit, path }`; a blobless sparse
clone of `fixtures-for-ui/` only, hooked into `postinstall`, refusing to run stale. Same idiom as
the schema. Failure avoided: a submodule pointer `git pull` leaves stale without a signal.

## 9 · one responder, two adapters

A pure responder answers JSON-RPC frames from `fixtures-for-ui/<state>/responses/<method>.json` and
replays `events.jsonl`; no file → `-32601`. Wrapped as an in-page transport (Storybook, tests) and
as a fake engine on a socket (Theia dev, engine-host tests). Failure avoided: a shell that imports
fixtures directly and never sends a request.

## 10 · FINDINGS.md, the sync line, the ledger

`FINDINGS.md` entries carry id, to, ask, blocks-here, status; the README states what the repo is
synced to; work is filed as arch-app issues before it starts (#1–#6). Findings for other repos stay
local until `arch-design` opens.
