import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export const CLEANUP_TIMEOUT_MS = 5000;

export interface ProcessCapture {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

export function sanitizeDiagnostic(value: unknown): string {
  return String(value)
    .replace(/[\r\n]+/g, ' ')
    .replace(/\b(cookie|cookies|xs|c_user|presence|fb_dtsg)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 500)
    .trim();
}

export function startFixture(fixture: string, scenario: string) {
  return spawn(process.execPath, [fixture, scenario], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

export async function collectProcess(child: ReturnType<typeof startFixture>, timeoutMs = 2000): Promise<ProcessCapture> {
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });
  const result = await Promise.race([
    new Promise<ProcessCapture>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (exitCode, signal) => resolve({ stdout, stderr, exitCode, signal }));
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`process timeout after ${timeoutMs}ms`)), timeoutMs)),
  ]);
  return result;
}

export async function terminateProcessTree(child: ReturnType<typeof startFixture>): Promise<void> {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    await execFileAsync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { timeout: CLEANUP_TIMEOUT_MS }).catch(() => undefined);
  } else {
    child.kill('SIGKILL');
  }
  await new Promise<void>((resolve, reject) => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(() => reject(new Error('process tree cleanup timeout')), CLEANUP_TIMEOUT_MS);
    child.once('close', () => { clearTimeout(timer); resolve(); });
  });
}
