import { describe, expect, it, vi } from 'vitest';
import { createCollectionsController, createTauriEngineClient, type Collection, type EngineClient, type CollectionsView } from '../src-tauri/frontend/controller';
import { loadReports, type ReportStore } from '../src-tauri/frontend/report';
import type { DownloaderSettings } from '../src-tauri/frontend/settings';

const settings: DownloaderSettings = { cookiesPath: 'cookies.txt', outputDir: 'downloads', jobs: 2, resolution: 720 };
const collections: Collection[] = [{ id: '302722351189018', name: 'Saved Videos', count: 7 }, { id: 'zero', name: 'Sản phẩm', count: 0 }];

function harness(client: EngineClient, reportStore?: ReportStore) {
  const view: CollectionsView = { renderCollections: vi.fn(), setBusy: vi.fn(), setStatus: vi.fn(), setProgress: vi.fn(), setTerminal: vi.fn() };
  return { controller: createCollectionsController(client, view, () => settings, reportStore), view };
}

describe('collections controller', () => {
  it('wires Tauri invoke commands to incremental engine events', async () => {
    const emitted: string[] = [];
    const bridge = {
      listen: async (_name: string, handler: (event: { payload: import('../src-tauri/frontend/controller').EngineEvent }) => void) => { handler({ payload: { type: 'progress', operationId: 'op', collectionId: 'saved', videoId: 'v', completed: 1, total: 1 } }); return () => undefined; },
      invoke: vi.fn(async (command: string) => { emitted.push(command); }),
    };
    const events: string[] = [];
    const client = createTauriEngineClient(bridge);
    await client.listCollections(settings, (event) => events.push(event.type));
    await client.start({ command: 'download-all', settings, dryRun: false }, (event) => events.push(event.type));
    expect(emitted).toEqual(['list_collections', 'run_engine']);
    expect(events).toEqual(['progress', 'progress']);
  });

  it('renders collection names/counts including Unicode and zero', async () => {
    const client: EngineClient = { listCollections: async (_s, emit) => emit({ type: 'collections', operationId: 'list', collections }), start: async () => undefined };
    const { controller, view } = harness(client); await controller.refresh();
    expect(view.renderCollections).toHaveBeenCalledWith(collections);
    expect(controller.collections[1]).toEqual({ id: 'zero', name: 'Sản phẩm', count: 0 });
  });

  it('passes exact collection id and preserves settings/dry-run', async () => {
    const start = vi.fn(async (request: Parameters<EngineClient['start']>[0], emit: Parameters<EngineClient['start']>[1]) => emit({ type: 'completed', operationId: 'x', successCount: 1, failureCount: 0, exitCode: 0 }));
    const { controller } = harness({ listCollections: async () => undefined, start }); await controller.downloadCollection('302722351189018', true);
    expect(start).toHaveBeenCalledWith({ command: 'download-collection', collectionId: '302722351189018', settings, dryRun: true }, expect.any(Function));
  });

  it('passes download-all and blocks duplicate clicks while busy', async () => {
    let release!: () => void; const pending = new Promise<void>((resolve) => { release = resolve; });
    const start = vi.fn(async () => pending); const { controller, view } = harness({ listCollections: async () => undefined, start });
    const first = controller.downloadAll(); const second = controller.downloadAll(); expect(await second).toBe(false); expect(start).toHaveBeenCalledTimes(1); expect(view.setBusy).toHaveBeenCalledWith(true); release(); await first; expect(view.setBusy).toHaveBeenLastCalledWith(false);
  });

  it('forwards progress and terminal, then refreshes after completion', async () => {
    const refresh = vi.fn(async (_s: DownloaderSettings, emit: Parameters<EngineClient['listCollections']>[1]) => emit({ type: 'collections', operationId: 'refresh', collections }));
    const { controller, view } = harness({ listCollections: refresh, start: async (_r, emit) => { emit({ type: 'progress', operationId: 'x', collectionId: '302722351189018', videoId: 'v', completed: 1, total: 2 }); emit({ type: 'completed', operationId: 'x', successCount: 2, failureCount: 0, exitCode: 0 }); } });
    await controller.downloadAll(); expect(view.setProgress).toHaveBeenCalled(); expect(view.setTerminal).toHaveBeenCalled();
  });

  it('surfaces engine failures and empty collection lists', async () => {
    const viewClient: EngineClient = { listCollections: async (_s, emit) => emit({ type: 'collections', operationId: 'empty', collections: [] }), start: async () => { throw new Error('COOKIE_SENTINEL_123'); } };
    const { controller, view } = harness(viewClient); await controller.refresh(); await controller.downloadAll(); expect(view.renderCollections).toHaveBeenCalledWith([]); expect(view.setStatus).toHaveBeenCalledWith(expect.not.stringContaining('COOKIE_SENTINEL_123'), 'error');
  });

  it('guides users to Settings when yt-dlp is missing', async () => {
    const viewClient: EngineClient = { listCollections: async () => undefined, start: async () => { throw new Error('yt-dlp is missing. Open Settings and choose Install yt-dlp.'); } };
    const { controller, view } = harness(viewClient); await controller.downloadAll();
    expect(view.setStatus).toHaveBeenCalledWith('yt-dlp missing. Open Settings to install it.', 'error');
  });

  it('persists partial terminal report with exact counts and failure detail', async () => {
    let raw = '';
    const reportStore: ReportStore = { getItem: () => raw || null, setItem: (_key, value) => { raw = value; } };
    const { controller } = harness({ listCollections: async () => undefined, start: async (_r, emit) => emit({ type: 'partial', operationId: 'x', successCount: 2, failureCount: 1, exitCode: 1, failures: [{ videoId: 'v3', reason: 'network failed' }] }) }, reportStore);
    await controller.downloadAll();
    const reports = loadReports(reportStore);
    expect(reports[0].status).toBe('partial');
    expect(reports[0].itemCounts).toEqual({ total: 3, succeeded: 2, failed: 1 });
    expect(reports[0].failures[0].reason).toBe('network failed');
  });

  it('uses cumulative completed and failed counts across progress events for timeout reports', async () => {
    let raw = '';
    const reportStore: ReportStore = { getItem: () => raw || null, setItem: (_key, value) => { raw = value; } };
    const { controller } = harness({ listCollections: async () => undefined, start: async (_r, emit) => {
      emit({ type: 'progress', operationId: 'x', collectionId: 'saved', videoId: 'v1', completed: 1, total: 1 });
      emit({ type: 'progress', operationId: 'x', collectionId: 'saved', videoId: 'v2', completed: 1, total: 1 });
      emit({ type: 'progress', operationId: 'x', collectionId: 'saved', videoId: 'v3', completed: 0, total: 1 });
      emit({ type: 'timeout', operationId: 'x', message: 'timed out', exitCode: 124 });
    } }, reportStore);
    await controller.downloadAll();
    expect(loadReports(reportStore)[0].itemCounts).toEqual({ total: 3, succeeded: 2, failed: 1 });
  });
});
