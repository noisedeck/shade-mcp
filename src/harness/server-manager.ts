import { spawn, type ChildProcess } from 'node:child_process'

let serverProcess: ChildProcess | null = null
let refCount = 0
let activePort = 4173

const MAX_WAIT_MS = 10000
const POLL_INTERVAL_MS = 200

export async function acquireServer(port: number, root: string): Promise<string> {
  activePort = port
  if (refCount > 0) {
    refCount++
    return getServerUrl()
  }

  serverProcess = spawn('npx', ['serve', '-l', `tcp://127.0.0.1:${port}`, root], {
    stdio: 'ignore',
    detached: false
  })

  // Poll until server responds or timeout
  const start = Date.now()
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}`)
      if (res.ok || res.status === 404) break
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  refCount = 1
  return getServerUrl()
}

export function releaseServer(): void {
  if (refCount <= 0) return
  refCount--
  if (refCount <= 0 && serverProcess) {
    serverProcess.kill()
    serverProcess = null
    refCount = 0
  }
}

export function getServerUrl(): string {
  return `http://127.0.0.1:${activePort}`
}

export function getRefCount(): number {
  return refCount
}
