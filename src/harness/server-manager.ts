import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

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

function serveFile(filePath: string, res: ServerResponse): void {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  const ext = extname(filePath).toLowerCase()
  const mime = MIME_TYPES[ext] || 'application/octet-stream'
  res.writeHead(200, {
    'Content-Type': mime,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  createReadStream(filePath).pipe(res)
}

export async function acquireServer(
  port: number,
  viewerRoot: string,
  effectsDir: string,
): Promise<string> {
  activePort = port
  if (refCount > 0) {
    refCount++
    return getServerUrl()
  }

  httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = decodeURIComponent(req.url || '/')

    // Route: /effects/* → effectsDir
    if (url.startsWith('/effects/')) {
      const relPath = url.slice('/effects/'.length)
      serveFile(join(effectsDir, relPath), res)
      return
    }

    // Route: everything else → viewerRoot
    const relPath = url === '/' ? 'index.html' : url.slice(1)
    serveFile(join(viewerRoot, relPath), res)
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
