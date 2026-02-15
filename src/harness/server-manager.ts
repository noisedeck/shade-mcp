import { spawn, type ChildProcess } from 'node:child_process'

let serverProcess: ChildProcess | null = null
let refCount = 0
let activePort = 4173

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

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000))
  refCount = 1
  return getServerUrl()
}

export function releaseServer(): void {
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
