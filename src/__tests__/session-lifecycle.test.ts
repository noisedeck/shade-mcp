import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolve } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

// A launch failure is the cheapest way to exercise the error path in setup()
// without a real browser.
vi.mock('playwright', () => ({
  chromium: { launch: vi.fn(async () => { throw new Error('launch failed') }) },
}))

import { BrowserSession } from '../harness/browser-session.js'
import { getRefCount, releaseServer } from '../harness/server-manager.js'
import {
  acquireBrowserSlot,
  releaseBrowserSlot,
  resetBrowserQueue,
  getActiveBrowsers,
} from '../harness/browser-queue.js'

const tmpDir = resolve('/tmp/shade-mcp-test-lifecycle-viewer')
const tmpEffects = resolve('/tmp/shade-mcp-test-lifecycle-effects')

function makeSession() {
  return new BrowserSession({
    backend: 'webgl2',
    headless: true,
    viewerPort: 0,
    viewerRoot: tmpDir,
    effectsDir: tmpEffects,
  })
}

describe('browser session lifecycle', () => {
  beforeEach(() => {
    resetBrowserQueue()
    while (getRefCount() > 0) releaseServer()
    mkdirSync(tmpDir, { recursive: true })
    writeFileSync(resolve(tmpDir, 'index.html'), '<h1>viewer</h1>')
    mkdirSync(tmpEffects, { recursive: true })
  })

  afterEach(() => {
    resetBrowserQueue()
    while (getRefCount() > 0) releaseServer()
    rmSync(tmpDir, { recursive: true, force: true })
    rmSync(tmpEffects, { recursive: true, force: true })
  })

  it('releases the server it acquired when setup fails', async () => {
    const session = makeSession()
    await expect(session.setup()).rejects.toThrow('launch failed')
    expect(getRefCount()).toBe(0)
  })

  it('releases the browser slot when setup fails', async () => {
    const session = makeSession()
    await expect(session.setup()).rejects.toThrow('launch failed')
    expect(getActiveBrowsers()).toBe(0)
  })

  it('teardown after a failed setup does not release anything twice', async () => {
    const session = makeSession()
    await expect(session.setup()).rejects.toThrow('launch failed')
    await session.teardown()
    expect(getRefCount()).toBe(0)
    expect(getActiveBrowsers()).toBe(0)
  })

  it('teardown on a session that was never set up releases nothing', async () => {
    // Stand in for a concurrent session holding the only slot and the server.
    await acquireBrowserSlot()
    expect(getActiveBrowsers()).toBe(1)

    const session = makeSession()
    await session.teardown()

    expect(getActiveBrowsers()).toBe(1)
    releaseBrowserSlot()
  })
})
