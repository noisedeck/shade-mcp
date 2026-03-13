/**
 * Async semaphore for pipelining browser sessions.
 * Prevents CPU contention when multiple tool calls arrive concurrently.
 */

let maxConcurrency = 1
const waiting: Array<() => void> = []
let active = 0

export function setMaxBrowsers(n: number): void {
  maxConcurrency = Math.max(1, n)
}

export function getMaxBrowsers(): number {
  return maxConcurrency
}

export function getActiveBrowsers(): number {
  return active
}

export function getQueueDepth(): number {
  return waiting.length
}

export async function acquireBrowserSlot(): Promise<void> {
  if (active < maxConcurrency) {
    active++
    return
  }
  await new Promise<void>((resolve) => {
    waiting.push(resolve)
  })
  // active was already incremented by releaseBrowserSlot (slot transfer)
}

export function releaseBrowserSlot(): void {
  if (waiting.length > 0) {
    // Transfer the slot directly to the next waiter
    const next = waiting.shift()!
    next()
  } else {
    active = Math.max(0, active - 1)
  }
}

export function resetBrowserQueue(): void {
  active = 0
  waiting.length = 0
  maxConcurrency = 1
}
