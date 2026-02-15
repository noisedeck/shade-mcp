# Shade MCP Design

**Date:** 2026-02-15
**License:** MIT
**Status:** Approved

## Overview

Shade MCP is a best-of-breed MCP server for shader effect development, distilled from three projects:

- **Noisemaker** — 12-tool MCP server for browser-based shader testing and on-disk analysis
- **Portable** — 11-tool MCP server for portable effect authoring and validation
- **Shade** — AI-native shader editor with 19 Claude API tools + 7 MCP tools

The result is a standalone, modular TypeScript MCP server exposing 18 tools for compiling, rendering, testing, analyzing, searching, and understanding shader effects. Designed for use with Claude Code, VS Code Copilot, Cursor, Windsurf, and any MCP-compatible AI coding environment.

## Decisions

- **Standalone MCP server** — pure stdio transport, no web UI
- **Both effect formats** — definition.js (noisemaker) and definition.json (portable) with auto-detection
- **Vendored runtime** — noisemaker-shaders-core.esm.js bundled in viewer/vendor/
- **Anthropic-first AI** — Claude for vision/analysis tools, OpenAI as fallback
- **Library mode** — operates on a configurable effects directory with namespace organization
- **Modular TypeScript** — type-safe, MCP ecosystem standard, esbuild-based builds

## Tool Inventory (18 tools)

### Browser Tools (8) — Playwright + vendored viewer

| Tool | Origin | Purpose |
|------|--------|---------|
| `compileEffect` | noisemaker | Verify shader compilation, return pass-level diagnostics. Supports glob/CSV batch. |
| `renderEffectFrame` | noisemaker | Render single frame, compute image metrics (mean RGB, variance, monochrome/blank detection), optional PNG capture. |
| `describeEffectFrame` | noisemaker+shade | Render frame + AI vision analysis (Anthropic-first). User provides analysis prompt. |
| `benchmarkEffectFPS` | noisemaker | Measure achieved FPS, jitter, frame timing stats against a target framerate. |
| `testUniformResponsiveness` | portable | For each uniform: render baseline, modify value, compare output. Returns per-uniform pass/fail. |
| `testNoPassthrough` | noisemaker | Verify filter effects actually modify their input (>1% pixel difference). |
| `testPixelParity` | portable | Render on both WebGL2 and WebGPU, compare pixel-by-pixel within epsilon tolerance. Reports maxDiff, meanDiff, mismatchPercent. |
| `runDslProgram` | noisemaker | Compile and execute arbitrary DSL code without pre-defined effect files. Returns metrics + pass status. |

### Analysis Tools (4) — on-disk, no browser

| Tool | Origin | Purpose |
|------|--------|---------|
| `checkEffectStructure` | merged | Detect unused files, broken references, naming violations, leaked/undefined uniforms, missing descriptions, structural parity issues. |
| `checkAlgEquiv` | noisemaker | AI semantic comparison of GLSL/WGSL pairs. Flags truly divergent algorithms, ignores syntax differences. |
| `compareShaders` | portable | Static structural comparison: function names, uniform declarations, line counts. No AI needed. |
| `analyzeBranching` | noisemaker | AI analysis of unnecessary shader branching with optimization suggestions. |

### Knowledge Tools (4) — in-memory indexes

| Tool | Origin | Purpose |
|------|--------|---------|
| `searchEffects` | shade | Search effect library by concept, tag, algorithm, or visual style. Synonym expansion. |
| `analyzeEffect` | shade | Deep-dive into an effect: full definition, shader source, uniforms, passes. |
| `searchShaderSource` | shade | Regex search through GLSL source code across all effects. Returns matching snippets with context. |
| `searchShaderKnowledge` | shade | Semantic search over curated shader documentation: DSL grammar, GLSL techniques, effect patterns, common errors. |

### Utility Tools (2)

| Tool | Origin | Purpose |
|------|--------|---------|
| `listEffects` | shade | List all effects, optionally filtered by namespace. |
| `generateManifest` | noisemaker | Rebuild effect manifest by scanning effects directory. |

## Architecture

### Project Structure

```
shade-mcp/
├── src/
│   ├── index.ts                    # Entry point, MCP server setup
│   ├── tools/
│   │   ├── browser/
│   │   │   ├── compile.ts          # compileEffect
│   │   │   ├── render.ts           # renderEffectFrame
│   │   │   ├── describe.ts         # describeEffectFrame
│   │   │   ├── benchmark.ts        # benchmarkEffectFPS
│   │   │   ├── uniforms.ts         # testUniformResponsiveness
│   │   │   ├── passthrough.ts      # testNoPassthrough
│   │   │   ├── parity.ts           # testPixelParity
│   │   │   └── dsl.ts              # runDslProgram
│   │   ├── analysis/
│   │   │   ├── structure.ts        # checkEffectStructure
│   │   │   ├── alg-equiv.ts        # checkAlgEquiv
│   │   │   ├── compare.ts          # compareShaders
│   │   │   └── branching.ts        # analyzeBranching
│   │   ├── knowledge/
│   │   │   ├── search-effects.ts   # searchEffects
│   │   │   ├── analyze-effect.ts   # analyzeEffect
│   │   │   ├── search-source.ts    # searchShaderSource
│   │   │   └── search-knowledge.ts # searchShaderKnowledge
│   │   └── utility/
│   │       ├── list-effects.ts     # listEffects
│   │       └── generate-manifest.ts # generateManifest
│   ├── harness/
│   │   ├── browser-session.ts      # Playwright browser lifecycle
│   │   ├── server-manager.ts       # Ref-counted HTTP server for viewer
│   │   └── pixel-reader.ts         # WebGL2/WebGPU pixel readback + metrics
│   ├── knowledge/
│   │   ├── vector-db.ts            # TF-IDF semantic search engine
│   │   ├── dsl-knowledge.ts        # DSL grammar & patterns
│   │   ├── glsl-reference.ts       # GLSL technique reference
│   │   └── effect-catalog.ts       # Pre-built effect metadata
│   ├── formats/
│   │   ├── definition-js.ts        # definition.js parser
│   │   └── definition-json.ts      # definition.json parser
│   ├── ai/
│   │   └── provider.ts             # Anthropic-first, OpenAI fallback
│   └── config.ts                   # Paths, backends, defaults
├── viewer/
│   ├── index.html                  # Minimal rendering page
│   └── vendor/
│       └── noisemaker-shaders-core.esm.js
├── package.json
├── tsconfig.json
└── LICENSE
```

### Key Patterns

**Stateless per-call:** Each browser tool creates a fresh Playwright session. No stale state between invocations.

**Shared HTTP server:** Ref-counted server manager. First tool call spins up the static server, last teardown kills it. Avoids port conflicts and zombie processes.

**Effect resolution:** Tools accept `effect_id` (single) or `effects` (CSV/glob). An effect resolver handles both definition.js and definition.json with auto-detection.

**AI provider abstraction:** Single module checks `ANTHROPIC_API_KEY` first, then `OPENAI_API_KEY`, then `.anthropic`/`.openai` files. Used by describeEffectFrame, checkAlgEquiv, analyzeBranching, searchShaderKnowledge.

**Lazy knowledge indexes:** Built on first use, not at server startup. Keeps MCP handshake fast.

## Tech Stack

### Runtime Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol (stdio transport, tool registration) |
| `playwright` | Browser automation for shader rendering |
| `@anthropic-ai/sdk` | Claude API for vision/analysis tools |
| `openai` | Fallback AI provider |
| `serve` | Static HTTP server for viewer |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `tsup` | Build (esbuild-based, zero-config) |
| `vitest` | Testing (fast, TypeScript-native) |
| `@types/node` | Node.js types |

### Build & Run

```bash
npm run build        # tsup src/index.ts --format esm
npm run dev          # tsup --watch + node
npm run start        # node dist/index.js (production)
npm run setup        # playwright install chromium + vendor noisemaker runtime
npm test             # vitest
```

### Node.js: >=18 (ESM only)

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SHADE_EFFECTS_DIR` | Path to effects library | `./effects` |
| `SHADE_VIEWER_PORT` | Port for browser harness | `4173` |
| `SHADE_BACKEND` | Default rendering backend | `webgl2` |
| `ANTHROPIC_API_KEY` | For AI-powered tools | — |
| `OPENAI_API_KEY` | Fallback AI provider | — |

### MCP Client Configs

**Claude Code** (`~/.claude.json`):
```json
{
  "mcpServers": {
    "shade": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/shade-mcp",
      "env": { "SHADE_EFFECTS_DIR": "/path/to/effects" }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "shade": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/shade-mcp",
      "env": { "SHADE_EFFECTS_DIR": "/path/to/effects" }
    }
  }
}
```

**Cursor** (`~/.cursor/mcp.json`): Same format as Claude Code.

## Knowledge System

### Indexes

**Effect Library Index** — On first use, scan `SHADE_EFFECTS_DIR` and build in-memory:
- Effect IDs, names, descriptions, tags, namespaces
- Uniform/parameter metadata
- Pass counts, shader file paths

**GLSL Source Index** — Index all `.glsl` files for regex search. Returns matching snippets with context lines and effect attribution.

**Shader Knowledge Base** — Curated TypeScript data modules ported from Shade:
- DSL grammar and syntax rules
- Effect definition format spec
- GLSL technique recipes (noise, SDF, raymarching, domain warp, etc.)
- Common errors and solutions
- Pipeline architecture details

**Semantic Search** — TF-IDF scoring over the knowledge corpus. No external embedding API needed, runs instantly.

### Tool Behavior

| Tool | Index | Search Method |
|------|-------|---------------|
| `searchEffects` | Effect library | Keyword + tag matching with synonym expansion |
| `analyzeEffect` | Effect library | Direct ID lookup, reads definition + shader source |
| `searchShaderSource` | GLSL source | Regex with configurable context lines |
| `searchShaderKnowledge` | Knowledge base | TF-IDF scoring over curated entries |
