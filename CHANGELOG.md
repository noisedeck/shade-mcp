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

### Fixed

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

- `zod` is declared as a direct dependency instead of resolving through the
  MCP SDK.
- Published packages contain only `dist/`, README and LICENSE.
- Documentation records the viewer requirement, the full environment variable
  set, and their real defaults.

## [0.1.4] — 2026-06-15

Releases through 0.1.4 are described in the
[GitHub releases](https://github.com/noisefactorllc/shade-mcp/releases).
