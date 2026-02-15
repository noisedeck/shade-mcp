import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { extname, join, resolve as pathResolve, normalize, basename } from 'node:path'

let httpServer: Server | null = null
let refCount = 0
let activePort = 4173

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.glsl': 'text/plain',
  '.wgsl': 'text/plain',
  '.frag': 'text/plain',
  '.vert': 'text/plain',
}

function safePath(root: string, relPath: string): string | null {
  const resolved = pathResolve(root, normalize(relPath))
  if (!resolved.startsWith(pathResolve(root))) return null
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
      'Access-Control-Allow-Origin': '*',
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
    if (port !== activePort) {
      throw new Error(`Server already running on port ${activePort}, cannot switch to ${port}`)
    }
    refCount++
    return getServerUrl()
  }
  activePort = port

  // Detect flat layout (effectsDir itself contains definition.json/js)
  const isFlatLayout = existsSync(join(effectsDir, 'definition.json')) || existsSync(join(effectsDir, 'definition.js'))
  const flatEffectName = isFlatLayout ? basename(effectsDir) : null

  httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host}`)
    const url = decodeURIComponent(parsedUrl.pathname)

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
    const relPath = url === '/' ? 'index.html' : url.slice(1)
    const filePath = safePath(viewerRoot, relPath)
    if (!filePath) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }
    serveFile(filePath, res)
  })

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(port, '127.0.0.1', () => resolve())
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
  }
}

export function getServerUrl(): string {
  return `http://127.0.0.1:${activePort}`
}

export function getRefCount(): number {
  return refCount
}
