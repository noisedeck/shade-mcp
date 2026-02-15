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
  })
})
