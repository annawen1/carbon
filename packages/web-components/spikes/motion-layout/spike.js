/**
 * Phase 0/1 spike — shared-element layout animations for @carbon/web-components.
 *
 * Originally built to prove that Motion's MIT projection engine (`motion-dom`)
 * could drive shared-element morphs in web components. It now runs either that
 * engine or the hand-written FLIP engine that replaced it, selected with
 * `?engine=motion-dom` or `?engine=carbon` (the default), so the two can be
 * compared on the same cases with the same instrumentation.
 *
 * `?mode=conformance` runs every case five times and diffs the result against
 * `baseline.motion-dom.json`.
 *
 * The `motion-dom` devDependency exists only for the `?engine=motion-dom` arm
 * of that comparison, and can be dropped once conformance is signed off.
 *
 * Throwaway. Nothing here is intended to ship.
 */

import { animate } from 'motion';
import {
  getMotionSurface,
  resolveDuration,
  resolveEasing,
} from '@carbon/motion';

/* -------------------------------------------------------------------------
 * Layer 1 — engine under test
 * ---------------------------------------------------------------------- */

const params = new URLSearchParams(location.search);
const engineName =
  params.get('engine') === 'motion-dom' ? 'motion-dom' : 'carbon';

/**
 * Both engines expose `animateLayout()` and `animateLayoutScopes()`, but the
 * `motion-dom` reconstruction resolves the multi-scope form to one builder per
 * scope. Normalising that here keeps the cases engine-agnostic.
 */
async function loadEngine(name) {
  if (name === 'carbon') {
    const module = await import(
      '../../src/globals/internal/motion/animate-layout.ts'
    );

    return {
      animateLayout: module.animateLayout,
      animateLayoutScopes: module.animateLayoutScopes,
    };
  }

  const { LayoutAnimationBuilder, parseAnimateLayoutArgs } = await import(
    'motion-dom'
  );

  return {
    animateLayout(scopeOrUpdate, updateOrOptions, options) {
      const { scope, updateDom, defaultOptions } = parseAnimateLayoutArgs(
        scopeOrUpdate,
        updateOrOptions,
        options
      );

      return new LayoutAnimationBuilder(scope, updateDom, defaultOptions);
    },
    // Builders constructed in the same synchronous tick flush as a single
    // commit, so extra scopes join an update by registering a no-op builder.
    animateLayoutScopes(scopes, updateDom, options) {
      const [owner, ...participants] = scopes;
      const builders = [new LayoutAnimationBuilder(owner, updateDom, options)];

      for (const scope of participants) {
        builders.push(new LayoutAnimationBuilder(scope, () => {}, options));
      }

      return Promise.all(
        builders.map((builder) => builder.then((a) => a))
      ).then((animations) => animations[0]);
    },
  };
}

const engine = await loadEngine(engineName);
const animateLayout = (...args) => engine.animateLayout(...args);
const animateLayoutScopes = (...args) => engine.animateLayoutScopes(...args);

/* -------------------------------------------------------------------------
 * Layer 2 — @carbon/motion surface tokens, ported from useMotionSurface.ts
 * ---------------------------------------------------------------------- */

function resolveSurface(name) {
  const surface = getMotionSurface(name);
  const duration =
    Number.parseInt(resolveDuration(surface.duration), 10) / 1000;
  const [enterName, enterMode] = surface.enterEasing;
  const [exitName, exitMode] = surface.exitEasing;

  return {
    kind: surface.kind,
    duration,
    enter: { duration, ease: [...resolveEasing(enterName, enterMode)] },
    exit: { duration, ease: [...resolveEasing(exitName, exitMode)] },
  };
}

const expand = resolveSurface('expand');

/* -------------------------------------------------------------------------
 * Custom elements under test
 * ---------------------------------------------------------------------- */

/** Case 2: host element reflecting `surface-id` to `data-layout-id`. */
class SpikeSurface extends HTMLElement {
  static observedAttributes = ['surface-id'];

  attributeChangedCallback(name, _old, value) {
    if (name === 'surface-id' && value) {
      this.setAttribute('data-layout-id', value);
    }
  }
}

customElements.define('spike-origin', class extends SpikeSurface {});
customElements.define('spike-target', class extends SpikeSurface {});

/** Case 3a: shadow-root wrapper that slots its light-DOM children. */
customElements.define(
  'spike-slot-wrapper',
  class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .frame {
            display: block;
            padding: 1rem;
            border: 1px dashed #a8a8a8;
            background: #f4f4f4;
          }
          .label {
            font-size: .6875rem;
            text-transform: uppercase;
            letter-spacing: .02em;
            color: #525252;
            margin-block-end: .75rem;
          }
        </style>
        <div class="frame">
          <div class="label">shadow root boundary</div>
          <slot></slot>
        </div>`;
    }
  }
);

/** Case 3b: origin whose morphing content lives inside its own shadow root. */
customElements.define(
  'spike-shadow-card',
  class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .card {
            display: block;
            inline-size: 15rem;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            cursor: pointer;
          }
          .media {
            block-size: 7rem;
            background: linear-gradient(135deg, #1192e8, #0072c3);
          }
          .text { padding: 1rem; }
          .eyebrow {
            margin: 0 0 .25rem;
            font-size: .75rem;
            text-transform: uppercase;
            letter-spacing: .02em;
            color: #525252;
          }
          h3 { margin: 0; font-size: 1.125rem; font-weight: 400; }
        </style>
        <div class="card" data-layout-id="c3b-card">
          <div class="media"></div>
          <div class="text">
            <p class="eyebrow">Shadow root</p>
            <h3>Encapsulated</h3>
          </div>
        </div>`;
    }
  }
);

/** Case 3b: persistent target host. Its shadow root exists from page load so
 *  it can be registered as a scope; only the inner element is added. */
customElements.define(
  'spike-shadow-dialog',
  class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          .layer {
            position: fixed;
            inset: 0;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }
          .layer:empty { display: none; }
          .layer > * { pointer-events: auto; }
        </style>
        <div class="layer"></div>`;
    }

    get layer() {
      return this.shadowRoot.querySelector('.layer');
    }
  }
);

/* -------------------------------------------------------------------------
 * Instrumentation
 * ---------------------------------------------------------------------- */

const IDENTITY = new Set(['none', 'matrix(1, 0, 0, 1, 0, 0)', '']);

function isMorphing(transform) {
  return Boolean(transform) && !IDENTITY.has(transform);
}

/** Pulls scale and translate out of a computed `matrix()` or `matrix3d()`. */
function parseMatrix(transform) {
  const match = /matrix(3d)?\(([^)]+)\)/.exec(transform ?? '');
  if (!match) return { sx: 1, sy: 1, tx: 0, ty: 0 };

  const v = match[2].split(',').map(Number);

  return match[1]
    ? { sx: v[0], sy: v[5], tx: v[12], ty: v[13] }
    : { sx: v[0], sy: v[3], tx: v[4], ty: v[5] };
}

const AT = [0, 0.25, 0.5, 0.75, 1];

/**
 * Reduces a per-frame sample series to the trajectory of one element, resampled
 * onto normalised progress so two engines running at different frame rates can
 * be compared.
 *
 * The element chosen is the one furthest from rest on the first animated frame,
 * which is the one carrying the morph rather than following it. Scale decides,
 * then translate, so a position-only morph is still picked up.
 */
function trajectoryOf(samples) {
  const animated = samples.filter((frame) => frame.some(isMorphing));
  if (animated.length === 0) return null;

  let index = -1;
  let best = [-1, -1];
  animated[0].forEach((transform, i) => {
    if (!isMorphing(transform)) return;
    const { sx, sy, tx, ty } = parseMatrix(transform);
    const score = [
      Math.abs(sx - 1) + Math.abs(sy - 1),
      Math.abs(tx) + Math.abs(ty),
    ];
    if (score[0] > best[0] || (score[0] === best[0] && score[1] > best[1])) {
      best = score;
      index = i;
    }
  });
  if (index === -1) return null;

  const series = animated
    .filter((frame) => isMorphing(frame[index]))
    .map((frame) => ({ ...parseMatrix(frame[index]), t: frame.at }));
  if (series.length < 2) return null;

  return resample(series);
}

/**
 * Resamples a frame series onto normalised progress using the frame timestamps
 * rather than frame indices. A dropped frame then shifts nothing, which matters
 * because a 240ms transition is only about 15 frames long.
 */
function resample(series) {
  const round = (value) => Math.round(value * 1000) / 1000;
  const start = series[0].t;
  const span = series[series.length - 1].t - start;

  return AT.map((at) => {
    const time = start + at * span;
    let high = series.findIndex((sample) => sample.t >= time);
    if (high < 1) high = 1;
    const low = series[high - 1];
    const next = series[high];
    const t = (time - low.t) / (next.t - low.t || 1);
    const lerp = (key) => round(low[key] + (next[key] - low[key]) * t);

    return {
      at,
      sx: lerp('sx'),
      sy: lerp('sy'),
      tx: lerp('tx'),
      ty: lerp('ty'),
    };
  });
}

/** Raw per-frame series of every tracked element, for diagnosis. */
function rawSeries(samples) {
  const animated = samples.filter((frame) => frame.some(isMorphing));
  if (!animated.length) return [];
  const start = animated[0].at;

  return animated.map((frame) => ({
    ms: Math.round(frame.at - start),
    tracked: frame.map((transform) =>
      transform === null ? null : parseMatrix(transform)
    ),
  }));
}

/**
 * Samples the computed transform of the tracked elements every frame while
 * `action` runs. A genuine projection morph writes a changing, non-identity
 * matrix for the length of the transition and settles back to identity, so a
 * screenshot alone cannot distinguish it from a hard cut.
 */
async function measureMorph(getTracked, action) {
  const samples = [];
  let running = true;

  const tick = () => {
    if (!running) return;
    const frame = getTracked().map((el) =>
      el ? getComputedStyle(el).transform : null
    );
    frame.at = performance.now();
    samples.push(frame);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const started = performance.now();
  let error = null;
  let animation = null;

  try {
    animation = await withTimeout(action(), 3000, 'builder never resolved');
    await withTimeout(animation?.finished, 3000, 'finished never settled');
  } catch (thrown) {
    error = String(thrown?.message ?? thrown);
  }

  const elapsed = performance.now() - started;
  await nextFrame();
  running = false;

  const morphingFrames = samples.filter((frame) =>
    frame.some(isMorphing)
  ).length;
  const distinct = new Set(samples.flat().filter(isMorphing)).size;

  /**
   * A shared-element stack keeps its follow member projected onto the lead's
   * box at opacity 0 so it can reverse-morph later, so only elements the user
   * can actually see are required to come to rest at identity.
   */
  const live = getTracked().filter(Boolean);
  const visible = live.filter((el) => getComputedStyle(el).opacity !== '0');
  const settled = visible.every(
    (el) => !isMorphing(getComputedStyle(el).transform)
  );

  return {
    error,
    elapsed: Math.round(elapsed),
    frames: samples.length,
    morphingFrames,
    distinct,
    settled,
    hiddenFollows: live.length - visible.length,
    animationCount: animation?.animations?.length ?? 0,
    trajectory: trajectoryOf(samples),
    raw: rawSeries(samples),
  };
}

function withTimeout(promise, ms, message) {
  if (!promise) return Promise.resolve(null);
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A morph passes when it animated across several frames with more than one
 * distinct matrix, ran for roughly the token duration, and ended at rest.
 */
function judge(open, close, expectedMs) {
  const problems = [];
  const floor = expectedMs * 0.5;

  for (const [phase, result] of [
    ['open', open],
    ['close', close],
  ]) {
    if (result.error) problems.push(`${phase}: ${result.error}`);
    if (result.morphingFrames < 3)
      problems.push(`${phase}: only ${result.morphingFrames} animated frames`);
    if (result.distinct < 3)
      problems.push(`${phase}: only ${result.distinct} distinct transforms`);
    if (result.elapsed < floor)
      problems.push(`${phase}: finished early (${result.elapsed}ms)`);
    if (!result.settled)
      problems.push(`${phase}: a visible element did not settle to identity`);
  }

  return { pass: problems.length === 0, problems };
}

/* -------------------------------------------------------------------------
 * Shared scrim
 * ---------------------------------------------------------------------- */

const scrim = document.getElementById('scrim');

function showScrim(show) {
  if (show) scrim.hidden = false;
  const controls = animate(scrim, { opacity: show ? 1 : 0 }, expand.enter);
  if (!show) controls.finished.then(() => (scrim.hidden = true));
}

/* -------------------------------------------------------------------------
 * DOM builders for the morph targets
 * ---------------------------------------------------------------------- */

function makeLayer() {
  const layer = document.createElement('div');
  layer.className = 'dialog-layer';
  return layer;
}

function dialogMarkup(mediaClass, eyebrow, title, extras = '') {
  return `
    <div class="card-media ${mediaClass}" ${extras}></div>
    <div class="card-text">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
    <div class="dialog-body">
      Expanded state. The shell, media and text should arrive together with no
      cut, and reverse cleanly on close.
    </div>`;
}

/* -------------------------------------------------------------------------
 * Cases
 * ---------------------------------------------------------------------- */

const cases = [];

/* --- Case 1: plain light-DOM elements ---------------------------------- */

cases.push({
  id: '1',
  name: 'Baseline light DOM',
  isolates: 'Control: does the MIT builder morph at all?',
  tracked: () => [
    document.querySelector('[data-layout-id="c1-card"].dialog'),
    document.querySelector('[data-layout-id="c1-card"].card'),
  ],
  open() {
    showScrim(true);
    return animateLayout(() => {
      const layer = makeLayer();
      layer.id = 'c1-layer';
      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      dialog.dataset.layoutId = 'c1-card';
      dialog.innerHTML = dialogMarkup('', 'Baseline', 'Plain elements');
      dialog.addEventListener('click', () => run(cases[0], 'close'));
      layer.append(dialog);
      document.body.append(layer);
    }, expand.enter);
  },
  close() {
    showScrim(false);
    return animateLayout(() => {
      document.getElementById('c1-layer')?.remove();
    }, expand.exit);
  },
});

/* --- Case 2: custom element hosts -------------------------------------- */

cases.push({
  id: '2',
  name: 'Custom element hosts',
  isolates: 'Host elements standing in for <cds-motion-surface>',
  tracked: () => [
    document.querySelector('spike-target[surface-id="c2-card"]'),
    document.querySelector('spike-origin[surface-id="c2-card"]'),
  ],
  open() {
    showScrim(true);
    return animateLayout(() => {
      const layer = makeLayer();
      layer.id = 'c2-layer';
      const dialog = document.createElement('spike-target');
      dialog.setAttribute('surface-id', 'c2-card');
      dialog.innerHTML = dialogMarkup(
        'alt',
        'Host element',
        'Light DOM content'
      );
      dialog.addEventListener('click', () => run(cases[1], 'close'));
      layer.append(dialog);
      document.body.append(layer);
    }, expand.enter);
  },
  close() {
    showScrim(false);
    return animateLayout(() => {
      document.getElementById('c2-layer')?.remove();
    }, expand.exit);
  },
});

/* --- Case 3a: slotted content ------------------------------------------ */

cases.push({
  id: '3a',
  name: 'Slotted origin',
  isolates: 'Projection parent (light tree) vs rendered ancestor (slot)',
  tracked: () => [
    document.querySelector('[data-layout-id="c3a-card"].dialog'),
    document.querySelector('[data-layout-id="c3a-card"].card'),
  ],
  open() {
    showScrim(true);
    return animateLayout(() => {
      const layer = makeLayer();
      layer.id = 'c3a-layer';
      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      dialog.dataset.layoutId = 'c3a-card';
      dialog.innerHTML = dialogMarkup('warm', 'Slotted', 'Shadow ancestor');
      dialog.addEventListener('click', () => run(cases[2], 'close'));
      layer.append(dialog);
      document.body.append(layer);
    }, expand.enter);
  },
  close() {
    showScrim(false);
    return animateLayout(() => {
      document.getElementById('c3a-layer')?.remove();
    }, expand.exit);
  },
});

/* --- Case 3b: cross shadow root ---------------------------------------- */

const shadowCard = () => document.querySelector('spike-shadow-card');
const shadowDialog = () => document.querySelector('spike-shadow-dialog');

cases.push({
  id: '3b',
  name: 'Cross shadow root',
  isolates: 'Two shadow roots joined by same-tick builders',
  tracked: () => [
    shadowDialog()?.shadowRoot.querySelector('[data-layout-id="c3b-card"]'),
    shadowCard()?.shadowRoot.querySelector('[data-layout-id="c3b-card"]'),
  ],
  open() {
    showScrim(true);
    const scopes = [
      shadowDialog().shadowRoot,
      shadowCard().shadowRoot,
      document,
    ];
    return animateLayoutScopes(
      scopes,
      () => {
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.dataset.layoutId = 'c3b-card';
        dialog.innerHTML = dialogMarkup('cool', 'Shadow root', 'Encapsulated');
        dialog.addEventListener('click', () => run(cases[3], 'close'));
        shadowDialog().layer.append(dialog);
      },
      expand.enter
    );
  },
  close() {
    showScrim(false);
    const scopes = [
      shadowDialog().shadowRoot,
      shadowCard().shadowRoot,
      document,
    ];
    return animateLayoutScopes(
      scopes,
      () => {
        shadowDialog().layer.replaceChildren();
      },
      expand.exit
    );
  },
});

/* --- Case 4: per-element animation types -------------------------------- */

cases.push({
  id: '4',
  name: 'data-layout types',
  isolates: 'preserve-aspect / position scale correction',
  tracked: () => [
    document.querySelector('[data-layout-id="c4-card"].dialog'),
    document.querySelector('[data-layout-id="c4-media"]'),
    document.querySelector('[data-layout-id="c4-text"]'),
  ],
  open() {
    showScrim(true);
    return animateLayout(() => {
      const layer = makeLayer();
      layer.id = 'c4-layer';
      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      dialog.dataset.layoutId = 'c4-card';
      dialog.innerHTML = `
        <div class="card-media figure" data-layout-id="c4-media"
             data-layout="preserve-aspect"></div>
        <div class="card-text" data-layout-id="c4-text" data-layout="position">
          <p class="eyebrow">Scale correction</p>
          <h3>Per-element types</h3>
        </div>
        <div class="dialog-body">
          The heading should stay legible throughout rather than stretching
          with the shell.
        </div>`;
      dialog.addEventListener('click', () => run(cases[4], 'close'));
      layer.append(dialog);
      document.body.append(layer);
    }, expand.enter);
  },
  close() {
    showScrim(false);
    return animateLayout(() => {
      document.getElementById('c4-layer')?.remove();
    }, expand.exit);
  },
});

/* -------------------------------------------------------------------------
 * Runner
 * ---------------------------------------------------------------------- */

const results = {};

async function run(testCase, phase) {
  const result = await measureMorph(testCase.tracked, () => testCase[phase]());
  results[testCase.id] ??= {};
  results[testCase.id][phase] = result;
  return result;
}

async function runCase(testCase) {
  const open = await run(testCase, 'open');
  await wait(150);
  const close = await run(testCase, 'close');
  await wait(150);

  const verdict = judge(open, close, expand.duration * 1000);
  results[testCase.id].verdict = verdict;
  results[testCase.id].name = testCase.name;
  results[testCase.id].isolates = testCase.isolates;
  renderReport();
  return verdict;
}

async function runAll() {
  const button = document.getElementById('run-all');
  button.disabled = true;
  for (const testCase of cases) {
    await runCase(testCase);
  }
  button.disabled = false;
  window.__spikeDone = true;
  return results;
}

/* -------------------------------------------------------------------------
 * Conformance against the recorded motion-dom baseline
 * ---------------------------------------------------------------------- */

const REPETITIONS = 5;

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.floor((sorted.length - 1) / 2)];
};

/** Median of every field of a trajectory across repetitions. */
function medianTrajectory(trajectories) {
  const present = trajectories.filter(Boolean);
  if (present.length === 0) return null;

  return AT.map((at, index) => {
    const field = (key) =>
      Math.round(median(present.map((run) => run[index][key])) * 1000) / 1000;

    return {
      at,
      sx: field('sx'),
      sy: field('sy'),
      tx: field('tx'),
      ty: field('ty'),
    };
  });
}

/**
 * Runs every case `REPETITIONS` times and reduces each phase to the same shape
 * the baseline records: median duration, animation count and trajectory.
 */
async function measureAll(repetitions = REPETITIONS) {
  const measured = {};

  for (const testCase of cases) {
    const runs = { open: [], close: [] };
    for (let i = 0; i < repetitions; i++) {
      runs.open.push(await run(testCase, 'open'));
      await wait(150);
      runs.close.push(await run(testCase, 'close'));
      await wait(150);
    }

    measured[testCase.id] = { name: testCase.name };
    for (const phase of ['open', 'close']) {
      measured[testCase.id][phase] = {
        durationMs: median(runs[phase].map((result) => result.elapsed)),
        animations: median(runs[phase].map((result) => result.animationCount)),
        trajectory: medianTrajectory(runs[phase].map((r) => r.trajectory)),
        errors: [...new Set(runs[phase].map((r) => r.error).filter(Boolean))],
      };
    }
  }

  return measured;
}

function diffPhase(actual, expected, tolerance) {
  const problems = [];
  const deltas = {
    durationMs: actual.durationMs - expected.durationMs,
    animations: actual.animations - expected.animations,
    scale: 0,
    translate: 0,
    worstAt: null,
  };

  if (actual.errors.length) {
    problems.push(actual.errors.join('; '));
  }
  if (Math.abs(deltas.durationMs) > tolerance.durationMs) {
    problems.push(`duration off by ${deltas.durationMs}ms`);
  }
  if (deltas.animations !== 0) {
    problems.push(
      `${actual.animations} animations, expected ${expected.animations}`
    );
  }
  if (!actual.trajectory) {
    problems.push('no animated frames sampled');

    return { pass: false, problems, deltas };
  }

  actual.trajectory.forEach((sample, index) => {
    const target = expected.trajectory[index];
    const scale = Math.max(
      Math.abs(sample.sx - target.sx),
      Math.abs(sample.sy - target.sy)
    );
    const translate = Math.max(
      Math.abs(sample.tx - target.tx),
      Math.abs(sample.ty - target.ty)
    );
    if (scale > deltas.scale) {
      deltas.scale = scale;
      deltas.worstAt = sample.at;
    }
    deltas.translate = Math.max(deltas.translate, translate);
  });

  if (deltas.scale > tolerance.scale) {
    problems.push(
      `scale off by ${deltas.scale.toFixed(3)} at progress ${deltas.worstAt}`
    );
  }
  if (deltas.translate > tolerance.translatePx) {
    problems.push(`translate off by ${deltas.translate.toFixed(0)}px`);
  }

  return { pass: problems.length === 0, problems, deltas };
}

async function conformance(repetitions = REPETITIONS) {
  const baseline = await fetch('./baseline.motion-dom.json').then((response) =>
    response.json()
  );
  const measured = await measureAll(repetitions);
  const report = { engine: engineName, repetitions, cases: {}, pass: true };

  for (const testCase of cases) {
    const expected = baseline[testCase.id];
    const actual = measured[testCase.id];
    const entry = { name: testCase.name };

    for (const phase of ['open', 'close']) {
      entry[phase] = diffPhase(
        actual[phase],
        expected[phase],
        baseline._meta.tolerance
      );
      entry[phase].actual = actual[phase];
      entry[phase].expected = expected[phase];
      if (!entry[phase].pass) report.pass = false;
    }

    report.cases[testCase.id] = entry;
  }

  results.conformance = report;
  renderConformance(report);

  return report;
}

function renderConformance(report) {
  const table = document.getElementById('conformance-body');
  document.getElementById('conformance').hidden = false;
  table.innerHTML = '';

  for (const [id, entry] of Object.entries(report.cases)) {
    for (const phase of ['open', 'close']) {
      const { pass, problems, deltas } = entry[phase];
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${id}</strong> ${entry.name}</td>
        <td>${phase}</td>
        <td class="detail">
          scale ${deltas.scale.toFixed(3)} /
          translate ${deltas.translate.toFixed(0)}px /
          duration ${deltas.durationMs}ms /
          animations ${deltas.animations >= 0 ? '+' : ''}${deltas.animations}
        </td>
        <td class="verdict ${pass ? 'pass' : 'fail'}">
          ${pass ? 'PASS' : 'FAIL'}
          ${problems.length ? `<div class="detail">${problems.join('<br>')}</div>` : ''}
        </td>`;
      table.append(row);
    }
  }
}

function renderReport() {
  const report = document.getElementById('report');
  const body = document.getElementById('report-body');
  report.hidden = false;
  body.innerHTML = '';

  for (const testCase of cases) {
    const entry = results[testCase.id];
    if (!entry?.verdict) continue;

    const row = document.createElement('tr');
    const summary = (phase) => {
      const r = entry[phase];
      return `${r.morphingFrames} frames / ${r.distinct} matrices / ${r.elapsed}ms`;
    };

    row.innerHTML = `
      <td><strong>${testCase.id}</strong> ${testCase.name}</td>
      <td class="detail">${testCase.isolates}</td>
      <td class="detail">${summary('open')}</td>
      <td class="detail">${summary('close')}</td>
      <td class="verdict ${entry.verdict.pass ? 'pass' : 'fail'}">
        ${entry.verdict.pass ? 'PASS' : 'FAIL'}
        ${
          entry.verdict.problems.length
            ? `<div class="detail">${entry.verdict.problems.join('<br>')}</div>`
            : ''
        }
      </td>`;
    body.append(row);
  }
}

/* --- Wiring ------------------------------------------------------------- */

document.getElementById('run-all').addEventListener('click', runAll);
document
  .getElementById('run-conformance')
  .addEventListener('click', () => conformance());

for (const testCase of cases) {
  const trigger = document.querySelector(`[data-case="${testCase.id}"]`);
  trigger?.addEventListener('click', () => run(testCase, 'open'));
}

document.getElementById('env').textContent =
  `engine: ${engineName} — expand: ${expand.duration * 1000}ms, ` +
  `ease [${expand.enter.ease.join(', ')}]`;

/**
 * Slowing the surface down makes a mid-morph screenshot reliable: capture
 * latency is a large fraction of the real 240ms token.
 */
function setDuration(seconds) {
  expand.duration = seconds;
  expand.enter.duration = seconds;
  expand.exit.duration = seconds;
}

window.__spike = {
  engine: engineName,
  runAll,
  runCase,
  run,
  conformance,
  measureAll,
  cases,
  results,
  expand,
  animateLayout,
  animateLayoutScopes,
  setDuration,
  resolveSurface,
};

if (params.get('mode') === 'conformance') {
  conformance().then(() => {
    window.__spikeDone = true;
  });
}
