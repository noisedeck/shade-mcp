import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import type { RenderResult } from '../../harness/types.js'
import { getConfig } from '../../config.js'
import { resolveEffectIds } from '../resolve-effects.js'

export const renderEffectFrameSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
  warmup_frames: z.number().optional().default(10).describe('Frames to wait before capture'),
  capture_image: z.boolean().optional().default(false).describe('Capture PNG data URI'),
  uniforms: z.record(z.number()).optional().describe('Uniform overrides'),
}

export async function renderEffectFrame(
  session: BrowserSession,
  effectId: string,
  options: { warmupFrames?: number; captureImage?: boolean; uniforms?: Record<string, number> } = {},
): Promise<RenderResult> {
  return session.runWithConsoleCapture(async () => {
    const page = session.page!

    // Select and compile effect
    await page.evaluate((id) => {
      const select = document.getElementById('effect-select') as HTMLSelectElement
      if (select) { select.value = id; select.dispatchEvent(new Event('change')) }
    }, effectId)

    // Wait for compile
    await page.waitForFunction(() => {
      const s = document.getElementById('status')
      const t = (s?.textContent || '').toLowerCase()
      return t.includes('loaded') || t.includes('ready') || t.includes('error')
    }, { timeout: 30000 })

    // Apply uniforms
    if (options.uniforms) {
      await page.evaluate((unis) => {
        const pipeline = (window as any).__shadeRenderingPipeline
        if (!pipeline) return
        for (const [k, v] of Object.entries(unis)) {
          if (pipeline.setUniform) pipeline.setUniform(k, v)
          else if (pipeline.globalUniforms) pipeline.globalUniforms[k] = v
        }
      }, options.uniforms)
    }

    // Wait for warmup frames
    const warmup = options.warmupFrames ?? 10
    await page.evaluate((frames) => {
      return new Promise<void>((resolve) => {
        const start = (window as any).__shadeFrameCount || 0
        const poll = () => {
          const current = (window as any).__shadeFrameCount || 0
          if (current - start >= frames) resolve()
          else requestAnimationFrame(poll)
        }
        poll()
      })
    }, warmup)

    // Read pixels and compute metrics
    const result = await page.evaluate((captureImage) => {
      const renderer = (window as any).__shadeCanvasRenderer
      const pipeline = (window as any).__shadeRenderingPipeline
      if (!renderer || !pipeline) return { status: 'error', backend: 'unknown', error: 'No renderer' }

      const canvas = renderer.canvas
      const gl = pipeline.backend?.gl

      let pixels: Uint8Array | null = null
      let width = canvas.width, height = canvas.height

      if (gl) {
        pixels = new Uint8Array(width * height * 4)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      }

      if (!pixels) return { status: 'error', backend: 'unknown', error: 'Failed to read pixels' }

      // Compute metrics
      const pixelCount = width * height
      const stride = Math.max(1, Math.floor(pixelCount / 1000))
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0
      let sumR2 = 0, sumG2 = 0, sumB2 = 0
      let samples = 0
      const colorSet = new Set<string>()

      for (let i = 0; i < pixelCount; i += stride) {
        const idx = i * 4
        const r = pixels[idx] / 255, g = pixels[idx + 1] / 255, b = pixels[idx + 2] / 255, a = pixels[idx + 3] / 255
        sumR += r; sumG += g; sumB += b; sumA += a
        sumR2 += r * r; sumG2 += g * g; sumB2 += b * b
        colorSet.add(`${pixels[idx]},${pixels[idx + 1]},${pixels[idx + 2]}`)
        samples++
      }

      const meanR = sumR / samples, meanG = sumG / samples, meanB = sumB / samples
      const stdR = Math.sqrt(sumR2 / samples - meanR * meanR)
      const stdG = Math.sqrt(sumG2 / samples - meanG * meanG)
      const stdB = Math.sqrt(sumB2 / samples - meanB * meanB)
      const luma = 0.299 * meanR + 0.587 * meanG + 0.114 * meanB
      let lumaVar = 0
      for (let i = 0; i < pixelCount; i += stride) {
        const idx = i * 4
        const l = 0.299 * pixels[idx] / 255 + 0.587 * pixels[idx + 1] / 255 + 0.114 * pixels[idx + 2] / 255
        lumaVar += (l - luma) * (l - luma)
      }
      lumaVar /= samples

      const isAllZero = meanR === 0 && meanG === 0 && meanB === 0
      const isAllTransparent = sumA / samples < 0.01
      const isBlank = lumaVar < 0.0001
      const isMono = colorSet.size <= 1

      let imageUri: string | null = null
      if (captureImage) {
        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = width; tmpCanvas.height = height
        const ctx = tmpCanvas.getContext('2d')!
        const imgData = ctx.createImageData(width, height)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((height - 1 - y) * width + x) * 4
            const dstIdx = (y * width + x) * 4
            imgData.data[dstIdx] = pixels[srcIdx]
            imgData.data[dstIdx + 1] = pixels[srcIdx + 1]
            imgData.data[dstIdx + 2] = pixels[srcIdx + 2]
            imgData.data[dstIdx + 3] = pixels[srcIdx + 3]
          }
        }
        ctx.putImageData(imgData, 0, 0)
        imageUri = tmpCanvas.toDataURL('image/png')
      }

      return {
        status: 'ok' as const,
        backend: pipeline.backend?.getName?.() || 'unknown',
        frame: { image_uri: imageUri, width, height },
        metrics: {
          mean_rgb: [meanR, meanG, meanB] as [number, number, number],
          mean_alpha: sumA / samples,
          std_rgb: [stdR, stdG, stdB] as [number, number, number],
          luma_variance: lumaVar,
          unique_sampled_colors: colorSet.size,
          is_all_zero: isAllZero,
          is_all_transparent: isAllTransparent,
          is_essentially_blank: isBlank,
          is_monochrome: isMono
        }
      }
    }, options.captureImage ?? false)

    return result as RenderResult
  })
}

export function registerRenderEffectFrame(server: McpServer): void {
  server.tool(
    'renderEffectFrame',
    'Render single frame, compute image metrics (mean RGB, variance, monochrome/blank detection), optional PNG capture.',
    renderEffectFrameSchema,
    async (args: any) => {
      const config = getConfig()
      const effectIds = resolveEffectIds(args, config.effectsDir)
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const results = []
        for (const id of effectIds) {
          results.push(await renderEffectFrame(session, id, {
            warmupFrames: args.warmup_frames,
            captureImage: args.capture_image,
            uniforms: args.uniforms,
          }))
        }
        return { content: [{ type: 'text', text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
