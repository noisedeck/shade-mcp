// Asserts what the built dist is allowed to import from outside itself.
//
// noisemaker and portable do not install this package. Their CI copies
// dist/harness, dist/ai, dist/analysis and dist/formats into vendor/shade-mcp
// and imports the files directly, so every bare specifier those files carry
// has to resolve in the *consumer's* node_modules, not in ours. tsup keeps
// anything declared in `dependencies` external, which makes that set change
// silently whenever a dependency moves from transitive to direct — exactly
// how 0.2.0 shipped an unresolvable `import { z } from "zod"` and broke
// noisemaker's shader test run without a single shade-mcp test noticing.
//
// The contract, stated positively:
//   - harness/index.js is importable with only playwright present. noisemaker
//     imports it at module level and defers the AI SDKs behind a dynamic
//     import precisely so a run without AI keys never needs them.
//   - the other vendored entries may additionally reach for the two AI SDKs.
//   - nothing anywhere may import a package that is not a declared dependency.
//
// Run after `npm run build`.
import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const declared = new Set(Object.keys(pkg.dependencies ?? {}))
const builtins = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)])

// Consumers that vendor the dist supply these themselves.
const VENDOR_SUPPLIED = new Set(['playwright', '@anthropic-ai/sdk', 'openai'])

const ENTRIES = [
  { file: 'dist/index.js', vendored: false },
  { file: 'dist/harness/index.js', vendored: true, allowed: new Set(['playwright']) },
  { file: 'dist/ai/provider.js', vendored: true, allowed: VENDOR_SUPPLIED },
  { file: 'dist/analysis/index.js', vendored: true, allowed: VENDOR_SUPPLIED },
  { file: 'dist/formats/index.js', vendored: true, allowed: VENDOR_SUPPLIED },
  { file: 'dist/knowledge/index.js', vendored: true, allowed: VENDOR_SUPPLIED },
]

// The dist is ESM, so static imports are line-anchored declarations rather
// than arbitrary expressions. Matching them that way keeps ordinary strings
// that happen to contain the word "from" out of the results.
const PATTERNS = [
  /^\s*import\s[^'"]*\sfrom\s*["']([^"']+)["']/gm, // import x from "y"
  /^\s*import\s*["']([^"']+)["']/gm, //               import "y"
  /^\s*export\s[^'"]*\sfrom\s*["']([^"']+)["']/gm, // export x from "y"
  /\bimport\(\s*["']([^"']+)["']\s*\)/g, //           await import("y")
]
const packageName = spec =>
  spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]

let failed = 0
for (const { file, vendored, allowed } of ENTRIES) {
  let source
  try {
    source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  } catch {
    console.error(`check-dist-externals: ${file} is missing — run npm run build first`)
    process.exit(2)
  }

  const externals = new Set()
  for (const pattern of PATTERNS) {
    for (const [, spec] of source.matchAll(pattern)) {
      if (spec.startsWith('.') || spec.startsWith('/')) continue
      if (builtins.has(spec)) continue
      const name = packageName(spec)
      if (builtins.has(name)) continue
      externals.add(name)
    }
  }

  const undeclared = [...externals].filter(n => !declared.has(n))
  const unvendorable = vendored ? [...externals].filter(n => !allowed.has(n)) : []

  let entryFailures = 0
  for (const name of undeclared) {
    console.error(`check-dist-externals: ${file} imports "${name}", which is not a declared dependency`)
    entryFailures++
  }
  for (const name of unvendorable) {
    if (undeclared.includes(name)) continue
    console.error(
      `check-dist-externals: ${file} imports "${name}", which consumers that vendor the dist cannot resolve. ` +
      `Add it to tsup's noExternal so it is bundled, or to this entry's allowed set if consumers really do supply it.`
    )
    entryFailures++
  }
  failed += entryFailures

  console.log(`check-dist-externals: ${entryFailures ? 'FAIL' : 'ok'} ${file} -> ${[...externals].join(', ') || '(node builtins only)'}`)
}

if (failed) process.exit(1)
