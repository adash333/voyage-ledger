import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSite} from '../scripts/build-site.mjs';

test('build-site publishes every sitemap page and nothing from development folders', () => {
  const out = buildSite(mkdtempSync(join(tmpdir(), 'site-')));
  try {
    const sitemap = readFileSync(join(out, 'sitemap.xml'), 'utf8');
    for (const [, loc] of sitemap.matchAll(/<loc>https:\/\/v\.5micro\.net(\/[^<]*)<\/loc>/g)) {
      assert.ok(existsSync(join(out, loc, 'index.html')), `missing ${loc}`);
    }
    for (const file of ['404.html', 'robots.txt', 'favicon.svg', 'src.js', 'accounting.mjs', 'trade/assets/trade-atlas.webp']) {
      assert.ok(existsSync(join(out, file)), `missing ${file}`);
    }
    for (const hidden of ['docs', 'specs', 'tests', 'scripts', 'node_modules', '.github', '.claude', '.git', 'CLAUDE.md', 'package.json', 'LICENSE']) {
      assert.ok(!existsSync(join(out, hidden)), `${hidden} must not be published`);
    }
  } finally {
    rmSync(out, {recursive: true, force: true});
  }
});
