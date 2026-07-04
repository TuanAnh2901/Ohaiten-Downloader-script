import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@animehay\/core$/,
        replacement: path.resolve(__dirname, '../AnimehayDownloader/src'),
      },
      {
        find: /^@animehay\/core\/(.+)/,
        replacement: path.resolve(__dirname, '../AnimehayDownloader/src/$1'),
      },
    ],
  },
});
