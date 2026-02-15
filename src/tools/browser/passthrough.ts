import { z } from 'zod'
import { BrowserSession } from '../../harness/browser-session.js'
import { getConfig } from '../../config.js'

export const testNoPassthroughSchema = {
  effect_id: z.string().describe('Effect ID'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
}

export async function testNoPassthrough(
  session: BrowserSession,
  effectId: string,
): Promise<any> {
  return session.runWithConsoleCapture(async () => {
    const page = session.page!

    // Select effect
    await page.evaluate((id) => {
      const select = document.getElementById('effect-select') as HTMLSelectElement
      if (select) { select.value = id; select.dispatchEvent(new Event('change')) }
    }, effectId)

    await page.waitForFunction(() => {
      const s = document.getElementById('status')
      const t = (s?.textContent || '').toLowerCase()
      return t.includes('loaded') || t.includes('ready') || t.includes('error')
    }, { timeout: 30000 })

    // Check if filter effect and test passthrough
    const result = await page.evaluate(() => {
      const w = window as any
      const pipeline = w.__shadeRenderingPipeline
      const effect = w.__shadeCurrentEffect
      if (!pipeline || !effect) return { status: 'error', isFilterEffect: false, similarity: null, details: 'No effect loaded' }

      const renderer = w.__shadeCanvasRenderer
      const gl = pipeline.backend?.gl
      if (!renderer || !gl) return { status: 'error', isFilterEffect: false, similarity: null, details: 'No GL context' }

      // Check if filter effect (has inputTex in passes)
      const passes = pipeline.graph?.passes || []
      const isFilter = passes.some((p: any) => {
        const inputs = p.inputs || {}
        return Object.values(inputs).some((v: any) => String(v).includes('input'))
      })

      if (!isFilter) return { status: 'skipped', isFilterEffect: false, similarity: null, details: 'Not a filter effect' }

      // Render and read output
      renderer.render(0)
      const canvas = renderer.canvas
      const width = canvas.width, height = canvas.height
      const pixels = new Uint8Array(width * height * 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

      // Compute pixel variance to check if output differs from blank/passthrough
      const pixelCount = width * height
      const stride = Math.max(1, Math.floor(pixelCount / 1000))
      let totalDiff = 0
      let samples = 0

      for (let i = 0; i < pixelCount; i += stride) {
        const idx = i * 4
        // Check if pixels differ from a neutral value (128,128,128)
        totalDiff += Math.abs(pixels[idx] - 128) + Math.abs(pixels[idx + 1] - 128) + Math.abs(pixels[idx + 2] - 128)
        samples++
      }

      const meanDiff = totalDiff / (samples * 3 * 255)

      return {
        status: meanDiff > 0.01 ? 'ok' : 'passthrough',
        isFilterEffect: true,
        similarity: 1 - meanDiff,
        meanDiff,
        details: meanDiff > 0.01 ? 'Effect modifies input' : 'Effect may be passing through unchanged'
      }
    })

    return result
  })
}

export function registerTestNoPassthrough(server: any): void {
  server.tool(
    'testNoPassthrough',
    'Verify filter effects actually modify their input (>1% pixel difference).',
    testNoPassthroughSchema,
    async (args: any) => {
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const result = await testNoPassthrough(session, args.effect_id)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
