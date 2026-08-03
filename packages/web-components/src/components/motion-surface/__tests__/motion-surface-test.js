/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '@carbon/web-components/es/components/motion-surface/index.js';
import {
  getMotionSurfaceOrigin,
  registerMotionSurfaceOrigin,
  unregisterMotionSurfaceOrigin,
} from '@carbon/web-components/es/components/motion-surface/motion-surface-registry.js';

function mockMatchMedia(matches) {
  const mediaQueryList = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  };
  window.matchMedia = () => mediaQueryList;
  return mediaQueryList;
}

describe('cds-motion-surface', () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders slotted content inside the animated root when open', async () => {
    mockMatchMedia(false);
    const el = await fixture(html`
      <cds-motion-surface surface="stretch" open>
        <span id="child">content</span>
      </cds-motion-surface>
    `);
    await waitUntil(
      () => el.shadowRoot.querySelector('.cds--motion-surface__root'),
      'surface root should mount when open'
    );

    const root = el.shadowRoot.querySelector('.cds--motion-surface__root');
    expect(root).to.exist;
    expect(root.getAttribute('data-carbon-surface')).to.equal('stretch');
    expect(root.getAttribute('data-carbon-surface-state')).to.equal('enter');

    const child = el.querySelector('#child');
    expect(child).to.exist;
    expect(child.getAttribute('data-carbon-surface')).to.equal(null);
  });

  it('keeps content mounted through exit then fires exit-complete', async () => {
    mockMatchMedia(true);
    const el = await fixture(html`
      <cds-motion-surface surface="contextual"></cds-motion-surface>
    `);

    let exitComplete = false;
    el.addEventListener('cds-motion-surface-exit-complete', () => {
      exitComplete = true;
    });

    el.open = true;
    await el.updateComplete;
    await waitUntil(
      () => el.shadowRoot.querySelector('.cds--motion-surface__root'),
      'should mount when open'
    );

    el.open = false;
    await el.updateComplete;
    await waitUntil(() => exitComplete, 'should fire exit-complete', {
      timeout: 3000,
    });
    await waitUntil(
      () => !el.shadowRoot.querySelector('.cds--motion-surface__root'),
      'should clear content after exit'
    );
  });

  it('does not stamp motion attrs onto slotted children', async () => {
    mockMatchMedia(false);
    const el = await fixture(html`
      <cds-motion-surface surface="contextual" open>
        <button type="button" id="slotted">Open</button>
      </cds-motion-surface>
    `);
    await waitUntil(() =>
      el.shadowRoot.querySelector('.cds--motion-surface__root')
    );

    const button = el.querySelector('#slotted');
    expect(button.hasAttribute('data-carbon-surface')).to.be.false;
    expect(button.hasAttribute('data-carbon-surface-state')).to.be.false;
    expect(button.hasAttribute('data-carbon-surface-id')).to.be.false;
  });
});

describe('cds-motion-surface-origin', () => {
  it('registers its host under surface-id', async () => {
    const el = await fixture(html`
      <cds-motion-surface-origin surface="expand" surface-id="pair-1">
        <button type="button">Trigger</button>
      </cds-motion-surface-origin>
    `);
    await el.updateComplete;

    expect(getMotionSurfaceOrigin('pair-1')).to.equal(el);
  });

  it('unregisters on disconnect', async () => {
    const el = await fixture(html`
      <cds-motion-surface-origin surface="expand" surface-id="pair-2">
        <button type="button">Trigger</button>
      </cds-motion-surface-origin>
    `);
    await el.updateComplete;
    expect(getMotionSurfaceOrigin('pair-2')).to.exist;

    el.remove();
    expect(getMotionSurfaceOrigin('pair-2')).to.be.undefined;
  });

  it('leaves slotted children untouched', async () => {
    const el = await fixture(html`
      <cds-motion-surface-origin surface="invoke" surface-id="pair-3">
        <button type="button" id="slotted">Trigger</button>
      </cds-motion-surface-origin>
    `);
    await el.updateComplete;

    const button = el.querySelector('#slotted');
    expect(button.hasAttribute('data-carbon-surface')).to.be.false;
    expect(button.hasAttribute('data-carbon-surface-id')).to.be.false;
  });
});

describe('motion-surface-registry', () => {
  it('registers and unregisters origins by surfaceId', () => {
    const el = document.createElement('div');
    registerMotionSurfaceOrigin('reg-1', el);
    expect(getMotionSurfaceOrigin('reg-1')).to.equal(el);

    unregisterMotionSurfaceOrigin('reg-1', el);
    expect(getMotionSurfaceOrigin('reg-1')).to.be.undefined;
  });

  it('does not unregister a replaced origin', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    registerMotionSurfaceOrigin('reg-2', first);
    registerMotionSurfaceOrigin('reg-2', second);
    unregisterMotionSurfaceOrigin('reg-2', first);
    expect(getMotionSurfaceOrigin('reg-2')).to.equal(second);
    unregisterMotionSurfaceOrigin('reg-2', second);
  });
});
