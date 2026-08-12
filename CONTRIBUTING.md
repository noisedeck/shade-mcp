# Contributing

Issues and pull requests are welcome.

## Getting set up

```bash
npm install            # installs dependencies and builds dist/
npm run setup          # install Playwright Chromium, for the browser tools
```

The browser tools also need a viewer page; see [Viewer](README.md#viewer).

## Before opening a pull request

```bash
npm run typecheck
npm test
```

Run both. Vitest does not typecheck, so a suite can be fully green while `tsc`
is failing.

## Conventions

- ESM only, Node 22 or newer.
- Each tool lives in `src/tools/<category>/` and exports a `register*` function
  that takes an `McpServer`, plus a plain function holding the logic so it can
  be tested without a server.
- Return results through `toolResult()` so failures carry `isError`.
- Anything a tool caller supplies — effect IDs especially — becomes a
  filesystem path. Validate containment; do not join it directly.
- When a tool computes a verdict and also returns model output, spread the
  model output first so the computed fields cannot be overwritten.
- New behavior comes with a test. Bug fixes come with a test that fails before
  the fix.
