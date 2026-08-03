/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html, css } from 'lit';
import { expect, fixture, waitUntil } from '@open-wc/testing';
import MotionController from '@carbon/web-components/es/globals/controllers/motion-controller.js';

const hostTag = `test-motion-surface-host-${Math.random().toString(36).slice(2)}`;

/**
 * Minimal host that owns presence: keep the target mounted until
 * onExitComplete (AnimatePresence analogue). Includes a short opacity
 * transition so exit can wait on `transitionend`.
 */
class TestMotionSurfaceHost extends LitElement {
  static properties = {
    open: { type: Boolean },
    surface: { type: String },
    _mounted: { state: true },
  };

  static styles = css`
    [data-carbon-surface] {
      opacity: 1;
      transition: opacity 50ms linear;
    }

    [data-carbon-surface-state='exit'] {
      opacity: 0;
    }
  `;

  constructor() {
    super();
    this.open = false;
    this.surface = 'contextual';
    this._mounted = false;
    this._exitCompleteCount = 0;
    this._motion = new MotionController(this);
  }

  get isExiting() {
    return this._motion.isExiting;
  }

  get exitCompleteCount() {
    return this._exitCompleteCount;
  }

  get motion() {
    return this._motion;
  }

  willUpdate(changed) {
    if (changed.has('open') && this.open) {
      this._mounted = true;
    }
  }

  updated(changed) {
    if (changed.has('open') || changed.has('surface')) {
      const target = this.renderRoot.querySelector('[data-target]');
      if (!target) {
        return;
      }
      this._motion.setOpen({
        surface: this.surface,
        target,
        open: this.open,
        onExitComplete: () => {
          this._exitCompleteCount += 1;
          this._mounted = false;
        },
      });
    }
  }

  render() {
    if (!this._mounted) {
      return html``;
    }
    return html`<div data-target>content</div>`;
  }
}

customElements.define(hostTag, TestMotionSurfaceHost);

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

async function openHost() {
  const el = await fixture(`<${hostTag}></${hostTag}>`);
  el.open = true;
  await el.updateComplete;
  await waitUntil(
    () => el.renderRoot.querySelector('[data-target]'),
    'surface should mount when open',
    { timeout: 3000 }
  );
  return el;
}

describe('MotionController', () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('sets carbon surface data attributes on enter', async () => {
    const el = await openHost();
    const target = el.renderRoot.querySelector('[data-target]');
    expect(target).to.exist;
    expect(target.getAttribute('data-carbon-surface')).to.equal('contextual');
    expect(target.getAttribute('data-carbon-surface-state')).to.equal('enter');
  });

  it('runs exit then reports onExitComplete before unmounting', async () => {
    const el = await openHost();

    el.open = false;
    await el.updateComplete;

    const target = el.renderRoot.querySelector('[data-target]');
    expect(target.getAttribute('data-carbon-surface-state')).to.equal('exit');

    await waitUntil(
      () => el.exitCompleteCount === 1,
      'onExitComplete should fire after exit transition',
      { timeout: 3000 }
    );
    await waitUntil(
      () => !el.renderRoot.querySelector('[data-target]'),
      'surface should unmount after exit',
      { timeout: 3000 }
    );
    expect(el.isExiting).to.equal(false);
  });

  it('cancels exit when reopened before exit finishes', async () => {
    const el = await openHost();

    el.open = false;
    await el.updateComplete;
    el.open = true;
    await el.updateComplete;

    await waitUntil(
      () => el.renderRoot.querySelector('[data-target]'),
      'surface should remain mounted after reopen',
      { timeout: 3000 }
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(el.exitCompleteCount).to.equal(0);
    const target = el.renderRoot.querySelector('[data-target]');
    expect(target.getAttribute('data-carbon-surface-state')).to.equal('enter');
  });

  describe('with reduced motion', () => {
    beforeEach(() => {
      mockMatchMedia(true);
    });

    it('shows the target and sets enter state', async () => {
      const el = await openHost();
      const target = el.renderRoot.querySelector('[data-target]');
      expect(target.getAttribute('data-carbon-surface-state')).to.equal(
        'enter'
      );
    });

    it('unmounts immediately and still reports exit completion', async () => {
      const el = await openHost();

      el.open = false;
      await el.updateComplete;

      await waitUntil(
        () => el.exitCompleteCount === 1,
        'onExitComplete should fire immediately',
        { timeout: 3000 }
      );
      await waitUntil(
        () => !el.renderRoot.querySelector('[data-target]'),
        'surface should unmount',
        { timeout: 3000 }
      );
    });
  });

  it('throws for shared-element surfaces without surfaceId and origin', async () => {
    const el = await openHost();
    const target = el.renderRoot.querySelector('[data-target]');
    let error;
    try {
      el.motion.setOpen({
        surface: 'expand',
        target,
        open: true,
      });
    } catch (err) {
      error = err;
    }
    expect(error).to.exist;
    expect(error.message).to.match(/surfaceId` and `origin/);
  });

  it('runs shared-element enter/exit without View Transitions when unsupported', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'startViewTransition'
    );
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    mockMatchMedia(false);
    const el = await fixture(`<${hostTag}></${hostTag}>`);
    await el.updateComplete;

    const origin = document.createElement('div');
    const target = document.createElement('div');
    document.body.append(origin, target);

    let exitComplete = 0;
    el.motion.setOpen({
      surface: 'expand',
      surfaceId: 'expand-test',
      origin,
      open: true,
      mountTarget: async () => target,
    });
    await waitUntil(
      () => target.getAttribute('data-carbon-surface-id') === 'expand-test',
      'shared-element target should receive pairing attrs',
      { timeout: 3000 }
    );
    expect(target.getAttribute('data-carbon-surface')).to.equal('expand');
    // Origin stays mounted but steps aside while the destination is shown
    expect(origin.getAttribute('data-carbon-surface-id')).to.equal(
      'expand-test'
    );
    expect(origin.hasAttribute('data-carbon-surface-active')).to.equal(true);

    el.motion.setOpen({
      surface: 'expand',
      surfaceId: 'expand-test',
      target,
      origin,
      open: false,
      unmountTarget: async () => {
        target.removeAttribute('data-carbon-surface');
        target.removeAttribute('data-carbon-surface-id');
        target.removeAttribute('data-carbon-surface-active');
      },
      onExitComplete: () => {
        exitComplete += 1;
      },
    });
    await waitUntil(() => exitComplete === 1, 'exit should complete', {
      timeout: 3000,
    });
    expect(target.hasAttribute('data-carbon-surface-id')).to.equal(false);
    expect(origin.hasAttribute('data-carbon-surface-id')).to.equal(false);
    expect(origin.hasAttribute('data-carbon-surface-active')).to.equal(false);

    origin.remove();
    target.remove();
    if (originalDescriptor) {
      Object.defineProperty(
        Document.prototype,
        'startViewTransition',
        originalDescriptor
      );
    } else {
      delete document.startViewTransition;
    }
  });
});
