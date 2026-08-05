// ---------------------------------------------------------------------------
// Multi-line progress manager for concurrent downloads
// ---------------------------------------------------------------------------

export interface ProgressSlot {
  label: string;
  update(
    pct: number,
    downloaded: string,
    total: string,
    speed: string,
    eta: string,
  ): void;
  finish(message: string): void;
}

/**
 * Renders N progress bars stacked vertically, one per concurrent job.
 * When a slot finishes its line is frozen and a new slot can be added.
 * Uses ANSI cursor-up escape codes to update lines without scrolling.
 */
export class MultiProgress {
  private slots: Array<{ label: string; line: string; done: boolean }> = [];
  private rowCount = 0;
  private started = false;

  /**
   * Create a new download slot, rendered as a new line immediately.
   * Returns an object with update/finish methods.
   */
  createSlot(label: string): ProgressSlot {
    const entry = { label, line: `${label}  starting...`, done: false };
    this.slots.push(entry);
    this.render();
    return {
      label,
      update: (pct, downloaded, total, speed, eta) => {
        if (entry.done) return;
        const filled = Math.round((pct / 100) * 40);
        const empty = 40 - filled;
        const bar =
          '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
        const sizeText = total ? `${downloaded}/${total}` : downloaded;
        entry.line =
          `${label}  [${bar}] ${pct.toFixed(1)}%  ` +
          `${sizeText}  ${speed}  ETA ${eta}`;
        this.render();
      },
      finish: (message) => {
        entry.done = true;
        entry.line = `${label}  ${message}`;
        this.render();
      },
    };
  }

  /**
   * Mark all slots as done with a given message.
   * Call this when the entire batch of concurrent downloads completes.
   */
  finishAll(message: string): void {
    for (const s of this.slots) {
      if (!s.done) {
        s.done = true;
        s.line = `${s.label}  ${message}`;
      }
    }
    this.render();
  }

  private render(): void {
    const lines = this.slots.map((s) => s.line);
    const n = lines.length;
    if (n === 0) return;

    if (this.started) {
      // Move cursor up by the previously rendered row count
      process.stderr.write(`\r\x1b[${this.rowCount}A`);
    }

    for (const line of lines) {
      process.stderr.write(`\r\x1b[K${line}\n`);
    }

    this.started = true;
    this.rowCount = n;
  }
}
