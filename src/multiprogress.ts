/**
 * Multi-line progress manager for concurrent downloads.
 *
 * Renders N progress bars stacked vertically, one per concurrent job.
 * When a slot finishes its line is frozen and a new slot can be added.
 * Uses ANSI escape codes to update individual lines without
 * scrolling the terminal.
 */

export interface ProgressSlot {
  label: string
  update(pct: number, downloaded: string, total: string, speed: string, eta: string): void
  finish(message: string): void
}

export class MultiProgress {
  private slots: Array<{ label: string; line: string; done: boolean }> = []
  private slotCount = 0
  private rowCount = 0
  private started = false

  /**
   * Create a new download slot. Returns an object with update/finish
   * methods. The slot is rendered as a new line immediately.
   */
  createSlot(label: string): ProgressSlot {
    const index = this.slotCount++
    const entry = { label, line: `${label}  starting...`, done: false }
    this.slots.push(entry)
    this.render()
    return {
      label,
      update: (pct, downloaded, total, speed, eta) => {
        if (entry.done) return
        const filled = Math.round((pct / 100) * 40)
        const empty = 40 - filled
        const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty))
        entry.line = `${label}  [${bar}] ${pct.toFixed(1)}%  ${downloaded}/${total}  ${speed}  ETA ${eta}`
        this.render()
      },
      finish: (message) => {
        entry.done = true
        entry.line = `${label}  ${message}`
        this.render()
      },
    }
  }

  /**
   * Mark all slots as done with a given message.
   * Call this when the entire batch of concurrent downloads completes.
   */
  finishAll(message: string): void {
    for (const s of this.slots) {
      if (!s.done) {
        s.done = true
        s.line = `${s.label}  ${message}`
      }
    }
    this.render()
  }

  private render(): void {
    const alive = this.slots.filter(s => !s.done).length
    const lines = this.slots.map(s => s.line)
    const n = lines.length

    if (n === 0) return

    if (this.started) {
      // Move cursor UP by previously rendered row count
      process.stderr.write(`\r\x1b[${this.rowCount}A`)
    }

    // Write each line, clearing it first
    for (const line of lines) {
      process.stderr.write(`\r\x1b[K${line}\n`)
    }

    this.started = true
    this.rowCount = n
  }
}
