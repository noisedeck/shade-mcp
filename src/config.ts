import { resolve } from 'node:path'

export type Backend = 'webgl2' | 'webgpu'

const VALID_BACKENDS: readonly Backend[] = ['webgl2', 'webgpu']

export interface Config {
  effectsDir: string
  viewerPort: number
  defaultBackend: Backend
  projectRoot: string
  globalsPrefix: string | undefined
  viewerPath: string | undefined
  maxBrowsers: number
  timeoutMs: number
  aiTimeoutMs: number
  aiModel: string | undefined
}

function parseCount(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Durations must be positive; 0 or a typo would disable the guard entirely. */
function parseDuration(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseBackend(value: string | undefined): Backend {
  if (value && VALID_BACKENDS.includes(value as Backend)) {
    return value as Backend
  }
  return 'webgl2'
}

export function getConfig(): Config {
  const projectRoot = process.env.SHADE_PROJECT_ROOT || process.cwd()
  return {
    effectsDir: process.env.SHADE_EFFECTS_DIR || resolve(projectRoot, 'effects'),
    viewerPort: parseCount(process.env.SHADE_VIEWER_PORT, 0),
    defaultBackend: parseBackend(process.env.SHADE_BACKEND),
    projectRoot,
    globalsPrefix: process.env.SHADE_GLOBALS_PREFIX || undefined,
    viewerPath: process.env.SHADE_VIEWER_PATH || undefined,
    maxBrowsers: parseCount(process.env.SHADE_MAX_BROWSERS, 1),
    timeoutMs: parseDuration(process.env.SHADE_TIMEOUT_MS, 300000),
    aiTimeoutMs: parseDuration(process.env.SHADE_AI_TIMEOUT_MS, 120000),
    aiModel: process.env.SHADE_AI_MODEL || undefined,
  }
}
