import { describe, it, expect } from 'vitest'
import { getServerUrl, getRefCount, releaseServer } from '../harness/server-manager.js'

describe('server-manager', () => {
  it('getServerUrl returns correct URL format', () => {
    const url = getServerUrl()
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })

  it('starts with refCount 0', () => {
    expect(getRefCount()).toBe(0)
  })

  it('releaseServer does not go below 0', () => {
    releaseServer()
    expect(getRefCount()).toBe(0)
  })
})
