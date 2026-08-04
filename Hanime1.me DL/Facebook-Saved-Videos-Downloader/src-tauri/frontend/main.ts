import {
  browserPathChecks, browserSettingsStore, loadSettings, resetSettings, saveSettings, tauriEvents, tauriSettings,
  type DownloaderSettings,
} from './settings';
import { createCollectionsController, createTauriEngineClient, type Collection, type EngineClient, type EngineEvent, type CollectionsView } from './controller';
import { browserReportStore, reportDetail, type ReportRecord } from './report';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root missing');

app.innerHTML = `
  <main class="shell" aria-labelledby="app-title">
    <header class="topbar"><div class="brand"><span class="app-icon" aria-hidden="true">▶</span><div><p class="eyebrow">Personal video library</p><h1 id="app-title">Facebook Saved <span class="muted">v0.1.0</span></h1></div></div><div class="topbar-actions"><div class="status" role="status" aria-live="polite"><span class="status-dot"></span><span data-status>ENGINE READY</span></div><button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle light and dark theme">☀️</button></div></header>
    <div class="layout"><aside class="sidebar" aria-label="Primary navigation"><nav>
      <button class="nav-link active" data-tab="collections" type="button" aria-current="page"><span class="nav-icon" aria-hidden="true">▦</span><span>Collections</span></button>
      <button class="nav-link" data-tab="history" type="button"><span class="nav-icon" aria-hidden="true">◷</span><span>Report history</span></button>
      <button class="nav-link" data-tab="settings" type="button"><span class="nav-icon" aria-hidden="true">⚙</span><span>Settings</span></button>
    </nav><div class="sidebar-note"><strong>Ready to archive</strong><span>Bundled engine standing by.</span></div></aside>
      <section class="content" aria-label="Application content">
        <div class="tab-content active" data-tab-content="collections" aria-labelledby="collections-title">
          <div class="section-heading"><div><p class="eyebrow">Your library</p><h2 id="collections-title">Saved collections</h2></div><button class="button button-secondary" id="refresh-collections" type="button">Refresh library</button></div>
          <p id="collections-status" class="muted" role="status" aria-live="polite">Loading collections...</p><div class="collection-grid" data-collections aria-label="Saved collections"></div>
          <section class="action-panel" aria-labelledby="download-title"><div><p class="eyebrow">Download center</p><h2 id="download-title">Archive your saved videos</h2><p class="muted">Select a collection above or scan all saved items.</p></div><div class="action-row"><button class="button button-primary" id="download-all" type="button">Download all</button><button class="button button-quiet" id="dry-run" type="button">Preview plan</button></div></section>
          <section class="progress-panel" aria-labelledby="progress-title"><div class="section-heading compact"><div><p class="eyebrow">Live activity</p><h2 id="progress-title">Download progress</h2></div></div><p id="operation-status" class="empty-state" role="status" aria-live="polite">No operation running.</p><progress id="operation-progress" max="1" value="0" aria-label="Download progress"></progress></section>
        </div>
        <div class="tab-content" data-tab-content="history" aria-labelledby="history-title">
          <section class="history-panel"><div class="section-heading compact"><div><p class="eyebrow">Activity</p><h2 id="history-title">Report history</h2></div></div><div data-history aria-live="polite"></div></section>
        </div>
        <div class="tab-content" data-tab-content="settings" aria-labelledby="settings-title">
          <section class="settings-panel"><div class="section-heading compact"><div><p class="eyebrow">Preferences</p><h2 id="settings-title">Download settings</h2></div></div><form id="settings-form" novalidate><div class="settings-grid">
            <label for="cookies-path">Cookies file<div class="field-control"><input id="cookies-path" data-testid="settings-cookies-path" type="text" autocomplete="off" /><button class="button browse-button" id="browse-cookies" type="button" aria-label="Browse for cookies file">Browse</button></div></label>
            <label for="output-dir">Output folder<div class="field-control"><input id="output-dir" data-testid="settings-output-dir" type="text" /><button class="button browse-button" id="browse-output" type="button" aria-label="Browse for output folder">Browse</button></div></label>
             <div class="tool-status" id="yt-dlp-status" role="status" aria-live="polite"><strong>yt-dlp</strong><span data-yt-dlp-message>Checking for yt-dlp...</span><button class="button button-secondary" id="install-yt-dlp" type="button">Install official yt-dlp</button></div>
            <label for="jobs">Concurrent jobs<input id="jobs" data-testid="settings-jobs" type="number" min="1" max="8" step="1" /></label>
            <label for="resolution">Maximum resolution<select id="resolution" data-testid="settings-resolution"><option value="360">360p</option><option value="480">480p</option><option value="720">720p</option><option value="1080">1080p</option></select></label>
          </div><p id="settings-errors" class="field-errors" role="alert" aria-live="polite"></p><div class="settings-actions"><button class="button button-primary" id="save-settings" data-testid="save-settings" type="submit">Save settings</button><button class="button button-quiet" id="reset-settings" data-testid="reset-settings" type="button">Reset defaults</button></div></form></section>
        </div>
      </section>
    </div>
  </main>`;

const settingsStore = browserSettingsStore();
const settingsPaths = browserPathChecks();
const fields = { cookiesPath: document.querySelector<HTMLInputElement>('#cookies-path'), outputDir: document.querySelector<HTMLInputElement>('#output-dir'), jobs: document.querySelector<HTMLInputElement>('#jobs'), resolution: document.querySelector<HTMLSelectElement>('#resolution') };

type PickerResult = string | string[] | null;
type DialogBridge = { open(options?: { directory?: boolean; filters?: { name: string; extensions: string[] }[] }): Promise<PickerResult> };
const dialog = (window as Window & { __TAURI__?: { dialog?: DialogBridge } }).__TAURI__?.dialog;
document.querySelectorAll<HTMLButtonElement>('.nav-link').forEach((link) => link.addEventListener('click', () => {
  const tab = link.dataset.tab;
  if (!tab) return;
  document.querySelectorAll<HTMLButtonElement>('.nav-link').forEach((item) => { const active = item === link; item.classList.toggle('active', active); if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); });
  document.querySelectorAll<HTMLElement>('[data-tab-content]').forEach((content) => content.classList.toggle('active', content.dataset.tabContent === tab));
}));
document.querySelector<HTMLButtonElement>('#browse-cookies')?.addEventListener('click', async () => {
  const result = await dialog?.open({ filters: [{ name: 'Cookies', extensions: ['txt'] }] });
  if (typeof result === 'string' && fields.cookiesPath) fields.cookiesPath.value = result;
});
document.querySelector<HTMLButtonElement>('#browse-output')?.addEventListener('click', async () => {
  const result = await dialog?.open({ directory: true });
  if (typeof result === 'string' && fields.outputDir) fields.outputDir.value = result;
});
const readSettings = (): DownloaderSettings => ({ cookiesPath: fields.cookiesPath?.value ?? '', outputDir: fields.outputDir?.value ?? '', jobs: Number(fields.jobs?.value), resolution: Number(fields.resolution?.value) });
const writeSettings = (s: DownloaderSettings) => { if (fields.cookiesPath) fields.cookiesPath.value = s.cookiesPath; if (fields.outputDir) fields.outputDir.value = s.outputDir; if (fields.jobs) fields.jobs.value = String(s.jobs); if (fields.resolution) fields.resolution.value = String(s.resolution); };
const setStatus = (message: string, kind: 'ok' | 'error' = 'ok') => { const el = document.querySelector<HTMLElement>('[data-status]'); if (el) el.textContent = message; el?.parentElement?.classList.toggle('status-error', kind === 'error'); };
const operationStatus = document.querySelector<HTMLElement>('#operation-status');
const progress = document.querySelector<HTMLProgressElement>('#operation-progress');
const collectionGrid = document.querySelector<HTMLElement>('[data-collections]');
const history = document.querySelector<HTMLElement>('[data-history]');
type YtDlpStatus = { available: boolean; source: string | null; version: string };
const renderYtDlpStatus = (status: YtDlpStatus) => { const message = document.querySelector<HTMLElement>('[data-yt-dlp-message]'); const button = document.querySelector<HTMLButtonElement>('#install-yt-dlp'); if (message) message.textContent = status.available ? `Available (${status.version})` : `Missing (${status.version})`; if (button) button.hidden = status.available; };

const renderReports = (reports: ReportRecord[]) => {
  if (!history) return;
  history.replaceChildren();
   if (!reports.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Completed runs will appear here.'; history.append(empty); return; }
  reports.forEach((record) => {
    const article = document.createElement('article'); article.className = `report-record report-${record.status}`;
     const heading = document.createElement('h3'); heading.textContent = `${record.status.toUpperCase()} · ${record.operationType}`;
     const metadata = document.createElement('p'); metadata.className = 'muted'; metadata.textContent = `${new Date(record.timestamp).toLocaleString()} · ${record.itemCounts.succeeded} succeeded · ${record.itemCounts.failed} failed · exit ${record.exitCode}`;
     const detail = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'View details and errors';
     const body = document.createElement('p'); body.className = 'muted'; body.textContent = `${record.collection} · ${record.outputPath} · ${Math.round(record.durationMs / 1000)}s${record.failures.length ? ` · ${reportDetail(record)}` : ''}`;
    detail.append(summary, body); article.append(heading, metadata, detail); history.append(article);
  });
};

const renderCollections = (collections: Collection[]) => {
  if (!collectionGrid) return;
  collectionGrid.replaceChildren();
   if (!collections.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'No collections found. Check settings and refresh.'; collectionGrid.append(empty); return; }
  collections.forEach((collection, index) => {
    const card = document.createElement('article'); card.className = 'collection-card'; card.dataset.collectionId = collection.id;
     const indexLabel = document.createElement('p'); indexLabel.className = 'card-index'; indexLabel.textContent = `Collection ${String(index + 1).padStart(2, '0')}`;
    const title = document.createElement('h3'); title.textContent = collection.name;
     const description = document.createElement('p'); description.textContent = collection.count === 0 ? 'This collection is empty.' : 'Ready to archive your saved videos.';
     const footer = document.createElement('div'); footer.className = 'card-footer'; footer.innerHTML = '<span>Items saved</span>';
    const count = document.createElement('strong'); count.textContent = `${collection.count} ${collection.count === 1 ? 'item' : 'items'}`; footer.append(count);
    const actions = document.createElement('div'); actions.className = 'card-actions';
     const download = document.createElement('button'); download.className = 'button button-primary'; download.type = 'button'; download.dataset.downloadCollection = collection.id; download.textContent = 'Download'; download.setAttribute('aria-label', `Download ${collection.name}`);
     const preview = document.createElement('button'); preview.className = 'button button-quiet'; preview.type = 'button'; preview.dataset.previewCollection = collection.id; preview.textContent = 'Preview'; preview.setAttribute('aria-label', `Preview ${collection.name}`);
    actions.append(download, preview); card.append(indexLabel, title, description, footer, actions); collectionGrid.append(card);
  });
};

const view: CollectionsView = {
  renderCollections,
  setBusy: (busy) => document.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = busy; button.setAttribute('aria-busy', String(busy)); }),
  setStatus,
   setProgress: (event) => { const total = Math.max(event.total, 1); if (progress) { progress.max = total; progress.value = event.completed; } if (operationStatus) operationStatus.textContent = `Downloading ${event.completed} of ${event.total} · video ${event.videoId}`; },
   setTerminal: (event) => { const hasFailures = (event.type === 'completed' || event.type === 'partial') && event.failureCount > 0; const label = hasFailures ? 'partial' : event.type; const summary = event.type === 'completed' || event.type === 'partial' ? `${label}: ${event.successCount} succeeded, ${event.failureCount} failed.` : `${event.type}: ${'message' in event ? event.message : 'unknown engine state'}`; if (operationStatus) operationStatus.textContent = summary; setStatus(label === 'completed' ? 'Engine complete' : `Engine ${label}`, label === 'completed' ? 'ok' : 'error'); },
  renderReports,
};

const tauri = tauriSettings();
const events = tauriEvents();
const client: EngineClient = tauri && events ? createTauriEngineClient({
  invoke: tauri.invoke,
  listen: events.listen,
}) : { listCollections: async (_settings, onEvent) => onEvent({ type: 'collections', operationId: 'browser', collections: [] }), start: async (_request, onEvent) => onEvent({ type: 'error', operationId: 'browser', message: 'Open the Tauri desktop app to run the engine.', exitCode: 3 }) };
const controller = createCollectionsController(client, view, readSettings, browserReportStore());
const refreshYtDlpStatus = async () => { if (!tauri) return; try { renderYtDlpStatus(await tauri.invoke<YtDlpStatus>('yt_dlp_status')); } catch { renderYtDlpStatus({ available: false, source: null, version: 'unknown' }); } };
void refreshYtDlpStatus();
document.querySelector<HTMLButtonElement>('#install-yt-dlp')?.addEventListener('click', async () => { const button = document.querySelector<HTMLButtonElement>('#install-yt-dlp'); if (button) { button.disabled = true; button.textContent = 'Installing...'; } try { if (!tauri) throw new Error('Open the Tauri desktop app to install yt-dlp.'); renderYtDlpStatus(await tauri.invoke<YtDlpStatus>('install_yt_dlp_command')); setStatus('yt-dlp installed'); } catch (error) { const message = String(error); if (settingsErrors) settingsErrors.textContent = message; setStatus('yt-dlp install failed', 'error'); } finally { if (button) { button.disabled = false; button.textContent = 'Install official yt-dlp'; } } });

document.querySelector<HTMLButtonElement>('#refresh-collections')?.addEventListener('click', () => void controller.refresh());
document.querySelector<HTMLButtonElement>('#download-all')?.addEventListener('click', () => void controller.downloadAll());
document.querySelector<HTMLButtonElement>('#dry-run')?.addEventListener('click', () => void controller.downloadAll(true));
collectionGrid?.addEventListener('click', (event) => { const target = event.target as HTMLElement; const downloadId = target.closest<HTMLButtonElement>('[data-download-collection]')?.dataset.downloadCollection; const previewId = target.closest<HTMLButtonElement>('[data-preview-collection]')?.dataset.previewCollection; if (downloadId) void controller.downloadCollection(downloadId); else if (previewId) void controller.downloadCollection(previewId, true); });

const settingsForm = document.querySelector<HTMLFormElement>('#settings-form'); const settingsErrors = document.querySelector<HTMLElement>('#settings-errors');
void (async () => { try { writeSettings(tauri ? await tauri.invoke<DownloaderSettings>('load_settings') : loadSettings(settingsStore)); } catch { writeSettings(loadSettings(settingsStore)); } await controller.refresh(); })();
settingsForm?.addEventListener('submit', async (event) => { event.preventDefault(); const settings = readSettings(); let errors = tauri ? [] : saveSettings(settings, settingsStore, settingsPaths); if (settingsErrors) settingsErrors.textContent = errors.join(' '); if (errors.length) return; try { if (tauri) await tauri.invoke('save_settings', { settings }); setStatus('Settings saved'); await controller.refresh(); } catch (error) { errors = [String(error)]; if (settingsErrors) settingsErrors.textContent = errors[0]; } });
document.querySelector<HTMLButtonElement>('#reset-settings')?.addEventListener('click', async () => { const settings = tauri ? await tauri.invoke<DownloaderSettings>('reset_settings') : resetSettings(settingsStore); writeSettings(settings); if (settingsErrors) settingsErrors.textContent = ''; setStatus('Defaults restored'); });

const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
const getTheme = () => localStorage.getItem('theme') || 'dark';
const setTheme = (theme: string) => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); if (themeToggle) themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙'; };
setTheme(getTheme());
themeToggle?.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
