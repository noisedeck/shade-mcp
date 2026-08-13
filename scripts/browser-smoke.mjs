// Drives the built MCP server against a real viewer and asserts the browser
// tools actually work end to end.
//
// The unit suite covers the harness in isolation with Playwright mocked, so it
// cannot catch a broken viewer configuration — the failure that motivated this
// script was a documented SHADE_VIEWER_ROOT that made every browser tool time
// out while every unit test stayed green.
//
// Usage: NOISEMAKER=/path/to/noisemaker node scripts/browser-smoke.mjs
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const NM = process.env.NOISEMAKER
if (!NM || !existsSync(`${NM}/demo/shaders/index.html`)) {
  console.error(`browser-smoke: set NOISEMAKER to a noisemaker checkout (got ${NM || 'unset'})`)
  process.exit(2)
}

const server = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    SHADE_EFFECTS_DIR: `${NM}/shaders/effects`,
    SHADE_PROJECT_ROOT: NM,
    // The viewer page lives in demo/shaders but imports the engine from
    // shaders/src at the repository root, so the root is what gets served.
    SHADE_VIEWER_ROOT: NM,
    SHADE_VIEWER_PATH: '/demo/shaders/',
    SHADE_GLOBALS_PREFIX: '__noisemaker',
    SHADE_HEADLESS: '1',
  },
})

let buf = ''
let nextId = 0
const pending = new Map()
server.stdout.on('data', chunk => {
  buf += chunk
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i)
    buf = buf.slice(i + 1)
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
    } catch { /* not a protocol line */ }
  }
})

const rpc = (method, params) => new Promise((resolve, reject) => {
  const id = ++nextId
  const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 180000)
  pending.set(id, msg => { clearTimeout(timer); resolve(msg) })
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
})

const init = await rpc('initialize', {
  protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'browser-smoke', version: '0' },
})
console.log(`browser-smoke: connected to ${init.result?.serverInfo?.name} ${init.result?.serverInfo?.version}`)
server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')

const checks = [
  ['compileEffect', { effect_id: 'synth/cell', backend: 'webgl2' }],
  ['renderEffectFrame', { effect_id: 'synth/cell', backend: 'webgl2' }],
]

let failed = 0
for (const [name, args] of checks) {
  const started = Date.now()
  const res = await rpc('tools/call', { name, arguments: args })
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  const text = res.result?.content?.[0]?.text ?? ''
  let payload
  try { payload = JSON.parse(text) } catch { payload = null }
  const ok = res.result?.isError !== true && payload?.status === 'ok'
  if (!ok) failed++
  console.log(`browser-smoke: ${ok ? 'PASS' : 'FAIL'} ${name} (${secs}s) ${ok ? '' : text.slice(0, 200)}`)
}

server.kill()

// The consumer pattern, which the MCP tools above do not exercise.
//
// noisemaker and portable do not call tools over stdio — they import
// dist/harness directly, build their own page with page.setContent(), and
// import the renderer from the harness server as an ES module. A setContent
// page's origin is the string "null", so that import is a cross-origin
// request. Dropping the server's CORS header in 0.2.0 made every one of their
// tests hang on a renderer global that never appeared, while shade-mcp's own
// suite stayed green.
const { acquireServer, releaseServer } = await import('../dist/harness/index.js')
const { chromium } = await import('playwright')

let consumerOk = false
const baseUrl = await acquireServer(0, NM, `${NM}/shaders/effects`)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent(
    `<canvas id="canvas"></canvas><script type="module">
       import { CanvasRenderer } from '${baseUrl}/shaders/src/index.js'
       window.__consumerLoaded = typeof CanvasRenderer === 'function'
     </script>`,
    { waitUntil: 'load' },
  )
  await page.waitForFunction(() => window.__consumerLoaded === true, null, { timeout: 30000 })
  consumerOk = true
} catch (err) {
  console.log(`browser-smoke: FAIL module import from a setContent page — ${String(err).split('\n')[0]}`)
} finally {
  await browser.close()
  await releaseServer()
}
if (!consumerOk) failed++
else console.log('browser-smoke: PASS module import from a setContent page')

if (failed) {
  console.error(`browser-smoke: ${failed} check(s) failed`)
  process.exit(1)
}
console.log(`browser-smoke: all ${checks.length + 1} checks OK`)
process.exit(0)
