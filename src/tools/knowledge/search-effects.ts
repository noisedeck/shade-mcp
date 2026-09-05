import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getSharedEffectIndex } from '../../knowledge/shared-instances.js'
import { expandQueryWithSynonyms } from '../../knowledge/shader-knowledge.js'
import { toolResult } from '../tool-result.js'

export const searchEffectsSchema = {
  query: z.string().describe('Search query: concept, algorithm, tag, or visual style'),
  limit: z.number().optional().default(10).describe('Maximum results'),
}

export function registerSearchEffects(server: McpServer): void {
  server.tool(
    'searchEffects',
    'Search the effect library by concept, tag, algorithm, or visual style. The tool expands the query with synonyms.',
    searchEffectsSchema,
    async (args: any) => {
      const index = await getSharedEffectIndex()
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
      return toolResult(output)
    }
  )
}
