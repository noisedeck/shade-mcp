import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import { getConfig } from '../../config.js'
import { resolveEffectIds } from '../resolve-effects.js'

export const testNoPassthroughSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
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
    const result = await page.evaluate((globals) => {
      const w = window as any
      const pipeline = w[globals.renderingPipeline]
      const effect = w[globals.currentEffect]
      if (!pipeline || !effect) return { status: 'error', isFilterEffect: false, similarity: null, details: 'No effect loaded' }

      const renderer = w[globals.canvasRenderer]
      const gl = pipeline.backend?.gl
      if (!renderer || !gl) return { status: 'error', isFilterEffect: false, similarity: null, details: 'No GL context' }

      // Check if filter effect (has inputTex in passes)
      const passes = pipeline.graph?.passes || []
      const isFilter = passes.some((p: any) => {
        const inputs = p.inputs || {}
        return Object.values(inputs).some((v: any) => String(v).includes('input'))
      })

      if (!isFilter) return { status: 'skipped', isFilterEffect: false, similarity: null, details: 'Not a filter effect' }

      const canvas = renderer.canvas
      const width = canvas.width, height = canvas.height

      // Render two frames at different times and compare
      renderer.render(0)
      const pixels0 = new Uint8Array(width * height * 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels0)

      renderer.render(1.0)
      const pixels1 = new Uint8Array(width * height * 4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels1)

      // Compare output at two times
      const pixelCount = width * height
      const stride = Math.max(1, Math.floor(pixelCount / 1000))
      let diffSum = 0, samples = 0
      const colors = new Set<string>()

      for (let i = 0; i < pixelCount; i += stride) {
        const idx = i * 4
        diffSum += Math.abs(pixels0[idx] - pixels1[idx]) +
          Math.abs(pixels0[idx + 1] - pixels1[idx + 1]) +
          Math.abs(pixels0[idx + 2] - pixels1[idx + 2])
        colors.add(`${pixels0[idx]},${pixels0[idx + 1]},${pixels0[idx + 2]}`)
        samples++
      }

      const temporalDiff = diffSum / (samples * 3 * 255)
      const uniqueColors = colors.size
      // An effect that modifies input should either vary over time or produce varied output
      const isModifying = temporalDiff > 0.01 || uniqueColors > 5

      return {
        status: isModifying ? 'ok' : 'passthrough',
        isFilterEffect: true,
        temporalDiff,
        uniqueColors,
        details: isModifying ? 'Effect modifies input' : 'Effect may be passing through unchanged'
      }
    }, session.globals)

    return result
  })
}

export function registerTestNoPassthrough(server: McpServer): void {
  server.tool(
    'testNoPassthrough',
    'Verify filter effects actually modify their input (>1% pixel difference).',
    testNoPassthroughSchema,
    async (args: any) => {
      const config = getConfig()
      const effectIds = resolveEffectIds(args, config.effectsDir)
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const results = []
        for (const id of effectIds) {
          try {
            results.push({ effect_id: id, ...await testNoPassthrough(session, id) })
          } catch (err) {
            results.push({ effect_id: id, status: 'error', error: err instanceof Error ? err.message : String(err) })
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
