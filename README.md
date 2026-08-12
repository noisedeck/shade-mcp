# shade-mcp

MCP server for shader effect development.

Distilled from three projects:
- **[noisemaker](https://noisemaker.app/)** — browser-based shader testing
- **[portable](https://github.com/noisedeck/portable)** — portable effect authoring
- **[shade](https://shade.noisedeck.app)** — agent-assisted shader editing

## Requirements

- Node.js 18 or newer
- A viewer page, for the browser tools only — shade-mcp does not bundle one. See [Viewer](#viewer).

## Quick Start

```bash
npm install            # installs dependencies and builds dist/
npm run setup          # install Playwright Chromium (browser tools only)
```

**Using shade-mcp with noisemaker or portable?** See [docs/SETUP.md](docs/SETUP.md) for step-by-step configuration.

## Viewer

The eight browser tools drive a real Chromium against a viewer page that hosts
the renderer. shade-mcp does not ship one: point `SHADE_VIEWER_ROOT` at a
directory containing an `index.html` that exposes the renderer as window
globals, and set `SHADE_GLOBALS_PREFIX` to match them.

| Project | `SHADE_VIEWER_ROOT` | `SHADE_GLOBALS_PREFIX` |
|---------|---------------------|------------------------|
| noisemaker | `<noisemaker>/demo/shaders` | `__noisemaker` |
| portable | `<portable>/viewer` | `__portable` |

The analysis, knowledge, and utility tools read from disk and need no viewer.

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SHADE_EFFECTS_DIR` | `<project root>/effects` | Path to the effects library |
| `SHADE_PROJECT_ROOT` | cwd | Project root, used for relative paths and AI key lookup |
| `SHADE_VIEWER_ROOT` | `<project root>/viewer` | Directory served as the viewer |
| `SHADE_VIEWER_PATH` | `/` | Path within the viewer to open |
| `SHADE_VIEWER_PORT` | `0` (OS-assigned) | Port for the local viewer server |
| `SHADE_GLOBALS_PREFIX` | `__shade` | Prefix of the viewer's window globals |
| `SHADE_BACKEND` | `webgl2` | Default rendering backend (`webgl2` or `webgpu`) |
| `SHADE_MAX_BROWSERS` | `1` | Concurrent browser sessions |
| `SHADE_HEADLESS` | `1` (headless) | Set to `0` to watch the browser window |
| `ANTHROPIC_API_KEY` | — | Required for AI-powered tools (vision, analysis) |
| `OPENAI_API_KEY` | — | Fallback AI provider |

## MCP Client Configuration

### Claude Code

```json
{
  "mcpServers": {
    "shade": {
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/effects"
      }
    }
  }
}
```

### VS Code Copilot

In `.vscode/mcp.json`:

```json
{
  "servers": {
    "shade": {
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/effects"
      }
    }
  }
}
```

### Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shade": {
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/effects"
      }
    }
  }
}
```

### Windsurf

In `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "shade": {
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/effects"
      }
    }
  }
}
```

## Tool Reference

### Browser Tools (8)

Require Playwright Chromium and a viewer (see [Viewer](#viewer)).

| Tool | Description |
|------|-------------|
| `compileEffect` | Compile shader effect, return pass-level diagnostics. Supports glob/CSV batch. |
| `renderEffectFrame` | Render single frame, compute image metrics (mean RGB, variance, blank/monochrome detection), optional PNG capture. |
| `describeEffectFrame` | Render frame + AI vision analysis. Requires `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. |
| `benchmarkEffectFPS` | Measure FPS, jitter, and frame timing stats against a target framerate. |
| `testUniformResponsiveness` | Test each uniform modifies output. Returns per-uniform pass/fail. |
| `testNoPassthrough` | Verify filter effects actually modify input (>1% pixel difference). |
| `testPixelParity` | Compare WebGL2 vs WebGPU rendering pixel-by-pixel within epsilon tolerance. |
| `runDslProgram` | Compile and execute arbitrary DSL code. Returns metrics + pass status. |

### Analysis Tools (4)

On-disk analysis, no browser needed.

| Tool | Description |
|------|-------------|
| `checkEffectStructure` | Detect unused files, broken refs, naming violations, leaked uniforms, structural parity issues. |
| `checkAlgEquiv` | AI semantic comparison of GLSL/WGSL pairs. Requires AI key. |
| `compareShaders` | Static structural comparison: function names, uniforms, line counts. |
| `analyzeBranching` | AI analysis of unnecessary shader branching with optimization suggestions. Requires AI key. |

### Knowledge Tools (4)

In-memory search indexes.

| Tool | Description |
|------|-------------|
| `searchEffects` | Search effect library by concept, tag, algorithm, or visual style. |
| `analyzeEffect` | Full definition, shader source, uniforms, and passes for an effect ID. |
| `searchShaderSource` | Regex search through GLSL source code across all effects. |
| `searchShaderKnowledge` | Semantic search over curated shader docs: DSL grammar, GLSL techniques, patterns, errors. |

### Utility Tools (2)

| Tool | Description |
|------|-------------|
| `listEffects` | List all effects, optionally filtered by namespace. |
| `generateManifest` | Rebuild effect manifest by scanning effects directory. |

## Development

```bash
npm test           # run tests
npm run typecheck  # tsc --noEmit, including tests
npm run build      # build with tsup
npm run dev        # watch mode
```

Tests and typecheck are separate gates: vitest does not typecheck, so run both.

## License

MIT
