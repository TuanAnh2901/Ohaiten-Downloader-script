export interface DownloaderSettings {
  cookiesPath: string;
  outputDir: string;
  jobs: number;
  resolution: number;
}

export interface SettingsStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface TauriGlobal {
  core: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> };
  event: { listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> };
}

export interface PathChecks {
  fileExists(path: string): boolean;
  directoryExists(path: string): boolean;
}

export const DEFAULT_SETTINGS: DownloaderSettings = {
  cookiesPath: 'Facebook-cookies.txt',
  outputDir: './downloads',
  jobs: 3,
  resolution: 720,
};

export const SETTINGS_KEY = 'fb-saved-dl.settings.v1';
export const JOBS_MIN = 1;
export const JOBS_MAX = 8;
export const RESOLUTIONS = [360, 480, 720, 1080] as const;

function cloneDefaults(): DownloaderSettings {
  return { ...DEFAULT_SETTINGS };
}

function persistedSettings(value: Partial<DownloaderSettings>): DownloaderSettings {
  return {
    cookiesPath: typeof value.cookiesPath === 'string' ? value.cookiesPath : DEFAULT_SETTINGS.cookiesPath,
    outputDir: typeof value.outputDir === 'string' ? value.outputDir : DEFAULT_SETTINGS.outputDir,
    jobs: typeof value.jobs === 'number' ? value.jobs : DEFAULT_SETTINGS.jobs,
    resolution: typeof value.resolution === 'number' ? value.resolution : DEFAULT_SETTINGS.resolution,
  };
}

export function loadSettings(store: SettingsStore): DownloaderSettings {
  const raw = store.getItem(SETTINGS_KEY);
  if (!raw) return cloneDefaults();
  try {
    return persistedSettings(JSON.parse(raw) as Partial<DownloaderSettings>);
  } catch {
    return cloneDefaults();
  }
}

export function validateSettings(settings: DownloaderSettings, paths: PathChecks): string[] {
  const errors: string[] = [];
  if (!settings.cookiesPath.trim() || !paths.fileExists(settings.cookiesPath)) {
    errors.push('Choose an existing Netscape cookie file.');
  }
  if (!settings.outputDir.trim() || !paths.directoryExists(settings.outputDir)) {
    errors.push('Choose an existing output directory.');
  }
  if (!Number.isInteger(settings.jobs) || settings.jobs < JOBS_MIN || settings.jobs > JOBS_MAX) {
    errors.push(`Jobs must be an integer from ${JOBS_MIN} to ${JOBS_MAX}.`);
  }
  if (!RESOLUTIONS.includes(settings.resolution as (typeof RESOLUTIONS)[number])) {
    errors.push(`Resolution must be one of ${RESOLUTIONS.join(', ')}p.`);
  }
  return errors;
}

export function saveSettings(settings: DownloaderSettings, store: SettingsStore, paths: PathChecks): string[] {
  const errors = validateSettings(settings, paths);
  if (errors.length) return errors;
  store.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return [];
}

export function resetSettings(store: SettingsStore): DownloaderSettings {
  store.removeItem(SETTINGS_KEY);
  return cloneDefaults();
}

export function browserSettingsStore(): SettingsStore {
  return window.localStorage;
}

export function tauriSettings(): TauriGlobal['core'] | undefined {
  return (window as Window & { __TAURI__?: TauriGlobal }).__TAURI__?.core;
}

export function tauriEvents(): TauriGlobal['event'] | undefined {
  return (window as Window & { __TAURI__?: TauriGlobal }).__TAURI__?.event;
}

export function browserPathChecks(): PathChecks {
  return { fileExists: (path) => Boolean(path.trim()), directoryExists: (path) => Boolean(path.trim()) };
}
