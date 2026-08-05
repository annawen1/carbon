/* eslint-disable no-console */
/**
 * Bundle cost of the layout-animation approach.
 *
 * Each scenario is a realistic entry point that actually *uses* what it
 * imports, so tree shaking reflects shipped code rather than a bare re-export.
 * Sizes are reported minified and brotli'd, since that is what a consumer's CDN
 * serves.
 */

import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const scenarios = [
  {
    name: 'tokens only (reveal surfaces, no JS engine)',
    code: `
      import { getMotionSurface, resolveDuration, resolveEasing } from '@carbon/motion';
      const s = getMotionSurface('expand');
      globalThis.out = [resolveDuration(s.duration), resolveEasing(...s.enterEasing)];
    `,
  },
  {
    name: 'animateLayout only (motion-dom projection engine)',
    code: `
      import { LayoutAnimationBuilder, parseAnimateLayoutArgs } from 'motion-dom';
      globalThis.animateLayout = (a, b, c) => {
        const { scope, updateDom, defaultOptions } = parseAnimateLayoutArgs(a, b, c);
        return new LayoutAnimationBuilder(scope, updateDom, defaultOptions);
      };
    `,
  },
  {
    name: 'animate() only (motion, for reference)',
    code: `
      import { animate } from 'motion';
      globalThis.a = (el) => animate(el, { opacity: 1 }, { duration: 0.24 });
    `,
  },
  {
    name: 'realistic surface layer (tokens + animateLayout + animate)',
    code: `
      import { LayoutAnimationBuilder, parseAnimateLayoutArgs } from 'motion-dom';
      import { animate } from 'motion';
      import { getMotionSurface, resolveDuration, resolveEasing } from '@carbon/motion';
      globalThis.animateLayout = (a, b, c) => {
        const { scope, updateDom, defaultOptions } = parseAnimateLayoutArgs(a, b, c);
        return new LayoutAnimationBuilder(scope, updateDom, defaultOptions);
      };
      globalThis.resolve = (name) => {
        const s = getMotionSurface(name);
        return { d: resolveDuration(s.duration), e: resolveEasing(...s.enterEasing) };
      };
      globalThis.fade = (el, o, t) => animate(el, { opacity: o }, t);
    `,
  },
  {
    name: 'lit (already shipped, for scale)',
    code: `
      import { LitElement, html, css } from 'lit';
      globalThis.X = class extends LitElement {
        static styles = css\`:host{display:block}\`;
        render() { return html\`<slot></slot>\`; }
      };
    `,
  },
];

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;

async function measure({ name, code }) {
  const result = await build({
    stdin: {
      contents: code,
      resolveDir: process.cwd(),
      loader: 'js',
    },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    treeShaking: true,
    write: false,
    legalComments: 'none',
  });

  const bytes = result.outputFiles[0].contents;
  return {
    name,
    min: bytes.byteLength,
    gzip: gzipSync(bytes).byteLength,
    brotli: brotliCompressSync(bytes).byteLength,
  };
}

const rows = [];
for (const scenario of scenarios) {
  rows.push(await measure(scenario));
}

const width = Math.max(...rows.map((r) => r.name.length));
console.log('\n=== bundle cost (esbuild, minified, tree-shaken) ===\n');
console.log(
  `${'scenario'.padEnd(width)}  ${'min'.padStart(9)}  ${'gzip'.padStart(9)}  ${'brotli'.padStart(9)}`
);
console.log('-'.repeat(width + 35));
for (const r of rows) {
  console.log(
    `${r.name.padEnd(width)}  ${kb(r.min).padStart(9)}  ${kb(r.gzip).padStart(9)}  ${kb(r.brotli).padStart(9)}`
  );
}

const tokens = rows[0];
const layout = rows[1];
const realistic = rows[3];
console.log(
  `\nprojection engine over tokens-only: +${kb(layout.brotli - tokens.brotli)} brotli`
);
console.log(
  `full surface layer over tokens-only: +${kb(realistic.brotli - tokens.brotli)} brotli\n`
);
