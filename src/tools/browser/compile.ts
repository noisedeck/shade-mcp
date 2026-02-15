import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { BrowserSession } from '../../harness/browser-session.js'
import type { CompileResult } from '../../harness/types.js'
import { getConfig } from '../../config.js'

const STATUS_TIMEOUT = 30000

export const compileEffectSchema = {
  effect_id: z.string().optional().describe('Single effect ID (e.g., "synth/noise")'),
  effects: z.string().optional().describe('CSV of effect IDs or glob patterns'),
  backend: z.enum(['webgl2', 'webgpu']).default('webgl2').describe('Rendering backend'),
}

export async function compileEffect(
  session: BrowserSession,
  effectId: string,
): Promise<CompileResult> {
  return session.runWithConsoleCapture(async () => {
    const page = session.page!

    // Select effect
    await page.evaluate((id) => {
      const select = document.getElementById('effect-select') as HTMLSelectElement
      if (select) { select.value = id; select.dispatchEvent(new Event('change')) }
    }, effectId)

    // Wait for compile
    const result = await page.evaluate(({ timeout }) => {
      return new Promise<any>((resolve) => {
        const start = Date.now()
        const poll = () => {
          const status = document.getElementById('status')
          const text = (status?.textContent || '').toLowerCase()
          const pipeline = (window as any).__shadeRenderingPipeline

          if (text.includes('error') || text.includes('failed')) {
            const passes = pipeline?.graph?.passes?.map((p: any, i: number) => ({
              id: p.name || `pass_${i}`, status: 'error'
            })) || []
            resolve({ status: 'error', passes, message: status?.textContent || 'Compilation failed' })
            return
          }
          if (text.includes('loaded') || text.includes('compiled') || text.includes('ready')) {
            const passes = pipeline?.graph?.passes?.map((p: any, i: number) => ({
              id: p.name || `pass_${i}`, status: 'ok'
            })) || [{ id: 'main', status: 'ok' }]
            resolve({ status: 'ok', passes, message: 'Compiled successfully' })
            return
          }
          if (Date.now() - start > timeout) {
            resolve({ status: 'error', passes: [], message: 'Compile timeout' })
            return
          }
          setTimeout(poll, 50)
        }
        poll()
      })
    }, { timeout: STATUS_TIMEOUT })

    return { ...result, backend: session.backend }
  })
}

export function registerCompileEffect(server: McpServer): void {
  server.tool(
    'compileEffect',
    'Compile shader effect and return pass-level diagnostics. Supports glob/CSV batch.',
    compileEffectSchema,
    async (args: any) => {
      const config = getConfig()
      const session = new BrowserSession({ backend: args.backend })
      try {
        await session.setup()
        const effectIds = args.effects
          ? args.effects.split(',').map((s: string) => s.trim())
          : [args.effect_id || '']

        const results = []
        for (const id of effectIds) {
          results.push(await compileEffect(session, id))
        }
        return { content: [{ type: 'text', text: JSON.stringify(results.length === 1 ? results[0] : results, null, 2) }] }
      } finally {
        await session.teardown()
      }
    }
  )
}
