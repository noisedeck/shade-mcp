# Contributing

Issues and pull requests are welcome.

## Getting set up

```bash
npm install            # installs dependencies and builds dist/
npm run setup          # install Playwright Chromium, for the browser tools
```

The browser tools also need a viewer page. See [Viewer](README.md#viewer).

## Before opening a pull request

```bash
npm run typecheck
npm test
```

Run both commands. Vitest does not typecheck. All tests can pass while `tsc` fails.

## Conventions

- ESM only, Node 22 or newer.
- Put each tool in `src/tools/<category>/`.
  Export a `register*` function that takes an `McpServer`.
  Export a separate function with the tool logic, so tests can call it without a server.
- Return results through `toolResult()` so failures carry `isError`.
- Tool caller input, especially effect IDs, becomes a filesystem path.
  Check that the path stays within the permitted directory.
  Do not join caller input directly to a path.
- If a tool returns a computed verdict and model output, spread the model output first.
  This order prevents model output from replacing the computed fields.
- New behavior comes with a test. Bug fixes come with a test that fails before
  the fix.
