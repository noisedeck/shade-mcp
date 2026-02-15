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

  it('exports DEFAULT_GLOBALS', async () => {
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
