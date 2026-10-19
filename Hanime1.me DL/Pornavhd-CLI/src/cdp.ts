// src/cdp.ts — CDP client tự viết (0 runtime dep): điều khiển Edge/Chrome thật.
// WebSocket built-in Node>=22; mọi event per-session của flatten mode đi qua 1 ws connection.
import { spawn, ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface CdpResponse {
  url: string
  status: number
  contentType: string
  requestId: string
  sessionId: string
}

export function decodeBody(body: string, base64Encoded: boolean): Buffer {
  if (base64Encoded) return Buffer.from(body, 'base64')
  return Buffer.from(body, 'utf8')
}

export function findBrowserExe(): string {
  const cands = [
    join(process.env['ProgramFiles'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env['LOCALAPPDATA'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env['ProgramFiles'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['LOCALAPPDATA'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ]
  const hit = cands.find((p) => existsSync(p))
  if (hit) return hit
  return 'msedge.exe' // PATH fallback — spawn error xử lý bên dưới
}

class Cdp {
  ws!: WebSocket
  private nextId = 0
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()
  private eventHandler: (m: any) => void = () => {}

  async connect(wsUrl: string) {
    this.ws = new WebSocket(wsUrl.replace('localhost', '127.0.0.1'))
    if (process.env.PWDBG) console.error('[cdp] connect...')
    await new Promise<void>((res, rej) => {
      this.ws.onopen = () => {
        if (process.env.PWDBG) console.error('[cdp] WS open')
        res()
      }
      this.ws.onerror = () => rej(new Error('không kết nối được DevTools WebSocket'))
      this.ws.onclose = (e) => {
        if (process.env.PWDBG) console.error('[cdp] WS close', e.code, e.reason?.slice(0, 80))
      }
      this.ws.onmessage = (ev) => this.onRawMessage(ev)
      // đặt onmessage TRƯỚC open để không mất message đầu (so sánh dbg2 chạy được)
    })
  }

  private onRawMessage(ev: any) {
    if (process.env.PWDBG) {
      try {
        const m = JSON.parse(String(ev.data))
        console.error('[cdp]<-', m.id || m.method)
      } catch {}
    }
    try {
      const msg = JSON.parse(String(ev.data))
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(`${msg.error.message || msg.error.code} ${(msg.error.data?.slice?.(0, 120) || '')}`))
        else p.resolve(msg.result)
      } else if (msg.method) {
        try {
          const hp = this.eventHandler(msg)
          if (hp && hp.catch) hp.catch(() => {})
        } catch {}
      }
    } catch (e) {
      if (process.env.PWDBG) console.error('[cdp] parse/dispatch lỗi:', e)
    }
  }

  send(method: string, params: any = {}, sessionId?: string): Promise<any> {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
}

export class Page {
  private listeners = new Set<(r: CdpResponse) => void>()

  constructor(
    private browser: Browser,
    public targetId: string,
    public sessionId: string,
  ) {}

  on(_event: 'response', cb: (r: CdpResponse) => void) {
    this.listeners.add(cb)
  }

  _emitResponse(r: CdpResponse) {
    for (const l of this.listeners) {
      try {
        l(r)
      } catch {}
    }
  }

  /** Page.navigate — không chờ load xong (caller tự poll html()) */
  async goto(url: string, timeoutMs = 45000) {
    await Promise.race([
      this.browser.cdp.send('Page.navigate', { url }, this.sessionId),
      new Promise((_, rej) => setTimeout(() => rej(new Error('navigate timeout')), timeoutMs)),
    ]).catch(() => {}) // nav lỗi chờ content poll tự xử lý
  }

  async html(): Promise<string> {
    const res = await this.browser.cdp.send(
      'Runtime.evaluate',
      { expression: 'document.documentElement.outerHTML', returnByValue: true },
      this.sessionId,
    ).catch((e) => {
      if (process.env.PWDBG) console.error('[cdp] html() lỗi:', String(e).slice(0, 120))
      return null
    })
    return res?.result?.value || ''
  }

  async evalInFrames(urlMatch: RegExp, expr: string): Promise<any[]> {
    const out: any[] = []
    for (const [tid, sid] of this.browser.frameSessions()) {
      if (!urlMatch.test(this.browser.targetUrl(tid))) continue
      const res = await this.browser.cdp
        .send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid)
        .catch(() => null)
      out.push(res?.result?.value ?? null)
    }
    return out
  }

  async getResponseBody(requestId: string): Promise<Buffer | null> {
    const res = await this.browser.cdp
      .send('Network.getResponseBody', { requestId }, this.sessionId)
      .catch(() => null)
    if (!res || res.body == null) return null
    return decodeBody(res.body, !!res.base64Encoded)
  }

  /** Đọc body theo sessionId ghi nhận sự kiện (requestId là per-session trong CDP) */
  body(resp: { requestId: string; sessionId: string }): Promise<Buffer | null> {
    return this.browser.cdp
      .send('Network.getResponseBody', { requestId: resp.requestId }, resp.sessionId as string)
      .then((res: any) => (res && res.body != null ? decodeBody(res.body, !!res.base64Encoded) : null))
      .catch(() => null)
  }

  async close() {
    await this.browser.closeTarget(this.targetId)
  }
}

export class Browser {
  cdp = new Cdp()
  proc!: ChildProcess
  private exe = ''
  private ownTargets = new Set<string>()
  private sessions = new Map<string, string>() // targetId -> sessionId
  private targetUrls = new Map<string, string>() // targetId -> url
  private pageTargets = new Map<string, string>() // sessionId -> owning page targetId
  private pages = new Map<string, Page>() // targetId -> Page
  private attachedHandle = async (m: any) => {
    if (m.method === 'Target.targetCreated' || m.method === 'Target.targetInfoChanged') {
      const ti = m.params.targetInfo
      this.targetUrls.set(ti.targetId, ti.url)
      if (ti.type === 'iframe') await this.ensureAttach(ti.targetId)
    } else if (m.method === 'Target.detachedFromTarget') {
      this.sessions.delete(m.params.targetId)
    } else if (
      typeof m.sessionId === 'string' &&
      (m.method === 'Network.responseReceived' || m.method === 'Network.loadFailed')
    ) {
      const resp = m.params.response
      if (resp) {
        const r: CdpResponse = {
          url: resp.url,
          status: resp.status,
          contentType: resp.headers?.['Content-Type'] || resp.headers?.['content-type'] || '',
          requestId: m.params.requestId,
          sessionId: m.sessionId,
        }
        // quốc gia listener của mọi page (browser của 1 worker chỉ 1 page hoạt động)
        for (const pg of this.pages.values()) pg._emitResponse(r)
      }
    }
  }

  private async ensureAttach(targetId: string): Promise<string | null> {
    for (let tryN = 0; tryN < 2; tryN++) { // lần 1 có thể thua race targetInfo' lụi giữa chừng — thử lại 200ms sau
      try {
        const res = await this.cdp.send('Target.attachToTarget', { targetId, flatten: true })
        if (res?.sessionId) {
          this.sessions.set(targetId, res.sessionId)
          for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) {
            this.cdp.send(m, {}, res.sessionId).catch(() => {})
          }
          return res.sessionId
        }
      } catch {
        // target phát/lụi giữa chừng (common với iframe quảng cáo) — bỏ session cache
        this.sessions.delete(targetId)
      }
      if (tryN === 0) await new Promise((r) => setTimeout(r, 200))
    }
    return null
  }

  targetUrl(tid: string): string {
    return this.targetUrls.get(tid) || ''
  }

  frameSessions(): [string, string][] {
    const out: [string, string][] = []
    for (const [tid, sid] of this.sessions) out.push([tid, sid]) // page/iframe đều hợp lệ
    return out
  }

  static async launch(profileDir: string, log: (s: string) => void = () => {}): Promise<Browser> { //	✔ giữ print^C 	/^C
    let exe = ''
    let proc: ChildProcess | null = null
    const b = new Browser()
    for (const cand of [findBrowserExe(), 'msedge.exe', 'chrome.exe']) {
      if (!cand || cand === exe) continue
      try {
        // chờ ws URL trong 15s; PATH exe sai sẽ mode process exit ngay
        proc = spawn(
          cand,
          [
            '--remote-debugging-port=0',
            `--user-data-dir=${profileDir}`,
            '--no-first-run',
            '--no-startup-window', // daemon: process sống mà không mở trang khởi-start (đóng nó = Edge exit -> 1006)
            '--mute-audio',
            '--autoplay-policy=no-user-gesture-required',
            '--window-size=1100,800',
            '--window-position=-2400,-2400', // offscreen: "background running" — showWindow() đưa lên khi cần click CF
            '--disable-blink-features=AutomationControlled',
          ],
          { stdio: ['ignore', 'ignore', 'pipe'] },
        )
        // PATH exe không tồn tại → spawn fires async 'error' event; bọc để loop thử candidate kế tiếp
        proc.on('error', () => {})
        let spawnFailed = false
        proc.once('error', () => { spawnFailed = true })
        exe = cand
        const wsUrl = await new Promise<string>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('không thấy DevTools ws URL')), 15000)
          const checkFail = setInterval(() => {
            if (spawnFailed) {
              clearTimeout(timer)
              clearInterval(checkFail)
              reject(new Error('spawn lỗi (ENOENT?)'))
            }
          }, 250)
          let buf = ''
          proc!.stderr!.on('data', (c) => {
            buf += String(c)
            if (process.env.PWDBG) console.error('[browser-stderr]', String(c).split('\n').filter(Boolean).slice(0, 3).join(' | ').slice(0, 200))
            const m = buf.match(/DevTools listening on (ws:\/\/\S+)/)
            if (m) {
              clearTimeout(timer)
              clearInterval(checkFail)
              resolve(m[1])
            }
          })
          proc!.on('exit', () => {
            clearTimeout(timer)
            clearInterval(checkFail)
            reject(new Error('browser process exit sớm'))
          })
        })
        await b.cdp.connect(wsUrl)
        break
      } catch (e) {
        try {
          proc?.kill()
        } catch {}
        proc = null
      }
    }
    if (!proc) throw new Error('Không mở được Edge/Chrome — kiểm tra cài đặt')
    b.proc = proc
    b.exe = exe
    b.cdp.eventHandler = b.attachedHandle
    await b.cdp.send('Target.setDiscoverTargets', { discover: true })
    await new Promise((res) => setTimeout(res, 300))
    log(`[browser] ${b.exe}`)
    return b
  }

  async newPage(startUrl: string): Promise<Page> {
    const res = await this.cdp.send('Target.createTarget', { url: 'about:blank' })
    const targetId = res.targetId
    this.ownTargets.add(targetId)
    const sessionId = await this.ensureAttach(targetId)
    if (!sessionId) throw new Error('không attach được target mới trong browser')
    const page = new Page(this, targetId, sessionId)
    this.pages.set(targetId, page)
    if (startUrl) await page.goto(startUrl)
    return page
  }

  async closeTarget(targetId: string) {
    try {
      await this.cdp.send('Target.closeTarget', { targetId })
    } catch {}
    this.pages.delete(targetId)
    this.ownTargets.delete(targetId)
  }

  async close() {
    try {
      this.cdp.send('Browser.close')
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
    try {
      this.proc.kill()
    } catch {}
  }

  /** ẩn/hiện cửa sổ browser (offscreen mặc định; hiện khi cần người dùng click CF) */
  async showWindow(on: boolean): Promise<void> {
    try {
      const { windowId } = (await this.cdp.send('Browser.getWindowForTarget', {})) as any
      if (!windowId) return
      await this.cdp.send('Browser.setWindowBounds', {
        windowId,
        bounds: on
          ? { windowState: 'normal', left: 80, top: 60, width: 1100, height: 800 }
          : { windowState: 'normal', left: -2400, top: -2400, width: 1100, height: 800 },
      })
    } catch {}
  }
}
