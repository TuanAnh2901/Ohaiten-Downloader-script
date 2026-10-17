// src/progress.ts — MultiProgress kiểu KHÔNG-ANSI: MỘT dòng trạng thái duy nhất ở đáy màn hình,
// chỉ dùng `\r` + đè spaces (console nào cũng chạy, kể cả conhost không hỗ trợ cursor-up ANSI).
// Log in đè lên dòng đó xong vẽ lại. Zero-dep.

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

/** 1 mini-slot: `a.mp4 45.2% 85/188 1.2MB/s 01:23` hoặc `a.mp4 khởi động...` */
export function slotFragment(s: { label: string; done: number; total: number; bytes: number; t0: number; started: boolean }): string {
  if (!s.started) return `${s.label.slice(0, 18)} khởi động...`
  const el = (Date.now() - s.t0) / 1000
  const pct = s.total ? ((s.done * 100) / s.total).toFixed(1) : '0'
  const speed = el > 1 ? formatSpeed(s.bytes / el) : '?'
  const eta = s.total && s.done > 0 && el > 1 ? formatEta(((s.total - s.done) / s.done) * el) : '?'
  return `${s.label.slice(0, 18)} ${pct}% ${s.done}/${s.total} ${speed} ${eta}`
}

/** [legacy] 1 hàng bar đầy đủ (không dùng trong UI mới nhưng giữ cho test/compat) */
const BAR_W = 30
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
  held: boolean // kết luận đã in — slot rảnh, retry cùng label chiếm lại
}

export interface FinishInfo {
  end: SlotEnd
  msg: string
  mb: number
  secs: number
}

export class MultiProgress {
  private slots: SlotState[] = []
  private lastPaint = 0
  private curLen = 0

  /** cùng label + slot đã xong → tái dùng (retry); chưa → tạo slot mới */
  createSlot(label: string): SlotState {
    const free = this.slots.find((s) => s.label === label && s.held)
    if (free) {
      free.started = false
      free.done = free.total = free.bytes = 0
      free.held = false
      this.writeStatus()
      return free
    }
    const s: SlotState = { label, done: 0, total: 0, bytes: 0, t0: 0, started: false, held: false }
    this.slots.push(s)
    this.writeStatus()
    return s
  }

  /** cập nhật số segment/bytes; throttled ~250ms */
  update(s: SlotState, done: number, total: number, bytes: number): void {
    if (!s.started) {
      s.started = true
      s.t0 = Date.now()
    }
    s.done = done
    s.total = total
    s.bytes = bytes
    const now = Date.now()
    if (now - this.lastPaint >= 250) {
      this.lastPaint = now
      this.writeStatus()
    }
  }

  /** in 1 dòng log: đè spaces lên dòng trạng thái → in log → vẽ lại trạng thái */
  log(line: string): void {
    this.clearStatus()
    process.stdout.write(`\r${line}\n`)
    this.writeStatus()
  }

  /** slot xong → in dòng kết luận bền; slot giữ lại để retry tái dùng */
  finish(s: SlotState, info: FinishInfo): void {
    this.clearStatus()
    const tag = info.end === 'ok' ? '[ok]  ' : info.end === 'skip' ? '[skip]' : '[FAIL]'
    const time = info.secs ? ` ${info.secs}s` : ''
    const size = info.mb ? ` ${info.mb}` : ''
    process.stdout.write(`\r${tag} ${s.label}${size}${time} ${info.msg}\n`)
    s.held = true
    this.writeStatus()
  }

  private statusLine(): string {
    return this.slots.filter((s) => !s.held).map(slotFragment).join('  |  ')
  }

  private writeStatus(): void {
    const line = this.statusLine()
    if (!line) {
      this.curLen = 0
      return
    }
    // đè spaces để xóa đuôi cũ nếu dòng mới ngắn hơn
    const pad = this.curLen > line.length ? ' '.repeat(this.curLen - line.length) : ''
    process.stdout.write(`\r${line}${pad}`)
    this.curLen = line.length
  }

  private clearStatus(): void {
    if (this.curLen > 0) {
      process.stdout.write(`\r${' '.repeat(this.curLen)}\r`)
      this.curLen = 0
    }
  }
}
