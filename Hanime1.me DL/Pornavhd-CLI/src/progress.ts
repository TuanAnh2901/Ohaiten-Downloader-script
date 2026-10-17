// src/progress.ts — MultiProgress: MỌI thứ về stdout (bar + log cùng stream → layout không nát).
// Slot tái dùng theo label: retry không nhảy hàng, không spam "[khởi động...]".
// Bất biến: sau mỗi lần vẽ, cursor nằm dưới khối bar. erase(): lên rowCount dòng rồi clear từng dòng.
// Zero-dep, pattern AnimehayCLI nhưng log đi qua đây luôn.

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
  private started = false
  private lastPaint = 0
  private rowCount = 0

  /** cùng label + slot đã xong → tái dùng (retry); chưa → hàng mới */
  createSlot(label: string): SlotState {
    const free = this.slots.find((s) => s.label === label && s.held)
    if (free) {
      free.started = false
      free.done = free.total = free.bytes = 0
      free.held = false
      this.render()
      return free
    }
    const s: SlotState = { label, done: 0, total: 0, bytes: 0, t0: 0, started: false, held: false }
    this.slots.push(s)
    this.render()
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
    if (now - this.lastPaint >= 100) {
      this.lastPaint = now
      this.erase()
      this.render()
    }
  }

  /** in 1 dòng log: xóa khối bar → in log → vẽ lại bar dưới nó */
  log(line: string): void {
    this.erase()
    process.stdout.write(`\r\x1b[K${line}\n`)
    this.render()
  }

  /** slot xong → in dòng kết luận bền, slot giữ lại (held) để retry tái dùng */
  finish(s: SlotState, info: FinishInfo): void {
    this.erase()
    const tag = info.end === 'ok' ? '[ok]  ' : info.end === 'skip' ? '[skip]' : '[FAIL]'
    const time = info.secs ? ` ${info.secs}s` : ''
    const size = info.mb ? ` ${info.mb}` : ''
    process.stdout.write(`\r\x1b[K${tag} ${s.label}${size}${time} ${info.msg}\n`)
    s.held = true
    this.render()
  }

  private erase(): void {
    if (!this.started || !this.rowCount) return
    process.stdout.write(`\x1b[${this.rowCount}A`)
    for (let i = 0; i < this.rowCount; i++) process.stdout.write('\r\x1b[K\x1b[1B')
  }

  /** vẽ khối bar từ vị trí cursor hiện tại — chỉ các slot đang chạy (held không vẽ) */
  private render(): void {
    const lines = this.slots.filter((s) => !s.held).map((s) => {
      if (!s.started) return `${s.label.slice(0, 22).padEnd(23)} [khởi động...]`
      const el = (Date.now() - s.t0) / 1000
      return barLine(s.label, s.done, s.total, s.bytes, el)
    })
    for (const l of lines) process.stdout.write(`\r\x1b[K${l}\n`)
    this.started = true
    this.rowCount = lines.length
  }
}
