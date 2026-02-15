import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses default values when no env vars set', async () => {
    const { getConfig } = await import('../config.js')
    const config = getConfig()
    expect(config.viewerPort).toBe(4173)
    expect(config.defaultBackend).toBe('webgl2')
  })

  it('reads SHADE_EFFECTS_DIR from env', async () => {
    vi.stubEnv('SHADE_EFFECTS_DIR', '/custom/effects')
    const { getConfig } = await import('../config.js')
    const config = getConfig()
    expect(config.effectsDir).toBe('/custom/effects')
  })

  it('reads SHADE_VIEWER_PORT from env', async () => {
    vi.stubEnv('SHADE_VIEWER_PORT', '8080')
    const { getConfig } = await import('../config.js')
    const config = getConfig()
    expect(config.viewerPort).toBe(8080)
  })

  it('reads SHADE_BACKEND from env', async () => {
    vi.stubEnv('SHADE_BACKEND', 'webgpu')
    const { getConfig } = await import('../config.js')
    const config = getConfig()
    expect(config.defaultBackend).toBe('webgpu')
  })
})
