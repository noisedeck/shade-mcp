# Setting Up shade-mcp for Your Project

shade-mcp replaces the built-in MCP servers in **noisemaker** and **portable**. This guide walks through setup for each project in VS Code and Claude Code.

Paths below are written as `/path/to/<project>`. Substitute your own checkout
locations; MCP clients do not expand `~`, so use absolute paths.

## Prerequisites

Node.js 22 or newer. Build shade-mcp once, from the shade-mcp directory:

```bash
cd /path/to/shade-mcp
npm install                # installs dependencies and builds dist/
npm run setup              # install Playwright Chromium (browser tools only)
```

Verify it built:

```bash
ls dist/index.js  # should exist
```

## The viewer

The eight browser tools need a viewer page that hosts the renderer. shade-mcp
does not bundle one, so each project points `SHADE_VIEWER_ROOT` at its own and
sets `SHADE_GLOBALS_PREFIX` to match the window globals that viewer exposes.
Both are included in the configs below. The analysis, knowledge, and utility
tools read from disk and work without a viewer.

## noisemaker

Effects live at `noisemaker/shaders/effects/` in nested `namespace/effect/` layout, and the demo viewer at `noisemaker/demo/shaders/`.

### VS Code (Copilot)

Create or edit `noisemaker/.vscode/mcp.json`:

```json
{
  "servers": {
    "shade": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/noisemaker/shaders/effects",
        "SHADE_PROJECT_ROOT": "/path/to/noisemaker",
        "SHADE_VIEWER_ROOT": "/path/to/noisemaker/demo/shaders",
        "SHADE_GLOBALS_PREFIX": "__noisemaker"
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
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/noisemaker/shaders/effects",
        "SHADE_PROJECT_ROOT": "/path/to/noisemaker",
        "SHADE_VIEWER_ROOT": "/path/to/noisemaker/demo/shaders",
        "SHADE_GLOBALS_PREFIX": "__noisemaker"
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

The effect lives at `portable/effect/` in a flat layout (no namespace nesting). shade-mcp auto-detects this. The viewer lives at `portable/viewer/`.

### VS Code (Copilot)

Create or edit `portable/.vscode/mcp.json`:

```json
{
  "servers": {
    "shade": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/portable/effect",
        "SHADE_PROJECT_ROOT": "/path/to/portable",
        "SHADE_VIEWER_ROOT": "/path/to/portable/viewer",
        "SHADE_GLOBALS_PREFIX": "__portable"
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
      "args": ["/path/to/shade-mcp/dist/index.js"],
      "env": {
        "SHADE_EFFECTS_DIR": "/path/to/portable/effect",
        "SHADE_PROJECT_ROOT": "/path/to/portable",
        "SHADE_VIEWER_ROOT": "/path/to/portable/viewer",
        "SHADE_GLOBALS_PREFIX": "__portable"
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

**"Invalid effect id"** — Effect IDs are resolved inside `SHADE_EFFECTS_DIR`; absolute paths and `..` segments are refused. Pass a plain `namespace/effect` ID.

**Browser tools hang or time out** — Check three things: `npm run setup` has installed Chromium; `SHADE_VIEWER_ROOT` points at a directory containing the viewer's `index.html`; and `SHADE_GLOBALS_PREFIX` matches the globals that viewer exposes. A prefix mismatch means the renderer global never appears and setup waits for it.

**I want to watch the render happen** — Set `SHADE_HEADLESS=0` to run headed. The default is headless, which is also the only mode that works on a machine with no display.

**AI tools return "No API key"** — Set `ANTHROPIC_API_KEY` (preferred) or `OPENAI_API_KEY` in the env block of your MCP config, or create a `.anthropic` / `.openai` file in the project root containing just the key.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SHADE_EFFECTS_DIR` | Yes | `<project root>/effects` | Path to effects directory |
| `SHADE_PROJECT_ROOT` | No | cwd | Project root for relative paths and AI key lookup |
| `SHADE_VIEWER_ROOT` | Browser tools | `<project root>/viewer` | Directory served as the viewer |
| `SHADE_GLOBALS_PREFIX` | Browser tools | `__shade` | Prefix of the viewer's window globals |
| `SHADE_VIEWER_PATH` | No | `/` | Path within the viewer to open |
| `SHADE_VIEWER_PORT` | No | `0` (OS-assigned) | HTTP server port |
| `SHADE_BACKEND` | No | `webgl2` | Default backend (`webgl2` or `webgpu`) |
| `SHADE_MAX_BROWSERS` | No | `1` | Concurrent browser sessions |
| `SHADE_HEADLESS` | No | `1` (headless) | Set to `0` to watch the browser window |
| `ANTHROPIC_API_KEY` | No | — | For AI-powered tools |
| `OPENAI_API_KEY` | No | — | Fallback AI provider |

The viewer server binds to `127.0.0.1` and serves only `SHADE_VIEWER_ROOT` and
`SHADE_EFFECTS_DIR`. Point `SHADE_VIEWER_ROOT` at the viewer directory itself
rather than a whole workspace, so unrelated files are never in scope.
