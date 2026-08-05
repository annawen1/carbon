/* eslint-disable no-console */
/**
 * Headless conformance driver.
 *
 * Runs the spike's conformance mode against the hand-written FLIP engine and,
 * with `--compare`, against `motion-dom` in the same session so a disagreement
 * with the recorded baseline can be attributed to the engine rather than to the
 * sampler or the viewport.
 *
 * Usage: node conformance.mjs [--compare] [--repetitions=5]
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));

const flags = process.argv.slice(2);
const compare = flags.includes('--compare');
const repetitions = Number(
  flags.find((flag) => flag.startsWith('--repetitions='))?.split('=')[1] ?? 5
);

/**
 * The baseline's translate values are viewport-relative. It was recorded at a
 * layout viewport roughly 15px narrower than this, i.e. with a visible
 * scrollbar, which headless Chromium hides — hence `--viewport`.
 */
const [width, height] = (
  flags.find((flag) => flag.startsWith('--viewport='))?.split('=')[1] ??
  '1920x1080'
)
  .split('x')
  .map(Number);
const VIEWPORT = { width, height };

const log = (...args) => console.log(...args);

const signed = (value, digits = 0) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;

async function runEngine(browser, url, engine) {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
  });

  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error.message)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(`${url}?engine=${engine}`, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.__spike !== undefined', {
    timeout: 15000,
  });

  const report = await page.evaluate(
    `window.__spike.conformance(${repetitions})`,
    { timeout: 300000 }
  );
  await page.close();

  return { report, errors };
}

function printReport({ report, errors }) {
  log(
    `\n=== engine: ${report.engine}, ${report.repetitions} repetitions per phase ===`
  );
  log(
    '  ' +
      'case'.padEnd(26) +
      'phase'.padEnd(7) +
      'Δscale'.padEnd(9) +
      'Δtranslate'.padEnd(12) +
      'Δduration'.padEnd(11) +
      'Δanims'
  );

  for (const [id, entry] of Object.entries(report.cases)) {
    for (const phase of ['open', 'close']) {
      const { pass, problems, deltas } = entry[phase];
      log(
        `  ${`${id} ${entry.name}`.padEnd(26)}${phase.padEnd(7)}` +
          `${deltas.scale.toFixed(3).padEnd(9)}` +
          `${`${deltas.translate.toFixed(0)}px`.padEnd(12)}` +
          `${`${signed(deltas.durationMs)}ms`.padEnd(11)}` +
          `${signed(deltas.animations).padEnd(7)}${pass ? 'PASS' : 'FAIL'}`
      );
      if (problems.length) log(`      ${problems.join('\n      ')}`);
    }
  }

  if (errors.length) log(`\n  page errors:\n    ${errors.join('\n    ')}`);
  log(`\n  ${report.pass ? 'ALL CASES WITHIN TOLERANCE' : 'OUT OF TOLERANCE'}`);
}

/**
 * Compares the two engines directly. This is the invariant that actually
 * matters: whatever the recorded baseline's own sampling conventions were, the
 * replacement engine has to be indistinguishable from the one it replaces when
 * both are measured the same way.
 */
const PARITY_TOLERANCE = { scale: 0.02, translatePx: 12 };

function printComparison(carbon, motionDom) {
  log(
    '\n=== engine parity: carbon vs motion-dom, same sampler, same session ==='
  );
  log(
    `  tolerance: scale ${PARITY_TOLERANCE.scale}, ` +
      `translate ${PARITY_TOLERANCE.translatePx}px`
  );
  let pass = true;

  for (const id of Object.keys(carbon.report.cases)) {
    for (const phase of ['open', 'close']) {
      const ours = carbon.report.cases[id][phase].actual.trajectory;
      const theirs = motionDom.report.cases[id][phase].actual.trajectory;
      if (!ours || !theirs) {
        log(`  ${id} ${phase}: missing trajectory`);
        pass = false;
        continue;
      }
      let scale = 0;
      let translate = 0;
      ours.forEach((sample, index) => {
        scale = Math.max(
          scale,
          Math.abs(sample.sx - theirs[index].sx),
          Math.abs(sample.sy - theirs[index].sy)
        );
        translate = Math.max(
          translate,
          Math.abs(sample.tx - theirs[index].tx),
          Math.abs(sample.ty - theirs[index].ty)
        );
      });
      const within =
        scale <= PARITY_TOLERANCE.scale &&
        translate <= PARITY_TOLERANCE.translatePx;
      if (!within) pass = false;

      log(
        `  ${id.padEnd(4)}${phase.padEnd(7)}` +
          `Δscale ${scale.toFixed(3).padEnd(8)}` +
          `Δtranslate ${`${translate.toFixed(0)}px`.padEnd(7)}` +
          `${within ? 'PASS' : 'FAIL'}` +
          `   (vs baseline: carbon ${carbon.report.cases[id][
            phase
          ].deltas.scale.toFixed(3)}, motion-dom ${motionDom.report.cases[id][
            phase
          ].deltas.scale.toFixed(3)})`
      );
    }
  }

  log(`\n  ${pass ? 'ENGINES ARE EQUIVALENT' : 'ENGINES DIVERGE'}`);

  return pass;
}

async function main() {
  const server = await createServer({
    root: here,
    configFile: false,
    logLevel: 'warn',
    server: { port: 0 },
    optimizeDeps: { force: true },
  });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  log(`serving ${here}\n    at ${url}`);

  const browser = await chromium.launch({ headless: true });
  const carbon = await runEngine(browser, url, 'carbon');
  printReport(carbon);

  let parity = true;
  if (compare) {
    const motionDom = await runEngine(browser, url, 'motion-dom');
    printReport(motionDom);
    parity = printComparison(carbon, motionDom);
  }

  await browser.close();
  await server.close();
  process.exit(carbon.report.pass && parity ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
