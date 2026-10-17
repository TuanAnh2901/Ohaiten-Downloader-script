// src/log.ts — logger ghi file (mọi event, timestamp) + in console những dòng chính.
import { appendFileSync } from 'node:fs'

export class Logger {
  constructor(private file: string | null) {}

  /** ghi log file (luôn) — console KHÔNG in (tránh phá bar) */
  log(scope: string, msg: string): void {
    if (!this.file) return
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)
    try {
      appendFileSync(this.file, `${ts} [${scope}] ${msg}\n`)
    } catch {}
  }

  /** event quan trọng: file + console */
  key(scope: string, msg: string): void {
    this.log(scope, msg)
    console.log(msg)
  }
}

/** parse duration từ output ffprobe -show_entries format=duration (kết quả dạng key=value) */
export function parseFfprobeDuration(out: string): number | null {
  const m = out.match(/(?:^|\n)duration=([\d.]+)/)
  if (!m) return null
  const v = Number(m[1])
  return Number.isFinite(v) && v > 0 ? v : null
}
