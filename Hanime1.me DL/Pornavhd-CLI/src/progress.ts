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

/** Rút gọn label giữ ĐẦU + ĐUÔI (số video nằm ở đuôi: `yurins…h_123.mp4`) */
export function fitLabel(label: string, max: number): string {
  if (label.length <= max) return label
  if (max <= 1) return label.slice(0, max)
  const head = Math.ceil((max - 1) / 2)
  const tail = max - 1 - head
  return label.slice(0, head) + '…' + label.slice(label.length - tail)
}

/** 1 mini-slot gọn trong `max` ký tự — rút dần: số segment → tốc độ → ETA, label giữ đầu+đuôi.
 *  Slot rộng (≥60 cột, dạng 1 video): thanh ASCII `[████░░░░]` — nhìn nhanh hơn số %.
 *  Đang seg: `a.mp4 [████░░] 85/188 1.2MB/s 01:23`; phase khác: `a.mp4 ghép…`; khởi động: `a.mp4 khởi động...` */
export function slotFragment(s0: { label: string; done: number; total: number; bytes: number; t0: number; started: boolean; phase?: string }, max = 40, idx = -1): string {
  const pre = idx >= 0 && max > 12 ? `#${idx + 1} ` : ''
  // dạng rộng: thanh + count + speed + eta (không % — thanh chính là %)
  const s = s0
  if (max >= 60 && s.started && (!s.phase || s.phase === 'seg')) {
    const cnt = `${s.done}/${s.total}`
    const el = (Date.now() - s.t0) / 1000
    const speed = el > 1 ? formatSpeed(s.bytes / el) : '?'
    const eta = s.total && s.done > 0 && el > 1 ? formatEta(((s.total - s.done) / s.done) * el) : '?'
    const rest = ` ${cnt} ${speed} ${eta}`.length
    const BW = Math.min(24, Math.max(8, max - 4 - rest))
    const lab = fitLabel(s0.label, Math.max(6, max - BW - rest - 5))
    const filled = s.total ? Math.round((Math.min(1, s.done / s.total)) * BW) : 0
    const bar = '█'.repeat(filled) + '░'.repeat(BW - filled)
    const full = `${pre}${lab}  [${bar}] ${cnt} ${speed} ${eta}`
    return full.length <= max ? full : compactFragment(s0, max, idx, pre)
  }
  return compactFragment(s0, max, idx, pre)
}

/** dạng hẹp/sapo: rút dần % → speed → eta như cũ */
function compactFragment(s: { label: string; done: number; total: number; bytes: number; t0: number; started: boolean; phase?: string }, max: number, idx: number, pre: string): string {
  const lab = fitLabel(s.label, Math.max(6, max - 20 - pre.length))
  if (s.phase && s.phase !== 'seg') return fitLabel(`${pre}${lab} ${s.phase}…`, max)
  if (!s.started) return fitLabel(`${pre}${lab} khởi động...`, max)
  const el = (Date.now() - s.t0) / 1000
  const pct = s.total ? ((s.done * 100) / s.total).toFixed(1) : '0'
  const speed = el > 1 ? formatSpeed(s.bytes / el) : '?'
  const eta = s.total && s.done > 0 && el > 1 ? formatEta(((s.total - s.done) / s.done) * el) : '?'
  const full = `${pre}${lab} ${pct}% ${s.done}/${s.total} ${speed} ${eta}`
  if (full.length <= max) return full
  const noCount = `${pre}${lab} ${pct}% ${speed} ${eta}`
  if (noCount.length <= max) return noCount
  const noSpeed = `${pre}${lab} ${pct}% ${eta}`
  if (noSpeed.length <= max) return noSpeed
  return fitLabel(`${pre}${lab} ${pct}%`, max)
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
  phase: string // '' | 'trang' | 'master' | 'seg' | 'ghép' | 'kiểm tra'
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
  private lastLine = ''
  /** số lần vẽ lại dòng status (đo nhiễu stdout) */
  paints = 0

  /** cùng label + slot đã xong → tái dùng (retry); chưa → tạo slot mới */
  createSlot(label: string): SlotState {
    const free = this.slots.find((s) => s.label === label && s.held)
    if (free) {
      free.started = false
      free.done = free.total = free.bytes = 0
      free.held = false
      free.phase = ''
      this.writeStatus()
      return free
    }
    const s: SlotState = { label, done: 0, total: 0, bytes: 0, t0: 0, started: false, held: false, phase: '' }
    this.slots.push(s)
    this.writeStatus()
    return s
  }

  /** đổi phase của slot (trang/master/seg/ghép/kiểm tra) — vẽ ngay nếu text khác */
  phase(s: SlotState, p: string): void {
    if (s.phase === p) return
    s.phase = p
    this.writeStatus()
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

  private width(): number {
    return Math.max(40, (process.stdout && process.stdout.columns) || 100)
  }

  /** in 1 dòng log: đè spaces lên dòng trạng thái → in log (clip ≤ columns, wrap hỏng \r) → vẽ lại */
  log(line: string): void {
    this.clearStatus()
    process.stdout.write(`\r${fitLabel(line, this.width())}\n`)
    this.writeStatus()
  }

  /** slot xong → in dòng kết luận bền; slot giữ lại để retry tái dùng */
  finish(s: SlotState, info: FinishInfo): void {
    this.clearStatus()
    const tag = info.end === 'ok' ? '[ok]  ' : info.end === 'skip' ? '[skip]' : '[FAIL]'
    const time = info.secs ? ` ${info.secs}s` : ''
    const size = info.mb ? ` ${info.mb}` : ''
    process.stdout.write(`\r${fitLabel(`${tag} ${s.label}${size}${time} ${info.msg}`, this.width())}\n`)
    s.held = true
    this.writeStatus()
  }

  /** MỘT dòng ≤ stdout.columns — tuyệt đối không wrap (wrap = `\r` hỏng + spam hạng rác) */
  private statusLine(): string {
    const act = this.slots.filter((s) => !s.held)
    if (!act.length) return ''
    const W = this.width()
    const budget = Math.max(14, Math.floor((W - (act.length - 1) * 3) / act.length))
    return act.map((s, i) => slotFragment(s, budget, act.length > 1 ? i : -1)).join(' | ')
  }

  private writeStatus(): void {
    const line = this.statusLine()
    if (line === this.lastLine) return // không vẽ lại text giống hệt — giảm nhiễu stdout
    this.lastLine = line
    if (!line) {
      this.clearStatus()
      return
    }
    this.paints++
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
    this.lastLine = ''
  }
}
