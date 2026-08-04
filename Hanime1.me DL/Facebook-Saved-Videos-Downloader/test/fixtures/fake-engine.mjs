import { spawn } from 'node:child_process';

const scenarios = new Set([
  'success',
  'partial',
  'failure',
  'delayed',
  'ignored-termination',
  'malformed',
  'incomplete',
  'post-terminal',
  'nonzero-terminal',
  'ignored-termination-child',
]);
const scenario = process.argv[2];
if (!scenarios.has(scenario)) process.exit(64);

const operationId = `fake-${scenario}`;
const collections = [{ id: 'saved', name: 'Saved Videos', count: 2 }];
const write = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (scenario === 'malformed') {
  process.stdout.write('{"type":"progress","operationId":"fake-malformed",\n');
  process.stderr.write('cookie=C:\\synthetic-cookie-sentinel.txt\n');
  process.exitCode = 3;
} else if (scenario === 'incomplete') {
  process.stdout.write('{"type":"progress","operationId":"fake-incomplete","collectionId":"saved","videoId":"video-1","completed":1,"total":2}');
} else if (scenario === 'post-terminal') {
  write({ type: 'completed', operationId, successCount: 1, failureCount: 0, exitCode: 0 });
  write({ type: 'progress', operationId, collectionId: 'saved', videoId: 'video-1', completed: 1, total: 1 });
} else if (scenario === 'nonzero-terminal') {
  write({ type: 'completed', operationId, successCount: 1, failureCount: 0, exitCode: 0 });
  process.exitCode = 1;
} else if (scenario === 'ignored-termination') {
  const child = spawn(process.execPath, [process.argv[1], 'ignored-termination-child'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  process.on('SIGTERM', () => undefined);
  write({ type: 'collections', operationId, collections });
  setInterval(() => undefined, 1000);
} else if (scenario === 'ignored-termination-child') {
  setInterval(() => undefined, 1000);
} else {
  write({ type: 'collections', operationId, collections });
  if (scenario === 'delayed') await wait(150);
  write({ type: 'progress', operationId, collectionId: 'saved', videoId: 'video-1', completed: 1, total: 2 });
  if (scenario === 'delayed') await wait(150);
  write({ type: 'progress', operationId, collectionId: 'saved', videoId: 'video-2', completed: 2, total: 2 });
  if (scenario === 'partial') {
    write({ type: 'partial', operationId, successCount: 1, failureCount: 1, exitCode: 1 });
    process.exitCode = 1;
  } else if (scenario === 'failure') {
    write({ type: 'failed', operationId, message: 'synthetic engine failure', exitCode: 3 });
    process.exitCode = 3;
  } else {
    write({ type: 'completed', operationId, successCount: 2, failureCount: 0, exitCode: 0 });
  }
}
