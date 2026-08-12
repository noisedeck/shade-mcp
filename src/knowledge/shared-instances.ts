import { EffectIndex } from './effect-index.js'
import { getConfig } from '../config.js'

/**
 * How long a built index is trusted.
 *
 * Effects are edited while the server runs — an agent that writes a new effect
 * and then searches for it has to find it — so the index is rebuilt on a short
 * interval instead of being cached for the life of the process.
 */
const INDEX_TTL_MS = 5000

let effectIndex: EffectIndex | null = null
let builtAt = 0
let building: Promise<EffectIndex> | null = null

export async function getSharedEffectIndex(): Promise<EffectIndex> {
  if (effectIndex && Date.now() - builtAt < INDEX_TTL_MS) return effectIndex
  // Concurrent callers share one build rather than each scanning the directory.
  if (building) return building

  building = (async () => {
    const index = new EffectIndex()
    await index.initialize(getConfig().effectsDir)
    effectIndex = index
    builtAt = Date.now()
    return index
  })()

  try {
    return await building
  } finally {
    building = null
  }
}

/** Forces the next lookup to rescan, for callers that just changed the library. */
export function invalidateSharedEffectIndex(): void {
  effectIndex = null
  builtAt = 0
}
