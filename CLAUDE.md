# shade-mcp

MCP server for shader effect development. TypeScript, ESM only, Node 18+.

## Build & Test

```bash
npm run build    # tsup (esbuild) → dist/index.js
npm test         # vitest
```

## Architecture

- `src/index.ts` — Entry point. Registers 18 tools with McpServer, starts stdio transport.
- `src/config.ts` — Config from env vars (SHADE_EFFECTS_DIR, SHADE_VIEWER_PORT, SHADE_VIEWER_ROOT, SHADE_VIEWER_PATH, SHADE_BACKEND, SHADE_PROJECT_ROOT, SHADE_GLOBALS_PREFIX).
- `src/ai/provider.ts` — AI abstraction. Anthropic-first, OpenAI fallback. Reads API keys from env or dotfiles.
- `src/formats/` — Effect definition parsers. Auto-detects definition.json (preferred) vs definition.js (regex extraction).
- `src/harness/` — Browser automation. `server-manager.ts` (ref-counted HTTP server), `browser-session.ts` (Playwright lifecycle), `pixel-reader.ts` (image metrics).
- `src/tools/browser/` — 8 browser-based tools (compile, render, describe, benchmark, uniforms, passthrough, parity, dsl).
- `src/tools/analysis/` — 4 on-disk analysis tools (structure, alg-equiv, compare, branching).
- `src/tools/knowledge/` — 4 knowledge tools (search-effects, analyze-effect, search-source, search-knowledge).
- `src/tools/utility/` — 2 utility tools (list-effects, generate-manifest).
- `src/knowledge/` — TF-IDF vector DB, curated shader knowledge, effect index, GLSL index.

## Tool Registration Pattern

Each tool exports a `register*` function taking `McpServer`:

```typescript
import { z } from 'zod'

export const myToolSchema = {
  param: z.string().describe('Description'),
}

export function registerMyTool(server: any): void {
  server.tool('myTool', 'Tool description.', myToolSchema, async (args: any) => {
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  })
}
```

## Per-Project Setup

shade-mcp is configured entirely via env vars. Each consumer project points its MCP client at shade-mcp's binary with project-specific env vars.

**VS Code** (`.vscode/mcp.json`):
```json
{
  "servers": {
    "shader-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "${workspaceFolder}/effects",
        "SHADE_PROJECT_ROOT": "${workspaceFolder}",
        "SHADE_VIEWER_ROOT": "${workspaceFolder}",
        "SHADE_VIEWER_PATH": "/viewer/index.html",
        "SHADE_GLOBALS_PREFIX": "__myProject"
      }
    }
  }
}
```

**Environment Variables:**

| Variable | Required | Default | Description |
|---|---|---|---|
| `SHADE_EFFECTS_DIR` | Yes | `./effects` | Directory containing effect definitions |
| `SHADE_PROJECT_ROOT` | No | cwd | Project root (for .anthropic/.openai key files) |
| `SHADE_VIEWER_ROOT` | No | `$PROJECT_ROOT/viewer` | HTTP server root directory |
| `SHADE_VIEWER_PATH` | No | `/` | Path to viewer index.html within viewer root |
| `SHADE_VIEWER_PORT` | No | `4173` | HTTP server port |
| `SHADE_GLOBALS_PREFIX` | No | `__shade` | Window globals prefix (e.g., `__portable` → `__portableCanvasRenderer`) |
| `SHADE_BACKEND` | No | `webgl2` | Default rendering backend |

## Source Projects

Consumer projects that use shade-mcp's built-in MCP server:
- `../noisemaker` — Browser-based shader testing
- `../portable` — Portable effect authoring
- `../shade` — AI-native shader editor

## Viewer

shade-mcp does not bundle a viewer. Consumers must provide one via `SHADE_VIEWER_ROOT` env var (or `viewerRoot` option in library mode). The viewer must expose window globals matching the configured prefix (default `__shade*`, customizable via `SHADE_GLOBALS_PREFIX`).
