# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- The local viewer server no longer sends `Access-Control-Allow-Origin: *`.
  Any page open in the user's browser could previously read whatever the server
  served, which included `.anthropic` / `.openai` key files whenever
  `SHADE_VIEWER_ROOT` pointed at a workspace root — as the docs used to suggest.
- Dotfiles, and anything beneath a dot-directory, are refused by the file server.
- Path containment now respects segment boundaries and re-checks symlinks. This
  closes a traversal in which an encoded slash (`..%2f`) survived URL
  normalization and reappeared once the handler decoded the path.
- `resolveEffectDir` rejects absolute and traversal effect IDs rather than
  joining caller-supplied input straight onto the effects directory, which had
  let a tool argument read files elsewhere on disk.
- A malformed request target returns 400 instead of throwing an uncaught
  `URIError` that terminated the whole server process.
- `matchEffects` escapes its pattern instead of compiling caller-supplied text
  as a regular expression, where `(a|b)/*` matched by alternation and a
  backtracking pattern could stall the process.

### Fixed

- AI provider calls are bounded. They previously had no timeout at all, so a
  stalled provider held the caller's browser slot for the SDK default of about
  ten minutes; requests now time out after `SHADE_AI_TIMEOUT_MS` with retries
  capped at one, so a stall cannot multiply the wait.
- `SIGINT` and `SIGTERM` tear down live browser sessions before exiting. An MCP
  client killing the server used to leave Chromium running and the viewer port
  bound.
- The effect index is rebuilt rather than cached for the life of the process,
  so an effect written during a session is visible to `searchEffects` and
  `listEffects` instead of missing until restart. Concurrent lookups share one
  build, and `generateManifest` drops the cached index after rewriting the
  library on disk.
- `describeEffectFrame` reports why a render failed instead of the bare
  "Failed to render frame", and normalizes model output that is not a JSON
  object so callers always see the same shape.
- A failed `setup()` handed back the browser slot but never the server it had
  already acquired, while `teardown()` released both unconditionally — so the
  `finally` block every tool uses could return resources the session never held.
- A non-numeric `SHADE_MAX_BROWSERS` became `NaN`, making every capacity check
  false and leaving browser tools queued forever with no error.
  `resetBrowserQueue()` now resolves its waiters instead of dropping them.
- `analyzeBranching` no longer lets model output overwrite its own computed
  status, and `checkAlgEquiv` keeps the program name it matched on disk.
- `benchmarkEffectFPS`, `testUniformResponsiveness` and `testNoPassthrough`
  switch the viewer to the requested backend before measuring, instead of
  labelling results with a backend they never selected.
- The server reports the real package version over the MCP handshake; it had
  said `0.1.0` since the first release.

### Added

- Tool failures carry `isError`, so a caller can tell a failed call from a
  successful one that found nothing.
- `npm run typecheck`, which also covers the `tests/` directory.

### Changed

- **The default AI models are current-generation and undated**: `claude-sonnet-5`
  and `gpt-5.2`, replacing `claude-sonnet-4-5-20250929` and `gpt-4o`. The dated
  Anthropic id pinned a snapshot that ages out silently. Both stay overridable
  with `SHADE_AI_MODEL`; the Anthropic tier is unchanged, so set the variable to
  `claude-opus-5` if you want the more capable model for vision and analysis.
- Dependency advisories resolved — nine of ten, including every high and
  moderate one, via lockfile updates that leave the declared ranges untouched.
  One low-severity advisory remains, reachable only through a breaking major.
- **`describeEffectFrame` no longer returns the rendered image by default.**
  The frame still goes to the vision model; echoing megabytes of base64 back to
  the caller spent context it had not asked for. Pass `capture_image: true` to
  get it.
- Every browser and page operation shares one configurable ceiling
  (`SHADE_TIMEOUT_MS`), replacing nine hardcoded five-minute literals and two
  duplicate constants. The AI model is selectable with `SHADE_AI_MODEL`.
- **Chromium runs headless by default.** A visible window on every tool call is
  noise, and launching headed fails outright on a machine with no display. Set
  `SHADE_HEADLESS=0` to watch the browser again.
- `zod` is declared as a direct dependency instead of resolving through the
  MCP SDK.
- Published packages contain only `dist/`, README and LICENSE.
- Documentation records the viewer requirement, the full environment variable
  set, and their real defaults.

## [0.1.4] — 2026-06-15

Releases through 0.1.4 are described in the
[GitHub releases](https://github.com/noisefactorllc/shade-mcp/releases).
