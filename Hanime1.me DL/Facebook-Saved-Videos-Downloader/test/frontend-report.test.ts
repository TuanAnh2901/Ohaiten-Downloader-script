import { describe, expect, it } from 'vitest';
import { aggregateReportStatus, createReportRecord, loadReports, reportDetail, saveReport, type ReportStore } from '../src-tauri/frontend/report';

function store(seed = ''): ReportStore {
  let value = seed;
  return { getItem: () => value || null, setItem: (_key, next) => { value = next; } };
}

describe('frontend report lifecycle', () => {
  it('derives partial from two successes and one failure', () => {
    const record = createReportRecord({ startedAt: 100, endedAt: 250, operationType: 'download-all', collection: 'all collections', outputPath: 'downloads', terminal: { type: 'completed', successCount: 2, failureCount: 1, exitCode: 1, failures: [{ videoId: 'v3', reason: 'yt-dlp failed' }] } });
    expect(record.status).toBe('partial');
    expect(record.itemCounts).toEqual({ total: 3, succeeded: 2, failed: 1 });
    expect(record.exitCode).toBe(1);
    expect(reportDetail(record)).toContain('v3: yt-dlp failed');
  });

  it.each([
    ['completed', 'success'], ['partial', 'partial'], ['failed', 'failed'], ['cancelled', 'cancelled'], ['timeout', 'timeout'],
  ] as const)('keeps %s terminal status distinct', (type, expected) => {
    expect(aggregateReportStatus({ type, successCount: type === 'completed' ? 1 : 0, failureCount: type === 'partial' ? 1 : 0 })).toBe(expected);
  });

  it('does not claim success when completed event contains failures', () => {
    expect(aggregateReportStatus({ type: 'completed', successCount: 2, failureCount: 1 })).toBe('partial');
  });

  it('persists across restart and returns newest first', () => {
    const first = createReportRecord({ startedAt: 0, endedAt: 10, operationType: 'download-all', collection: 'old', outputPath: 'downloads', terminal: { type: 'completed', successCount: 1, failureCount: 0, exitCode: 0 } });
    const second = createReportRecord({ startedAt: 20, endedAt: 40, operationType: 'download-collection', collection: 'new', outputPath: 'downloads', terminal: { type: 'cancelled', exitCode: 130 } });
    const persisted = store(); saveReport(persisted, first); saveReport(persisted, second);
    const afterRestart = loadReports(persisted);
    expect(afterRestart.map((report) => report.collection)).toEqual(['new', 'old']);
    expect(afterRestart[0].status).toBe('cancelled');
  });

  it('redacts cookie sentinel from persisted fields and error detail', () => {
    const persisted = store();
    const record = createReportRecord({ startedAt: 0, endedAt: 1, operationType: 'download-all', collection: 'COOKIE_SENTINEL_123', outputPath: 'cookies=COOKIE_SENTINEL_123', terminal: { type: 'failed', exitCode: 3, message: 'xs=COOKIE_SENTINEL_123' } });
    saveReport(persisted, record);
    expect(persisted.getItem('reports')).not.toContain('COOKIE_SENTINEL_123');
    expect(reportDetail(record)).not.toContain('COOKIE_SENTINEL_123');
  });

  it('preserves timeout counts supplied from progress lifecycle', () => {
    const record = createReportRecord({ startedAt: 0, endedAt: 5, operationType: 'download-all', collection: 'all collections', outputPath: 'downloads', terminal: { type: 'timeout', successCount: 2, failureCount: 1, exitCode: 124 } });
    expect(record.itemCounts).toEqual({ total: 3, succeeded: 2, failed: 1 });
    expect(record.status).toBe('timeout');
  });
});
