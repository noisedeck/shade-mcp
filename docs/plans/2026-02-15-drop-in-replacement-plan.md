# Drop-in MCP Replacement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make shade-mcp a drop-in replacement for the MCP servers in py-noisemaker and portable by adding a custom HTTP server, batch effect parameters, and single-effect auto-detection.

**Architecture:** Replace the `npx serve` child process with an in-process Node HTTP server that mounts the viewer at `/` and the effects directory at `/effects/`. Add a shared `resolveEffectIds()` helper for all browser tools. Auto-detect single-effect mode when effect_id is omitted.

**Tech Stack:** Node `http` + `fs` (no Express), vitest for testing, existing Zod schemas.

---

### Task 1: Custom HTTP server

Replace `npx serve` spawn in `server-manager.ts` with an in-process static file server.

**Files:**
- Modify: `src/harness/server-manager.ts`
- Test: `src/__tests__/server-manager.test.ts`

**Step 1: Write the failing test**

In `src/__tests__/server-manager.test.ts`, add tests for the new behavior:

```typescript
import { describe, it, expect, afterEach } from 'vitest'
import { acquireServer, releaseServer, getServerUrl, getRefCount } from '../harness/server-manager.js'
import { resolve } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

describe('server-manager', () => {
  it('getServerUrl returns correct URL format', () => {
    const url = getServerUrl()
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })

  it('starts with refCount 0', () => {
    expect(getRefCount()).toBe(0)
  })

  it('releaseServer does not go below 0', () => {
    releaseServer()
    expect(getRefCount()).toBe(0)
  })

  describe('acquireServer with routes', () => {
    const testPort = 4199
    const tmpDir = resolve('/tmp/shade-mcp-test-viewer')
    const tmpEffects = resolve('/tmp/shade-mcp-test-effects')

    afterEach(async () => {
      while (getRefCount() > 0) releaseServer()
      rmSync(tmpDir, { recursive: true, force: true })
      rmSync(tmpEffects, { recursive: true, force: true })
    })

    it('serves viewer root at /', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '<h1>test</h1>')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/index.html`)
      expect(res.ok).toBe(true)
      const text = await res.text()
      expect(text).toContain('<h1>test</h1>')
    })

    it('serves effects dir at /effects/', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '<h1>test</h1>')
      mkdirSync(resolve(tmpEffects, 'synth/noise'), { recursive: true })
      writeFileSync(resolve(tmpEffects, 'synth/noise/definition.json'), '{"name":"test"}')

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/effects/synth/noise/definition.json`)
      expect(res.ok).toBe(true)
      const json = await res.json()
      expect(json.name).toBe('test')
    })

    it('ref-counts correctly', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      mkdirSync(tmpEffects, { recursive: true })

      await acquireServer(testPort, tmpDir, tmpEffects)
      expect(getRefCount()).toBe(1)
      await acquireServer(testPort, tmpDir, tmpEffects)
      expect(getRefCount()).toBe(2)
      releaseServer()
      expect(getRefCount()).toBe(1)
      releaseServer()
      expect(getRefCount()).toBe(0)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/server-manager.test.ts`
Expected: FAIL — `acquireServer` doesn't accept 3 args, no HTTP routing.

**Step 3: Write the implementation**

Replace `src/harness/server-manager.ts`:

```typescript
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve, extname, join } from 'node:path'

let httpServer: Server | null = null
let refCount = 0
let activePort = 4173

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.glsl': 'text/plain',
  '.wgsl': 'text/plain',
  '.frag': 'text/plain',
  '.vert': 'text/plain',
}

function serveFile(filePath: string, res: ServerResponse): void {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  const ext = extname(filePath).toLowerCase()
  const mime = MIME_TYPES[ext] || 'application/octet-stream'
  res.writeHead(200, {
    'Content-Type': mime,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  createReadStream(filePath).pipe(res)
}

export async function acquireServer(
  port: number,
  viewerRoot: string,
  effectsDir: string,
): Promise<string> {
  activePort = port
  if (refCount > 0) {
    refCount++
    return getServerUrl()
  }

  httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = decodeURIComponent(req.url || '/')

    // Route: /effects/* → effectsDir
    if (url.startsWith('/effects/')) {
      const relPath = url.slice('/effects/'.length)
      serveFile(join(effectsDir, relPath), res)
      return
    }

    // Route: everything else → viewerRoot
    const relPath = url === '/' ? 'index.html' : url.slice(1)
    serveFile(join(viewerRoot, relPath), res)
  })

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(port, '127.0.0.1', () => resolve())
    httpServer!.on('error', reject)
  })

  refCount = 1
  return getServerUrl()
}

export function releaseServer(): void {
  if (refCount <= 0) return
  refCount--
  if (refCount === 0 && httpServer) {
    httpServer.close()
    httpServer = null
  }
}

export function getServerUrl(): string {
  return `http://127.0.0.1:${activePort}`
}

export function getRefCount(): number {
  return refCount
}
```

**Step 4: Update BrowserSession to pass effectsDir**

In `src/harness/browser-session.ts:57`, change the `acquireServer` call:

```typescript
// Before:
this.baseUrl = await acquireServer(this.options.viewerPort, this.options.viewerRoot)

// After:
this.baseUrl = await acquireServer(this.options.viewerPort, this.options.viewerRoot, this.options.effectsDir)
```

**Step 5: Run tests**

Run: `npm test -- src/__tests__/server-manager.test.ts`
Expected: PASS

**Step 6: Run full test suite**

Run: `npm test`
Expected: PASS (no regressions)

**Step 7: Commit**

```bash
git add src/harness/server-manager.ts src/harness/browser-session.ts src/__tests__/server-manager.test.ts
git commit -m "feat: replace npx serve with in-process HTTP server

Routes /effects/* to SHADE_EFFECTS_DIR and everything else to the
viewer root. Enables serving effects from external project directories."
```

---

### Task 2: Effect ID resolution helper

Create a shared helper that normalizes `effect_id` / `effects` args and auto-detects single-effect mode.

**Files:**
- Create: `src/tools/resolve-effects.ts`
- Test: `src/__tests__/resolve-effects.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const tmpEffects = resolve('/tmp/shade-mcp-test-resolve')

describe('resolveEffectIds', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    rmSync(tmpEffects, { recursive: true, force: true })
  })

  it('returns effect_id as single-element array', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({ effect_id: 'synth/noise' }, tmpEffects)
    expect(ids).toEqual(['synth/noise'])
  })

  it('splits effects CSV', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({ effects: 'synth/noise, filter/blur' }, tmpEffects)
    expect(ids).toEqual(['synth/noise', 'filter/blur'])
  })

  it('prefers effects over effect_id when both given', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({ effect_id: 'synth/noise', effects: 'filter/blur' }, tmpEffects)
    expect(ids).toEqual(['filter/blur'])
  })

  it('auto-detects single effect when neither given', async () => {
    mkdirSync(resolve(tmpEffects, 'synth/noise'), { recursive: true })
    writeFileSync(resolve(tmpEffects, 'synth/noise/definition.json'), '{}')
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    const ids = resolveEffectIds({}, tmpEffects)
    expect(ids).toEqual(['synth/noise'])
  })

  it('throws when no effect_id and multiple effects exist', async () => {
    mkdirSync(resolve(tmpEffects, 'synth/noise'), { recursive: true })
    writeFileSync(resolve(tmpEffects, 'synth/noise/definition.json'), '{}')
    mkdirSync(resolve(tmpEffects, 'filter/blur'), { recursive: true })
    writeFileSync(resolve(tmpEffects, 'filter/blur/definition.json'), '{}')
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    expect(() => resolveEffectIds({}, tmpEffects)).toThrow(/specify effect_id/)
  })

  it('throws when no effect_id and no effects directory', async () => {
    const { resolveEffectIds } = await import('../tools/resolve-effects.js')
    expect(() => resolveEffectIds({}, tmpEffects)).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/resolve-effects.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

Create `src/tools/resolve-effects.ts`:

```typescript
import { readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

export function resolveEffectIds(
  args: { effect_id?: string; effects?: string },
  effectsDir: string,
): string[] {
  // CSV takes precedence
  if (args.effects) {
    return args.effects.split(',').map(s => s.trim()).filter(Boolean)
  }

  // Single effect_id
  if (args.effect_id) {
    return [args.effect_id]
  }

  // Auto-detect: scan effectsDir for effects (directories with definition.json or definition.js)
  if (!existsSync(effectsDir)) {
    throw new Error(`Effects directory not found: ${effectsDir}. Specify effect_id or set SHADE_EFFECTS_DIR.`)
  }

  const found: string[] = []
  try {
    const namespaces = readdirSync(effectsDir)
    for (const ns of namespaces) {
      const nsDir = join(effectsDir, ns)
      if (!statSync(nsDir).isDirectory()) continue
      const effects = readdirSync(nsDir)
      for (const effect of effects) {
        const effectDir = join(nsDir, effect)
        if (!statSync(effectDir).isDirectory()) continue
        if (existsSync(join(effectDir, 'definition.json')) || existsSync(join(effectDir, 'definition.js'))) {
          found.push(`${ns}/${effect}`)
        }
      }
    }
  } catch {
    throw new Error(`Failed to scan effects directory: ${effectsDir}`)
  }

  if (found.length === 0) {
    throw new Error(`No effects found in ${effectsDir}. Specify effect_id.`)
  }

  if (found.length === 1) {
    console.warn(`[shade-mcp] Auto-detected single effect: ${found[0]}`)
    return found
  }

  throw new Error(
    `Multiple effects found (${found.length}). Please specify effect_id or effects parameter. Available: ${found.slice(0, 10).join(', ')}${found.length > 10 ? '...' : ''}`
  )
}
```

**Step 4: Run tests**

Run: `npm test -- src/__tests__/resolve-effects.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/tools/resolve-effects.ts src/__tests__/resolve-effects.test.ts
git commit -m "feat: add resolveEffectIds helper for batch and auto-detect

Supports effect_id (single), effects (CSV), and auto-detection of
single-effect projects like portable."
```

---

### Task 3: Add batch parameters to browser tool schemas

Update all browser tool registration functions to accept `effects` CSV and use `resolveEffectIds`.

**Files:**
- Modify: `src/tools/browser/render.ts`
- Modify: `src/tools/browser/describe.ts`
- Modify: `src/tools/browser/benchmark.ts`
- Modify: `src/tools/browser/uniforms.ts`
- Modify: `src/tools/browser/passthrough.ts`
- Modify: `src/tools/browser/parity.ts`

**Step 1: Update schemas — make effect_id optional, add effects**

For each of the 6 files above, apply the same pattern. Example for `render.ts`:

```typescript
// Before (render.ts:7-13):
export const renderEffectFrameSchema = {
  effect_id: z.string().describe('Effect ID'),
  backend: ...

// After:
export const renderEffectFrameSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
  backend: ...
```

Apply the same `effect_id` → `optional()` + add `effects` to:
- `describeEffectFrameSchema` in `describe.ts`
- `benchmarkEffectFPSSchema` in `benchmark.ts`
- `testUniformResponsivenessSchema` in `uniforms.ts`
- `testNoPassthroughSchema` in `passthrough.ts`
- `testPixelParitySchema` in `parity.ts`

**Step 2: Update registration handlers to use resolveEffectIds**

For each tool, change the handler to resolve IDs and loop. Example for `render.ts`:

```typescript
import { resolveEffectIds } from '../resolve-effects.js'

// In registerRenderEffectFrame handler:
async (args: any) => {
  const config = getConfig()
  const effectIds = resolveEffectIds(args, config.effectsDir)
  const session = new BrowserSession({ backend: args.backend })
  try {
    await session.setup()
    const results = []
    for (const id of effectIds) {
      results.push(await renderEffectFrame(session, id, {
        warmupFrames: args.warmup_frames,
        captureImage: args.capture_image,
        uniforms: args.uniforms,
      }))
    }
    return { content: [{ type: 'text', text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] }
  } finally {
    await session.teardown()
  }
}
```

Apply the same pattern to all 6 tools. Also update `compileEffect` registration to use `resolveEffectIds` instead of its inline CSV splitting.

**Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS

**Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build, no type errors.

**Step 5: Commit**

```bash
git add src/tools/browser/*.ts
git commit -m "feat: add batch effects param to all browser tools

All browser tools now accept optional effects CSV parameter and
auto-detect single-effect projects via resolveEffectIds."
```

---

### Task 4: Remove `serve` dependency

Since we no longer spawn `npx serve`, remove it from dependencies.

**Files:**
- Modify: `package.json`

**Step 1: Remove dependency**

```bash
npm uninstall serve
```

**Step 2: Build and test**

Run: `npm run build && npm test`
Expected: PASS — no code references `serve` anymore.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove serve dependency

No longer needed — replaced with in-process HTTP server."
```

---

### Task 5: Manual integration test

Test shade-mcp against the portable and py-noisemaker effects directories.

**Step 1: Test with portable**

```bash
SHADE_EFFECTS_DIR=../portable/effects SHADE_PROJECT_ROOT=../portable node dist/index.js
```

Verify: The server starts without error. If effects exist, `generateManifest` and `compileEffect` should work when called via MCP.

**Step 2: Test with py-noisemaker**

```bash
SHADE_EFFECTS_DIR=../py-noisemaker/shaders/effects SHADE_PROJECT_ROOT=../py-noisemaker node dist/index.js
```

Verify: Same as above.

**Step 3: Test single-effect auto-detect**

Point at a project with one effect, call a tool without `effect_id`. Verify it auto-detects and warns.

**Step 4: Commit any fixes**

If integration reveals issues, fix and commit each individually.
