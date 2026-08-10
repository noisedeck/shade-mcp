import { describe, it, expect } from 'vitest'
import type { BrowserSession } from '../harness/browser-session.js'
import { DEFAULT_GLOBALS } from '../harness/types.js'
import { benchmarkEffectFPS } from '../tools/browser/benchmark.js'
import { testUniformResponsiveness } from '../tools/browser/uniforms.js'
import { testNoPassthrough } from '../tools/browser/passthrough.js'

/**
 * The viewer starts on its own default backend, so a tool that reports results
 * as `session.backend` has to put the viewer on that backend first. The page
 * stub aborts at the first evaluate, which is all the ordering contract needs.
 */
function fakeSession(backend: 'webgl2' | 'webgpu') {
  const setBackendCalls: string[] = []
  const session = {
    backend,
    globals: DEFAULT_GLOBALS,
    page: {
      evaluate: async () => { throw new Error('stop-here') },
      waitForFunction: async () => {},
      setViewportSize: async () => {},
    },
    async setBackend(b: string) { setBackendCalls.push(b) },
    async runWithConsoleCapture<T>(fn: () => Promise<T>): Promise<T> { return fn() },
  }
  return { session: session as unknown as BrowserSession, setBackendCalls }
}

describe('browser tools select the requested backend', () => {
  it('benchmarkEffectFPS switches the viewer before measuring', async () => {
    const { session, setBackendCalls } = fakeSession('webgpu')
    await expect(benchmarkEffectFPS(session, 'synth/noise')).rejects.toThrow('stop-here')
    expect(setBackendCalls).toEqual(['webgpu'])
  })

  it('testUniformResponsiveness switches the viewer before rendering', async () => {
    const { session, setBackendCalls } = fakeSession('webgpu')
    await expect(testUniformResponsiveness(session, 'synth/noise')).rejects.toThrow('stop-here')
    expect(setBackendCalls).toEqual(['webgpu'])
  })

  it('testNoPassthrough switches the viewer before comparing', async () => {
    const { session, setBackendCalls } = fakeSession('webgpu')
    await expect(testNoPassthrough(session, 'synth/noise')).rejects.toThrow('stop-here')
    expect(setBackendCalls).toEqual(['webgpu'])
  })
})
