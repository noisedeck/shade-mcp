import { createRequire } from 'node:module'

/**
 * Read at runtime rather than hardcoded: the version reported over the MCP
 * handshake is what registries and clients display, and a literal here drifts
 * silently every time the package is released.
 */
const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

export const VERSION: string = pkg.version
