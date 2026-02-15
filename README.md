# shade-mcp

Best-of-breed MCP server for shader effect development. 18 tools for compiling, rendering, testing, analyzing, searching, and understanding shader effects.

Distilled from three projects:
- **[noisemaker](https://github.com/aayars/noisemaker)** — browser-based shader testing
- **[portable](https://github.com/aayars/portable)** — portable effect authoring
- **[shade](https://github.com/aayars/shade)** — AI-native shader editing

## Quick Start

```bash
npm install
npm run setup          # install Playwright Chromium
bash scripts/setup.sh  # vendor noisemaker runtime (requires ../noisemaker)
npm run build
```

**Using shade-mcp with noisemaker or portable?** See [docs/SETUP.md](docs/SETUP.md) for step-by-step configuration.

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SHADE_EFFECTS_DIR` | `../noisemaker/effects` | Path to effects library |
| `SHADE_VIEWER_PORT` | `4173` | Local dev server port |
| `SHADE_BACKEND` | `webgl2` | Default rendering backend (`webgl2` or `webgpu`) |
| `SHADE_PROJECT_ROOT` | cwd | Project root for relative paths |
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

Require Playwright Chromium and vendored noisemaker runtime.

| Tool | Description |
|------|-------------|
| `compileEffect` | Compile shader effect, return pass-level diagnostics. Supports CSV batch. |
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
npm test          # run tests
npm run build     # build with tsup
npm run dev       # watch mode
```

## License

MIT
