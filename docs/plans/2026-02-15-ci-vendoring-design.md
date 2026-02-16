# CI & Vendoring Design for portable and shade

## Problem

- **portable**: No CI. MCP server references absolute local path. Cloners can't use shade-mcp tools without a sibling checkout.
- **shade**: `file:../shade-mcp` in package.json breaks in Docker/CI builds.
- **shade-mcp**: No upstream trigger to notify downstream repos on changes.

## Design

### portable

Vendor shade-mcp dist files into the repo (same pattern as py-noisemaker).

**Vendored artifacts**: Full `dist/` directory to `vendor/shade-mcp/` — all 6 entry points including the MCP server binary (`index.js`).

**Dependencies**: Add `@modelcontextprotocol/sdk`, `@anthropic-ai/sdk`, `openai` to portable's package.json (the MCP server's external imports that aren't bundled by tsup).

**Scripts & workflows**:
- `pull-shade-mcp` — Clone, build, copy dist/ to `vendor/shade-mcp/`. Same pattern as py-noisemaker's script.
- `.github/workflows/pull-shade-mcp.yml` — Triggered by `repository_dispatch` type `shade-mcp-updated`. Runs pull script, auto-commits.
- `.github/workflows/pull-noisemaker.yml` — Triggered by `repository_dispatch` type `noisemaker-updated`. Runs existing `pull-noisemaker`, auto-commits.
- Update `.vscode/mcp.json` — Change absolute path to `${workspaceFolder}/vendor/shade-mcp/index.js`.

### shade

Pull shade-mcp at Docker build time. shade only imports `shade-mcp/knowledge` (19 named exports, zero external deps).

**Changes**:
- `pull-shade-mcp` script — Clone, build, copy `dist/knowledge/` to `vendor/shade-mcp/knowledge/`.
- Update `deploy-scaffold.yml` — Add `./pull-shade-mcp` step before Docker build.
- Remove `"shade-mcp": "file:../shade-mcp"` from package.json.
- Rewrite 2 import sites (`server/routes/chat.js`, `server/tools/index.js`) from `'shade-mcp/knowledge'` to relative vendor path.
- `.github/workflows/pull-shade-mcp.yml` — Triggered by `repository_dispatch`, SSHes to production and rebuilds (mirrors existing `pull-noisemaker.yml`).

### shade-mcp (upstream trigger)

New `.github/workflows/trigger-downstream.yml` — On push to main, sends `repository_dispatch` to:
- `noisedeck/noisemaker` (type `shade-mcp-updated`)
- `noisedeck/portable` (type `shade-mcp-updated`)
- `noisedeck/shade` (type `shade-mcp-updated`)

Uses GitHub App token (same `NOISEDECK_APP_ID` / `NOISEDECK_APP_PRIVATE_KEY` secrets as py-noisemaker).
