# shade-mcp Shared Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make shade-mcp importable as a library so py-noisemaker's test harness can consume it directly, then rewrite py-noisemaker's test-harness.js to use shade-mcp imports.

**Architecture:** Multi-entry tsup build with package.json exports. BrowserSession gains configurable globals for viewer compatibility. Tool functions (compile, render, benchmark, etc.) are already exported separately from MCP registration — we surface them through barrel exports.

**Tech Stack:** TypeScript, tsup (multi-entry ESM), Playwright, vitest

---

### Task 1: Add globals config to BrowserSession types

**Files:**
- Modify: `src/harness/types.ts`

**Step 1: Write the failing test**

Create test file:

```typescript
// tests/harness/browser-session.test.ts
import { describe, it, expect } from 'vitest'
import type { BrowserSessionOptions, ViewerGlobals } from '../../src/harness/types.js'

describe('BrowserSessionOptions', () => {
  it('accepts globals override', () => {
    const opts: BrowserSessionOptions = {
      backend: 'webgl2',
      globals: {
        canvasRenderer: '__noisemakerCanvasRenderer',
        renderingPipeline: '__noisemakerRenderingPipeline',
        currentBackend: '__noisemakerCurrentBackend',
        currentEffect: '__noisemakerCurrentEffect',
        setPaused: '__noisemakerSetPaused',
        setPausedTime: '__noisemakerSetPausedTime',
        frameCount: '__noisemakerFrameCount',
      }
    }
    expect(opts.globals?.canvasRenderer).toBe('__noisemakerCanvasRenderer')
  })

  it('globals are optional', () => {
    const opts: BrowserSessionOptions = { backend: 'webgl2' }
    expect(opts.globals).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness/browser-session.test.ts`
Expected: FAIL — `ViewerGlobals` type not found

**Step 3: Add ViewerGlobals type and update BrowserSessionOptions**

In `src/harness/types.ts`, add:

```typescript
export interface ViewerGlobals {
  canvasRenderer: string
  renderingPipeline: string
  currentBackend: string
  currentEffect: string
  setPaused: string
  setPausedTime: string
  frameCount: string
}

export const DEFAULT_GLOBALS: ViewerGlobals = {
  canvasRenderer: '__shadeCanvasRenderer',
  renderingPipeline: '__shadeRenderingPipeline',
  currentBackend: '__shadeCurrentBackend',
  currentEffect: '__shadeCurrentEffect',
  setPaused: '__shadeSetPaused',
  setPausedTime: '__shadeSetPausedTime',
  frameCount: '__shadeFrameCount',
}
```

Add `globals?: ViewerGlobals` to `BrowserSessionOptions`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness/browser-session.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/harness/browser-session.test.ts src/harness/types.ts
git commit -m "feat: add ViewerGlobals type to BrowserSessionOptions"
```

---

### Task 2: Update BrowserSession to use configurable globals

**Files:**
- Modify: `src/harness/browser-session.ts`

**Step 1: Write the failing test**

```typescript
// tests/harness/globals-config.test.ts
import { describe, it, expect } from 'vitest'
import { BrowserSession } from '../../src/harness/browser-session.js'
import { DEFAULT_GLOBALS } from '../../src/harness/types.js'

describe('BrowserSession globals', () => {
  it('uses default globals when none specified', () => {
    const session = new BrowserSession({ backend: 'webgl2' })
    expect(session.globals).toEqual(DEFAULT_GLOBALS)
  })

  it('uses custom globals when specified', () => {
    const custom = {
      canvasRenderer: '__nmRenderer',
      renderingPipeline: '__nmPipeline',
      currentBackend: '__nmBackend',
      currentEffect: '__nmEffect',
      setPaused: '__nmPaused',
      setPausedTime: '__nmPausedTime',
      frameCount: '__nmFrameCount',
    }
    const session = new BrowserSession({ backend: 'webgl2', globals: custom })
    expect(session.globals).toEqual(custom)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness/globals-config.test.ts`
Expected: FAIL — `session.globals` does not exist

**Step 3: Update BrowserSession constructor and expose globals**

In `src/harness/browser-session.ts`:

1. Import `ViewerGlobals`, `DEFAULT_GLOBALS` from `./types.js`
2. Add `public globals: ViewerGlobals` field
3. In constructor: `this.globals = opts.globals ?? DEFAULT_GLOBALS`
4. Replace all hardcoded `__shade*` references in `page.evaluate()` calls with `this.globals.*` passed as parameters:

Key changes in `setup()`:
```typescript
// Before:
await this.page.waitForFunction(
  () => !!(window as any).__shadeCanvasRenderer,
  { timeout: STATUS_TIMEOUT }
)

// After:
const g = this.globals
await this.page.waitForFunction(
  (rendererGlobal) => !!(window as any)[rendererGlobal],
  g.canvasRenderer,
  { timeout: STATUS_TIMEOUT }
)
```

Key changes in `setBackend()`:
```typescript
// Pass globals names into page.evaluate
await this.page!.evaluate(async ({ targetBackend, timeout, globals }) => {
  const w = window as any
  const current = typeof w[globals.currentBackend] === 'function'
    ? w[globals.currentBackend]()
    : 'glsl'
  // ... rest uses globals.currentBackend
}, { targetBackend, timeout: STATUS_TIMEOUT, globals: this.globals })
```

Similarly update `getEffectGlobals()` and `resetUniformsToDefaults()` to pass `this.globals` into `page.evaluate()`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness/globals-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/harness/browser-session.ts tests/harness/globals-config.test.ts
git commit -m "feat: BrowserSession uses configurable viewer globals"
```

---

### Task 3: Update browser tool functions to use session globals

**Files:**
- Modify: `src/tools/browser/compile.ts`
- Modify: `src/tools/browser/render.ts`
- Modify: `src/tools/browser/benchmark.ts`
- Modify: `src/tools/browser/uniforms.ts`
- Modify: `src/tools/browser/passthrough.ts`
- Modify: `src/tools/browser/parity.ts`

Every `page.evaluate()` call in these files that references `window.__shade*` must be updated to accept globals from `session.globals` and use dynamic property access. The pattern is:

```typescript
// Before:
const renderer = (window as any).__shadeCanvasRenderer

// After:
const renderer = (window as any)[globals.canvasRenderer]
```

Each function already takes `session: BrowserSession` as first arg, so access `session.globals` and pass it into `page.evaluate()`.

**Step 1: Update compile.ts**

In `compileEffect()`, the `page.evaluate()` at line 30 references `__shadeRenderingPipeline`. Pass `session.globals` and use `w[globals.renderingPipeline]`.

**Step 2: Update render.ts**

In `renderEffectFrame()`:
- Line 54: `__shadeFrameCount` → `w[globals.frameCount]`
- Line 66-67: `__shadeCanvasRenderer`, `__shadeRenderingPipeline` → use globals

**Step 3: Update benchmark.ts**

No `__shade*` references in `page.evaluate()` — only uses DOM elements. No changes needed.

**Step 4: Update uniforms.ts**

Lines 32-36: `__shadeSetPaused`, `__shadeSetPausedTime` → use globals
Lines 39-43: `__shadeRenderingPipeline`, `__shadeCurrentEffect`, `__shadeCanvasRenderer` → use globals

**Step 5: Update passthrough.ts**

Lines 33-39: `__shadeRenderingPipeline`, `__shadeCurrentEffect`, `__shadeCanvasRenderer` → use globals

**Step 6: Update parity.ts**

- `CAPTURE_PIXELS_FN` string: Replace hardcoded `__shadeCanvasRenderer` and `__shadeRenderingPipeline` with function parameters. Change `capturePixels()` to `capturePixels(globals)` and pass globals in.
- Lines 75-79: `__shadeSetPaused`, `__shadeSetPausedTime` → use globals
- Lines 90-101: Same pattern

**Step 7: Verify build succeeds**

Run: `npm run build`
Expected: Clean build with no errors

**Step 8: Commit**

```bash
git add src/tools/browser/
git commit -m "refactor: browser tools use configurable globals from session"
```

---

### Task 4: Create barrel exports for harness module

**Files:**
- Create: `src/harness/index.ts`

**Step 1: Write the failing test**

```typescript
// tests/harness/exports.test.ts
import { describe, it, expect } from 'vitest'

describe('harness barrel exports', () => {
  it('exports BrowserSession', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.BrowserSession).toBeDefined()
  })

  it('exports server manager functions', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.acquireServer).toBeDefined()
    expect(mod.releaseServer).toBeDefined()
    expect(mod.getServerUrl).toBeDefined()
  })

  it('exports computeImageMetrics', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.computeImageMetrics).toBeDefined()
  })

  it('exports types', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.DEFAULT_GLOBALS).toBeDefined()
  })

  it('exports browser operations', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.compileEffect).toBeDefined()
    expect(mod.renderEffectFrame).toBeDefined()
    expect(mod.benchmarkEffectFPS).toBeDefined()
    expect(mod.testNoPassthrough).toBeDefined()
    expect(mod.testPixelParity).toBeDefined()
    expect(mod.testUniformResponsiveness).toBeDefined()
  })

  it('exports analysis operations', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.checkEffectStructure).toBeDefined()
    expect(mod.checkAlgEquiv).toBeDefined()
    expect(mod.analyzeBranching).toBeDefined()
  })

  it('exports resolveEffectIds', async () => {
    const mod = await import('../../src/harness/index.js')
    expect(mod.resolveEffectIds).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/harness/exports.test.ts`
Expected: FAIL — module not found

**Step 3: Create src/harness/index.ts**

```typescript
// Harness core
export { BrowserSession } from './browser-session.js'
export { acquireServer, releaseServer, getServerUrl, getRefCount } from './server-manager.js'
export { computeImageMetrics } from './pixel-reader.js'

// Types
export type {
  BrowserSessionOptions, ViewerGlobals,
  ImageMetrics, CompileResult, RenderResult, BenchmarkResult, ParityResult
} from './types.js'
export { DEFAULT_GLOBALS } from './types.js'

// Browser operations
export { compileEffect } from '../tools/browser/compile.js'
export { renderEffectFrame } from '../tools/browser/render.js'
export { benchmarkEffectFPS } from '../tools/browser/benchmark.js'
export { testNoPassthrough } from '../tools/browser/passthrough.js'
export { testPixelParity } from '../tools/browser/parity.js'
export { testUniformResponsiveness } from '../tools/browser/uniforms.js'

// Analysis operations
export { checkEffectStructure } from '../tools/analysis/structure.js'
export { checkAlgEquiv } from '../tools/analysis/alg-equiv.js'
export { analyzeBranching } from '../tools/analysis/branching.js'

// Utilities
export { resolveEffectIds } from '../tools/resolve-effects.js'
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/harness/exports.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/harness/index.ts tests/harness/exports.test.ts
git commit -m "feat: add harness barrel exports for library consumption"
```

---

### Task 5: Switch tsup to multi-entry build

**Files:**
- Modify: `tsup.config.ts`

**Step 1: Update tsup config**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'harness/index': 'src/harness/index.ts',
    'formats/index': 'src/formats/index.ts',
    'ai/provider': 'src/ai/provider.ts',
  },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
  banner(ctx) {
    // Only add shebang to the MCP server entry point
    if (ctx.format === 'esm') {
      return {}
    }
    return {}
  },
})
```

Note: The shebang must only be on `dist/index.js`, not on library entry points. tsup's `banner` applies to all entries, so we need a different approach. Use `esbuildOptions` or a post-build script to add the shebang only to index.js. Simplest: remove `banner` from tsup config and add shebang via a build script.

Update `package.json` scripts:
```json
"build": "tsup && node -e \"const fs=require('fs');const f='dist/index.js';fs.writeFileSync(f,'#!/usr/bin/env node\\n'+fs.readFileSync(f,'utf8'))\""
```

Or simpler: use tsup's `onSuccess` option.

**Step 2: Build and verify output**

Run: `npm run build`
Expected: `dist/` contains `index.js`, `harness/index.js`, `formats/index.js`, `ai/provider.js` with `.d.ts` files

**Step 3: Verify shebang only on index.js**

Run: `head -1 dist/index.js` → should show `#!/usr/bin/env node`
Run: `head -1 dist/harness/index.js` → should NOT show shebang

**Step 4: Commit**

```bash
git add tsup.config.ts package.json
git commit -m "build: multi-entry tsup for library + MCP server"
```

---

### Task 6: Add package.json exports field

**Files:**
- Modify: `package.json`

**Step 1: Add exports**

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./harness": {
      "import": "./dist/harness/index.js",
      "types": "./dist/harness/index.d.ts"
    },
    "./formats": {
      "import": "./dist/formats/index.js",
      "types": "./dist/formats/index.d.ts"
    },
    "./ai": {
      "import": "./dist/ai/provider.js",
      "types": "./dist/ai/provider.d.ts"
    }
  }
}
```

**Step 2: Build and verify imports work**

Run: `npm run build`

Then test with a quick script:
```bash
node -e "import('file:///$(pwd)/dist/harness/index.js').then(m => console.log(Object.keys(m).join(', '))).catch(e => console.error(e))"
```

Expected: Lists all exported names

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add package.json exports for harness, formats, ai"
```

---

### Task 7: Add matchEffects glob utility

py-noisemaker's test harness uses glob patterns like `synth/*`, `classicNoisemaker/*` to match effects. shade-mcp's `resolveEffectIds` doesn't support globs — it just scans directories. Add a `matchEffects` utility.

**Files:**
- Modify: `src/tools/resolve-effects.ts`

**Step 1: Write the failing test**

```typescript
// tests/utils/match-effects.test.ts
import { describe, it, expect } from 'vitest'
import { matchEffects } from '../../src/tools/resolve-effects.js'

describe('matchEffects', () => {
  const allEffects = [
    'synth/noise', 'synth/plasma', 'synth/warp',
    'filter/blur', 'filter/edge',
    'classicNoisemaker/worms',
  ]

  it('matches exact effect ID', () => {
    expect(matchEffects(allEffects, 'synth/noise')).toEqual(['synth/noise'])
  })

  it('matches namespace wildcard', () => {
    expect(matchEffects(allEffects, 'synth/*')).toEqual(['synth/noise', 'synth/plasma', 'synth/warp'])
  })

  it('matches all with */*', () => {
    expect(matchEffects(allEffects, '*/*')).toEqual(allEffects)
  })

  it('returns empty for no match', () => {
    expect(matchEffects(allEffects, 'nonexistent/*')).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/utils/match-effects.test.ts`
Expected: FAIL — `matchEffects` not exported

**Step 3: Add matchEffects to resolve-effects.ts**

```typescript
export function matchEffects(allEffects: string[], pattern: string): string[] {
  if (!pattern.includes('*')) {
    return allEffects.filter(e => e === pattern)
  }
  const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]+') + '$')
  return allEffects.filter(e => regex.test(e))
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/utils/match-effects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/resolve-effects.ts tests/utils/match-effects.test.ts
git commit -m "feat: add matchEffects glob utility for effect pattern matching"
```

---

### Task 8: Verify full build and run all tests

**Step 1: Build**

Run: `npm run build`
Expected: Clean build, all entry points present

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Verify dist structure**

```
dist/
  index.js          (MCP server with shebang)
  index.d.ts
  harness/
    index.js         (library exports)
    index.d.ts
  formats/
    index.js
    index.d.ts
  ai/
    provider.js
    provider.d.ts
```

**Step 4: Commit if any fixes needed**

---

### Task 9: Link shade-mcp into py-noisemaker

**Files:**
- Modify: `/Users/aayars/source/py-noisemaker/package.json`

**Step 1: Add shade-mcp dependency**

In py-noisemaker's package.json, add:
```json
"dependencies": {
  "shade-mcp": "file:../shade-mcp"
}
```

**Step 2: Install**

Run: `cd /Users/aayars/source/py-noisemaker && npm install`

**Step 3: Verify import works**

```bash
cd /Users/aayars/source/py-noisemaker
node -e "import('shade-mcp/harness').then(m => console.log('OK:', Object.keys(m).length, 'exports')).catch(e => console.error(e))"
```

Expected: `OK: N exports`

**Step 4: Commit**

```bash
cd /Users/aayars/source/py-noisemaker
git add package.json package-lock.json
git commit -m "deps: add shade-mcp as local dependency"
```

---

### Task 10: Rewrite py-noisemaker test-harness.js to use shade-mcp

**Files:**
- Modify: `/Users/aayars/source/py-noisemaker/shaders/mcp/test-harness.js`

This is the largest task. The test harness keeps its CLI parsing, effect discovery, exemption sets, and reporting logic. It replaces all imports from `browser-harness.js` and `core-operations.js` with shade-mcp imports.

**Step 1: Update imports**

Replace:
```javascript
import { BrowserSession, checkEffectStructureOnDisk, checkAlgEquivOnDisk, analyzeBranchingOnDisk, matchEffects, gracePeriod } from './browser-harness.js'
import { getAIProvider } from './core-operations.js'
```

With:
```javascript
import {
  BrowserSession,
  compileEffect, renderEffectFrame, benchmarkEffectFPS,
  testNoPassthrough, testPixelParity, testUniformResponsiveness,
  checkEffectStructure, checkAlgEquiv, analyzeBranching,
  matchEffects, resolveEffectIds,
  DEFAULT_GLOBALS,
} from 'shade-mcp/harness'
import { getAIProvider } from 'shade-mcp/ai'
```

**Step 2: Configure BrowserSession with noisemaker globals**

```javascript
const NOISEMAKER_GLOBALS = {
  canvasRenderer: '__noisemakerCanvasRenderer',
  renderingPipeline: '__noisemakerRenderingPipeline',
  currentBackend: '__noisemakerCurrentBackend',
  currentEffect: '__noisemakerCurrentEffect',
  setPaused: '__noisemakerSetPaused',
  setPausedTime: '__noisemakerSetPausedTime',
  frameCount: '__noisemakerFrameCount',
}

const session = new BrowserSession({
  backend: args.backend,
  headless: !needsHeaded,
  globals: NOISEMAKER_GLOBALS,
  viewerRoot: path.join(PROJECT_ROOT, 'shaders'),
  effectsDir: path.join(PROJECT_ROOT, 'shaders', 'effects'),
  viewerPort: 3000,
})
```

**Step 3: Replace session method calls with imported functions**

The old harness called methods on `session` (e.g., `session.compileEffect(effectId)`). The new approach calls standalone functions that take `session` as first arg:

```javascript
// Old:
const compileResult = await session.compileEffect(effectId)
const renderResult = await session.renderEffectFrame(effectId, { skipCompile: true })

// New:
const compileResult = await compileEffect(session, effectId)
const renderResult = await renderEffectFrame(session, effectId, { warmupFrames: 10 })
```

Apply this pattern throughout `testEffect()`:
- `session.compileEffect(id)` → `compileEffect(session, id)`
- `session.renderEffectFrame(id, opts)` → `renderEffectFrame(session, id, opts)`
- `session.benchmarkEffectFps(id, opts)` → `benchmarkEffectFPS(session, id, opts)`
- `session.testUniformResponsiveness(id, opts)` → `testUniformResponsiveness(session, id)`
- `session.testNoPassthrough(id, opts)` → `testNoPassthrough(session, id)`
- `session.testPixelParity(id, opts)` → `testPixelParity(session, id, opts)`
- `session.describeEffectFrame(id, prompt, opts)` → (handle separately, may not be needed initially)

**Step 4: Replace filesystem-based test calls**

```javascript
// Old:
const structureResult = await checkEffectStructureOnDisk(effectId, { backend })

// New:
const structureResult = await checkEffectStructure(effectId)
```

Similarly for `checkAlgEquivOnDisk` → `checkAlgEquiv` and `analyzeBranchingOnDisk` → `analyzeBranching`.

Note: shade-mcp's analysis functions use `getConfig()` to find effectsDir. We need to ensure `SHADE_EFFECTS_DIR` is set in the environment, or adapt these functions. Set env var before importing:

```javascript
process.env.SHADE_EFFECTS_DIR = path.join(PROJECT_ROOT, 'shaders', 'effects')
process.env.SHADE_PROJECT_ROOT = PROJECT_ROOT
```

**Step 5: Replace effect discovery**

```javascript
// Old:
const allEffects = await session.listEffects()

// New (filesystem scan):
function discoverEffects(effectsDir) {
  // Keep existing discoverEffectsFromDisk function
}
```

Or use shade-mcp's `resolveEffectIds` for auto-discovery if appropriate.

**Step 6: Handle API differences**

shade-mcp's function signatures differ slightly from py-noisemaker's:
- `renderEffectFrame` returns `RenderResult` with `metrics` field (same structure)
- `compileEffect` returns `CompileResult` with `status`, `passes`, `message`
- `benchmarkEffectFPS` returns `BenchmarkResult` with `achieved_fps`, `meets_target`, `stats`

Map the results to match the existing pass/fail logic. The field names are close enough that most logic works as-is.

**Step 7: Add gracePeriod helper**

```javascript
function gracePeriod(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

**Step 8: Test with a single effect**

Run: `cd /Users/aayars/source/py-noisemaker && node shaders/mcp/test-harness.js --effects synth/noise --backend webgl2`

Expected: Effect compiles and renders, test passes

**Step 9: Test with full corpus**

Run: `cd /Users/aayars/source/py-noisemaker && node shaders/mcp/test-harness.js --effects "*/*" --backend webgl2 --structure`

Expected: Same pass/fail results as the old harness

**Step 10: Commit**

```bash
cd /Users/aayars/source/py-noisemaker
git add shaders/mcp/test-harness.js
git commit -m "refactor: test harness consumes shade-mcp library instead of local browser-harness"
```

---

### Task 11: Clean up deprecated py-noisemaker files

After validating Task 10 works end-to-end:

**Step 1: Verify no other files import from browser-harness.js or core-operations.js**

Check all imports in `/Users/aayars/source/py-noisemaker/shaders/mcp/`.

**Step 2: Delete or deprecate old files**

If nothing else imports them, mark `browser-harness.js` and `core-operations.js` for deletion (or add deprecation notice). Don't delete yet if other scripts reference them.

**Step 3: Commit**

```bash
cd /Users/aayars/source/py-noisemaker
git add -A shaders/mcp/
git commit -m "cleanup: deprecate browser-harness.js and core-operations.js (replaced by shade-mcp)"
```
