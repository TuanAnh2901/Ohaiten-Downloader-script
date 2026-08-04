import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  resetSettings,
  saveSettings,
  validateSettings,
  type DownloaderSettings,
  type SettingsStore,
} from '../src-tauri/frontend/settings';

function memoryStore(): SettingsStore {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const validPaths = { fileExists: () => true, directoryExists: () => true };
const validSettings: DownloaderSettings = {
  cookiesPath: 'cookies.txt', outputDir: 'downloads', jobs: 2, resolution: 1080,
};

describe('settings persistence and validation', () => {
  it('persists JSON settings and reloads them, including cookie path only', () => {
    const store = memoryStore();
    expect(saveSettings(validSettings, store, validPaths)).toEqual([]);
    expect(loadSettings(store)).toEqual(validSettings);
    expect(store.getItem(SETTINGS_KEY)).toBe(JSON.stringify(validSettings));
    expect(store.getItem(SETTINGS_KEY)).not.toContain('COOKIE_SENTINEL_123');
  });

  it('resets to defaults and removes persisted state', () => {
    const store = memoryStore();
    saveSettings(validSettings, store, validPaths);
    expect(resetSettings(store)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects missing paths and CLI-incompatible ranges', () => {
    const errors = validateSettings(
      { ...validSettings, jobs: 0, resolution: 999 },
      { fileExists: (path) => path !== 'cookies.txt', directoryExists: () => false },
    );
    expect(errors).toHaveLength(4);
    expect(saveSettings({ ...validSettings, cookiesPath: 'COOKIE_SENTINEL_123' }, storeForTest(), {
      fileExists: () => false, directoryExists: () => true,
    })).toContain('Choose an existing Netscape cookie file.');
  });

  it('reloads only the persisted settings shape', () => {
    const store = memoryStore();
    store.setItem(SETTINGS_KEY, JSON.stringify({ ...validSettings, cookieContents: 'COOKIE_SENTINEL_123' }));

    const loaded = loadSettings(store) as DownloaderSettings & { cookieContents?: string };
    expect(loaded).toEqual(validSettings);
    expect(loaded.cookieContents).toBeUndefined();
    expect(JSON.stringify(loaded)).not.toContain('COOKIE_SENTINEL_123');
  });

  it('uses injected path checks for Windows-style paths before persistence', () => {
    const store = memoryStore();
    const settings = {
      ...validSettings,
      cookiesPath: 'C:\\Users\\Test User\\cookies.txt',
      outputDir: 'D:\\Saved Videos',
    };
    const checks = {
      fileExists: (path: string) => path === settings.cookiesPath,
      directoryExists: (path: string) => path === settings.outputDir,
    };

    expect(saveSettings(settings, store, checks)).toEqual([]);
    expect(loadSettings(store)).toEqual(settings);
  });
});

function storeForTest(): SettingsStore {
  return memoryStore();
}
