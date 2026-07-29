/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Static registration-coverage audit for the pure-exports model
 *
 * Under pure exports, importing a component's class file no longer registers
 * its custom element - that now lives in the barrel, e.g. `{component}/index.ts`
 * via `defineCustomElement`. There are two regressions to look out for, both
 * covered by this script:
 *
 * 1. Component gap: a component's barrel must register every Carbon element that
 *    renders in its own (composed) shadow DOM. If a barrel registers less than
 *    it renders, the child ships inert (`icon-indicator` and `shape-indicator`
 *    would have this problem - see their import strategy for an example of this
 *    guard).
 *
 * 2. Test-import gap: a test that impornts a component class file rather than
 *    its barrel no longer registers the element, so the element never upgrades.
 *    The barrel is the only import that guarantees registration.
 *
 * Exits non-zero and prints the offending (barrel -> tag) / (test -> import)
 * pairs when either check fails, so it can run in `ci-check`.
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS = path.resolve(__dirname, '../src/components');

const read = (f) => {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch {
    return '';
  }
};

const isFile = (f) => {
  try {
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};

// resolve relative import to a `.ts` file or directory barrel
function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);

  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (isFile(candidate)) {
      return candidate;
    }
  }

  return null;
}

// the `cds-` tag a class file registers under, from its decorator or `static is`
function tagOf(file) {
  const src = read(file);
  const m =
    src.match(/@customElement\(`\$\{prefix\}(-[a-z0-9-]+)`\)/) ||
    src.match(/static is\s*=\s*`\$\{prefix\}(-[a-z0-9-]+)`/);

  return m ? `cds${m[1]}` : null;
}

const isComponentClassFile = (f) =>
  f.endsWith('.ts') &&
  path.basename(f) !== 'index.ts' &&
  path.basename(f) !== 'defs.ts' &&
  !f.includes('.stories.') &&
  !f.includes('__tests__');

// map every `cds-` tag to the class file that defines it
function buildTagIndex() {
  const tagToFile = {};

  for (const name of fs.readdirSync(COMPONENTS)) {
    const dir = path.join(COMPONENTS, name);

    if (!fs.statSync(dir).isDirectory()) {
      continue;
    }

    for (const f of fs.readdirSync(dir)) {
      const abs = path.join(dir, f);

      if (!isComponentClassFile(abs)) {
        continue;
      }

      const tag = tagOf(abs);

      if (tag && !tagToFile[tag]) {
        tagToFile[tag] = abs;
      }
    }
  }
  return tagToFile;
}

// tags registered when a user imports a barrel. registration onlyhappens
// via `defineCustomElement(Class)`; barrels become reachable by following the
// full import graph
function registeredTags(barrel, seen = new Set(), out = new Set()) {
  if (!barrel || seen.has(barrel)) {
    return out;
  }

  seen.add(barrel);

  const src = read(barrel);
  const imports = {};

  for (const m of src.matchAll(
    /import\s+([A-Za-z0-9_]+)\s+from\s+'(\.[^']+)'/g
  )) {
    const r = resolveImport(barrel, m[2]);

    if (r) {
      imports[m[1]] = r;
    }
  }
  for (const m of src.matchAll(/defineCustomElement\(\s*([A-Za-z0-9_]+)/g)) {
    const tag = imports[m[1]] && tagOf(imports[m[1]]);

    if (tag) {
      out.add(tag);
    }
  }
  for (const m of src.matchAll(/import[^'";]*'(\.[^']+)'/g)) {
    const r = resolveImport(barrel, m[1]);

    if (r) {
      registeredTags(r, seen, out);
    }
  }

  return out;
}

// strip block/line comments such as `@fires`, `@deprecated` so the element they
// reference don't get mistaken as a rendered element
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function localRenderedTags(rawSrc) {
  const src = stripComments(rawSrc);
  const tags = new Set();

  for (const m of src.matchAll(/<(cds-[a-z0-9-]+)(?![-a-z0-9])/g)) {
    tags.add(m[1]);
  }

  for (const m of src.matchAll(/<\$\{prefix\}(-[a-z0-9-]+)(?![-a-z0-9])/g)) {
    tags.add(`cds${m[1]}`);
  }

  return tags;
}

// every tag that ends up in a class file's composed shadow-DOM render tree - its
// own template tags plus the tags rendered by its children (transitive)
function renderTree(file, tagToFile, cache = new Map(), seen = new Set()) {
  if (!file) {
    return new Set();
  }

  if (cache.has(file)) {
    return cache.get(file);
  }

  if (seen.has(file)) {
    return new Set();
  }

  seen.add(file);

  const src = read(file);
  const out = localRenderedTags(src);

  // only go into elements this file renders (a literal `<tag>`) - do not follow
  // `extends`, this leads to false positives
  for (const tag of [...out]) {
    const childFile = tagToFile[tag];

    if (childFile && childFile !== file) {
      for (const t of renderTree(childFile, tagToFile, cache, seen)) {
        out.add(t);
      }
    }
  }

  cache.set(file, out);
  return out;
}

// 1. check that each barrel registers every tag its component renders
function auditComponents(tagToFile) {
  const gaps = [];

  for (const name of fs.readdirSync(COMPONENTS)) {
    const dir = path.join(COMPONENTS, name);

    if (!fs.statSync(dir).isDirectory()) {
      continue;
    }

    const barrel = path.join(dir, 'index.ts');

    if (!isFile(barrel)) {
      continue;
    }

    const registered = registeredTags(barrel);
    const cache = new Map();
    const rendered = new Set();

    for (const f of fs.readdirSync(dir)) {
      const abs = path.join(dir, f);

      if (isComponentClassFile(abs)) {
        for (const t of renderTree(abs, tagToFile, cache)) {
          rendered.add(t);
        }
      }
    }

    const missing = [...rendered].filter(
      (t) => !registered.has(t) && t !== `cds-${name}`
    );

    if (missing.length) {
      gaps.push({ name, missing });
    }
  }

  return gaps;
}

// 2. test importing a component class file (not barrel or `defs`) must also
// import that component's barrel, or that the element the test mounts is never
// registered
function auditTestImports() {
  const risks = [];

  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);

      if (e.isDirectory()) {
        walk(p);
      } else if (/-test\.js$|\.test\.js$/.test(e.name)) {
        checkTestFile(p, risks);
      }
    }
  };

  walk(COMPONENTS);
  return risks;
}

function checkTestFile(file, risks) {
  const src = read(file);
  const byComp = {};

  for (const line of src.split('\n')) {
    const wc = line.match(
      /@carbon\/web-components\/es\/components\/([^/]+)\/([^'"]+?)(?:\.js)?['"]/
    );

    if (!wc) {
      continue;
    }

    const comp = wc[1];
    const sub = wc[2].replace(/\.js$/, '');
    (byComp[comp] = byComp[comp] || []).push(sub);
  }

  for (const [comp, subs] of Object.entries(byComp)) {
    const hasBarrel = subs.includes('index');
    const classImports = subs.filter((s) => s !== 'index' && s !== 'defs');

    if (classImports.length && !hasBarrel) {
      risks.push({
        file: path.relative(COMPONENTS, file),
        comp,
        classImports,
      });
    }
  }
}

function main() {
  const tagToFile = buildTagIndex();
  const componentGaps = auditComponents(tagToFile);
  const testRisks = auditTestImports();

  let failed = false;

  if (componentGaps.length) {
    failed = true;
    console.error(
      '\n✗ Components whose barrel does NOT register a tag they render:\n'
    );
    for (const { name, missing } of componentGaps) {
      console.error(
        `  ${name}/index.ts  -> add a barrel import that registers: ${missing.join(', ')}`
      );
    }
  }

  if (testRisks.length) {
    failed = true;
    console.error(
      '\n✗ Tests that import a component class file without its barrel ' +
        '(element will not register):\n'
    );
    for (const { file, comp, classImports } of testRisks) {
      console.error(
        `  ${file}  imports ${comp}/${classImports.join(', ')} but not ${comp}/index.js`
      );
    }
  }

  if (failed) {
    console.error(
      '\nFix: import the component barrel (`<component>/index.js`), which ' +
        'registers via defineCustomElement.\n'
    );
    process.exit(1);
  }

  console.log('✓ registration coverage: all barrels register what they render');
}

main();
