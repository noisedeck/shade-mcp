import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserSession } from '../harness/browser-session.js'

vi.mock('../tools/browser/render.js', () => ({ renderEffectFrame: vi.fn() }))
vi.mock('../ai/provider.js', () => ({
  getAIProvider: () => ({ provider: 'test', apiKey: 'k', model: 'm' }),
  callAI: vi.fn(),
  NO_AI_KEY_MESSAGE: 'No AI API key found.',
}))

import { renderEffectFrame } from '../tools/browser/render.js'
import { callAI } from '../ai/provider.js'
import { describeEffectFrame } from '../tools/browser/describe.js'

const session = {} as BrowserSession
const IMAGE = 'data:image/png;base64,AAAA'

describe('describeEffectFrame', () => {
  beforeEach(() => {
    vi.mocked(renderEffectFrame).mockReset()
    vi.mocked(callAI).mockReset()
    vi.mocked(callAI).mockResolvedValue(JSON.stringify({ description: 'blue', tags: ['blue'] }))
  })

  it('reports why the render failed instead of a generic message', async () => {
    vi.mocked(renderEffectFrame).mockResolvedValue({
      status: 'error',
      error: 'WebGPU adapter unavailable',
    } as any)

    const result = await describeEffectFrame(session, 'synth/noise', 'describe it')

    expect(result.status).toBe('error')
    expect(result.error).toContain('WebGPU adapter unavailable')
  })

  it('leaves the captured image out of the result by default', async () => {
    vi.mocked(renderEffectFrame).mockResolvedValue({
      status: 'ok',
      frame: { image_uri: IMAGE, width: 8, height: 8 },
    } as any)

    const result = await describeEffectFrame(session, 'synth/noise', 'describe it')

    expect(result.status).toBe('ok')
    expect(result.vision.description).toBe('blue')
    expect(JSON.stringify(result)).not.toContain('data:image/png')
  })

  it('returns the image when the caller asks for it', async () => {
    vi.mocked(renderEffectFrame).mockResolvedValue({
      status: 'ok',
      frame: { image_uri: IMAGE, width: 8, height: 8 },
    } as any)

    const result = await describeEffectFrame(session, 'synth/noise', 'describe it', { captureImage: true })

    expect(result.frame.image_uri).toBe(IMAGE)
  })

  it('normalizes model output that is not an object', async () => {
    vi.mocked(renderEffectFrame).mockResolvedValue({
      status: 'ok',
      frame: { image_uri: IMAGE, width: 8, height: 8 },
    } as any)
    vi.mocked(callAI).mockResolvedValue('"just a bare string"')

    const result = await describeEffectFrame(session, 'synth/noise', 'describe it')

    expect(result.vision).toMatchObject({ description: expect.any(String) })
  })
})
