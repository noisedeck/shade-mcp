# Portable Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace portable's local MCP server code (browser-harness.js, core-operations.js, server.js) with shade-mcp library imports, making portable a thin consumer of shade-mcp.

**Architecture:** Portable's server.js becomes a thin MCP server that imports tool functions from `shade-mcp/harness` and `shade-mcp/analysis`, creates BrowserSession instances with portable-specific `__portable*` globals, and delegates all work to shade-mcp. A new `resolveEffectDir` helper in shade-mcp handles the flat single-effect layout (effectsDir IS the effect directory).

**Tech Stack:** shade-mcp (TypeScript library), portable (JavaScript ESM), `@modelcontextprotocol/sdk`

---

### Task 1: Add `resolveEffectDir` helper for flat layout support

shade-mcp's analysis tools do `join(config.effectsDir, ...effectId.split('/'))` to find an effect directory. When `effectsDir` itself IS the effect (flat layout, e.g., portable's `./effect/`), `resolveEffectIds` returns the directory basename as the effectId. This causes a double-path: `join('/path/to/effect', 'effect')` → `/path/to/effect/effect` which doesn't exist.

**Files:**
- Modify: `src/tools/resolve-effects.ts`

**Step 1: Add the helper function**

Add to `src/tools/resolve-effects.ts`, after the existing imports:

```typescript
export function resolveEffectDir(effectId: string, effectsDir: string): string {
  // Flat layout: effectsDir itself is the effect
  const dirName = basename(effectsDir) || 'effect'
  if (effectId === dirName &&
    (existsSync(join(effectsDir, 'definition.json')) || existsSync(join(effectsDir, 'definition.js')))) {
    return effectsDir
  }
  return join(effectsDir, ...effectId.split('/'))
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: clean build

**Step 3: Commit**

```bash
git add src/tools/resolve-effects.ts
git commit -m "feat: add resolveEffectDir helper for flat layout support"
```

---

### Task 2: Update analysis tools to use `resolveEffectDir`

Replace all `join(config.effectsDir, ...effectId.split('/'))` calls in analysis and knowledge tools with `resolveEffectDir`.

**Files:**
- Modify: `src/tools/analysis/structure.ts` (line 18)
- Modify: `src/tools/analysis/alg-equiv.ts` (line 17)
- Modify: `src/tools/analysis/branching.ts` (line 18)
- Modify: `src/tools/analysis/compare.ts` (line 49)
- Modify: `src/tools/knowledge/analyze-effect.ts` (line 19)

In each file:
1. Add import: `import { resolveEffectDir } from '../resolve-effects.js'`
2. Replace `join(config.effectsDir, ...effectId.split('/'))` with `resolveEffectDir(effectId, config.effectsDir)`
3. Remove unused `join` import if it was only used for that purpose

**Step 1: Update all five files**

For structure.ts:
```typescript
import { resolveEffectDir } from '../resolve-effects.js'
// ...
const effectDir = resolveEffectDir(effectId, config.effectsDir)
```

Same pattern for alg-equiv.ts, branching.ts, compare.ts, analyze-effect.ts.

**Step 2: Build and test**

Run: `npm run build && npm test`
Expected: clean build, all 58 tests pass

**Step 3: Commit**

```bash
git add src/tools/analysis/ src/tools/knowledge/analyze-effect.ts
git commit -m "feat: use resolveEffectDir in analysis/knowledge tools for flat layout support"
```

---

### Task 3: Export `resolveEffectDir` from harness barrel

**Files:**
- Modify: `src/harness/index.ts` (line 26)

**Step 1: Add export**

Change the utilities export line from:
```typescript
export { resolveEffectIds, matchEffects } from '../tools/resolve-effects.js'
```
to:
```typescript
export { resolveEffectIds, resolveEffectDir, matchEffects } from '../tools/resolve-effects.js'
```

**Step 2: Build and test**

Run: `npm run build && npm test`
Expected: clean build, all tests pass, `resolveEffectDir` visible in `dist/harness/index.d.ts`

**Step 3: Commit**

```bash
git add src/harness/index.ts
git commit -m "feat: export resolveEffectDir from harness barrel"
```

---

### Task 4: Add shade-mcp dependency to portable

**Files:**
- Modify: `../portable/mcp/package.json`

**Step 1: Add dependency**

Add to the `dependencies` section:
```json
"shade-mcp": "file:../../shade-mcp"
```

**Step 2: Install**

Run: `cd ../portable/mcp && npm install`

**Step 3: Commit (in portable repo)**

```bash
cd ../portable
git add mcp/package.json mcp/package-lock.json
git commit -m "feat: add shade-mcp as library dependency"
```

---

### Task 5: Rewrite portable's server.js

Replace portable's server.js with a thin wrapper that imports everything from shade-mcp. The new server.js:
- Sets `SHADE_EFFECTS_DIR` and `SHADE_PROJECT_ROOT` env vars
- Defines `PORTABLE_GLOBALS` with `__portable*` window global names
- Imports tool functions from `shade-mcp/harness`
- Imports AI-dependent analysis functions from `shade-mcp/analysis`
- Imports on-disk analysis functions from `shade-mcp/harness` (checkEffectStructure) and `shade-mcp/analysis` (checkAlgEquiv, analyzeBranching)
- Imports `compareShaders` from shade-mcp
- Registers each tool with McpServer, creating BrowserSession with portable globals per invocation

**Files:**
- Rewrite: `../portable/mcp/server.js`

**Step 1: Write the new server.js**

```javascript
#!/usr/bin/env node
/**
 * MCP Server for Portable Effect Testing
 *
 * Thin wrapper around shade-mcp library. All testing logic lives in shade-mcp;
 * this server configures it for portable's single-effect layout and __portable* globals.
 */

import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

// Configure shade-mcp for portable's layout
process.env.SHADE_EFFECTS_DIR = path.join(PROJECT_ROOT, 'effect')
process.env.SHADE_PROJECT_ROOT = PROJECT_ROOT
process.env.SHADE_VIEWER_ROOT = PROJECT_ROOT

// Import shade-mcp after setting env vars
const {
    BrowserSession,
    compileEffect,
    renderEffectFrame,
    benchmarkEffectFPS,
    testUniformResponsiveness,
    testNoPassthrough,
    testPixelParity,
    checkEffectStructure,
    resolveEffectIds,
} = await import('shade-mcp/harness')

const {
    checkAlgEquiv,
    analyzeBranching,
    describeEffectFrame,
} = await import('shade-mcp/analysis')

const { compareShaders } = await import('shade-mcp/harness')

const PORTABLE_GLOBALS = {
    canvasRenderer: '__portableCanvasRenderer',
    renderingPipeline: '__portableRenderingPipeline',
    currentBackend: '__portableCurrentBackend',
    currentEffect: '__portableCurrentEffect',
    setPaused: '__portableSetPaused',
    setPausedTime: '__portableSetPausedTime',
    frameCount: '__portableFrameCount',
}

const GRACE_PERIOD_MS = 125
function gracePeriod() {
    return new Promise(resolve => setTimeout(resolve, GRACE_PERIOD_MS))
}

// =========================================================================
// MCP Server
// =========================================================================

const server = new Server(
    { name: 'portable-shader-tools', version: '2.0.0' },
    { capabilities: { tools: {} } }
)

const TOOLS = [
    {
        name: 'compileEffect',
        description: 'Compile the portable effect and verify it compiles cleanly. Returns detailed pass-level diagnostics.',
        inputSchema: {
            type: 'object',
            properties: {
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Rendering backend (required)' }
            },
            required: ['backend']
        }
    },
    {
        name: 'renderEffectFrame',
        description: 'Render a single frame of the portable effect and analyze output. Returns image metrics.',
        inputSchema: {
            type: 'object',
            properties: {
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Rendering backend (required)' },
                test_case: {
                    type: 'object',
                    description: 'Optional test configuration',
                    properties: {
                        time: { type: 'number', description: 'Time value to render at' },
                        resolution: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: 'Resolution [width, height]' },
                        uniforms: { type: 'object', additionalProperties: true, description: 'Uniform overrides' }
                    }
                }
            },
            required: ['backend']
        }
    },
    {
        name: 'describeEffectFrame',
        description: 'Render a frame and get an AI vision description of the output.',
        inputSchema: {
            type: 'object',
            properties: {
                prompt: { type: 'string', description: 'Vision prompt - what to analyze' },
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Rendering backend (required)' },
            },
            required: ['prompt', 'backend']
        }
    },
    {
        name: 'benchmarkEffectFPS',
        description: 'Benchmark the portable effect to verify it can sustain a target framerate.',
        inputSchema: {
            type: 'object',
            properties: {
                target_fps: { type: 'number', default: 60, description: 'Target FPS' },
                duration_seconds: { type: 'number', default: 5, description: 'Duration in seconds' },
                resolution: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: 'Resolution [width, height]' },
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Rendering backend (required)' }
            },
            required: ['target_fps', 'backend']
        }
    },
    {
        name: 'testUniformResponsiveness',
        description: 'Test that uniform controls affect shader output.',
        inputSchema: {
            type: 'object',
            properties: {
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Rendering backend (required)' }
            },
            required: ['backend']
        }
    },
    {
        name: 'testNoPassthrough',
        description: 'Test that filter effect does NOT pass through input unchanged.',
        inputSchema: {
            type: 'object',
            properties: {
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Rendering backend (required)' }
            },
            required: ['backend']
        }
    },
    {
        name: 'testPixelParity',
        description: 'Test pixel-for-pixel parity between GLSL and WGSL shader outputs.',
        inputSchema: {
            type: 'object',
            properties: {
                epsilon: { type: 'number', default: 1, description: 'Max per-channel difference (0-255)' },
                seed: { type: 'number', default: 42, description: 'Random seed for reproducible noise' }
            },
            required: []
        }
    },
    {
        name: 'checkEffectStructure',
        description: 'Check effect structure on disk for unused files, naming issues.',
        inputSchema: {
            type: 'object',
            properties: {
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Backend to check' }
            },
            required: ['backend']
        }
    },
    {
        name: 'checkAlgEquiv',
        description: 'Check GLSL/WGSL algorithmic equivalence using AI.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'compareShaders',
        description: 'Compare GLSL and WGSL shader sources structurally.',
        inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'analyzeBranching',
        description: 'Analyze shader code for unnecessary branching.',
        inputSchema: {
            type: 'object',
            properties: {
                backend: { type: 'string', enum: ['webgl2', 'webgpu'], description: 'Which shader language (required)' }
            },
            required: ['backend']
        }
    }
]

/**
 * Create a BrowserSession with portable globals.
 */
function createSession(backend) {
    return new BrowserSession({
        backend,
        headless: true,
        globals: PORTABLE_GLOBALS,
        viewerRoot: PROJECT_ROOT,
        viewerPath: '/viewer/index.html',
        effectsDir: path.join(PROJECT_ROOT, 'effect'),
    })
}

/**
 * Run a browser-based test with session lifecycle.
 */
async function runBrowserTest(backend, testFn) {
    const session = createSession(backend)
    try {
        await session.setup()
        const result = await testFn(session)
        await gracePeriod()
        return { backend, result }
    } finally {
        await session.teardown()
    }
}

/**
 * Get the auto-detected effectId for the single effect.
 */
function getEffectId() {
    const ids = resolveEffectIds({}, path.join(PROJECT_ROOT, 'effect'))
    return ids[0]
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
        let result
        const effectId = getEffectId()

        switch (name) {
            case 'compileEffect': {
                result = await runBrowserTest(args.backend, async (session) => {
                    return await compileEffect(session, effectId)
                })
                break
            }

            case 'renderEffectFrame': {
                const tc = args.test_case || {}
                result = await runBrowserTest(args.backend, async (session) => {
                    return await renderEffectFrame(session, effectId, {
                        time: tc.time,
                        resolution: tc.resolution,
                        uniforms: tc.uniforms,
                    })
                })
                break
            }

            case 'describeEffectFrame': {
                result = await runBrowserTest(args.backend, async (session) => {
                    return await describeEffectFrame(session, effectId, args.prompt)
                })
                break
            }

            case 'benchmarkEffectFPS': {
                result = await runBrowserTest(args.backend, async (session) => {
                    return await benchmarkEffectFPS(session, effectId, {
                        targetFps: args.target_fps,
                        durationSeconds: args.duration_seconds,
                        resolution: args.resolution,
                    })
                })
                break
            }

            case 'testUniformResponsiveness': {
                result = await runBrowserTest(args.backend, async (session) => {
                    return await testUniformResponsiveness(session, effectId)
                })
                break
            }

            case 'testNoPassthrough': {
                result = await runBrowserTest(args.backend, async (session) => {
                    return await testNoPassthrough(session, effectId)
                })
                break
            }

            case 'testPixelParity': {
                const session = createSession('webgl2')
                try {
                    await session.setup()
                    result = {
                        epsilon: args.epsilon ?? 1,
                        seed: args.seed ?? 42,
                        result: await testPixelParity(session, effectId, {
                            epsilon: args.epsilon,
                            seed: args.seed,
                        })
                    }
                } finally {
                    await session.teardown()
                }
                break
            }

            case 'checkEffectStructure': {
                result = {
                    backend: args.backend,
                    result: await checkEffectStructure(effectId)
                }
                break
            }

            case 'checkAlgEquiv': {
                result = { result: await checkAlgEquiv(effectId) }
                break
            }

            case 'compareShaders': {
                result = { result: await compareShaders(effectId) }
                break
            }

            case 'analyzeBranching': {
                result = {
                    backend: args.backend,
                    result: await analyzeBranching(effectId, args.backend)
                }
                break
            }

            default:
                throw new Error(`Unknown tool: ${name}`)
        }

        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }

    } catch (error) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: error.message || String(error) }, null, 2) }],
            isError: true
        }
    }
})

async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('Portable Shader Tools MCP server v2.0.0 running on stdio (powered by shade-mcp)')
}

main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})
```

**Step 2: Verify server starts**

Run: `cd ../portable/mcp && node server.js 2>&1 | head -1`
Expected: `Portable Shader Tools MCP server v2.0.0 running on stdio (powered by shade-mcp)`

Note: The server will hang waiting for stdio input. Kill with Ctrl+C after checking the startup message.

**Step 3: Commit (in portable repo)**

```bash
cd ../portable
git add mcp/server.js
git commit -m "feat: rewrite server.js to use shade-mcp library imports"
```

---

### Task 6: Export `compareShaders` from harness barrel

`compareShaders` is currently only exported via the analysis tools' register function. The standalone `compareShaders(effectId)` function needs to be importable from `shade-mcp/harness` for portable to use it without AI dependencies.

**Files:**
- Modify: `src/harness/index.ts`

**Step 1: Add export**

Add to the analysis operations section:
```typescript
export { compareShaders } from '../tools/analysis/compare.js'
```

**Step 2: Build and test**

Run: `npm run build && npm test`
Expected: clean build, all tests pass

**Step 3: Commit**

```bash
git add src/harness/index.ts
git commit -m "feat: export compareShaders from harness barrel"
```

---

### Task 7: Delete portable's local harness files

**Files:**
- Delete: `../portable/mcp/browser-harness.js`
- Delete: `../portable/mcp/core-operations.js`

**Step 1: Delete files**

```bash
cd ../portable
rm mcp/browser-harness.js mcp/core-operations.js
```

**Step 2: Verify server still starts**

Run: `cd ../portable/mcp && timeout 3 node server.js 2>&1 || true`
Expected: startup message, no import errors

**Step 3: Commit (in portable repo)**

```bash
cd ../portable
git add -u mcp/
git commit -m "chore: remove local harness code, now using shade-mcp library"
```

---

### Task 8: Smoke test the MCP server

Run a quick manual verification that the MCP tools respond correctly. Use `echo` to send a JSON-RPC request to the server's stdin.

**Step 1: Test tool listing**

```bash
cd ../portable/mcp
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"capabilities":{},"clientInfo":{"name":"test","version":"1.0"},"protocolVersion":"2024-11-05"}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | timeout 5 node server.js 2>/dev/null | head -5
```

Expected: JSON response listing 11 tools

**Step 2: Verify**

Check the output contains tool names like `compileEffect`, `renderEffectFrame`, etc.
