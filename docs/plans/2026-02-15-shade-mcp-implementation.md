# Shade MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a best-of-breed MCP server for shader effect development, distilling 18 tools from noisemaker, portable, and shade into a single TypeScript project.

**Architecture:** Modular TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport. Browser-based tools use Playwright via a ref-counted browser harness. AI tools use Anthropic-first with OpenAI fallback. Knowledge tools use TF-IDF over a curated knowledge base.

**Tech Stack:** TypeScript, tsup, @modelcontextprotocol/sdk, playwright, @anthropic-ai/sdk, openai, vitest

**Source Projects (reference implementations):**
- Noisemaker: `../noisemaker/shaders/mcp/` (server.js, browser-harness.js, core-operations.js)
- Portable: `../portable/mcp/` (server.js, browser-harness.js, core-operations.js)
- Shade: `../shade/server/` (tools/index.js, mcp/index.js, shader-knowledge/)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `LICENSE`
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "shade-mcp",
  "version": "0.1.0",
  "description": "Best-of-breed MCP server for shader effect development",
  "type": "module",
  "license": "MIT",
  "main": "dist/index.js",
  "bin": {
    "shade-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "setup": "playwright install chromium",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.26.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "openai": "^4.77.0",
    "playwright": "^1.57.0",
    "serve": "^14.2.5"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "viewer"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
})
```

**Step 4: Create LICENSE (MIT)**

Standard MIT license with "Shade MCP Contributors" as copyright holder, year 2026.

**Step 5: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.env
.anthropic
.openai
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: Clean install, no errors.

**Step 7: Verify build works**

Create minimal `src/index.ts`:
```typescript
console.log('shade-mcp')
```

Run: `npx tsup`
Expected: Build succeeds, `dist/index.js` created.

**Step 8: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts LICENSE .gitignore src/index.ts
git commit -m "chore: scaffold project with TypeScript, tsup, MCP SDK"
```

---

### Task 2: Config Module

**Files:**
- Create: `src/config.ts`
- Test: `src/__tests__/config.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses default values when no env vars set', async () => {
    const { getConfig } = await import('../config.js')
    const config = getConfig()
    expect(config.viewerPort).toBe(4173)
    expect(config.defaultBackend).toBe('webgl2')
  })

  it('reads SHADE_EFFECTS_DIR from env', async () => {
    vi.stubEnv('SHADE_EFFECTS_DIR', '/custom/effects')
    // Re-import to pick up env change
    vi.resetModules()
    const { getConfig } = await import('../config.js')
    const config = getConfig()
    expect(config.effectsDir).toBe('/custom/effects')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
import { resolve } from 'node:path'

export type Backend = 'webgl2' | 'webgpu'

export interface Config {
  effectsDir: string
  viewerPort: number
  defaultBackend: Backend
  projectRoot: string
}

export function getConfig(): Config {
  const projectRoot = process.env.SHADE_PROJECT_ROOT || process.cwd()
  return {
    effectsDir: process.env.SHADE_EFFECTS_DIR || resolve(projectRoot, 'effects'),
    viewerPort: parseInt(process.env.SHADE_VIEWER_PORT || '4173', 10),
    defaultBackend: (process.env.SHADE_BACKEND as Backend) || 'webgl2',
    projectRoot
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts src/__tests__/config.test.ts
git commit -m "feat: add config module with env var support"
```

---

### Task 3: AI Provider Abstraction

**Files:**
- Create: `src/ai/provider.ts`
- Test: `src/__tests__/ai-provider.test.ts`

**Reference:** `../noisemaker/shaders/mcp/core-operations.js` lines 26-177 (getAIProvider, callAI, _callAnthropic, _callOpenAI)

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getAIProvider } from '../ai/provider.js'

describe('getAIProvider', () => {
  it('returns null when no keys available', () => {
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider).toBeNull()
  })

  it('prefers anthropic when ANTHROPIC_API_KEY env is set', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider?.provider).toBe('anthropic')
    vi.unstubAllEnvs()
  })

  it('falls back to openai when only OPENAI_API_KEY is set', () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    const provider = getAIProvider({ projectRoot: '/nonexistent' })
    expect(provider?.provider).toBe('openai')
    vi.unstubAllEnvs()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/ai-provider.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

Port from noisemaker's `core-operations.js` lines 26-177. Key changes:
- TypeScript types for `AIProvider`, `CallAIOptions`
- Use `@anthropic-ai/sdk` and `openai` packages instead of raw fetch
- Check env vars first (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), then dotfiles (`.anthropic`, `.openai`)
- Anthropic-first priority order

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface AIProvider {
  provider: 'anthropic' | 'openai'
  apiKey: string
  model: string
}

export interface CallAIOptions {
  system: string
  userContent: Array<{ type: string; text?: string; image_url?: { url: string } }>
  maxTokens?: number
  jsonMode?: boolean
  ai: AIProvider
}

function readKeyFile(projectRoot: string, filename: string): string | null {
  try {
    const key = readFileSync(join(projectRoot, filename), 'utf-8').trim()
    return key || null
  } catch {
    return null
  }
}

export function getAIProvider(options: { projectRoot: string }): AIProvider | null {
  // Env vars first
  const anthropicEnv = process.env.ANTHROPIC_API_KEY
  if (anthropicEnv) {
    return { provider: 'anthropic', apiKey: anthropicEnv, model: 'claude-sonnet-4-5-20250929' }
  }
  const openaiEnv = process.env.OPENAI_API_KEY
  if (openaiEnv) {
    return { provider: 'openai', apiKey: openaiEnv, model: 'gpt-4o' }
  }
  // Dotfiles
  const anthropicKey = readKeyFile(options.projectRoot, '.anthropic')
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey, model: 'claude-sonnet-4-5-20250929' }
  }
  const openaiKey = readKeyFile(options.projectRoot, '.openai')
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey, model: 'gpt-4o' }
  }
  return null
}

export async function callAI(options: CallAIOptions): Promise<string | null> {
  if (options.ai.provider === 'anthropic') {
    return callAnthropic(options)
  }
  return callOpenAI(options)
}

async function callAnthropic(options: CallAIOptions): Promise<string | null> {
  const client = new Anthropic({ apiKey: options.ai.apiKey })

  // Convert image_url blocks to Anthropic format
  const content = options.userContent.map(block => {
    if (block.type === 'image_url' && block.image_url) {
      const url = block.image_url.url
      const match = url.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        return {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: match[1] as 'image/png', data: match[2] }
        }
      }
    }
    return { type: 'text' as const, text: block.text || '' }
  })

  let system = options.system
  if (options.jsonMode) {
    system += '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation.'
  }

  const response = await client.messages.create({
    model: options.ai.model,
    max_tokens: options.maxTokens || 500,
    system,
    messages: [{ role: 'user', content }]
  })

  const textBlock = response.content.find(b => b.type === 'text')
  return textBlock ? textBlock.text : null
}

async function callOpenAI(options: CallAIOptions): Promise<string | null> {
  const client = new OpenAI({ apiKey: options.ai.apiKey })

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.userContent.map(block => {
      if (block.type === 'image_url' && block.image_url) {
        return { type: 'image_url' as const, image_url: { url: block.image_url.url } }
      }
      return { type: 'text' as const, text: block.text || '' }
    })}
  ]

  const response = await client.chat.completions.create({
    model: options.ai.model,
    max_tokens: options.maxTokens || 500,
    messages,
    ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
  })

  return response.choices[0]?.message?.content || null
}

export const NO_AI_KEY_MESSAGE = 'No AI API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or create .anthropic/.openai file in project root.'
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/ai-provider.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ai/provider.ts src/__tests__/ai-provider.test.ts
git commit -m "feat: add AI provider abstraction (Anthropic-first, OpenAI fallback)"
```

---

### Task 4: Effect Format Parsers

**Files:**
- Create: `src/formats/definition-json.ts`
- Create: `src/formats/definition-js.ts`
- Create: `src/formats/index.ts`
- Create: `src/formats/types.ts`
- Test: `src/__tests__/formats.test.ts`

**Reference:** Portable's `definition.json` format + Noisemaker's `definition.js` format

**Step 1: Write the types**

```typescript
// src/formats/types.ts
export interface EffectUniform {
  name: string
  type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'boolean'
  uniform: string
  default?: number | number[]
  min?: number
  max?: number
  step?: number
  choices?: Record<string, number>
  control?: boolean
}

export interface EffectPass {
  name?: string
  program: string
  type?: 'render' | 'compute' | 'gpgpu'
  inputs?: Record<string, string>
  outputs?: Record<string, string>
}

export interface EffectDefinition {
  func: string
  name?: string
  namespace?: string
  description?: string
  starter?: boolean
  tags?: string[]
  globals: Record<string, EffectUniform>
  passes: EffectPass[]
  format: 'json' | 'js'
  effectDir: string
}
```

**Step 2: Write tests**

```typescript
import { describe, it, expect } from 'vitest'
import { parseDefinitionJson, parseDefinitionJs, loadEffectDefinition } from '../formats/index.js'

describe('parseDefinitionJson', () => {
  it('parses a minimal definition.json', () => {
    const json = {
      func: 'myEffect',
      name: 'My Effect',
      globals: {},
      passes: [{ program: 'main' }]
    }
    const def = parseDefinitionJson(json, '/test/effect')
    expect(def.func).toBe('myEffect')
    expect(def.format).toBe('json')
    expect(def.passes).toHaveLength(1)
  })
})
```

**Step 3: Write implementation**

Port the JSON parser from portable's format, and the JS parser using regex extraction from noisemaker's `checkEffectStructure` (lines 2394-2500 of core-operations.js). The JS parser reads `definition.js`, extracts `func`, `description`, `globals`, `passes` via regex + `new Function()` eval where safe.

The `loadEffectDefinition(effectDir)` function auto-detects format by checking for `definition.json` first, then `definition.js`.

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add src/formats/
git commit -m "feat: add effect definition parsers (JSON + JS with auto-detection)"
```

---

### Task 5: Viewer Setup

**Files:**
- Create: `viewer/index.html`
- Create: `scripts/setup.sh`

**Reference:** `../portable/viewer/index.html` (551 lines)

**Step 1: Create viewer HTML**

Port from portable's `viewer/index.html`. This is a minimal rendering page that:
- Imports `noisemaker-shaders-core.esm.js` from `vendor/`
- Creates a full-viewport canvas with `CanvasRenderer`
- Loads effects from the effects directory
- Exposes window globals for the browser harness:
  - `window.__shadeCanvasRenderer`
  - `window.__shadeRenderingPipeline`
  - `window.__shadeCurrentBackend`
  - `window.__shadeSetPaused` / `window.__shadeSetPausedTime`
  - `window.__shadeFrameCount`
- Backend switching (WebGL2/WebGPU) via radio buttons
- Effect selection dropdown
- Status element showing compile status

Key change from portable: instead of loading a single `/effect/definition.json`, this viewer loads effects from a configurable effects directory, supporting both `definition.json` and `definition.js` formats. The effects list is populated from a manifest endpoint or directory listing.

**Step 2: Create setup script**

```bash
#!/bin/bash
# scripts/setup.sh - Vendor the noisemaker shader runtime
set -e

NOISEMAKER_DIR="${1:-../noisemaker}"
VENDOR_DIR="viewer/vendor"

mkdir -p "$VENDOR_DIR"

echo "Building noisemaker shader bundle..."
(cd "$NOISEMAKER_DIR" && npm run build:shaders 2>/dev/null || npm run build 2>/dev/null)

echo "Copying runtime..."
cp "$NOISEMAKER_DIR/shaders/dist/noisemaker-shaders-core.esm.js" "$VENDOR_DIR/"

echo "Installing Playwright Chromium..."
npx playwright install chromium

echo "Setup complete."
```

**Step 3: Run setup**

Run: `bash scripts/setup.sh ../noisemaker`
Expected: `viewer/vendor/noisemaker-shaders-core.esm.js` exists.

**Step 4: Commit**

```bash
git add viewer/index.html scripts/setup.sh
git commit -m "feat: add viewer page and setup script for vendored runtime"
```

---

### Task 6: Browser Harness — Server Manager

**Files:**
- Create: `src/harness/server-manager.ts`
- Test: `src/__tests__/server-manager.test.ts`

**Reference:** `../noisemaker/shaders/mcp/browser-harness.js` lines 1-80 (acquireServer/releaseServer)

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest'
import { acquireServer, releaseServer, getServerUrl } from '../harness/server-manager.js'

describe('server-manager', () => {
  it('acquireServer returns a URL', async () => {
    const url = await acquireServer(4173, process.cwd())
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:4173/)
    releaseServer()
  })
})
```

**Step 2: Write implementation**

Ref-counted HTTP server using `npx serve`. Port from noisemaker's pattern:
- `acquireServer(port, root)`: If refcount > 0, increment and return URL. Otherwise spawn `npx serve -l tcp://127.0.0.1:${port} ${root}`, wait 2s for startup, increment refcount.
- `releaseServer()`: Decrement refcount. If 0, kill the serve process.
- `getServerUrl()`: Return `http://127.0.0.1:${port}`.

```typescript
import { spawn, ChildProcess } from 'node:child_process'

let serverProcess: ChildProcess | null = null
let refCount = 0
let serverPort = 4173

export async function acquireServer(port: number, root: string): Promise<string> {
  serverPort = port
  if (refCount > 0) {
    refCount++
    return getServerUrl()
  }

  serverProcess = spawn('npx', ['serve', '-l', `tcp://127.0.0.1:${port}`, root], {
    stdio: 'ignore',
    detached: false
  })

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000))
  refCount = 1
  return getServerUrl()
}

export function releaseServer(): void {
  refCount--
  if (refCount <= 0 && serverProcess) {
    serverProcess.kill()
    serverProcess = null
    refCount = 0
  }
}

export function getServerUrl(): string {
  return `http://127.0.0.1:${serverPort}`
}
```

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add src/harness/server-manager.ts src/__tests__/server-manager.test.ts
git commit -m "feat: add ref-counted HTTP server manager for viewer"
```

---

### Task 7: Browser Harness — Browser Session

**Files:**
- Create: `src/harness/browser-session.ts`
- Create: `src/harness/types.ts`

**Reference:** `../noisemaker/shaders/mcp/browser-harness.js` lines 82-400 (BrowserSession class)

**Step 1: Write harness types**

```typescript
// src/harness/types.ts
import type { Backend } from '../config.js'

export interface BrowserSessionOptions {
  backend: Backend
  headless?: boolean
  viewerPort?: number
  viewerRoot?: string
  effectsDir?: string
}

export interface ImageMetrics {
  mean_rgb: [number, number, number]
  mean_alpha: number
  std_rgb: [number, number, number]
  luma_variance: number
  unique_sampled_colors: number
  is_all_zero: boolean
  is_all_transparent: boolean
  is_essentially_blank: boolean
  is_monochrome: boolean
}

export interface CompileResult {
  status: 'ok' | 'error'
  backend: string
  passes: Array<{ id: string; status: 'ok' | 'error'; errors?: string[] }>
  message: string
  console_errors?: string[]
}

export interface RenderResult {
  status: 'ok' | 'error'
  backend: string
  frame?: { image_uri?: string; width: number; height: number }
  metrics?: ImageMetrics
  console_errors?: string[]
}

export interface BenchmarkResult {
  status: 'ok' | 'error'
  backend: string
  achieved_fps: number
  meets_target: boolean
  stats: {
    frame_count: number
    avg_frame_time_ms: number
    jitter_ms: number
    min_frame_time_ms: number
    max_frame_time_ms: number
  }
  console_errors?: string[]
}

export interface ParityResult {
  status: 'ok' | 'error' | 'mismatch'
  maxDiff: number
  meanDiff: number
  mismatchCount: number
  mismatchPercent: number
  resolution: [number, number]
  details: string
  console_errors?: string[]
}
```

**Step 2: Write BrowserSession**

Port from noisemaker's `BrowserSession` class. Key methods:
- `setup()`: Acquire server, launch Chromium with WebGPU flags, navigate to viewer, wait for pipeline.
- `teardown()`: Close browser, release server.
- `_setBackend(backend)`: Click radio button, wait for pipeline to switch.
- `clearConsoleMessages()`, `getConsoleMessages()`: Console capture.
- `listEffects()`: Query effect dropdown.
- `getEffectGlobals()`: Query current effect's globals.
- `resetUniformsToDefaults()`: Reset all uniforms.

The class wraps core operations by delegating to imported functions, adding console capture via `_runWithConsoleCapture()`.

Browser launch options for WebGPU (port from noisemaker):
```typescript
function getBrowserLaunchOptions(headless: boolean, backend: Backend) {
  const args = [
    '--disable-gpu-sandbox',
    '--enable-unsafe-webgpu',
    '--enable-features=Vulkan',
    '--enable-webgpu-developer-features',
  ]
  if (process.platform === 'darwin') {
    args.push('--use-angle=metal')
  } else {
    args.push('--use-angle=vulkan')
  }
  return { headless, args }
}
```

**Step 3: Commit**

```bash
git add src/harness/
git commit -m "feat: add BrowserSession with Playwright lifecycle management"
```

---

### Task 8: Image Metrics (computeImageMetrics)

**Files:**
- Create: `src/harness/pixel-reader.ts`
- Test: `src/__tests__/pixel-reader.test.ts`

**Reference:** `../noisemaker/shaders/mcp/core-operations.js` lines 331-415

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest'
import { computeImageMetrics } from '../harness/pixel-reader.js'

describe('computeImageMetrics', () => {
  it('detects all-black image', () => {
    const data = new Uint8Array(4 * 100) // 10x10 black image
    const metrics = computeImageMetrics(data, 10, 10)
    expect(metrics.is_all_zero).toBe(true)
    expect(metrics.is_essentially_blank).toBe(true)
    expect(metrics.mean_rgb).toEqual([0, 0, 0])
  })

  it('detects monochrome image', () => {
    const data = new Uint8Array(4 * 100)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128; data[i+1] = 64; data[i+2] = 32; data[i+3] = 255
    }
    const metrics = computeImageMetrics(data, 10, 10)
    expect(metrics.is_monochrome).toBe(true)
    expect(metrics.unique_sampled_colors).toBe(1)
  })

  it('detects colorful image', () => {
    const data = new Uint8Array(4 * 100)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = (i * 7) % 256
      data[i+1] = (i * 13) % 256
      data[i+2] = (i * 23) % 256
      data[i+3] = 255
    }
    const metrics = computeImageMetrics(data, 10, 10)
    expect(metrics.is_monochrome).toBe(false)
    expect(metrics.is_essentially_blank).toBe(false)
    expect(metrics.unique_sampled_colors).toBeGreaterThan(1)
  })
})
```

**Step 2: Implement computeImageMetrics**

Port directly from noisemaker's `computeImageMetrics()` (lines 331-415), adding TypeScript types. This is a pure function — no browser needed.

**Step 3: Run tests, commit**

```bash
git add src/harness/pixel-reader.ts src/__tests__/pixel-reader.test.ts
git commit -m "feat: add computeImageMetrics for image analysis"
```

---

### Task 9: Core Browser Operations

**Files:**
- Create: `src/tools/browser/compile.ts`
- Create: `src/tools/browser/render.ts`
- Create: `src/tools/browser/benchmark.ts`
- Create: `src/tools/browser/describe.ts`
- Create: `src/tools/browser/uniforms.ts`
- Create: `src/tools/browser/passthrough.ts`
- Create: `src/tools/browser/parity.ts`
- Create: `src/tools/browser/dsl.ts`

**Reference:**
- Noisemaker `core-operations.js` lines 211-1360 (compile, render, benchmark, describe)
- Noisemaker `core-operations.js` lines 1408-2149 (passthrough, parity)
- Noisemaker `core-operations.js` lines 775-1170 (runDslProgram)
- Noisemaker `browser-harness.js` lines 510-775 (testUniformResponsiveness)

Each tool follows this pattern:

```typescript
// src/tools/browser/compile.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'  // or inline schemas
import { BrowserSession } from '../../harness/browser-session.js'
import type { CompileResult } from '../../harness/types.js'

// The tool's input schema
export const compileEffectSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs or glob patterns'),
  backend: z.enum(['webgl2', 'webgpu']).describe('Rendering backend'),
}

// The tool handler (pure function, takes session)
export async function compileEffect(
  session: BrowserSession,
  effectId: string,
  options: { backend: string }
): Promise<CompileResult> {
  // Port from noisemaker core-operations.js compileEffect() lines 211-321
  // Key: page.evaluate() that switches backend, selects effect, polls status
}

// Registration function
export function registerCompileEffect(server: McpServer): void {
  server.tool(
    'compileEffect',
    'Compile shader effect and return pass-level diagnostics. Supports glob/CSV batch testing.',
    compileEffectSchema,
    async (args) => {
      // Create session, run test, teardown
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const result = await session.compileEffect(args.effect_id || args.effects)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
```

For each of the 8 browser tools, port the corresponding function from noisemaker/portable, following this pattern. Key implementation notes per tool:

- **compileEffect**: Port from noisemaker lines 211-321. Single `page.evaluate()` that switches backend, selects effect, polls `#status` for compile status.
- **renderEffectFrame**: Port from noisemaker lines 431-756. Compile, apply uniforms, warmup frames, read pixels (WebGL2 readPixels / WebGPU readPixels), compute metrics, optional PNG capture.
- **benchmarkEffectFPS**: Port from noisemaker lines 1172-1266. Must run in headed mode for accurate GPU timing (like noisemaker browser-harness.js lines 437-499).
- **describeEffectFrame**: Port from noisemaker lines 1282-1360. Render with captureImage, send to AI vision.
- **testUniformResponsiveness**: Port from noisemaker browser-harness.js lines 510-775 (the inline implementation). Pause animation, test each uniform by modifying value and comparing luma difference.
- **testNoPassthrough**: Port from noisemaker lines 1408-1913. Compare input/output textures for filter effects.
- **testPixelParity**: Port from noisemaker lines 1968-2149 (or portable's improved version). Capture both backends, compare per-channel.
- **runDslProgram**: Port from noisemaker lines 775-1170. Compile DSL, run, return metrics.

**Commit after each tool, or batch:**

```bash
git add src/tools/browser/
git commit -m "feat: add 8 browser-based shader testing tools"
```

---

### Task 10: Analysis Tools (On-Disk)

**Files:**
- Create: `src/tools/analysis/structure.ts`
- Create: `src/tools/analysis/alg-equiv.ts`
- Create: `src/tools/analysis/compare.ts`
- Create: `src/tools/analysis/branching.ts`

**Reference:**
- Noisemaker `core-operations.js` lines 2394-3243 (checkEffectStructure)
- Noisemaker `core-operations.js` lines 3256-3486 (checkShaderParity)
- Portable `core-operations.js` compareShaders function
- Noisemaker `core-operations.js` lines 3501-3729 (analyzeBranching)

These tools operate directly on the filesystem — no browser needed.

**checkEffectStructure**: Port the comprehensive static analysis from noisemaker. Checks:
- Unused shader files
- Missing description
- Naming conventions (camelCase)
- Leaked/undefined uniforms
- Structural parity (GLSL ↔ WGSL)
- Must handle both definition.json and definition.js via the format parsers.

**checkAlgEquiv**: Port from noisemaker's `checkShaderParity`. Read GLSL/WGSL pairs, send to AI for semantic comparison.

**compareShaders**: Port from portable. Static structural comparison — extract function names, uniforms, line counts. No AI needed.

**analyzeBranching**: Port from noisemaker. Read shader files, send to AI for branching analysis.

Each tool follows the registration pattern from Task 9.

**Commit:**

```bash
git add src/tools/analysis/
git commit -m "feat: add 4 on-disk analysis tools"
```

---

### Task 11: Knowledge System

**Files:**
- Create: `src/knowledge/vector-db.ts`
- Create: `src/knowledge/shader-knowledge.ts`
- Create: `src/knowledge/effect-index.ts`
- Create: `src/knowledge/glsl-index.ts`
- Test: `src/__tests__/vector-db.test.ts`

**Reference:**
- Shade `server/shader-knowledge/vector-db/index.js` (ShaderKnowledgeDB class)
- Shade `server/shader-knowledge/vector-db/knowledge-base.json`
- Shade `server/shader-knowledge/index.js`

**Step 1: Write vector-db test**

```typescript
import { describe, it, expect } from 'vitest'
import { ShaderKnowledgeDB } from '../knowledge/vector-db.js'

describe('ShaderKnowledgeDB', () => {
  it('indexes and searches documents', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'Voronoi Noise', content: 'Voronoi noise creates cellular patterns using distance fields', category: 'technique' },
      { id: '2', title: 'Perlin Noise', content: 'Perlin noise generates smooth gradient noise', category: 'technique' },
      { id: '3', title: 'DSL Basics', content: 'The DSL uses function chaining with write and render', category: 'dsl' },
    ])
    db.buildIndex()

    const results = db.search('cellular noise patterns')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('1') // Voronoi should rank highest
  })

  it('filters by category', () => {
    const db = new ShaderKnowledgeDB()
    db.addDocuments([
      { id: '1', title: 'Voronoi', content: 'cellular noise', category: 'technique' },
      { id: '2', title: 'DSL', content: 'DSL noise function', category: 'dsl' },
    ])
    db.buildIndex()

    const results = db.search('noise', { category: 'dsl' })
    expect(results.every(r => r.category === 'dsl')).toBe(true)
  })
})
```

**Step 2: Implement ShaderKnowledgeDB**

Port the TF-IDF implementation from Shade's `vector-db/index.js`. Key methods:
- `addDocument(doc)` / `addDocuments(docs)`
- `buildIndex()` — Compute TF-IDF vectors
- `search(query, options)` — Cosine similarity with optional category filter
- `extractSnippet(content, query)` — Find best snippet window

**Step 3: Create shader-knowledge.ts**

Port the curated knowledge data from Shade's `vector-db/index.js`:
- `INNATE_SHADER_KNOWLEDGE` (comprehensive shader knowledge string)
- `TECHNIQUE_SYNONYMS` (query expansion map)
- Curated documents from `knowledge-base.json`

**Step 4: Create effect-index.ts**

Lazy scanner that builds an in-memory index of effects from `SHADE_EFFECTS_DIR`:
```typescript
export class EffectIndex {
  private effects: Map<string, EffectDefinition> = new Map()
  private initialized = false

  async initialize(effectsDir: string): Promise<void> {
    // Scan directory, parse definitions, populate map
  }

  search(query: string, limit?: number): EffectDefinition[]
  get(effectId: string): EffectDefinition | undefined
  list(namespace?: string): EffectDefinition[]
}
```

**Step 5: Create glsl-index.ts**

Lazy scanner for GLSL regex search:
```typescript
export class GlslIndex {
  private files: Map<string, { effectId: string; content: string }> = new Map()

  async initialize(effectsDir: string): Promise<void> {
    // Scan for .glsl files, read contents
  }

  search(query: string, contextLines?: number, limit?: number): SearchResult[]
}
```

**Step 6: Run tests, commit**

```bash
git add src/knowledge/ src/__tests__/vector-db.test.ts
git commit -m "feat: add knowledge system with TF-IDF search and effect/GLSL indexes"
```

---

### Task 12: Knowledge Tools

**Files:**
- Create: `src/tools/knowledge/search-effects.ts`
- Create: `src/tools/knowledge/analyze-effect.ts`
- Create: `src/tools/knowledge/search-source.ts`
- Create: `src/tools/knowledge/search-knowledge.ts`

**Reference:** Shade `server/tools/index.js` tool definitions and handler implementations

**searchEffects**: Search the effect library index by concept, tag, algorithm, or visual style. Uses synonym expansion from `TECHNIQUE_SYNONYMS`. Returns effect metadata (id, description, tags, uniforms, passCount).

**analyzeEffect**: Direct ID lookup. Returns full definition + shader source code (reads .glsl files from disk). Port from Shade's `analyzeEffectServerSide()`.

**searchShaderSource**: Regex search through all GLSL files in the effects directory. Returns matching snippets with line numbers and context. Port from Shade's `executeSearchShaderSource()`.

**searchShaderKnowledge**: TF-IDF search over the curated knowledge base. Port from Shade's `searchShaderKnowledge()` with synonym expansion.

Each tool registers with the MCP server using the same pattern as browser tools.

**Commit:**

```bash
git add src/tools/knowledge/
git commit -m "feat: add 4 knowledge tools for shader research and reference"
```

---

### Task 13: Utility Tools

**Files:**
- Create: `src/tools/utility/list-effects.ts`
- Create: `src/tools/utility/generate-manifest.ts`

**listEffects**: Uses the effect index to return all effects, optionally filtered by namespace.

**generateManifest**: Spawns the manifest generation script (if available) or scans the effects directory and writes a manifest file. Port from noisemaker's approach.

**Commit:**

```bash
git add src/tools/utility/
git commit -m "feat: add utility tools (listEffects, generateManifest)"
```

---

### Task 14: MCP Server Entry Point

**Files:**
- Modify: `src/index.ts`

**Reference:** `../noisemaker/shaders/mcp/server.js` (MCP server setup pattern)

**Step 1: Write the MCP server**

```typescript
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// Import tool registration functions
import { registerCompileEffect } from './tools/browser/compile.js'
import { registerRenderEffectFrame } from './tools/browser/render.js'
import { registerDescribeEffectFrame } from './tools/browser/describe.js'
import { registerBenchmarkEffectFPS } from './tools/browser/benchmark.js'
import { registerTestUniformResponsiveness } from './tools/browser/uniforms.js'
import { registerTestNoPassthrough } from './tools/browser/passthrough.js'
import { registerTestPixelParity } from './tools/browser/parity.js'
import { registerRunDslProgram } from './tools/browser/dsl.js'
import { registerCheckEffectStructure } from './tools/analysis/structure.js'
import { registerCheckAlgEquiv } from './tools/analysis/alg-equiv.js'
import { registerCompareShaders } from './tools/analysis/compare.js'
import { registerAnalyzeBranching } from './tools/analysis/branching.js'
import { registerSearchEffects } from './tools/knowledge/search-effects.js'
import { registerAnalyzeEffect } from './tools/knowledge/analyze-effect.js'
import { registerSearchShaderSource } from './tools/knowledge/search-source.js'
import { registerSearchShaderKnowledge } from './tools/knowledge/search-knowledge.js'
import { registerListEffects } from './tools/utility/list-effects.js'
import { registerGenerateManifest } from './tools/utility/generate-manifest.js'

const server = new McpServer({
  name: 'shade-mcp',
  version: '0.1.0',
})

// Register all 18 tools
registerCompileEffect(server)
registerRenderEffectFrame(server)
registerDescribeEffectFrame(server)
registerBenchmarkEffectFPS(server)
registerTestUniformResponsiveness(server)
registerTestNoPassthrough(server)
registerTestPixelParity(server)
registerRunDslProgram(server)
registerCheckEffectStructure(server)
registerCheckAlgEquiv(server)
registerCompareShaders(server)
registerAnalyzeBranching(server)
registerSearchEffects(server)
registerAnalyzeEffect(server)
registerSearchShaderSource(server)
registerSearchShaderKnowledge(server)
registerListEffects(server)
registerGenerateManifest(server)

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build, `dist/index.js` created with shebang.

**Step 3: Smoke test**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js`
Expected: JSON response with server info and 18 tools listed.

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire up MCP server entry point with all 18 tools"
```

---

### Task 15: Integration Testing

**Files:**
- Create: `src/__tests__/integration.test.ts`

**Step 1: Write integration tests**

Test that the MCP server starts and lists tools correctly. Test on-disk tools with fixture effects. Browser tools are harder to test in CI (need Chromium) — mark them as requiring setup.

```typescript
import { describe, it, expect } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

describe('MCP server integration', () => {
  it('registers all 18 tools', async () => {
    // Import and check tool count
    // Verify each tool name is present
  })
})
```

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/__tests__/integration.test.ts
git commit -m "test: add integration tests for MCP server"
```

---

### Task 16: Documentation & Polish

**Files:**
- Create: `README.md`
- Create: `CLAUDE.md`

**Step 1: Write README.md**

Include:
- Project description
- Quick start (npm install, setup, configure)
- Tool reference table (all 18 tools with brief descriptions)
- MCP client configuration examples for:
  - Claude Code
  - VS Code Copilot
  - Cursor
  - Windsurf
- Environment variables reference
- License (MIT)

**Step 2: Write CLAUDE.md**

Project conventions for AI agents working on this codebase:
- TypeScript, ESM only, Node 18+
- Build with `npm run build` (tsup)
- Test with `npm test` (vitest)
- Tool registration pattern
- Source project references

**Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: add README with tool reference and MCP client configs"
```

---

## Task Dependency Graph

```
Task 1 (scaffolding)
  ├── Task 2 (config)
  ├── Task 3 (AI provider)
  ├── Task 4 (format parsers)
  └── Task 5 (viewer)
        │
Task 6 (server manager) ──┐
Task 7 (browser session) ─┤
Task 8 (pixel reader) ────┤
                           │
Task 9 (browser tools) ────┘ depends on 6,7,8
Task 10 (analysis tools) ──── depends on 3,4
Task 11 (knowledge system) ── depends on 4
Task 12 (knowledge tools) ─── depends on 11
Task 13 (utility tools) ───── depends on 4,11
Task 14 (MCP server) ──────── depends on 9,10,12,13
Task 15 (integration tests) ─ depends on 14
Task 16 (docs) ───────────── depends on 14
```

Tasks 2-5 can run in parallel after Task 1.
Tasks 6-8 can run in parallel.
Tasks 9-13 can partially overlap.
Tasks 14-16 are sequential at the end.
