import { chromium, type Browser, type BrowserContext, type Page, type ConsoleMessage } from 'playwright'
import { resolve } from 'node:path'
import type { Backend } from '../config.js'
import type { BrowserSessionOptions, CompileResult, RenderResult, BenchmarkResult, ImageMetrics, ViewerGlobals } from './types.js'
import { DEFAULT_GLOBALS } from './types.js'
import { acquireServer, releaseServer, getServerUrl } from './server-manager.js'
import { getConfig } from '../config.js'

const STATUS_TIMEOUT = 30000

interface ConsoleEntry {
  type: string
  text: string
}

function getBrowserLaunchOptions(headless: boolean, backend: Backend) {
  const args = ['--disable-gpu-sandbox']

  if (backend === 'webgpu') {
    args.push(
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan',
      '--enable-webgpu-developer-features',
      process.platform === 'darwin' ? '--use-angle=metal' : '--use-angle=vulkan'
    )
  } else {
    if (process.platform === 'darwin') {
      args.push('--use-angle=metal')
    }
  }

  return { headless, args }
}

export class BrowserSession {
  private options: Required<Omit<BrowserSessionOptions, 'globals' | 'viewerPath'>>
  private viewerPath: string
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  public page: Page | null = null
  public globals: ViewerGlobals
  private baseUrl = ''
  private consoleMessages: ConsoleEntry[] = []
  private _isSetup = false

  constructor(opts: BrowserSessionOptions) {
    const config = getConfig()
    this.globals = opts.globals ?? DEFAULT_GLOBALS
    this.viewerPath = opts.viewerPath ?? '/'
    this.options = {
      backend: opts.backend,
      headless: opts.headless !== false,
      viewerPort: opts.viewerPort ?? config.viewerPort,
      viewerRoot: opts.viewerRoot ?? resolve(config.projectRoot, 'viewer'),
      effectsDir: opts.effectsDir ?? config.effectsDir
    }
  }

  async setup(): Promise<void> {
    if (this._isSetup) throw new Error('Session already set up. Call teardown() first.')

    this.baseUrl = await acquireServer(this.options.viewerPort, this.options.viewerRoot, this.options.effectsDir)

    this.browser = await chromium.launch(
      getBrowserLaunchOptions(this.options.headless, this.options.backend)
    )

    const viewportSize = process.env.CI
      ? { width: 256, height: 256 }
      : { width: 1280, height: 720 }

    this.context = await this.browser.newContext({
      viewport: viewportSize,
      ignoreHTTPSErrors: true
    })

    this.page = await this.context.newPage()
    this.page.setDefaultTimeout(STATUS_TIMEOUT)
    this.page.setDefaultNavigationTimeout(STATUS_TIMEOUT)

    this.consoleMessages = []
    this.page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text()
      if (text.includes('Error') || text.includes('error') || text.includes('warning') ||
          text.includes('[compileEffect]') || text.includes('[expand]') ||
          text.includes('[Pipeline') || text.includes('[MCP-UNIFORM]') ||
          msg.type() === 'error' || msg.type() === 'warning') {
        this.consoleMessages.push({ type: msg.type(), text })
      }
    })

    this.page.on('pageerror', (error: Error) => {
      this.consoleMessages.push({ type: 'pageerror', text: error.message })
    })

    await this.page.goto(`${this.baseUrl}${this.viewerPath}`, { waitUntil: 'networkidle' })

    // Wait for renderer to be ready
    const rendererGlobal = this.globals.canvasRenderer
    await this.page.waitForFunction(
      (name) => !!(window as any)[name],
      rendererGlobal,
      { timeout: STATUS_TIMEOUT }
    )

    this._isSetup = true
  }

  async teardown(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {})
      this.page = null
    }
    if (this.context) {
      await this.context.close().catch(() => {})
      this.context = null
    }
    if (this.browser) {
      await this.browser.close().catch(() => {})
      this.browser = null
    }
    releaseServer()
    this.consoleMessages = []
    this._isSetup = false
  }

  async setBackend(backend: Backend): Promise<void> {
    const targetBackend = backend === 'webgpu' ? 'wgsl' : 'glsl'

    await this.page!.evaluate(async ({ targetBackend, timeout, globals }) => {
      const w = window as any
      const current = typeof w[globals.currentBackend] === 'function'
        ? w[globals.currentBackend]()
        : 'glsl'

      if (current !== targetBackend) {
        const radio = document.querySelector(`input[name="backend"][value="${targetBackend}"]`) as HTMLInputElement | null
        if (radio) {
          radio.click()
          const start = Date.now()
          while (Date.now() - start < timeout) {
            const nowBackend = typeof w[globals.currentBackend] === 'function' ? w[globals.currentBackend]() : 'glsl'
            if (nowBackend === targetBackend) break
            await new Promise(r => setTimeout(r, 50))
          }
        }
      }
    }, { targetBackend, timeout: STATUS_TIMEOUT, globals: this.globals })
  }

  clearConsoleMessages(): void {
    this.consoleMessages = []
  }

  getConsoleMessages(): ConsoleEntry[] {
    return this.consoleMessages
  }

  async runWithConsoleCapture<T>(fn: () => Promise<T>): Promise<T & { console_errors?: string[] }> {
    this.clearConsoleMessages()
    const result = await fn() as T & { console_errors?: string[] }
    if (this.consoleMessages.length > 0) {
      result.console_errors = this.consoleMessages.map(m => m.text)
    }
    return result
  }

  get backend(): Backend {
    return this.options.backend
  }

  async selectEffect(effectId: string): Promise<void> {
    await this.page!.evaluate((id) => {
      const select = document.getElementById('effect-select') as HTMLSelectElement | null
      if (select) {
        select.value = id
        select.dispatchEvent(new Event('change'))
      }
    }, effectId)
  }

  async getEffectGlobals(): Promise<Record<string, any>> {
    return await this.page!.evaluate((globals) => {
      const effect = (window as any)[globals.currentEffect]
      if (!effect?.instance?.globals) return {}
      return effect.instance.globals
    }, this.globals)
  }

  async resetUniformsToDefaults(): Promise<void> {
    await this.page!.evaluate((globals) => {
      const w = window as any
      const pipeline = w[globals.renderingPipeline]
      const effect = w[globals.currentEffect]
      if (!pipeline || !effect?.instance?.globals) return

      for (const spec of Object.values(effect.instance.globals) as any[]) {
        if (!spec.uniform) continue
        const val = spec.default ?? spec.min ?? 0
        if (pipeline.setUniform) {
          pipeline.setUniform(spec.uniform, val)
        } else if (pipeline.globalUniforms) {
          pipeline.globalUniforms[spec.uniform] = val
        }
      }
    }, this.globals)
  }
}
