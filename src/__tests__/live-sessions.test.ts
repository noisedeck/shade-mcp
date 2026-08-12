import { describe, it, expect, beforeEach } from 'vitest'
import {
  trackSession,
  untrackSession,
  closeAllSessions,
  liveSessionCount,
} from '../harness/live-sessions.js'

describe('live session registry', () => {
  beforeEach(async () => {
    await closeAllSessions()
  })

  it('tears down every tracked session', async () => {
    let torn = 0
    trackSession({ teardown: async () => { torn += 1 } })
    trackSession({ teardown: async () => { torn += 1 } })
    expect(liveSessionCount()).toBe(2)

    await closeAllSessions()

    expect(torn).toBe(2)
    expect(liveSessionCount()).toBe(0)
  })

  it('leaves an untracked session alone', async () => {
    let torn = 0
    const session = { teardown: async () => { torn += 1 } }
    trackSession(session)
    untrackSession(session)

    await closeAllSessions()

    expect(torn).toBe(0)
  })

  it('tears down the rest when one throws', async () => {
    let torn = 0
    trackSession({ teardown: async () => { throw new Error('already gone') } })
    trackSession({ teardown: async () => { torn += 1 } })

    await expect(closeAllSessions()).resolves.toBeUndefined()
    expect(torn).toBe(1)
    expect(liveSessionCount()).toBe(0)
  })
})
