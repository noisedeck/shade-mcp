# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/noisefactorllc/shade-mcp/security/advisories/new)
rather than opening a public issue.

## What this server exposes

shade-mcp runs a local HTTP server on `127.0.0.1` to host the viewer page for the browser tools.
The server has these access limits:

- The server serves exactly two directories, `SHADE_VIEWER_ROOT` and
  `SHADE_EFFECTS_DIR`. Set `SHADE_VIEWER_ROOT` to the smallest directory containing the viewer and its imports.
  Noisemaker requires its repository root. See [Viewer](README.md#viewer).
  Other non-dotfiles under the selected root remain accessible.
  The server refuses dotfiles and dot-directories regardless of the root.
- The server permits CORS reads from opaque origins (`Origin: null`) and HTTP/HTTPS loopback origins.
  Loopback hosts are `localhost`, `127.0.0.1`, and `[::1]`, with optional ports.
  It sends no CORS permission header for other origins.

shade-mcp reads API keys from the environment or from `.anthropic` / `.openai` files under `SHADE_PROJECT_ROOT`.
It passes these keys only to the provider SDKs.
It never logs the keys or includes them in tool results.
