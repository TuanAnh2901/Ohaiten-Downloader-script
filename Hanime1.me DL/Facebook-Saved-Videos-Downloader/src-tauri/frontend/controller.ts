import type { DownloaderSettings } from './settings';
import { createReportRecord, loadReports, saveReport, type ReportRecord, type ReportStore } from './report';

export interface Collection { id: string; name: string; count: number }
export type EngineEvent =
  | { type: 'collections'; operationId: string; collections: Collection[] }
  | { type: 'progress'; operationId: string; collectionId: string; videoId: string; completed: number; total: number }
  | { type: 'completed' | 'partial'; operationId: string; successCount: number; failureCount: number; exitCode: 0 | 1; failures?: { videoId?: string; reason: string }[] }
  | { type: 'failed' | 'cancelled' | 'timeout' | 'error'; operationId: string; message: string; exitCode: 3 | 130 | 124 };

export interface EngineRequest {
  command: 'download-all' | 'download-collection';
  collectionId?: string;
  settings: DownloaderSettings;
  dryRun: boolean;
}

export interface EngineClient {
  listCollections(settings: DownloaderSettings, onEvent: (event: EngineEvent) => void): Promise<void>;
  start(request: EngineRequest, onEvent: (event: EngineEvent) => void): Promise<void>;
}

export interface TauriEngineBridge {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void>;
}

export function createTauriEngineClient(bridge: TauriEngineBridge): EngineClient {
  const run = async (command: string, args: Record<string, unknown>, onEvent: (event: EngineEvent) => void) => {
    const unlisten = await bridge.listen<EngineEvent>('engine-event', (event) => onEvent(event.payload));
    try { await bridge.invoke<void>(command, args); } finally { unlisten(); }
  };
  return {
    listCollections: (settings, onEvent) => run('list_collections', { settings }, onEvent),
    start: (request, onEvent) => run('run_engine', { request }, onEvent),
  };
}

export interface CollectionsView {
  renderCollections(collections: Collection[]): void;
  setBusy(busy: boolean): void;
  setStatus(message: string, kind?: 'ok' | 'error'): void;
  setProgress(event: Extract<EngineEvent, { type: 'progress' }>): void;
  setTerminal(event: Extract<EngineEvent, { type: 'completed' | 'partial' | 'failed' | 'cancelled' | 'timeout' | 'error' }>): void;
  renderReports?(reports: ReportRecord[]): void;
}

export function createCollectionsController(client: EngineClient, view: CollectionsView, settings: () => DownloaderSettings, reportStore?: ReportStore) {
  let busy = false;
  let collections: Collection[] = [];
  let reports: ReportRecord[] = reportStore ? loadReports(reportStore) : [];
  view.renderReports?.(reports);

  let activeTerminal: Extract<EngineEvent, { type: 'completed' | 'partial' | 'failed' | 'cancelled' | 'timeout' | 'error' }> | undefined;
  let progressCompleted = 0;
  let progressFailed = 0;
  const consume = (event: EngineEvent) => {
    if (event.type === 'collections') { collections = event.collections; view.renderCollections(collections); return; }
    if (event.type === 'progress') {
      progressCompleted += event.completed;
      progressFailed += Math.max(0, event.total - event.completed);
      view.setProgress(event);
      return;
    }
    activeTerminal = event;
    view.setTerminal(event);
  };

  const run = async (operation: () => Promise<void>, label: string, refreshAfter = false, operationType: 'download-all' | 'download-collection' = 'download-all', collection = 'all collections') => {
    if (busy) return false;
    busy = true;
    view.setBusy(true);
    view.setStatus(`${label} in progress`);
    const startedAt = Date.now();
    activeTerminal = undefined;
    progressCompleted = 0;
    progressFailed = 0;
    const wrappedOperation = async () => operation();
    let succeeded = true;
    try {
      await wrappedOperation();
    } catch (error) {
      succeeded = false;
      const message = String(error).replace(/[\r\n]+/g, ' ').replace(/COOKIE_SENTINEL_123/g, '[redacted]').replace(/(cookie|cookies|xs|c_user|presence|fb_dtsg)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]').slice(0, 500);
      activeTerminal = { type: 'error', operationId: 'controller', message, exitCode: 3 };
      view.setStatus(message.includes('yt-dlp is missing') ? 'yt-dlp missing. Open Settings to install it.' : `Engine error: ${message}`, 'error');
    } finally {
      busy = false;
      view.setBusy(false);
    }
    if (activeTerminal && reportStore) {
      const terminal = activeTerminal;
      const reportTerminal = progressCompleted + progressFailed > 0 && !['completed', 'partial'].includes(terminal.type)
        ? { ...terminal, successCount: progressCompleted, failureCount: progressFailed }
        : terminal;
      reports = saveReport(reportStore, createReportRecord({ startedAt, operationType, collection, outputPath: settings().outputDir, terminal: reportTerminal, endedAt: Date.now() }));
      view.renderReports?.(reports);
    }
    if (refreshAfter) await run(() => client.listCollections(settings(), consume), 'Refreshing collections');
    return succeeded;
  };

  return {
    get collections() { return collections; },
    get isBusy() { return busy; },
    refresh: () => run(() => client.listCollections(settings(), consume), 'Refreshing collections'),
    downloadAll: (dryRun = false) => run(() => client.start({ command: 'download-all', settings: settings(), dryRun }, consume), dryRun ? 'Previewing all saved videos' : 'Downloading all saved videos', true),
    downloadCollection: (collectionId: string, dryRun = false) => run(() => client.start({ command: 'download-collection', collectionId, settings: settings(), dryRun }, consume), dryRun ? 'Previewing collection' : 'Downloading collection', true, 'download-collection', collectionId),
  };
}
