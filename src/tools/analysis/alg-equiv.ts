import { z } from 'zod'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { getAIProvider, callAI, NO_AI_KEY_MESSAGE } from '../../ai/provider.js'
import { getConfig } from '../../config.js'

export const checkAlgEquivSchema = {
  effect_id: z.string().describe('Effect ID (e.g., "synth/noise")'),
}

export async function checkAlgEquiv(effectId: string): Promise<any> {
  const config = getConfig()
  const ai = getAIProvider({ projectRoot: config.projectRoot })
  if (!ai) return { status: 'error', error: NO_AI_KEY_MESSAGE }

  const effectDir = join(config.effectsDir, ...effectId.split('/'))
  const glslDir = join(effectDir, 'glsl')
  const wgslDir = join(effectDir, 'wgsl')

  if (!existsSync(glslDir) || !existsSync(wgslDir)) {
    return { status: 'error', error: 'Missing glsl/ or wgsl/ directory' }
  }

  const glslFiles = readdirSync(glslDir).filter(f => f.endsWith('.glsl'))
  const wgslFiles = readdirSync(wgslDir).filter(f => f.endsWith('.wgsl'))

  // Match pairs by base name
  const pairs: Array<{ program: string; glsl: string; wgsl: string }> = []
  const unmatchedGlsl: string[] = []
  const unmatchedWgsl: string[] = []

  const wgslMap = new Map(wgslFiles.map(f => [basename(f, '.wgsl'), f]))

  for (const gf of glslFiles) {
    const name = basename(gf, '.glsl')
    const wf = wgslMap.get(name)
    if (wf) {
      pairs.push({
        program: name,
        glsl: readFileSync(join(glslDir, gf), 'utf-8'),
        wgsl: readFileSync(join(wgslDir, wf), 'utf-8'),
      })
      wgslMap.delete(name)
    } else {
      unmatchedGlsl.push(name)
    }
  }
  for (const name of wgslMap.keys()) {
    unmatchedWgsl.push(name)
  }

  if (pairs.length === 0) {
    return { status: 'error', error: 'No matching GLSL/WGSL pairs found' }
  }

  // Read definition for context
  let defContext = ''
  try {
    const defPath = existsSync(join(effectDir, 'definition.json'))
      ? join(effectDir, 'definition.json')
      : join(effectDir, 'definition.js')
    defContext = readFileSync(defPath, 'utf-8').slice(0, 1000)
  } catch {}

  // Compare each pair
  const results = []
  for (const pair of pairs) {
    const response = await callAI({
      system: 'You are an expert shader programmer. Compare GLSL and WGSL shader implementations for algorithmic equivalence. Ignore syntax differences. Respond with JSON: {parity: "equivalent"|"divergent", confidence: "high"|"medium"|"low", notes: string, concerns: string[]}',
      userContent: [
        { type: 'text', text: `Effect definition context:\n${defContext}\n\nGLSL (${pair.program}.glsl):\n${pair.glsl}\n\nWGSL (${pair.program}.wgsl):\n${pair.wgsl}\n\nAre these algorithmically equivalent?` }
      ],
      maxTokens: 500,
      jsonMode: true,
      ai,
    })

    let parsed: any = { parity: 'error', notes: 'Failed to analyze' }
    if (response) {
      try { parsed = JSON.parse(response) } catch { parsed = { parity: 'error', notes: response } }
    }

    results.push({ program: pair.program, ...parsed })
  }

  const divergent = results.filter(r => r.parity === 'divergent').length
  const status = divergent > 0 ? 'divergent' : 'ok'

  return {
    status,
    pairs: results,
    unmatchedGlsl: unmatchedGlsl.length > 0 ? unmatchedGlsl : undefined,
    unmatchedWgsl: unmatchedWgsl.length > 0 ? unmatchedWgsl : undefined,
    summary: `${results.length} pairs analyzed: ${results.length - divergent} equivalent, ${divergent} divergent`
  }
}

export function registerCheckAlgEquiv(server: any): void {
  server.tool(
    'checkAlgEquiv',
    'AI semantic comparison of GLSL/WGSL pairs. Flags truly divergent algorithms, ignores syntax differences.',
    checkAlgEquivSchema,
    async (args: any) => {
      const result = await checkAlgEquiv(args.effect_id)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )
}
