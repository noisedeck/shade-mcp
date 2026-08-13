import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import { renderEffectFrame } from './render.js'
import { getAIProvider, callAI, NO_AI_KEY_MESSAGE } from '../../ai/provider.js'
import { getConfig } from '../../config.js'
import { resolveEffectIds } from '../resolve-effects.js'
import { toolResult } from '../tool-result.js'

export const describeEffectFrameSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs'),
  prompt: z.string().describe('Analysis prompt for the AI vision model'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
  capture_image: z.boolean().optional().default(false)
    .describe('Return the rendered PNG data URI alongside the description'),
}

export async function describeEffectFrame(
  session: BrowserSession,
  effectId: string,
  prompt: string,
  options: { captureImage?: boolean } = {},
): Promise<any> {
  const config = getConfig()
  const ai = getAIProvider({ projectRoot: config.projectRoot })
  if (!ai) return { status: 'error', error: NO_AI_KEY_MESSAGE }

  const renderResult = await renderEffectFrame(session, effectId, { captureImage: true })
  if (renderResult.status === 'error' || !renderResult.frame?.image_uri) {
    const reason = (renderResult as { error?: string }).error
    return { status: 'error', error: reason ? `Failed to render frame: ${reason}` : 'Failed to render frame' }
  }

  const vision = await callAI({
    system: 'You are an expert shader effect analyzer. Describe shader visuals precisely. Respond with JSON: {description, tags, notes}',
    userContent: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: renderResult.frame.image_uri } }
    ],
    maxTokens: 1500,
    jsonMode: true,
    ai,
  })

  // Model output is free-form: anything that is not a JSON object becomes the
  // description, so callers always see the same shape.
  let parsed: any = null
  if (vision) {
    try {
      const raw = JSON.parse(vision)
      parsed = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw
        : { description: typeof raw === 'string' ? raw : vision, tags: [], notes: null }
    } catch {
      parsed = { description: vision, tags: [], notes: null }
    }
  }

  // The image went to the vision model; echoing megabytes of base64 back to the
  // caller costs it context it did not ask for.
  return {
    status: 'ok',
    ...(options.captureImage ? { frame: { image_uri: renderResult.frame.image_uri } } : {}),
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
            results.push({ effect_id: id, ...await describeEffectFrame(session, id, args.prompt, { captureImage: args.capture_image }) })
          } catch (err) {
            results.push({ effect_id: id, status: 'error', error: err instanceof Error ? err.message : String(err) })
          }
        }
        return toolResult(results.length === 1 ? results[0] : results)
      } finally {
        await session.teardown()
      }
    }
  )
}
