# Drop-in MCP Replacement for py-noisemaker and portable

## Problem

shade-mcp has the right tool names and behavior to replace the MCP servers in `../py-noisemaker` (12 tools) and `../portable` (11 tools), but can't currently serve effects from external project directories.

## Gaps

1. **HTTP server** — `npx serve` serves a single root (`viewer/`). Effects live in the target project (e.g. `../portable/effects/`, `../py-noisemaker/shaders/effects/`).
2. **Batch parameters** — Old noisemaker MCP supports `effects` (CSV/glob) on all browser tools. shade-mcp only supports it on `compileEffect`.
3. **Single-effect auto-detection** — portable's tools don't require `effect_id` because it's a single-effect project. shade-mcp requires it everywhere.
4. **Viewer routing** — The viewer fetches `/effects/manifest.json` and `/effects/{ns}/{effect}/...` relative to HTTP root.

## Design

### 1. Custom HTTP server (replaces `npx serve`)

Replace the `npx serve` spawn in `server-manager.ts` with a built-in Node HTTP server that mounts multiple paths:

```
GET /                → viewer/index.html     (shade-mcp's viewer)
GET /vendor/*        → viewer/vendor/*       (shade-mcp's vendored runtime)
GET /effects/*       → SHADE_EFFECTS_DIR/*   (target project's effects)
```

This is a simple static file server (~60 lines) using Node's `http` module and `fs`. No Express needed. The ref-counting lifecycle stays the same — just the underlying server process changes from a child process to an in-process HTTP server.

### 2. Batch parameter normalization

Add `effects` (CSV string) parameter to all browser tools that currently only accept `effect_id`:
- renderEffectFrame
- describeEffectFrame
- benchmarkEffectFPS
- testUniformResponsiveness
- testNoPassthrough
- testPixelParity

Extract a shared `resolveEffectIds(args)` helper that:
1. Takes `{ effect_id?, effects? }`
2. Returns `string[]` of resolved effect IDs
3. Supports glob expansion against the effects directory
4. Falls back to single-effect auto-detection (see below)

### 3. Single-effect auto-detection

When neither `effect_id` nor `effects` is provided:
1. Scan `SHADE_EFFECTS_DIR` for effects (directories containing `definition.json` or `definition.js`)
2. If exactly one found, use it (log warning: "auto-detected single effect: {id}")
3. If zero or multiple found, return error asking caller to specify

### 4. No changes to

- Tool names or response shapes
- Viewer HTML (it already fetches `/effects/...` relatively)
- AI provider abstraction
- Knowledge/search/analysis tools
- Config env var names (SHADE_EFFECTS_DIR, SHADE_VIEWER_PORT, SHADE_BACKEND, SHADE_PROJECT_ROOT)

## Configuration for each project

### portable
```
SHADE_EFFECTS_DIR=../portable/effects
SHADE_PROJECT_ROOT=../portable
```

### py-noisemaker
```
SHADE_EFFECTS_DIR=../py-noisemaker/shaders/effects
SHADE_PROJECT_ROOT=../py-noisemaker
```

## Success criteria

- `compileEffect`, `renderEffectFrame`, etc. work identically to old MCPs when pointed at each project
- portable workflows work without specifying `effect_id` (auto-detected)
- noisemaker workflows work with glob patterns across all browser tools
- All existing shade-mcp tests still pass
