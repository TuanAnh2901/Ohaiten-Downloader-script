export type ReportStatus = 'success' | 'partial' | 'failed' | 'cancelled' | 'timeout';

export interface ReportFailure {
  videoId?: string;
  reason: string;
}

export interface ReportRecord {
  timestamp: string;
  operationType: 'download-all' | 'download-collection';
  collection: string;
  outputPath: string;
  durationMs: number;
  itemCounts: { total: number; succeeded: number; failed: number };
  failures: ReportFailure[];
  exitCode: number;
  status: ReportStatus;
}

export interface ReportStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const REPORTS_KEY = 'fb-saved-dl.reports.v1';

function redact(value: string): string {
  return value.replace(/COOKIE_SENTINEL_123/g, '[redacted]').replace(/(cookie|cookies|xs|c_user|presence|fb_dtsg)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]').slice(0, 500);
}

export function aggregateReportStatus(terminal: { type: string; successCount?: number; failureCount?: number }): ReportStatus {
  const failures = terminal.failureCount ?? 0;
  if (terminal.type === 'cancelled') return 'cancelled';
  if (terminal.type === 'timeout') return 'timeout';
  if (terminal.type === 'failed' || terminal.type === 'error') return 'failed';
  return failures > 0 || terminal.type === 'partial' ? 'partial' : 'success';
}

export function createReportRecord(input: {
  startedAt: number;
  operationType: ReportRecord['operationType'];
  collection: string;
  outputPath: string;
  terminal: { type: string; successCount?: number; failureCount?: number; exitCode: number; message?: string; failures?: ReportFailure[] };
  endedAt?: number;
}): ReportRecord {
  const succeeded = input.terminal.successCount ?? 0;
  const failed = input.terminal.failureCount ?? 0;
  const failures: ReportFailure[] = (input.terminal.failures ?? []).map((failure) => ({ videoId: failure.videoId, reason: redact(failure.reason) }));
  if (input.terminal.message && !failures.length && failed > 0) failures.push({ reason: redact(input.terminal.message) });
  return {
    timestamp: new Date(input.endedAt ?? Date.now()).toISOString(),
    operationType: input.operationType,
    collection: redact(input.collection),
    outputPath: redact(input.outputPath),
    durationMs: Math.max(0, (input.endedAt ?? Date.now()) - input.startedAt),
    itemCounts: { total: succeeded + failed, succeeded, failed },
    failures,
    exitCode: input.terminal.exitCode,
    status: aggregateReportStatus(input.terminal),
  };
}

export function loadReports(store: ReportStore): ReportRecord[] {
  try {
    const parsed = JSON.parse(store.getItem(REPORTS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record): record is ReportRecord => Boolean(record && typeof record === 'object' && typeof (record as ReportRecord).timestamp === 'string'));
  } catch { return []; }
}

export function saveReport(store: ReportStore, record: ReportRecord): ReportRecord[] {
  const reports = [record, ...loadReports(store)].slice(0, 50);
  store.setItem(REPORTS_KEY, JSON.stringify(reports));
  return reports;
}

export function reportDetail(record: ReportRecord): string {
  const counts = `${record.itemCounts.succeeded} succeeded, ${record.itemCounts.failed} failed`;
  const errors = record.failures.map((failure) => `${failure.videoId ? `${failure.videoId}: ` : ''}${failure.reason}`).join(' | ');
  return `${record.status} | ${counts}${errors ? ` | ${errors}` : ''}`;
}

export function browserReportStore(): ReportStore {
  return window.localStorage;
}
