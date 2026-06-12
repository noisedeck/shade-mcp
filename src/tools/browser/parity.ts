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
// WebGL: gl.readPixels (bottom-up) flipped to top-down.
// WebGPU: canvas 2D getImageData (already top-down).
// Both end up top-down (screen orientation), so a shader-level vertical
// inversion shows up as one image being the vertical mirror of the other —
// which the Y-flip detector below tests for explicitly.
const CAPTURE_PIXELS_FN = `
function capturePixels(globals) {
  var w = window;
  var renderer = w[globals.canvasRenderer];
  var pipeline = w[globals.renderingPipeline];
  if (!renderer) return null;

  // Render twice: the first render's present()/blit to the default
  // framebuffer can race a synchronous readback (preserveDrawingBuffer:false
  // clears it; the FBO->canvas blit may not have committed). A second render
  // guarantees the default framebuffer holds a complete, current frame before
  // we read it. Without this the WebGL2 capture is non-deterministic — the
  // same shader yields rich pixels one run and a near-blank buffer the next,
  // which made every parity number and Y-flip ratio unreliable.
  renderer.render(0);
  renderer.render(0);
  var canvas = renderer.canvas;
  var width = canvas.width, height = canvas.height;

  var gl = pipeline && pipeline.backend && pipeline.backend.gl;
  if (gl) {
    gl.finish(); // ensure all GPU work (incl. present blit) has completed
    var pixels = new Uint8Array(width * height * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    var flipped = new Uint8Array(width * height * 4);
    var rowBytes = width * 4;
    for (var y = 0; y < height; y++) {
      flipped.set(pixels.subarray((height - 1 - y) * rowBytes, (height - y) * rowBytes), y * rowBytes);
    }
    return { data: Array.from(flipped), width: width, height: height };
  }

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
  }, { timeout: 300000 })

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

  // Re-select the effect after backend switch so uniforms re-initialize from
  // effect defaults under the new backend; otherwise WebGL2-side state leaks
  // and we compare drifted uniforms.
  await session.page!.evaluate((id) => {
    const select = document.getElementById('effect-select') as HTMLSelectElement
    if (select) { select.value = id; select.dispatchEvent(new Event('change')) }
  }, effectId)

  await session.page!.waitForFunction(() => {
    const s = document.getElementById('status')
    const t = (s?.textContent || '').toLowerCase()
    return t.includes('loaded') || t.includes('compiled') || t.includes('ready')
  }, { timeout: 300000 })

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
  const w = glslPixels.width, h = glslPixels.height

  // Solid color detection: check variance for each backend
  function checkSolid(pixels: { data: number[], width: number, height: number }, label: string) {
    const n = pixels.width * pixels.height
    let rS = 0, gS = 0, bS = 0
    for (let i = 0; i < pixels.data.length; i += 4) { rS += pixels.data[i]; gS += pixels.data[i+1]; bS += pixels.data[i+2] }
    const rM = rS/n, gM = gS/n, bM = bS/n
    let rV = 0, gV = 0, bV = 0
    for (let i = 0; i < pixels.data.length; i += 4) {
      rV += (pixels.data[i]-rM)**2; gV += (pixels.data[i+1]-gM)**2; bV += (pixels.data[i+2]-bM)**2
    }
    rV /= n; gV /= n; bV /= n
    const isSolid = rV < 5 && gV < 5 && bV < 5
    return { label, isSolid, variance: [Math.round(rV), Math.round(gV), Math.round(bV)], mean: [Math.round(rM), Math.round(gM), Math.round(bM)] }
  }

  const glslSolid = checkSolid(glslPixels, 'glsl')
  const wgslSolid = checkSolid(wgslPixels, 'wgsl')

  // Y-flip detection.
  //
  // Compare GLSL against a VERTICALLY FLIPPED WGSL using BOTH a continuous
  // metric (mean absolute difference) and the thresholded channel count.
  // The count metric alone (diff > epsilon) is too noisy for noise fields and
  // its old `< mismatchPercent * 0.5` cutoff missed real inversions that also
  // carried minor coord/aspect differences. The MAD ratio is the reliable
  // signal: if flipping WGSL makes the average per-channel difference
  // substantially smaller than the un-flipped comparison, the render is
  // vertically inverted (fully or partially) between the two backends.
  let yFlipMismatch = 0
  let yFlipTotalDiff = 0
  const rowBytes = w * 4
  for (let y = 0; y < h; y++) {
    const glslRow = y
    const wgslFlippedRow = h - 1 - y
    for (let x = 0; x < rowBytes; x++) {
      const diff = Math.abs(glslPixels.data[glslRow * rowBytes + x] - wgslPixels.data[wgslFlippedRow * rowBytes + x])
      yFlipTotalDiff += diff
      if (diff > epsilon) yFlipMismatch++
    }
  }
  const yFlipPercent = (yFlipMismatch / totalChannels) * 100
  const yFlipMeanDiff = yFlipTotalDiff / totalChannels

  // meanDiff = average abs diff of the NORMAL (un-flipped) comparison.
  // Ratio < 1 means flipping improves the match. A real Y-flip drives the
  // flipped MAD far below the normal MAD; uncorrelated noise gives ratio ~1.
  const yFlipRatio = meanDiff > 0 ? yFlipMeanDiff / meanDiff : 1
  const isYFlipped =
    meanDiff > 2 &&                       // there is a real difference to explain
    yFlipMeanDiff < meanDiff &&           // flipping must actually help
    yFlipRatio < 0.7                      // and help substantially (>=30% lower MAD)
  const isCleanYFlip = meanDiff > 2 && yFlipRatio < 0.25

  const issues: string[] = []
  if (glslSolid.isSolid) issues.push(`GLSL SOLID COLOR (mean=${glslSolid.mean})`)
  if (wgslSolid.isSolid) issues.push(`WGSL SOLID COLOR (mean=${wgslSolid.mean})`)
  if (isYFlipped) {
    issues.push(
      `${isCleanYFlip ? 'Y-FLIP' : 'PARTIAL Y-FLIP'} DETECTED ` +
      `(flipped meanDiff=${yFlipMeanDiff.toFixed(2)} vs normal meanDiff=${meanDiff.toFixed(2)}, ` +
      `ratio=${yFlipRatio.toFixed(2)}, flip mismatch=${yFlipPercent.toFixed(1)}% vs normal=${mismatchPercent.toFixed(1)}%)`
    )
  }

  const status = mismatchPercent < 1 ? 'ok' : 'mismatch'

  return {
    status,
    maxDiff,
    meanDiff: Math.round(meanDiff * 100) / 100,
    mismatchCount,
    mismatchPercent: Math.round(mismatchPercent * 100) / 100,
    resolution: [w, h],
    glslSolid: glslSolid.isSolid,
    wgslSolid: wgslSolid.isSolid,
    glslVariance: glslSolid.variance,
    wgslVariance: wgslSolid.variance,
    yFlipDetected: isYFlipped,
    yFlipCleanFlip: isCleanYFlip,
    yFlipMismatchPercent: Math.round(yFlipPercent * 100) / 100,
    yFlipMeanDiff: Math.round(yFlipMeanDiff * 100) / 100,
    yFlipRatio: Math.round(yFlipRatio * 1000) / 1000,
    issues,
    details: issues.length > 0
      ? issues.join('; ')
      : mismatchPercent < 1
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
