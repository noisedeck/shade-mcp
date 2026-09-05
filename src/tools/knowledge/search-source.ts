import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { GlslIndex } from '../../knowledge/glsl-index.js'
import { getConfig } from '../../config.js'
import { toolResult } from '../tool-result.js'

let glslIndex: GlslIndex | null = null

async function getGlslIndex(): Promise<GlslIndex> {
  if (!glslIndex) {
    glslIndex = new GlslIndex()
    await glslIndex.initialize(getConfig().effectsDir)
  }
  return glslIndex
}

export const searchShaderSourceSchema = {
  query: z.string().describe('Regular expression to search for'),
  context_lines: z.number().optional().default(5).describe('Number of context lines around each match'),
  limit: z.number().optional().default(10).describe('Maximum results'),
}

export function registerSearchShaderSource(server: McpServer): void {
  server.tool(
    'searchShaderSource',
    'Search GLSL source code across all effects with a regular expression. Return matching snippets with context.',
    searchShaderSourceSchema,
    async (args: any) => {
      const index = await getGlslIndex()
      const results = index.search(args.query, args.context_lines, args.limit)

      const output = {
        query: args.query,
        matchCount: results.length,
        results: results.map(r => ({
          effectId: r.effectId,
          file: r.file,
          lineNumber: r.lineNumber,
          matchLine: r.matchLine,
          context: r.context,
        })),
      }
      return toolResult(output)
    }
  )
}
