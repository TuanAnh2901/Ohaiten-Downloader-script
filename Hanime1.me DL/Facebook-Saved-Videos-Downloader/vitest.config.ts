import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // serial test files: 5 suites launch chromium in parallel and race at teardown (rare Failed Suites flake)
    fileParallelism: false,
  },
});
