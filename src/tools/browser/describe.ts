import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import { renderEffectFrame } from './render.js'
import { getAIProvider, callAI, NO_AI_KEY_MESSAGE } from '../../ai/provider.js'
import { getConfig } from '../../config.js'
import { resolveEffectIds } from '../resolve-effects.js'

export const describeEffectFrameSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
  prompt: z.string().describe('Analysis prompt for the AI vision model'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
}

export async function describeEffectFrame(
  session: BrowserSession,
  effectId: string,
  prompt: string,
): Promise<any> {
  const config = getConfig()
  const ai = getAIProvider({ projectRoot: config.projectRoot })
  if (!ai) return { status: 'error', error: NO_AI_KEY_MESSAGE }

  const renderResult = await renderEffectFrame(session, effectId, { captureImage: true })
  if (renderResult.status === 'error' || !renderResult.frame?.image_uri) {
    return { status: 'error', error: 'Failed to render frame' }
  }

  const vision = await callAI({
    system: 'You are an expert shader effect analyzer. Describe shader visuals precisely. Respond with JSON: {description, tags, notes}',
    userContent: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: renderResult.frame.image_uri } }
    ],
    maxTokens: 500,
    jsonMode: true,
    ai,
  })

  let parsed = null
  if (vision) {
    try { parsed = JSON.parse(vision) } catch { parsed = { description: vision, tags: [], notes: null } }
  }

  return {
    status: 'ok',
    frame: { image_uri: renderResult.frame.image_uri },
    vision: parsed,
  }
}

export function registerDescribeEffectFrame(server: McpServer): void {
  server.tool(
    'describeEffectFrame',
    'Render frame + AI vision analysis. User provides analysis prompt.',
    describeEffectFrameSchema,
    async (args: any) => {
      const config = getConfig()
      const effectIds = resolveEffectIds(args, config.effectsDir)
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const results = []
        for (const id of effectIds) {
          try {
            results.push({ effect_id: id, ...await describeEffectFrame(session, id, args.prompt) })
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
