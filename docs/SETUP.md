# Setting Up shade-mcp for Your Project

shade-mcp replaces the built-in MCP servers in **py-noisemaker** and **portable**. This guide walks through setup for each project in VS Code and Claude Code.

## Prerequisites

Build shade-mcp once (from the shade-mcp directory):

```bash
cd ~/source/shade-mcp
npm install
npm run setup              # install Playwright Chromium
bash scripts/setup.sh      # vendor noisemaker runtime (requires ../noisemaker)
npm run build
```

Verify it built:

```bash
ls dist/index.js  # should exist
```

## py-noisemaker

Effects live at `py-noisemaker/shaders/effects/` in nested `namespace/effect/` layout.

### VS Code (Copilot)

Create or edit `py-noisemaker/.vscode/mcp.json`:

```json
{
  "servers": {
    "shade": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/aayars/source/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/Users/aayars/source/py-noisemaker/shaders/effects",
        "SHADE_PROJECT_ROOT": "/Users/aayars/source/py-noisemaker"
      }
    }
  }
}
```

Remove or comment out the old `noisemaker-shader-tools` entry in `.vscode/settings.json` if present.

### Claude Code

Add to `~/.claude/settings.json` (or project-level `.claude/settings.local.json`):

```json
{
  "mcpServers": {
    "shade": {
      "command": "node",
      "args": ["/Users/aayars/source/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/Users/aayars/source/py-noisemaker/shaders/effects",
        "SHADE_PROJECT_ROOT": "/Users/aayars/source/py-noisemaker"
      }
    }
  }
}
```

### What works

All 18 tools. Examples:

```
compileEffect({ effects: "synth/noise, synth/gradient", backend: "webgl2" })
renderEffectFrame({ effect_id: "filter/blur", backend: "webgpu" })
searchEffects({ query: "fractal noise" })
generateManifest()
```

## portable

The effect lives at `portable/effect/` in a flat layout (no namespace nesting). shade-mcp auto-detects this.

### VS Code (Copilot)

Create or edit `portable/.vscode/mcp.json`:

```json
{
  "servers": {
    "shade": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/aayars/source/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/Users/aayars/source/portable/effect",
        "SHADE_PROJECT_ROOT": "/Users/aayars/source/portable"
      }
    }
  }
}
```

Remove or comment out the old `portable-shader` entry if present.

### Claude Code

Add to `~/.claude/settings.json` (or project-level `.claude/settings.local.json`):

```json
{
  "mcpServers": {
    "shade": {
      "command": "node",
      "args": ["/Users/aayars/source/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/Users/aayars/source/portable/effect",
        "SHADE_PROJECT_ROOT": "/Users/aayars/source/portable"
      }
    }
  }
}
```

### What works

All tools work. Since there's only one effect, you can omit `effect_id` — it auto-detects:

```
compileEffect({ backend: "webgl2" })
renderEffectFrame({ backend: "webgpu", capture_image: true })
testPixelParity()
```

You'll see a warning in stderr: `[shade-mcp] Auto-detected flat effect layout: effect` — this is expected.

## Disabling the old MCP

You don't need to delete the old MCP servers. Just make sure only one is active at a time:

- **VS Code**: Remove the old server entry from `.vscode/mcp.json` or `.vscode/settings.json`
- **Claude Code**: Remove the old server entry from whichever settings file it's in
- **Cursor**: Remove from `.cursor/mcp.json`

If both old and new MCPs are active, you'll get duplicate tool names and unpredictable behavior.

## Troubleshooting

**"Effects directory not found"** — Check that `SHADE_EFFECTS_DIR` points to the right path. For noisemaker it's `shaders/effects/`, for portable it's `effect/`.

**"No effects found"** — The directory exists but contains no `definition.json` or `definition.js` files. Check the path is correct and points to the effects, not one level above.

**"Multiple effects found. Please specify effect_id"** — You're pointing at a multi-effect library (like noisemaker) but didn't pass `effect_id`. Pass it explicitly: `compileEffect({ effect_id: "synth/noise" })`.

**Browser tools hang or timeout** — Make sure you ran `npm run setup` (installs Chromium) and `bash scripts/setup.sh` (vendors the noisemaker runtime). Without the runtime, the viewer page can't render anything.

**AI tools return "No API key"** — Set `ANTHROPIC_API_KEY` (preferred) or `OPENAI_API_KEY` in the env block of your MCP config, or create a `.anthropic` / `.openai` file in the project root containing just the key.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SHADE_EFFECTS_DIR` | Yes | `./effects` | Path to effects directory |
| `SHADE_PROJECT_ROOT` | No | cwd | Project root for AI key lookup |
| `SHADE_VIEWER_PORT` | No | `4173` | HTTP server port |
| `SHADE_BACKEND` | No | `webgl2` | Default backend (`webgl2` or `webgpu`) |
| `ANTHROPIC_API_KEY` | No | — | For AI-powered tools |
| `OPENAI_API_KEY` | No | — | Fallback AI provider |
