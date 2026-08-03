#!/usr/bin/env node
import('../dist/index.js').then(async (m) => {
  const code = await m.run(process.argv, m.defaultServices);
  process.exitCode = code;
}).catch((err) => {
  console.error('[ERROR]', err?.message ?? err);
  process.exitCode = 1;
});
