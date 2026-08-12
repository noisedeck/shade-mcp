import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { getConfig } from './config.js'
import { setMaxBrowsers } from './harness/browser-queue.js'

// Browser tools
import { registerCompileEffect } from './tools/browser/compile.js'
import { registerRenderEffectFrame } from './tools/browser/render.js'
import { registerDescribeEffectFrame } from './tools/browser/describe.js'
import { registerBenchmarkEffectFPS } from './tools/browser/benchmark.js'
import { registerTestUniformResponsiveness } from './tools/browser/uniforms.js'
import { registerTestNoPassthrough } from './tools/browser/passthrough.js'
import { registerTestPixelParity } from './tools/browser/parity.js'
import { registerRunDslProgram } from './tools/browser/dsl.js'

// Analysis tools
import { registerCheckEffectStructure } from './tools/analysis/structure.js'
import { registerCheckAlgEquiv } from './tools/analysis/alg-equiv.js'
import { registerCompareShaders } from './tools/analysis/compare.js'
import { registerAnalyzeBranching } from './tools/analysis/branching.js'

// Knowledge tools
import { registerSearchEffects } from './tools/knowledge/search-effects.js'
import { registerAnalyzeEffect } from './tools/knowledge/analyze-effect.js'
import { registerSearchShaderSource } from './tools/knowledge/search-source.js'
import { registerSearchShaderKnowledge } from './tools/knowledge/search-knowledge.js'

// Utility tools
import { registerListEffects } from './tools/utility/list-effects.js'
import { registerGenerateManifest } from './tools/utility/generate-manifest.js'
import { VERSION } from './version.js'
import { closeAllSessions } from './harness/live-sessions.js'

// Configure browser concurrency from env
const config = getConfig()
setMaxBrowsers(config.maxBrowsers)

const server = new McpServer({
  name: 'shade-mcp',
  version: VERSION,
})

// Register all 18 tools
registerCompileEffect(server)
registerRenderEffectFrame(server)
registerDescribeEffectFrame(server)
registerBenchmarkEffectFPS(server)
registerTestUniformResponsiveness(server)
registerTestNoPassthrough(server)
registerTestPixelParity(server)
registerRunDslProgram(server)
registerCheckEffectStructure(server)
registerCheckAlgEquiv(server)
registerCompareShaders(server)
registerAnalyzeBranching(server)
registerSearchEffects(server)
registerAnalyzeEffect(server)
registerSearchShaderSource(server)
registerSearchShaderKnowledge(server)
registerListEffects(server)
registerGenerateManifest(server)

// Close the browsers and the viewer server on the way out. Without this an
// MCP client that kills the process leaves Chromium running behind it.
let shuttingDown = false
async function shutdown(): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  await closeAllSessions()
  await server.close().catch(() => {})
  process.exit(0)
}

process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })

// Start server
const transport = new StdioServerTransport()
await server.connect(transport)
