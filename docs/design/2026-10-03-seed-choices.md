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
5 s. A candidate is trusted only if `--version` prints `arch <semver>`: `arch` is also a macOS and
coreutils command, and PATH discovery found that one first (F-8). Every failure is a status-bar state and a Checks row, never a dialog (ADR 23). The socket path
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

## Learned while building (2026-10-03)

- Theia 1.76 bundles with esbuild, not webpack: `esbuild.mjs` per application is committed,
  `gen-esbuild.*.mjs` is generated and ignored.
- npm runs each workspace package's own `prepare` in arbitrary order, so packages have no
  `prepare`; the root's `lerna run build` is the only build on install, in dependency order.
- inversify 7 has no injectable container: widget factories are `toDynamicValue(ctx => …)`.
- `@theia/markers` arrives with `@theia/monaco`; its Problems view is removed with Theia's
  `FilterContribution`, the model stays.
- Nothing in `initializeLayout` may await a widget's visibility: the shell is attached there but not
  revealed, and the reveal comes after it. `onStart` runs before the shell is even attached, so nothing
  measured there is real: a size Theia computes from a `clientHeight` is lost (issue #16).
- sett v0.4.0 is a GitHub release, not an npm package: the root `overrides` map both names to the
  release tarballs (one place, integrity in the lock file); `arch-shell` asks for plain `0.4.0`.
- `@tau-rs/sett` is ESM only and Theia extensions compile to CommonJS: each application's
  `esbuild.mjs` aliases the package to its one module file. Its Lit elements then mount in Theia
  widgets as they are.
- The rail is a subclass of `SidePanelHandler` rebound in the container (F-2). Sett's colour themes
  are registered through `MonacoThemingService.registerParsedTheme` and named in `defaultTheme`;
  `data-theme` on `<html>` mirrors the active theme's type, which is what `sett.css` switches on.
- Choice 3, amended by #14: the areas stay Theia's dock panels, and two of them are drawn by sett.
  `ArchApplicationShell` (a subclass rebound in the container) moves the main area into `sett-frame`
  and the bottom area into `sett-bottom-panel`'s `terminal` slot, through a Lumino layout that puts a
  widget's node inside an element; `addWidget(widget, { area })` is untouched, so a terminal lands in
  the slot by itself. The panel region is that bottom area, no longer a host widget. Collapsed, the
  bottom area keeps its strip: `closed` follows Theia's collapsed state, one source of truth.
- Lumino's dock panel in `single-document` mode keeps its tab bar as a hidden node: no Theia tab bar is
  drawn in the bottom area, and one terminal shows at a time.
- The bottom panel is not a `SidePanelHandler`: Theia sizes it as a child of its split panel, so
  `getBottomPanelSize`, `getDefaultBottomPanelSize` and `setBottomPanelSize` are overridden to name the
  sett panel. `doToggleMaximized` lifts an area out of that split panel and is turned off.
- Theia binds its status bar twice (`StatusBarImpl` and `StatusBar`), both over one view model; the
  rebind is `StatusBarImpl` to the subclass and `StatusBar` to that same service. The subclass renders
  `sett-status-bar` and takes another id, so none of Theia's status bar styles apply.
- Theia's terminal extension opens a terminal on a first start; the panel still starts on Findings,
  and shows Terminal only for a terminal opened once the app is ready.
- The bottom panel opens at Theia's `bottomPanel.initialSizeRatio` of its column, from
  `initializeLayout` on a first start and from the saved size after that (#16). Theia's `emptySize`
  (an empty bottom area opens small) does not apply: sett's panel always has its tabs. sett's bar and
  status bar render after that first open and the column shrinks by their height, so until the app is
  ready the open panel goes back to the ratio on every resize of its column.
