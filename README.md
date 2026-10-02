# arch-app

The Theia product for **arch**: the shell, the map, the views, the editor decorations, the API
client. It computes nothing about architecture: it subscribes to views from `arch` and sends
intents. It owns no styling: every visual element comes from `@tau-rs/sett`.

Synced to: `arch-v1-spec.md` §13 (2026-10-02). ADRs: none published yet; see `FINDINGS.md`.

## Layout

```
packages/
  arch-shell             the frame: a Theia extension; four host widgets mark the regions
  arch-client            generated from arch's published OpenRPC schema; never hand-written  (#3)
  arch-fixtures-loader   pins and loads arch-fixtures/fixtures-for-ui; a fake engine for dev  (#4)
applications/
  browser                Theia browser target: the dev loop and the Playwright target
  electron               Theia electron target: the product; spawns `arch serve`              (#2)
docs/design/             the seed choices and their reasons
FINDINGS.md              what this repo needs from the others
```

## Run

```
nvm use            # Node 24
npm install        # also builds the packages (lerna run prepare)
npm run build:browser && npm run start:browser    # http://localhost:3000
npm run build:electron && npm run start:electron
```

## Rules

- No `sett-*` component is defined here. A missing one is a finding, not a local widget.
- No modal dialogs. Errors are a status-bar state and a Checks row (ADR 23).
- `arch-client` is regenerated on every schema version; CI fails on drift.
- Work is an issue before it is a branch: see the milestone epics.
