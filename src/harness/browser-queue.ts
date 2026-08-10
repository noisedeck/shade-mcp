/**
 * Async semaphore for pipelining browser sessions.
 * Prevents CPU contention when multiple tool calls arrive concurrently.
 */

let maxConcurrency = 1
const waiting: Array<() => void> = []
let active = 0

export function setMaxBrowsers(n: number): void {
  // A non-numeric limit would make every comparison against it false, so
  // acquireBrowserSlot would queue forever instead of admitting anyone.
  maxConcurrency = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1
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
  // Resolve pending waiters rather than dropping them: a dropped waiter never
  // settles, so its caller hangs for the life of the process.
  while (waiting.length > 0) waiting.shift()!()
  active = 0
  maxConcurrency = 1
}
