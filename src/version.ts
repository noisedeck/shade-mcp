/**
 * The version advertised over the MCP handshake, substituted from
 * package.json at build time.
 *
 * Read at build time rather than hardcoded, because the string registries and
 * clients display drifts silently every release if it is restated by hand.
 * Read at *build* time rather than runtime, because the dist is also shipped
 * as a bare file drop: consumers vendor the contents of dist/ with no
 * package.json above them, and a `require('../package.json')` here resolves in
 * this repo and under npm while being unsatisfiable for them.
 * scripts/check-dist-selfcontained.mjs holds that line.
 *
 * The define lives in tsup.config.ts for the build and vitest.config.ts for
 * the tests; both take it from package.json, which stays the single source.
 */
declare const __SHADE_VERSION__: string

export const VERSION: string = __SHADE_VERSION__
