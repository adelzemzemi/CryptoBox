/**
 * Run the smoke test in headless Chrome against the built `dist/index.mjs`.
 *
 * Uses the Chrome already installed on the machine (`channel: 'chrome'`), so no
 * browser is downloaded. Files are served by request interception on a
 * localhost origin, which Web Crypto treats as a secure context.
 *
 * Run from the repository root after `npm run build`: `node tests/runtimes/chromium.mjs`
 */
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const ORIGIN = 'http://localhost:4173';

const FILES = {
  '/index.mjs': 'dist/index.mjs',
  '/smoke.mjs': 'tests/runtimes/smoke.mjs',
};

const browser = await chromium.launch({ channel: 'chrome' });

try {
  const page = await browser.newPage();

  await page.route(`${ORIGIN}/**`, async route => {
    const { pathname } = new URL(route.request().url());

    if (pathname === '/') {
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>smoke</title>',
      });
      return;
    }

    const file = FILES[pathname];
    if (file === undefined) {
      await route.fulfill({ status: 404 });
      return;
    }

    await route.fulfill({ contentType: 'text/javascript', body: await readFile(file, 'utf8') });
  });

  await page.goto(`${ORIGIN}/`);

  const result = await page.evaluate(async () => {
    const cryptobox = await import('/index.mjs');
    const { smoke } = await import('/smoke.mjs');
    return smoke(cryptobox);
  });

  console.log(`Chrome ${browser.version()}: ${result}`);
} finally {
  await browser.close();
}
