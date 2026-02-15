import { EffectIndex } from './effect-index.js'
import { getConfig } from '../config.js'

let effectIndex: EffectIndex | null = null

export async function getSharedEffectIndex(): Promise<EffectIndex> {
  if (!effectIndex) {
    effectIndex = new EffectIndex()
    await effectIndex.initialize(getConfig().effectsDir)
  }
  return effectIndex
}
