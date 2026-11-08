import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const ORIGIN = 'https://v.5micro.net';
const SKIP = new Set(['.git', '.github', '.claude', 'node_modules', 'docs', 'specs', 'tests', 'scripts', 'test-results', 'playwright-report']);

function pages(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (!SKIP.has(name)) out.push(...pages(full)); }
    else if (name === 'index.html') {
      const rel = relative(root, dir).split(sep).join('/');
      out.push(rel ? `/${rel}/` : '/');
    }
  }
  return out;
}

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

test('sitemap lists every public page exactly once', () => {
  const expected = pages(root).map(p => ORIGIN + p).sort();
  assert.deepEqual([...locs].sort(), expected);
  assert.equal(new Set(locs).size, locs.length);
});

test('robots.txt points to the sitemap', () => {
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/v\.5micro\.net\/sitemap\.xml$/m);
});
