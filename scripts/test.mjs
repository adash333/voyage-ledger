import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Pass explicit files: shell globs and directory arguments differ across OS/Node versions.
const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(new URL('../tests/', import.meta.url))
  .filter(name => name.endsWith('.test.mjs'))
  .sort()
  .map(name => `tests/${name}`);
if (!files.length) throw Error('No unit tests found');
const result = spawnSync(process.execPath, ['--test', ...files], {cwd: root, stdio: 'inherit'});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
