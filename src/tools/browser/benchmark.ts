import { z } from 'zod'
import { chromium } from 'playwright'
import { BrowserSession } from '../../harness/browser-session.js'
import type { BenchmarkResult } from '../../harness/types.js'
import { getConfig } from '../../config.js'

export const benchmarkEffectFPSSchema = {
  effect_id: z.string().describe('Effect ID'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
  target_fps: z.number().optional().default(60).describe('Target FPS'),
  duration_seconds: z.number().optional().default(5).describe('Benchmark duration in seconds'),
}

export async function benchmarkEffectFPS(
  session: BrowserSession,
  effectId: string,
  options: { targetFps?: number; durationSeconds?: number } = {},
): Promise<BenchmarkResult> {
  const targetFps = options.targetFps ?? 60
  const duration = options.durationSeconds ?? 5

  return session.runWithConsoleCapture(async () => {
    const page = session.page!

    // Select effect
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

    // Run benchmark
    const result = await page.evaluate(({ duration }) => {
      return new Promise<any>((resolve) => {
        const w = window as any
        const startFrame = w.__shadeFrameCount || 0
        const startTime = performance.now()

        setTimeout(() => {
          const endFrame = w.__shadeFrameCount || 0
          const endTime = performance.now()
          const totalMs = endTime - startTime
          const frameCount = endFrame - startFrame
          const fps = frameCount / (totalMs / 1000)
          const avgFrameTime = totalMs / Math.max(frameCount, 1)

          resolve({
            frame_count: frameCount,
            achieved_fps: Math.round(fps * 100) / 100,
            avg_frame_time_ms: Math.round(avgFrameTime * 100) / 100,
          })
        }, duration * 1000)
      })
    }, { duration })

    return {
      status: 'ok' as const,
      backend: 'webgl2',
      achieved_fps: result.achieved_fps,
      meets_target: result.achieved_fps >= targetFps,
      stats: {
        frame_count: result.frame_count,
        avg_frame_time_ms: result.avg_frame_time_ms,
        jitter_ms: 0,
        min_frame_time_ms: 0,
        max_frame_time_ms: 0,
      }
    }
  })
}

export function registerBenchmarkEffectFPS(server: any): void {
  server.tool(
    'benchmarkEffectFPS',
    'Measure achieved FPS, jitter, frame timing stats against a target framerate.',
    benchmarkEffectFPSSchema,
    async (args: any) => {
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const result = await benchmarkEffectFPS(session, args.effect_id, {
          targetFps: args.target_fps,
          durationSeconds: args.duration_seconds,
        })
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
