import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { getAIProvider, callAI, NO_AI_KEY_MESSAGE } from '../../ai/provider.js'
import { getConfig } from '../../config.js'

export const analyzeBranchingSchema = {
  effect_id: z.string().describe('Effect ID (e.g., "synth/noise")'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Which shader language to analyze'),
}

export async function analyzeBranching(effectId: string, backend: string): Promise<any> {
  const config = getConfig()
  const ai = getAIProvider({ projectRoot: config.projectRoot })
  if (!ai) return { status: 'error', error: NO_AI_KEY_MESSAGE }

  const effectDir = join(config.effectsDir, ...effectId.split('/'))
  const shaderDir = join(effectDir, backend === 'webgpu' ? 'wgsl' : 'glsl')
  const ext = backend === 'webgpu' ? '.wgsl' : '.glsl'

  if (!existsSync(shaderDir)) {
    return { status: 'error', error: `Shader directory not found: ${shaderDir}` }
  }

  const files = readdirSync(shaderDir).filter(f => f.endsWith(ext))
  if (files.length === 0) {
    return { status: 'error', error: 'No shader files found' }
  }

  // Read all shader sources
  const sources = files.map(f => ({
    file: f,
    source: readFileSync(join(shaderDir, f), 'utf-8'),
  }))

  // Read definition for context
  let defContext = ''
  try {
    const defPath = existsSync(join(effectDir, 'definition.json'))
      ? join(effectDir, 'definition.json')
      : join(effectDir, 'definition.js')
    defContext = readFileSync(defPath, 'utf-8').slice(0, 1000)
  } catch {}

  const shaderText = sources.map(s => `--- ${s.file} ---\n${s.source}`).join('\n\n')

  const response = await callAI({
    system: 'You are a senior GPU shader developer. Identify UNNECESSARY branching in shader code that could be flattened for better GPU performance. Focus on simple if/else over uniforms, not complex algorithms. Severity: high (inner loops), medium (per-fragment), low (negligible). Respond with JSON: {shaders: [{file, opportunities: [{location, description, severity}], notes}], summary}',
    userContent: [
      { type: 'text', text: `Effect definition:\n${defContext}\n\nShader sources:\n${shaderText}\n\nIdentify unnecessary branching.` }
    ],
    maxTokens: 1000,
    jsonMode: true,
    ai,
  })

  let parsed: any = { shaders: [], summary: 'Failed to analyze' }
  if (response) {
    try { parsed = JSON.parse(response) } catch { parsed = { shaders: [], summary: response } }
  }

  const totalOpportunities = parsed.shaders?.reduce(
    (sum: number, s: any) => sum + (s.opportunities?.length || 0), 0
  ) || 0

  return {
    status: totalOpportunities >= 2 ? 'warning' : 'ok',
    ...parsed,
  }
}

export function registerAnalyzeBranching(server: McpServer): void {
  server.tool(
    'analyzeBranching',
    'AI analysis of unnecessary shader branching with optimization suggestions.',
    analyzeBranchingSchema,
    async (args: any) => {
      const result = await analyzeBranching(args.effect_id, args.backend)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )
}
