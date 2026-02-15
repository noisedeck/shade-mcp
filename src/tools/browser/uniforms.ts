import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import { getConfig } from '../../config.js'
import { resolveEffectIds } from '../resolve-effects.js'

export const testUniformResponsivenessSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
}

export async function testUniformResponsiveness(
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
      return (s?.textContent || '').toLowerCase().includes('loaded') || (s?.textContent || '').toLowerCase().includes('ready')
    }, { timeout: 30000 })

    // Pause animation for deterministic testing
    await page.evaluate((globals) => {
      const w = window as any
      if (w[globals.setPaused]) w[globals.setPaused](true)
      if (w[globals.setPausedTime]) w[globals.setPausedTime](0)
    }, session.globals)

    const result = await page.evaluate((globals) => {
      const w = window as any
      const pipeline = w[globals.renderingPipeline]
      const effect = w[globals.currentEffect]
      if (!pipeline || !effect?.instance?.globals) {
        return { status: 'error', tested_uniforms: [], details: 'No effect loaded' }
      }

      const renderer = w[globals.canvasRenderer]
      const gl = pipeline.backend?.gl

      function captureMetrics() {
        if (!renderer || !gl) return null
        renderer.render(0)
        const canvas = renderer.canvas
        const width = canvas.width, height = canvas.height
        const pixels = new Uint8Array(width * height * 4)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        const count = width * height
        let sumR = 0, sumG = 0, sumB = 0
        for (let i = 0; i < pixels.length; i += 4) {
          sumR += pixels[i] / 255; sumG += pixels[i + 1] / 255; sumB += pixels[i + 2] / 255
        }
        return [sumR / count, sumG / count, sumB / count]
      }

      const baseline = captureMetrics()
      if (!baseline) return { status: 'error', tested_uniforms: [], details: 'Failed to capture baseline' }

      const effectGlobals = effect.instance.globals
      const tested: string[] = []
      let anyResponded = false

      for (const [name, spec] of Object.entries(effectGlobals) as any[]) {
        if (!spec.uniform) continue
        if (spec.type === 'boolean' || spec.type === 'button') continue
        if (typeof spec.min !== 'number' || typeof spec.max !== 'number' || spec.min === spec.max) continue

        const defaultVal = spec.default ?? spec.min
        const range = spec.max - spec.min
        let testVal = defaultVal === spec.min ? spec.min + range * 0.75 : spec.min + range * 0.25
        if (spec.type === 'int') testVal = Math.round(testVal)

        if (pipeline.setUniform) pipeline.setUniform(spec.uniform, testVal)
        else if (pipeline.globalUniforms) pipeline.globalUniforms[spec.uniform] = testVal

        const testMetrics = captureMetrics()
        if (testMetrics) {
          const lumaDiff = Math.abs(
            (testMetrics[0] + testMetrics[1] + testMetrics[2]) / 3 -
            (baseline[0] + baseline[1] + baseline[2]) / 3
          )
          const maxChannelDiff = Math.max(
            Math.abs(testMetrics[0] - baseline[0]),
            Math.abs(testMetrics[1] - baseline[1]),
            Math.abs(testMetrics[2] - baseline[2])
          )
          if (lumaDiff > 0.002 || maxChannelDiff > 0.002) {
            anyResponded = true
            tested.push(`${name}:pass`)
          } else {
            tested.push(`${name}:fail`)
          }
        } else {
          tested.push(`${name}:error`)
        }

        // Restore default
        if (pipeline.setUniform) pipeline.setUniform(spec.uniform, defaultVal)
        else if (pipeline.globalUniforms) pipeline.globalUniforms[spec.uniform] = defaultVal
      }

      return {
        status: anyResponded ? 'ok' : (tested.length === 0 ? 'skipped' : 'error'),
        tested_uniforms: tested,
        details: anyResponded ? 'Uniforms affect output' : (tested.length === 0 ? 'No testable uniforms' : 'No uniforms affected output')
      }
    }, session.globals)

    // Resume animation
    await page.evaluate((globals) => {
      const w = window as any
      if (w[globals.setPaused]) w[globals.setPaused](false)
    }, session.globals)

    return result
  })
}

export function registerTestUniformResponsiveness(server: McpServer): void {
  server.tool(
    'testUniformResponsiveness',
    'For each uniform: render baseline, modify value, compare output. Returns per-uniform pass/fail.',
    testUniformResponsivenessSchema,
    async (args: any) => {
      const config = getConfig()
      const effectIds = resolveEffectIds(args, config.effectsDir)
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const results = []
        for (const id of effectIds) {
          try {
            results.push({ effect_id: id, ...await testUniformResponsiveness(session, id) })
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
