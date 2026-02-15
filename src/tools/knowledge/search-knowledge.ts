import { z } from 'zod'
import { ShaderKnowledgeDB } from '../../knowledge/vector-db.js'
import { CURATED_KNOWLEDGE, expandQueryWithSynonyms } from '../../knowledge/shader-knowledge.js'

let db: ShaderKnowledgeDB | null = null

function getDB(): ShaderKnowledgeDB {
  if (!db) {
    db = new ShaderKnowledgeDB()
    db.addDocuments(CURATED_KNOWLEDGE)
    db.buildIndex()
  }
  return db
}

export const searchShaderKnowledgeSchema = {
  query: z.string().describe('Natural language query'),
  category: z.string().optional().describe('Filter by category (dsl, glsl, technique, errors, etc.)'),
  limit: z.number().optional().default(5).describe('Maximum results'),
}

export function registerSearchShaderKnowledge(server: any): void {
  server.tool(
    'searchShaderKnowledge',
    'Semantic search over curated shader documentation: DSL grammar, GLSL techniques, effect patterns, common errors.',
    searchShaderKnowledgeSchema,
    async (args: any) => {
      const database = getDB()
      const expanded = expandQueryWithSynonyms(args.query)
      const results = database.search(expanded, {
        limit: args.limit,
        category: args.category,
        minScore: 0.05,
      })

      const output = {
        query: args.query,
        category: args.category || 'all',
        matchCount: results.length,
        databaseStats: database.getStats(),
        results: results.map((r, i) => ({
          title: r.title,
          category: r.category,
          score: r.score,
          snippet: r.snippet,
          tags: r.tags,
          content: i < 3 ? r.content : undefined,
        })),
      }
      return { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] }
    }
  )
}
