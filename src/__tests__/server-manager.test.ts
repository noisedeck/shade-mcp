import { describe, it, expect } from 'vitest'
import { getServerUrl } from '../harness/server-manager.js'

describe('server-manager', () => {
  it('getServerUrl returns correct URL format', () => {
    const url = getServerUrl()
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })
})
