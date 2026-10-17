// src/progress.ts — MultiProgress: mỗi job 1 hàng, redraw stderr bằng ANSI cursor-up.
// Khác AnimehayCLI: slot xong in 1 dòng kết luận rồi THU GỌN (không phình stack).
// Zero-dep, copy pattern từ AnimehayCLI/src/multiprogress.ts.

export function formatBytes(n: number): string {
  if (n < 0) return '?'
  if (n < 1024) return `${n}B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)}KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)}MB`
  return `${(n / 1073741824).toFixed(2)}GB`
}

export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '?'
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatEta(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '?'
  sec = Math.round(sec)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}

const BAR_W = 30

/** 1 hàng bar: `[label] [████░░░] 45.2% 120/163 18.5MB/s ETA 01:23` */
export function barLine(label: string, done: number, total: number, bytes: number, elapsedSec: number): string {
  const pct = total ? (done * 100) / total : 0
  const filled = Math.round((Math.min(100, pct) / 100) * BAR_W)
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_W - filled)
  const lab = label.length > 22 ? label.slice(0, 21) + '…' : label
  const speed = elapsedSec > 0.5 ? formatSpeed(bytes / elapsedSec) : '?'
  const eta = pct > 1 && elapsedSec > 0.5 ? formatEta(((100 - pct) / pct) * elapsedSec) : '?'
  return `${lab.padEnd(23)} [${bar}] ${pct.toFixed(1).padStart(5)}% ${String(done).padStart(3)}/${total} ${speed.padStart(10)} ETA ${eta}`
}

export type SlotEnd = 'ok' | 'fail' | 'skip'

export interface SlotState {
  label: string
  done: number
  total: number
  bytes: number
  t0: number
  started: boolean
}

export interface FinishInfo {
  end: SlotEnd
  msg: string
  mb: number
  secs: number
}

export class MultiProgress {
  private slots: SlotState[] = []
  private started = false
  private lastPaint = 0
  private rowCount = 0

  createSlot(label: string): SlotState {
    const s: SlotState = { label, done: 0, total: 0, bytes: 0, t0: 0, started: false }
    this.slots.push(s)
    this.paint(true)
    return s
  }

  /** cập nhật số segment/bytes; throttled ~100ms */
  update(s: SlotState, done: number, total: number, bytes: number): void {
    if (!s.started) {
      s.started = true
      s.t0 = Date.now()
    }
    s.done = done
    s.total = total
    s.bytes = bytes
    const now = Date.now()
    if (now - this.lastPaint >= 100) this.paint(false)
  }

  /** slot xong → in dòng kết luận bền (stdout), thu gọn hàng */
  finish(s: SlotState, info: FinishInfo): void {
    this.slots = this.slots.filter((x) => x !== s)
    const tag = info.end === 'ok' ? '[ok]  ' : info.end === 'skip' ? '[skip]' : '[FAIL]'
    const time = info.secs ? ` ${info.secs}s` : ''
    const size = info.mb ? ` ${info.mb}` : ''
    process.stdout.write(`${tag} ${s.label}${size}${time} ${info.msg}\n`)
    if (this.slots.length) this.paint(true) // redraw stack còn lại từ đầu
  }

  private paint(force: boolean): void {
    const now = Date.now()
    if (!force && now - this.lastPaint < 100) return
    this.lastPaint = now
    const lines = this.slots.map((s) => {
      if (!s.started) return `${s.label.slice(0, 22).padEnd(23)} [khởi động...]`
      const el = (Date.now() - s.t0) / 1000
      return barLine(s.label, s.done, s.total, s.bytes, el)
    })
    if (this.started) process.stderr.write(`\r\x1b[${this.rowCount}A`)
    for (const l of lines) process.stderr.write(`\r\x1b[K${l}\n`)
    this.started = true
    this.rowCount = lines.length
  }
}
