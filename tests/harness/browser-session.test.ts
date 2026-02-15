import { describe, it, expect } from 'vitest'
import type { BrowserSessionOptions, ViewerGlobals } from '../../src/harness/types.js'
import { DEFAULT_GLOBALS } from '../../src/harness/types.js'

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

  it('DEFAULT_GLOBALS has shade prefix', () => {
    expect(DEFAULT_GLOBALS.canvasRenderer).toBe('__shadeCanvasRenderer')
    expect(DEFAULT_GLOBALS.renderingPipeline).toBe('__shadeRenderingPipeline')
    expect(DEFAULT_GLOBALS.currentBackend).toBe('__shadeCurrentBackend')
    expect(DEFAULT_GLOBALS.currentEffect).toBe('__shadeCurrentEffect')
    expect(DEFAULT_GLOBALS.setPaused).toBe('__shadeSetPaused')
    expect(DEFAULT_GLOBALS.setPausedTime).toBe('__shadeSetPausedTime')
    expect(DEFAULT_GLOBALS.frameCount).toBe('__shadeFrameCount')
  })
})
