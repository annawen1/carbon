/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, nextFrame } from '@open-wc/testing';
import * as motionDom from 'motion-dom';
import {
  animateLayout,
  animateLayoutScopes,
  resolveMotionSurface,
} from '@carbon/web-components/es/globals/internal/motion/index.js';

// `motion-dom`'s published ESM reads `process.env.NODE_ENV` directly and relies
// on a bundler defining it. The test runner serves raw ESM, so shim it here.
globalThis.process ??= { env: { NODE_ENV: 'test' } };

const { enterTransition } = resolveMotionSurface('expand');

const IDENTITY = new Set(['none', 'matrix(1, 0, 0, 1, 0, 0)', '']);

const isMorphing = (element) =>
  !IDENTITY.has(getComputedStyle(element).transform);

describe('motion-dom layout primitives', () => {
  // Canary: `LayoutAnimationBuilder` and `parseAnimateLayoutArgs` are exported
  // but undocumented, so an upgrade could drop them without a major bump. This
  // is the only thing standing between that and a silent loss of morphs.
  it('are still exported from motion-dom', () => {
    expect(motionDom.LayoutAnimationBuilder).to.be.a('function');
    expect(motionDom.parseAnimateLayoutArgs).to.be.a('function');
  });
});

describe('animateLayout', () => {
  it('morphs elements that share a data-layout-id', async () => {
    const origin = await fixture(
      html`<div
        data-layout-id="test-surface"
        style="inline-size: 4rem; block-size: 4rem"></div>`
    );
    let target;

    const animation = await animateLayout(() => {
      origin.remove();
      target = document.createElement('div');
      target.dataset.layoutId = 'test-surface';
      target.style.cssText = 'inline-size: 20rem; block-size: 16rem';
      document.body.append(target);
    }, enterTransition);

    expect(animation.animations.length).to.be.greaterThan(0);

    await nextFrame();
    expect(isMorphing(target)).to.be.true;

    await animation.finished;
    await nextFrame();
    expect(isMorphing(target)).to.be.false;

    target.remove();
  });

  it('only animates targets inside an explicit scope', async () => {
    const scope = await fixture(
      html`<div>
        <div data-layout style="block-size: 2rem"></div>
      </div>`
    );
    const outside = await fixture(
      html`<div data-layout style="block-size: 2rem"></div>`
    );
    const inside = scope.querySelector('[data-layout]');

    const animation = await animateLayout(
      scope,
      () => {
        inside.style.blockSize = '12rem';
        outside.style.blockSize = '12rem';
      },
      enterTransition
    );

    await nextFrame();
    expect(isMorphing(inside)).to.be.true;
    expect(isMorphing(outside)).to.be.false;

    await animation.finished;
  });
});

describe('animateLayoutScopes', () => {
  it('joins two shadow roots in a single commit', async () => {
    const container = await fixture(html`<div></div>`);

    const originHost = document.createElement('div');
    container.append(originHost);
    const originScope = originHost.attachShadow({ mode: 'open' });
    originScope.innerHTML =
      '<div data-layout-id="shadow-surface" ' +
      'style="inline-size: 4rem; block-size: 4rem"></div>';

    const targetHost = document.createElement('div');
    container.append(targetHost);
    const targetScope = targetHost.attachShadow({ mode: 'open' });

    const animations = await animateLayoutScopes(
      [targetScope, originScope, document],
      () => {
        originScope.replaceChildren();
        const target = document.createElement('div');
        target.dataset.layoutId = 'shadow-surface';
        target.style.cssText = 'inline-size: 20rem; block-size: 16rem';
        targetScope.append(target);
      },
      enterTransition
    );

    expect(animations).to.have.lengthOf(3);

    const target = targetScope.querySelector('[data-layout-id]');
    await nextFrame();
    expect(isMorphing(target)).to.be.true;

    await Promise.all(animations.map(({ finished }) => finished));
    await nextFrame();
    expect(isMorphing(target)).to.be.false;
  });

  it('requires at least one scope', () => {
    expect(() => animateLayoutScopes([], () => {})).to.throw(
      /at least one scope/
    );
  });
});
