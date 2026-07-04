// check-scope.mjs
// Ensures changes to AnimehayDownloader/ are NOT detected
// Runs git diff --name-only from the parent directory to catch any drift
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const parentDir = resolve(__dirname, '..', '..'); // AnimehayCli/../ = Hanime1.me DL/

const forbiddenPrefixes = [
  'AnimehayDownloader/src/',
  'AnimehayDownloader/test/',
  'AnimehayDownloader/package.json',
  'AnimehayDownloader/tsconfig.json',
  'AnimehayDownloader/build/',
];

try {
  const stdout = execSync('git diff --name-only', {
    encoding: 'utf-8',
    cwd: parentDir,
  });

  const changed = stdout.trim().split('\n').filter(Boolean);

  const violations = changed.filter((f) =>
    forbiddenPrefixes.some((prefix) => f.startsWith(prefix))
  );

  if (violations.length > 0) {
    console.error('SCOPE CHECK FAILED — AnimehayDownloader/ files were changed:');
    for (const v of violations) {
      console.error(`  ✘ ${v}`);
    }
    process.exit(1);
  }

  console.log('Scope check passed — no AnimehayDownloader/ files changed.');
} catch {
  console.log('Scope check skipped (not a git repository or git unavailable).');
  process.exit(0);
}
