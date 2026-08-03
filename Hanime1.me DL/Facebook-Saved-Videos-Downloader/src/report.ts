import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXIT_NOTHING, EXIT_OK, EXIT_PARTIAL } from './errors.js';

interface Failure {
  videoId: string;
  reason: string;
  url?: string;
}

interface Skip {
  videoId: string;
  reason: string;
}

export class Report {
  private downloaded: string[] = [];
  private failures: Failure[] = [];
  private skipped: Skip[] = [];

  addDownloaded(videoId: string): void {
    this.downloaded.push(videoId);
  }

  addFailure(videoId: string, reason: string, url?: string): void {
    this.failures.push({ videoId, reason, url });
  }

  addSkipped(videoId: string, reason: string): void {
    this.skipped.push({ videoId, reason });
  }

  get downloadedCount(): number {
    return this.downloaded.length;
  }

  get failedCount(): number {
    return this.failures.length;
  }

  get skippedCount(): number {
    return this.skipped.length;
  }

  writeReportFile(dir: string): string {
    mkdirSync(dir, { recursive: true });
    const now = new Date();
    const stamp =
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}` +
      `${String(now.getDate()).padStart(2, '0')}-` +
      `${String(now.getHours()).padStart(2, '0')}` +
      `${String(now.getMinutes()).padStart(2, '0')}` +
      `${String(now.getSeconds()).padStart(2, '0')}`;
    const path = join(dir, `report-${stamp}.json`);
    writeFileSync(
      path,
      JSON.stringify(
        {
          timestamp: now.toISOString(),
          summary: {
            downloaded: this.downloadedCount,
            failed: this.failedCount,
            skipped: this.skippedCount,
          },
          failures: this.failures,
          skipped: this.skipped,
        },
        null,
        2,
      ),
    );
    return path;
  }

  summaryText(): string {
    return `[DONE] ${this.downloadedCount} downloaded, ${this.failedCount} failed, ${this.skippedCount} skipped`;
  }

  exitCode(): number {
    if (this.failedCount > 0) return EXIT_PARTIAL;
    if (this.downloadedCount === 0 && this.skippedCount === 0) return EXIT_NOTHING;
    return EXIT_OK;
  }
}
