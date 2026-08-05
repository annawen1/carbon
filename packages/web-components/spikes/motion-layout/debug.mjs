/* eslint-disable no-console */
/**
 * Scratch driver for poking at a single case in a real browser.
 *
 * Usage: node debug.mjs <caseId> [engine]
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const caseId = process.argv[2] ?? '4';
const engine = process.argv[3] ?? 'carbon';

const server = await createServer({
  root: here,
  configFile: false,
  logLevel: 'warn',
  server: { port: 0 },
  optimizeDeps: { force: true },
});
await server.listen();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'no-preference',
  deviceScaleFactor: 1,
});
page.on('pageerror', (error) => console.log('PAGEERROR', error.message));
page.on('console', (message) =>
  console.log(`[${message.type()}]`, message.text())
);

await page.goto(`${server.resolvedUrls.local[0]}?engine=${engine}`, {
  waitUntil: 'networkidle',
});
await page.waitForFunction('window.__spike !== undefined');

const summary = await page.evaluate(`(async () => {
  const spike = window.__spike;
  const testCase = spike.cases.find((c) => c.id === '${caseId}');
  const out = {};
  for (const phase of ['open', 'close']) {
    const result = await spike.run(testCase, phase);
    out[phase] = {
      elapsed: result.elapsed,
      animationCount: result.animationCount,
      morphingFrames: result.morphingFrames,
      distinct: result.distinct,
      error: result.error,
      trajectory: result.trajectory,
      raw: result.raw,
      tracked: testCase.tracked().map((el) =>
        el
          ? {
              tag: el.tagName.toLowerCase(),
              id: el.dataset.layoutId ?? el.getAttribute('surface-id'),
              transform: getComputedStyle(el).transform,
              opacity: getComputedStyle(el).opacity,
              rect: (({ x, y, width, height }) => ({ x, y, width, height }))(
                el.getBoundingClientRect()
              ),
            }
          : null
      ),
    };
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
})()`);

for (const phase of ['open', 'close']) {
  const result = summary[phase];
  console.log(
    `\n--- ${engine} case ${caseId} ${phase}: ${result.raw.length} frames, ` +
      `${result.elapsed}ms, ${result.animationCount} animations` +
      (result.error ? `, error: ${result.error}` : '')
  );
  for (const frame of result.raw) {
    console.log(
      `  ${String(frame.ms).padStart(4)}ms  ` +
        frame.tracked
          .map((m, i) =>
            m === null
              ? `[${i}] gone`
              : `[${i}] ${m.sx.toFixed(3)}x${m.sy.toFixed(3)} ` +
                `@${m.tx.toFixed(0)},${m.ty.toFixed(0)}`
          )
          .join('   ')
    );
  }
  console.log(
    '  resampled: ' +
      (result.trajectory ?? [])
        .map((s) => `${s.at}:${s.sx.toFixed(3)}/${s.tx.toFixed(0)}`)
        .join('  ')
  );
}

if (process.env.DEBUG_JSON) console.log(JSON.stringify(summary, null, 2));

await browser.close();
await server.close();
