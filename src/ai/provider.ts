import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface AIProvider {
  provider: 'anthropic' | 'openai'
  apiKey: string
  model: string
}

export interface CallAIOptions {
  system: string
  userContent: Array<{ type: string; text?: string; image_url?: { url: string } }>
  maxTokens?: number
  jsonMode?: boolean
  ai: AIProvider
}

function readKeyFile(projectRoot: string, filename: string): string | null {
  try {
    const key = readFileSync(join(projectRoot, filename), 'utf-8').trim()
    return key || null
  } catch {
    return null
  }
}

export function getAIProvider(options: { projectRoot: string }): AIProvider | null {
  // Env vars first (highest priority)
  const anthropicEnv = process.env.ANTHROPIC_API_KEY
  if (anthropicEnv) {
    return { provider: 'anthropic', apiKey: anthropicEnv, model: 'claude-sonnet-4-5-20250929' }
  }
  const openaiEnv = process.env.OPENAI_API_KEY
  if (openaiEnv) {
    return { provider: 'openai', apiKey: openaiEnv, model: 'gpt-4o' }
  }
  // Dotfiles
  const anthropicKey = readKeyFile(options.projectRoot, '.anthropic')
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey, model: 'claude-sonnet-4-5-20250929' }
  }
  const openaiKey = readKeyFile(options.projectRoot, '.openai')
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey, model: 'gpt-4o' }
  }
  return null
}

export async function callAI(options: CallAIOptions): Promise<string | null> {
  if (options.ai.provider === 'anthropic') {
    return callAnthropic(options)
  }
  return callOpenAI(options)
}

async function callAnthropic(options: CallAIOptions): Promise<string | null> {
  const client = new Anthropic({ apiKey: options.ai.apiKey })

  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = options.userContent.map(block => {
    if (block.type === 'image_url' && block.image_url) {
      const url = block.image_url.url
      const match = url.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        return {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: match[1] as 'image/png', data: match[2] }
        }
      }
    }
    return { type: 'text' as const, text: block.text || '' }
  })

  let system = options.system
  if (options.jsonMode) {
    system += '\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation.'
  }

  const response = await client.messages.create({
    model: options.ai.model,
    max_tokens: options.maxTokens || 500,
    system,
    messages: [{ role: 'user', content }]
  })

  const textBlock = response.content.find((b: Anthropic.ContentBlock) => b.type === 'text')
  return textBlock && 'text' in textBlock ? textBlock.text : null
}

async function callOpenAI(options: CallAIOptions): Promise<string | null> {
  const client = new OpenAI({ apiKey: options.ai.apiKey })

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.userContent.map(block => {
      if (block.type === 'image_url' && block.image_url) {
        return { type: 'image_url' as const, image_url: { url: block.image_url.url } }
      }
      return { type: 'text' as const, text: block.text || '' }
    })}
  ]

  const response = await client.chat.completions.create({
    model: options.ai.model,
    max_tokens: options.maxTokens || 500,
    messages,
    ...(options.jsonMode ? { response_format: { type: 'json_object' as const } } : {})
  })

  return response.choices[0]?.message?.content || null
}

export const NO_AI_KEY_MESSAGE = 'No AI API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or create .anthropic/.openai file in project root.'
