import { describe, it, expect, afterEach } from 'vitest'
import { acquireServer, releaseServer, getServerUrl, getRefCount } from '../harness/server-manager.js'
import { resolve } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { connect } from 'node:net'

/** Sends a request with a literal path, bypassing client-side URL normalization. */
function rawGet(port: number, rawPath: string): Promise<string> {
  return new Promise((resolveRaw, reject) => {
    let data = ''
    const socket = connect(port, '127.0.0.1', () => {
      socket.write(`GET ${rawPath} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`)
    })
    socket.setTimeout(4000, () => { socket.destroy(); resolveRaw(data) })
    socket.on('data', (chunk) => { data += chunk })
    socket.on('end', () => resolveRaw(data))
    socket.on('error', reject)
  })
}

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

    it('returns 404 for missing files', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/nonexistent.html`)
      expect(res.status).toBe(404)
    })

    it('serves flat layout effects via virtual nested path', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      // Create a flat layout in tmpEffects (definition.json at root)
      mkdirSync(tmpEffects, { recursive: true })
      writeFileSync(resolve(tmpEffects, 'definition.json'), '{"name":"flat"}')
      mkdirSync(resolve(tmpEffects, 'glsl'), { recursive: true })
      writeFileSync(resolve(tmpEffects, 'glsl/main.glsl'), 'void main(){}')

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      // The basename of tmpEffects is the virtual path component
      const effectName = tmpEffects.split('/').pop()

      // Should serve via virtual nested path
      const defRes = await fetch(`${url}/effects/${effectName}/definition.json`)
      expect(defRes.ok).toBe(true)
      const def = await defRes.json()
      expect(def.name).toBe('flat')

      const glslRes = await fetch(`${url}/effects/${effectName}/glsl/main.glsl`)
      expect(glslRes.ok).toBe(true)
      const glsl = await glslRes.text()
      expect(glsl).toContain('void main')

      // Should also serve at root /effects/ path
      const rootDef = await fetch(`${url}/effects/definition.json`)
      expect(rootDef.ok).toBe(true)
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

    it('rejects path traversal attempts', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      let blocked = false
      try {
        const res = await fetch(`${url}/effects/../../etc/passwd`)
        blocked = res.status === 403
      } catch {
        // Server closing connection on invalid path also counts as blocking
        blocked = true
      }
      expect(blocked).toBe(true)
    })

    it('does not send a wildcard CORS header', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '<h1>test</h1>')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/index.html`)
      expect(res.ok).toBe(true)
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    })

    it('survives malformed percent-encoding in the URL', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '<h1>test</h1>')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const bad = await fetch(`${url}/%`)
      expect(bad.status).toBe(400)

      // The server must still be alive for subsequent requests
      const good = await fetch(`${url}/index.html`)
      expect(good.ok).toBe(true)
    })

    it('rejects raw traversal into a sibling directory sharing the root prefix', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      mkdirSync(tmpEffects, { recursive: true })
      // Sibling whose path starts with the effects root string
      const sibling = tmpEffects + '-backup'
      mkdirSync(sibling, { recursive: true })
      writeFileSync(resolve(sibling, 'secret.json'), '{"key":"SHOULD-NOT-LEAK"}')

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const port = Number(new URL(url).port)
      const siblingName = sibling.split('/').pop()
      // Encoded slashes keep this from being parsed as a dot segment, so the
      // traversal reappears when the handler decodes the path after parsing.
      const raw = await rawGet(port, `/effects/..%2f${siblingName}%2fsecret.json`)
      expect(raw).not.toContain('SHOULD-NOT-LEAK')

      rmSync(sibling, { recursive: true, force: true })
    })

    it('serves viewer assets whose extension is not in the MIME table', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      writeFileSync(resolve(tmpDir, 'bundle.chunk'), 'CHUNK-PAYLOAD')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/bundle.chunk`)
      expect(res.ok).toBe(true)
      expect(await res.text()).toContain('CHUNK-PAYLOAD')
    })

    it('refuses to serve dotfiles from the viewer root', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '')
      writeFileSync(resolve(tmpDir, '.anthropic'), 'sk-ant-SHOULD-NOT-LEAK')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/.anthropic`)
      expect(res.ok).toBe(false)
      expect(await res.text()).not.toContain('SHOULD-NOT-LEAK')
    })

    it('strips query strings from URLs', async () => {
      mkdirSync(tmpDir, { recursive: true })
      writeFileSync(resolve(tmpDir, 'index.html'), '<h1>test</h1>')
      mkdirSync(tmpEffects, { recursive: true })

      const url = await acquireServer(testPort, tmpDir, tmpEffects)
      const res = await fetch(`${url}/index.html?v=123`)
      expect(res.ok).toBe(true)
      const text = await res.text()
      expect(text).toContain('<h1>test</h1>')
    })
  })
})
