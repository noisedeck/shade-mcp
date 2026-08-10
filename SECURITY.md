# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/noisefactorllc/shade-mcp/security/advisories/new)
rather than opening a public issue.

## What this server exposes

shade-mcp runs a local HTTP server on `127.0.0.1` to host the viewer page the
browser tools drive. Two things are worth knowing when configuring it:

- The server serves exactly two directories, `SHADE_VIEWER_ROOT` and
  `SHADE_EFFECTS_DIR`. Point `SHADE_VIEWER_ROOT` at a viewer directory rather
  than a whole workspace, so unrelated files are never in scope. Dotfiles and
  dot-directories are refused regardless.
- No CORS headers are sent, so pages from other origins cannot read responses.

API keys are read from the environment or from `.anthropic` / `.openai` files
under `SHADE_PROJECT_ROOT`, and are passed only to the provider SDKs. They are
never logged or included in tool results.
