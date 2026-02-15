import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import type { ParityResult } from '../../harness/types.js'
import { getConfig } from '../../config.js'
import { resolveEffectIds } from '../resolve-effects.js'

export const testPixelParitySchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
  epsilon: z.number().optional().default(1).describe('Allowed per-channel difference (0-255)'),
  seed: z.number().optional().default(42).describe('Random seed for reproducible noise'),
}

// Capture pixels from the canvas, handling both WebGL and WebGPU backends.
// WebGL: gl.readPixels (bottom-up, flipped to top-down)
// WebGPU: canvas 2D getImageData fallback (already top-down)
const CAPTURE_PIXELS_FN = `
function capturePixels(globals) {
  var w = window;
  var renderer = w[globals.canvasRenderer];
  var pipeline = w[globals.renderingPipeline];
  if (!renderer) return null;

  renderer.render(0);
  var canvas = renderer.canvas;
  var width = canvas.width, height = canvas.height;

  // Try WebGL readPixels
  var gl = pipeline && pipeline.backend && pipeline.backend.gl;
  if (gl) {
    var pixels = new Uint8Array(width * height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // Flip Y to top-down for consistent comparison
    var flipped = new Uint8Array(width * height * 4);
    var rowBytes = width * 4;
    for (var y = 0; y < height; y++) {
      flipped.set(pixels.subarray((height - 1 - y) * rowBytes, (height - y) * rowBytes), y * rowBytes);
    }
    return { data: Array.from(flipped), width: width, height: height };
  }

  // Fallback: canvas 2D context (works for WebGPU)
  var tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = width;
  tmpCanvas.height = height;
  var ctx = tmpCanvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(canvas, 0, 0);
  var imageData = ctx.getImageData(0, 0, width, height);
  return { data: Array.from(imageData.data), width: width, height: height };
}
`

export async function testPixelParity(
  session: BrowserSession,
  effectId: string,
  options: { epsilon?: number; seed?: number } = {},
): Promise<ParityResult> {
  const epsilon = options.epsilon ?? 1
  const seed = options.seed ?? 42

  // Capture with WebGL2
  await session.setBackend('webgl2')
  await session.page!.evaluate((id) => {
    const select = document.getElementById('effect-select') as HTMLSelectElement
    if (select) { select.value = id; select.dispatchEvent(new Event('change')) }
  }, effectId)

  await session.page!.waitForFunction(() => {
    const s = document.getElementById('status')
    const t = (s?.textContent || '').toLowerCase()
    return t.includes('loaded') || t.includes('compiled') || t.includes('ready')
  }, { timeout: 30000 })

  // Pause, set seed, and render at time=0
  await session.page!.evaluate(({ globals, seed }) => {
    const w = window as any
    if (w[globals.setPaused]) w[globals.setPaused](true)
    if (w[globals.setPausedTime]) w[globals.setPausedTime](0)
    const pipeline = w[globals.renderingPipeline]
    if (pipeline) {
      if (pipeline.globalUniforms) pipeline.globalUniforms.seed = seed
      const passes = pipeline.graph?.passes || []
      for (const pass of passes) {
        if (pass.uniforms) pass.uniforms.seed = seed
      }
    }
  }, { globals: session.globals, seed })

  const glslPixels = await session.page!.evaluate(
    new Function('globals', CAPTURE_PIXELS_FN + 'return capturePixels(globals);') as (g: any) => any,
    session.globals
  )

  if (!glslPixels) {
    return { status: 'error', maxDiff: 0, meanDiff: 0, mismatchCount: 0, mismatchPercent: 0, resolution: [0, 0], details: 'Failed to capture WebGL2' }
  }

  // Switch to WebGPU and capture
  await session.setBackend('webgpu')

  await session.page!.evaluate(({ globals, seed }) => {
    const w = window as any
    if (w[globals.setPausedTime]) w[globals.setPausedTime](0)
    const pipeline = w[globals.renderingPipeline]
    if (pipeline) {
      if (pipeline.globalUniforms) pipeline.globalUniforms.seed = seed
      const passes = pipeline.graph?.passes || []
      for (const pass of passes) {
        if (pass.uniforms) pass.uniforms.seed = seed
      }
    }
  }, { globals: session.globals, seed })

  const wgslPixels = await session.page!.evaluate(
    new Function('globals', CAPTURE_PIXELS_FN + 'return capturePixels(globals);') as (g: any) => any,
    session.globals
  )

  // Resume
  await session.page!.evaluate((globals) => {
    const w = window as any
    if (w[globals.setPaused]) w[globals.setPaused](false)
  }, session.globals)

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

export function registerTestPixelParity(server: McpServer): void {
  server.tool(
    'testPixelParity',
    'Render on both WebGL2 and WebGPU, compare pixel-by-pixel within epsilon tolerance.',
    testPixelParitySchema,
    async (args: any) => {
      const config = getConfig()
      const effectIds = resolveEffectIds(args, config.effectsDir)
      const session = new BrowserSession({ backend: 'webgl2' })
      try {
        await session.setup()
        const results = []
        for (const id of effectIds) {
          try {
            results.push({ effect_id: id, ...await testPixelParity(session, id, { epsilon: args.epsilon, seed: args.seed }) })
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
