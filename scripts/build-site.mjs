// Copy only the files the public site needs into an output folder (default: _site).
// Used by .github/workflows/deploy.yml for both GitHub Pages and Cloudflare Pages,
// so development material (docs/, specs/, tests/, prompts, config) is never published.
import {cpSync, mkdirSync, readdirSync, rmSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const EXCLUDE = new Set([
  'docs', 'specs', 'tests', 'scripts', 'node_modules', 'test-results', 'playwright-report', '_site',
  'package.json', 'package-lock.json', 'playwright.config.mjs', 'CLAUDE.md', 'README.md', 'LICENSE',
]);

export function buildSite(outDir = join(root, '_site')) {
  const out = resolve(outDir);
  rmSync(out, {recursive: true, force: true});
  mkdirSync(out, {recursive: true});
  for (const name of readdirSync(root)) {
    if (name.startsWith('.') || EXCLUDE.has(name)) continue;
    cpSync(join(root, name), join(out, name), {recursive: true});
  }
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log('built', buildSite(process.argv[2]));
}
