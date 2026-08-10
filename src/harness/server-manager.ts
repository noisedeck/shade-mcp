import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, realpathSync } from 'node:fs'
import { extname, join, resolve as pathResolve, normalize, basename, relative, sep } from 'node:path'

let httpServer: Server | null = null
let refCount = 0
let activePort = 0
let requestedPort = 0

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.xml': 'application/xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.bin': 'application/octet-stream',
  '.data': 'application/octet-stream',
  '.glsl': 'text/plain',
  '.wgsl': 'text/plain',
  '.frag': 'text/plain',
  '.vert': 'text/plain',
  '.comp': 'text/plain',
}

function safePath(root: string, relPath: string): string | null {
  const rootResolved = pathResolve(root)
  const resolved = pathResolve(rootResolved, normalize(relPath))

  // Containment must respect segment boundaries: a sibling directory whose name
  // merely starts with the root's name is outside the root.
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + sep)) return null

  // Never serve dotfiles or anything beneath a dot-directory: that is where API
  // keys (.anthropic, .openai), .env files and .git internals live.
  const rel = relative(rootResolved, resolved)
  if (rel && rel.split(sep).some(segment => segment.startsWith('.'))) return null

  // Re-check containment after symlink resolution so links cannot escape the root.
  try {
    const realRoot = realpathSync(rootResolved)
    const realTarget = realpathSync(resolved)
    if (realTarget !== realRoot && !realTarget.startsWith(realRoot + sep)) return null
  } catch {
    // Path does not exist yet; serveFile reports 404 below.
  }

  return resolved
}

function serveFile(filePath: string, res: ServerResponse): void {
  const ext = extname(filePath).toLowerCase()
  const mime = MIME_TYPES[ext] || 'application/octet-stream'
  const stream = createReadStream(filePath)
  stream.on('error', (err) => {
    if (!res.headersSent) {
      const status = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 500
      res.writeHead(status)
    }
    res.end()
  })
  stream.on('open', () => {
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
    })
    stream.pipe(res)
  })
}

export async function acquireServer(
  port: number,
  viewerRoot: string,
  effectsDir: string,
): Promise<string> {
  if (refCount > 0) {
    if (port !== requestedPort) {
      throw new Error(`Server already running on port ${activePort} (requested ${requestedPort}), cannot switch to ${port}`)
    }
    refCount++
    return getServerUrl()
  }
  requestedPort = port

  // Detect flat layout (effectsDir itself contains definition.json/js)
  const isFlatLayout = existsSync(join(effectsDir, 'definition.json')) || existsSync(join(effectsDir, 'definition.js'))
  const flatEffectName = isFlatLayout ? basename(effectsDir) : null

  const route = (req: IncomingMessage, res: ServerResponse): void => {
    let url: string
    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`)
      url = decodeURIComponent(parsedUrl.pathname)
    } catch {
      // Malformed request target or Host header. Without this the throw would
      // escape the request listener and take the whole MCP server down.
      res.writeHead(400)
      res.end('Bad Request')
      return
    }

    // Route: /effects/* → effectsDir
    if (url.startsWith('/effects/')) {
      const relPath = url.slice('/effects/'.length)

      // Flat layout: /effects/{basename}/* → effectsDir/*
      if (flatEffectName && relPath.startsWith(flatEffectName + '/')) {
        const innerPath = relPath.slice(flatEffectName.length + 1)
        const filePath = safePath(effectsDir, innerPath)
        if (!filePath) { res.writeHead(403); res.end('Forbidden'); return }
        serveFile(filePath, res)
        return
      }

      // Normal nested layout: /effects/* → effectsDir/*
      const filePath = safePath(effectsDir, relPath)
      if (!filePath) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      serveFile(filePath, res)
      return
    }

    // Route: everything else → viewerRoot
    let relPath = url === '/' ? 'index.html' : url.slice(1)
    // Resolve directory URLs to index.html
    if (relPath.endsWith('/')) {
      relPath += 'index.html'
    }
    const filePath = safePath(viewerRoot, relPath)
    if (!filePath) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    serveFile(filePath, res)
  }

  httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    try {
      route(req, res)
    } catch {
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }
  })

  // Malformed HTTP framing must not surface as an uncaught exception either.
  httpServer.on('clientError', (_err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
    else socket.destroy()
  })

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(port, '127.0.0.1', () => {
      const addr = httpServer!.address()
      activePort = typeof addr === 'object' && addr ? addr.port : port
      resolve()
    })
    httpServer!.on('error', reject)
  })

  refCount = 1
  return getServerUrl()
}

export function releaseServer(): void {
  if (refCount <= 0) return
  refCount--
  if (refCount === 0 && httpServer) {
    httpServer.close()
    httpServer = null
    activePort = 0
    requestedPort = 0
  }
}

export function getServerUrl(): string {
  return `http://127.0.0.1:${activePort}`
}

export function getRefCount(): number {
  return refCount
}
