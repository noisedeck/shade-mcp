# shade-mcp as Shared Library

## Goal

Restructure shade-mcp so its harness, format parsing, and AI modules are importable as a library. Rewrite py-noisemaker's test harness to consume shade-mcp instead of maintaining duplicate code. Eventually deprecate py-noisemaker's standalone harness.

## Export Surface

Three importable entry points alongside the existing MCP server binary:

- **`shade-mcp/harness`** — `BrowserSession`, `acquireServer`, `releaseServer`, `getServerUrl`, `computeImageMetrics`
- **`shade-mcp/formats`** — `loadEffectDefinition`, types (`EffectDefinition`, `EffectUniform`, `EffectPass`)
- **`shade-mcp/ai`** — `getAIProvider`, `callAI`

## Globals Abstraction

`BrowserSession` accepts a configurable globals map so it works with any viewer:

```typescript
interface BrowserSessionOptions {
  // ... existing options ...
  globals?: {
    canvasRenderer: string    // default: '__shadeCanvasRenderer'
    renderingPipeline: string // default: '__shadeRenderingPipeline'
    currentBackend: string    // default: '__shadeCurrentBackend'
    currentEffect: string     // default: '__shadeCurrentEffect'
    setPaused: string         // default: '__shadeSetPaused'
    setPausedTime: string     // default: '__shadeSetPausedTime'
    frameCount: string        // default: '__shadeFrameCount'
  }
}
```

shade-mcp's MCP tools use defaults. py-noisemaker passes `__noisemaker*` names.

## Build Changes

Switch tsup from single-entry to multi-entry build:

```typescript
entry: {
  'index': 'src/index.ts',
  'harness/index': 'src/harness/index.ts',
  'formats/index': 'src/formats/index.ts',
  'ai/provider': 'src/ai/provider.ts',
}
```

Add `"exports"` field to package.json mapping subpaths to dist outputs. Main entry stays as MCP server binary with shebang.

## py-noisemaker Integration

- Link shade-mcp via `"shade-mcp": "file:../shade-mcp"` in package.json
- Delete `core-operations.js` (duplicated logic)
- Delete `browser-harness.js` `BrowserSession` class
- Rewrite `test-harness.js` as thin orchestration: CLI parsing, effect discovery, exemption sets, result reporting. All browser/analysis work delegates to shade-mcp imports.
- Viewer and serve.js stay unchanged (keep `__noisemaker*` globals)
