/* eslint-disable no-console */
/**
 * Headless verifier for the Phase 0 spike.
 *
 * The interactive run was flaky because an embedded webview stops compositing
 * when it is occluded, which stalls requestAnimationFrame and therefore
 * Motion's frameloop. Driving real headless Chrome removes that variable and
 * makes the whole matrix repeatable, which is also what the Phase 1 tests
 * would need.
 *
 * Usage: node verify.mjs [url]
 */

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'screenshots');
const RUNS = 3;

const probeSource = `(id) => {
  const probe = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      appliedScaleX: +(r.width / el.offsetWidth).toFixed(3),
      appliedScaleY: +(r.height / el.offsetHeight).toFixed(3),
      rect: r.width.toFixed(0) + 'x' + r.height.toFixed(0),
      layout: el.offsetWidth + 'x' + el.offsetHeight,
    };
  };
  const dialog = document.querySelector('[data-layout-id="c' + id + '-card"].dialog');
  if (!dialog) return { error: 'no dialog for case ' + id };
  return {
    shell: probe(dialog),
    textBlock: probe(dialog.querySelector('.card-text')),
    heading: probe(dialog.querySelector('h3')),
    media: probe(dialog.querySelector('.card-media')),
  };
}`;

const log = (...args) => console.log(...args);

async function main() {
  await mkdir(shots, { recursive: true });

  /**
   * Owning the dev server keeps the run hermetic. A long-lived `vite serve`
   * kept handing back a cached transform of spike.js after edits, which is an
   * easy way to draw conclusions from code that is not on disk.
   */
  const server = await createServer({
    root: here,
    configFile: false,
    logLevel: 'warn',
    server: { port: 0 },
    optimizeDeps: { force: true },
  });
  await server.listen();
  const url = process.argv[2] ?? server.resolvedUrls.local[0];
  log(`serving ${here}\n    at ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 940 },
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
  });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.__spike !== undefined', {
    timeout: 10000,
  });

  const surface = await page.evaluate('window.__spike.expand');
  log('\n=== token resolution (from @carbon/motion) ===');
  log(
    `expand: kind=${surface.kind} duration=${surface.duration * 1000}ms ` +
      `ease=cubic-bezier(${surface.enter.ease.join(', ')})`
  );

  /* --- A. Stability matrix ------------------------------------------- */

  log(`\n=== A. morph matrix, ${RUNS} consecutive runs ===`);
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const result = await page.evaluate('window.__spike.runAll()');
    runs.push(result);
  }

  const caseIds = await page.evaluate('window.__spike.cases.map(c => c.id)');
  const names = await page.evaluate(
    'Object.fromEntries(window.__spike.cases.map(c => [c.id, c.name]))'
  );

  let allPass = true;
  for (const id of caseIds) {
    const perRun = runs.map((r) => r[id]);
    const passes = perRun.filter((c) => c.verdict.pass).length;
    const openMs = perRun.map((c) => c.open.elapsed);
    const closeMs = perRun.map((c) => c.close.elapsed);
    const matrices = perRun.map((c) => c.open.distinct);
    const problems = [...new Set(perRun.flatMap((c) => c.verdict.problems))];
    if (passes !== RUNS) allPass = false;

    log(
      `  ${passes === RUNS ? 'PASS' : 'FAIL'}  ${id.padEnd(3)} ${names[id].padEnd(22)} ` +
        `open ${openMs.join('/')}ms  close ${closeMs.join('/')}ms  ` +
        `matrices ${matrices.join('/')}  anims=${perRun[0].open.animationCount}` +
        `  hiddenFollows=${perRun[0].open.hiddenFollows}`
    );
    if (problems.length) log(`        problems: ${problems.join('; ')}`);
  }

  /* --- B. Content stretch -------------------------------------------- */

  log('\n=== B. content stretch at 50% of the morph ===');
  log(
    '  appliedScale = getBoundingClientRect / offset size, i.e. visible distortion'
  );
  await page.evaluate('window.__spike.setDuration(4)');

  const stretch = {};
  for (const id of ['1', '4']) {
    const testCase = `window.__spike.cases.find(c => c.id === '${id}')`;

    // Keep the origin on screen so the interpolated box is fully capturable.
    await page.evaluate(
      `document.querySelector('[data-case="${id}"]')
         .scrollIntoView({ block: 'center' })`
    );
    await new Promise((r) => setTimeout(r, 200));

    await page.evaluate(`${testCase}.open()`);
    await new Promise((r) => setTimeout(r, 2000));
    stretch[id] = await page.evaluate(`(${probeSource})('${id}')`);

    const box = await page.evaluate(
      `(() => {
         const r = document.querySelector('[data-layout-id="c${id}-card"].dialog')
           .getBoundingClientRect();
         const pad = 24;
         return { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad),
                  width: r.width + pad * 2, height: r.height + pad * 2 };
       })()`
    );
    await page.screenshot({
      path: join(shots, `case-${id}-midmorph.png`),
      clip: box,
    });

    await new Promise((r) => setTimeout(r, 2500));
    await page.evaluate(`${testCase}.close()`);
    await new Promise((r) => setTimeout(r, 4500));
  }
  await page.evaluate('window.__spike.setDuration(0.24)');

  const fmt = (p) =>
    p
      ? `${String(p.appliedScaleX).padEnd(6)} x ${String(p.appliedScaleY).padEnd(6)} (${p.rect} rendered / ${p.layout} layout)`
      : 'n/a';

  for (const [id, data] of Object.entries(stretch)) {
    log(
      `  case ${id} (${id === '1' ? 'no data-layout tags' : 'per-element data-layout'}):`
    );
    log(`      shell      ${fmt(data.shell)}`);
    log(`      media      ${fmt(data.media)}`);
    log(`      text block ${fmt(data.textBlock)}`);
    log(`      heading    ${fmt(data.heading)}`);
  }

  /* --- C. Reduced motion --------------------------------------------- */

  log('\n=== C. prefers-reduced-motion: reduce ===');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(
    "window.__spike.runCase(window.__spike.cases[0]).then(() => window.__spike.results['1'])"
  );
  log(
    `  open: ${reduced.open.elapsed}ms, ${reduced.open.morphingFrames} animated frames, ` +
      `${reduced.open.distinct} matrices`
  );
  log(
    reduced.open.morphingFrames > 3
      ? '  -> engine STILL animates. The wrapper must gate on reduced motion itself,\n' +
          '     exactly as useMotionEnabled() does on the React side.'
      : '  -> engine self-gates on reduced motion.'
  );

  /* --- D. Idle screenshot -------------------------------------------- */

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({
    path: join(shots, 'page-overview.png'),
    fullPage: true,
  });

  log('\n=== errors ===');
  log(consoleErrors.length ? consoleErrors.join('\n') : '  none');

  log(
    `\n=== VERDICT: ${allPass ? 'ALL CASES PASS' : 'FAILURES PRESENT'} ===\n`
  );
  log(`screenshots: ${shots}`);

  await browser.close();
  await server.close();
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
