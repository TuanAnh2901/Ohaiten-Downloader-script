import { describe, it, expect } from 'vitest';
import {
  installGmShim,
  installRequesterShim,
  resetGmShim,
  type Requester,
} from '../src/core-shim.js';

describe('core-shim', () => {
  describe('installGmShim', () => {
    it('allows importing @animehay/core/config and returns expected defaults', async () => {
      // Arrange — seed the GM_* shim before touching any @animehay/core module
      installGmShim();

      // Act — dynamic import to bypass ES-module hoisting
      const { config } = await import('@animehay/core/config.js');

      // Assert — ConfigData defaults from AnimehayDownloader/src/config.ts
      expect(config.get('preferredSource')).toBe('AHS');
      expect(config.get('filenameTemplate')).toBe('[%number%] %title%');
      expect(config.get('hlsSaveMode')).toBe('blob');
      expect(config.get('downloadMethod')).toBe('browser');
      expect(config.get('concurrentVideos')).toBe(3);
      expect(config.get('downloadDelay')).toBe(1000);
      expect(config.get('maxBrowserBlobMb')).toBe(1024);
      expect(config.get('chunksPerVideo')).toBe(5);
      expect(config.get('autoDownload')).toBe(false);
      expect(config.get('debug')).toBe(false);
    });
  });

  describe('installRequesterShim', () => {
    it('accepts a Requester function without throwing', () => {
      resetGmShim();
      installGmShim();

      const fakeRequester: Requester = async () => ({
        ok: true,
        status: 200,
        text: 'ok',
      });

      expect(() => installRequesterShim(fakeRequester)).not.toThrow();
    });
  });
});
