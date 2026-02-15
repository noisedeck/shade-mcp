import { z } from 'zod'
import { BrowserSession } from '../../harness/browser-session.js'
import type { ParityResult } from '../../harness/types.js'
import { getConfig } from '../../config.js'

export const testPixelParitySchema = {
  effect_id: z.string().describe('Effect ID'),
  epsilon: z.number().optional().default(1).describe('Allowed per-channel difference (0-255)'),
}

export async function testPixelParity(
  session: BrowserSession,
  effectId: string,
  options: { epsilon?: number } = {},
): Promise<ParityResult> {
  const epsilon = options.epsilon ?? 1

  // Capture with WebGL2
  await session.setBackend('webgl2')
  await session.page!.evaluate((id) => {
    const select = document.getElementById('effect-select') as HTMLSelectElement
    if (select) { select.value = id; select.dispatchEvent(new Event('change')) }
  }, effectId)

  await session.page!.waitForFunction(() => {
    const s = document.getElementById('status')
    return (s?.textContent || '').toLowerCase().includes('loaded') || (s?.textContent || '').toLowerCase().includes('ready')
  }, { timeout: 30000 })

  // Pause and render at time=0
  await session.page!.evaluate(() => {
    const w = window as any
    if (w.__shadeSetPaused) w.__shadeSetPaused(true)
    if (w.__shadeSetPausedTime) w.__shadeSetPausedTime(0)
  })

  const glslPixels = await session.page!.evaluate(() => {
    const w = window as any
    const renderer = w.__shadeCanvasRenderer
    const pipeline = w.__shadeRenderingPipeline
    if (!renderer || !pipeline?.backend?.gl) return null
    renderer.render(0)
    const gl = pipeline.backend.gl
    const canvas = renderer.canvas
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return { data: Array.from(pixels), width: canvas.width, height: canvas.height }
  })

  if (!glslPixels) {
    return { status: 'error', maxDiff: 0, meanDiff: 0, mismatchCount: 0, mismatchPercent: 0, resolution: [0, 0], details: 'Failed to capture WebGL2' }
  }

  // Switch to WebGPU and capture
  await session.setBackend('webgpu')

  await session.page!.evaluate(() => {
    const w = window as any
    if (w.__shadeSetPausedTime) w.__shadeSetPausedTime(0)
  })

  const wgslPixels = await session.page!.evaluate(() => {
    const w = window as any
    const renderer = w.__shadeCanvasRenderer
    const pipeline = w.__shadeRenderingPipeline
    if (!renderer || !pipeline?.backend?.gl) return null
    renderer.render(0)
    const gl = pipeline.backend.gl
    const canvas = renderer.canvas
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    return { data: Array.from(pixels), width: canvas.width, height: canvas.height }
  })

  // Resume
  await session.page!.evaluate(() => {
    const w = window as any
    if (w.__shadeSetPaused) w.__shadeSetPaused(false)
  })

  if (!wgslPixels) {
    return { status: 'error', maxDiff: 0, meanDiff: 0, mismatchCount: 0, mismatchPercent: 0, resolution: [glslPixels.width, glslPixels.height], details: 'Failed to capture WebGPU' }
  }

  // Compare pixels
  let maxDiff = 0
  let totalDiff = 0
  let mismatchCount = 0
  const totalChannels = glslPixels.data.length

  for (let i = 0; i < totalChannels; i++) {
    const diff = Math.abs(glslPixels.data[i] - wgslPixels.data[i])
    if (diff > maxDiff) maxDiff = diff
    totalDiff += diff
    if (diff > epsilon) mismatchCount++
  }

  const meanDiff = totalDiff / totalChannels
  const mismatchPercent = (mismatchCount / totalChannels) * 100

  return {
    status: mismatchPercent < 1 ? 'ok' : 'mismatch',
    maxDiff,
    meanDiff: Math.round(meanDiff * 100) / 100,
    mismatchCount,
    mismatchPercent: Math.round(mismatchPercent * 100) / 100,
    resolution: [glslPixels.width, glslPixels.height],
    details: mismatchPercent < 1
      ? `Pixel parity OK (maxDiff=${maxDiff}, meanDiff=${meanDiff.toFixed(2)})`
      : `Pixel mismatch: ${mismatchPercent.toFixed(1)}% channels differ by >${epsilon}`
  }
}

export function registerTestPixelParity(server: any): void {
  server.tool(
    'testPixelParity',
    'Render on both WebGL2 and WebGPU, compare pixel-by-pixel within epsilon tolerance.',
    testPixelParitySchema,
    async (args: any) => {
      const session = new BrowserSession({ backend: 'webgl2' })
      try {
        await session.setup()
        const result = await testPixelParity(session, args.effect_id, { epsilon: args.epsilon })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
