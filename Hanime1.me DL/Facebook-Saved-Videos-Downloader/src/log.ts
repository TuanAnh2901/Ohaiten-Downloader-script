/**
 * File logger for the engine (and any CLI run). Writes ISO-timestamped lines
 * to the path given via `setLogFile` (the Tauri GUI passes
 * FB_SAVED_DLP_LOG_FILE env pointing at its app log dir). No-op until a path
 * is set, so plain CLI runs and tests stay silent. Best-effort: a failed
 * append must never break the run.
 */

import { appendFileSync } from 'node:fs';

let logPath: string | null = null;

export function setLogFile(path: string): void {
  logPath = path;
}

export function log(...args: unknown[]): void {
  if (!logPath) return;
  try {
    appendFileSync(logPath, `[${new Date().toISOString()}] ${args.map(String).join(' ')}\n`);
  } catch {
    // Best-effort only.
  }
}
