import { z } from 'zod'
import { EffectIndex } from '../../knowledge/effect-index.js'
import { expandQueryWithSynonyms } from '../../knowledge/shader-knowledge.js'
import { getConfig } from '../../config.js'

let effectIndex: EffectIndex | null = null

async function getEffectIndex(): Promise<EffectIndex> {
  if (!effectIndex) {
    effectIndex = new EffectIndex()
    await effectIndex.initialize(getConfig().effectsDir)
  }
  return effectIndex
}

export const searchEffectsSchema = {
  query: z.string().describe('Search query - concept, algorithm, tag, or visual style'),
  limit: z.number().optional().default(10).describe('Maximum results'),
}

export function registerSearchEffects(server: any): void {
  server.tool(
    'searchEffects',
    'Search effect library by concept, tag, algorithm, or visual style. Synonym expansion.',
    searchEffectsSchema,
    async (args: any) => {
      const index = await getEffectIndex()
      const expanded = expandQueryWithSynonyms(args.query)
      const results = index.search(expanded, args.limit)

      const output = {
        query: args.query,
        results: results.map(r => ({
          id: r.id,
          description: r.def.description || '',
          tags: r.def.tags || [],
          score: r.score,
        })),
        total: results.length,
      }
      return { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] }
    }
  )
}
