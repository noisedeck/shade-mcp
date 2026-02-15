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
