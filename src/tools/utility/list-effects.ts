import { z } from 'zod'
import { EffectIndex } from '../../knowledge/effect-index.js'
import { getConfig } from '../../config.js'

let effectIndex: EffectIndex | null = null

async function getEffectIndex(): Promise<EffectIndex> {
  if (!effectIndex) {
    effectIndex = new EffectIndex()
    await effectIndex.initialize(getConfig().effectsDir)
  }
  return effectIndex
}

export const listEffectsSchema = {
  namespace: z.string().optional().describe('Filter by namespace'),
}

export function registerListEffects(server: any): void {
  server.tool(
    'listEffects',
    'List all effects, optionally filtered by namespace.',
    listEffectsSchema,
    async (args: any) => {
      const index = await getEffectIndex()
      const effects = index.list(args.namespace)

      const output = {
        namespace: args.namespace || 'all',
        count: effects.length,
        effects: effects.map(e => ({
          id: e.id,
          name: e.def.name || e.def.func,
          description: e.def.description || '',
          tags: e.def.tags || [],
          passes: e.def.passes.length,
        })),
      }
      return { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] }
    }
  )
}
