/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, css, html } from 'lit';
import {
  animateLayout,
  animateLayoutScopes,
  isMotionEnabled,
  resolveMotionSurface,
} from './index';

/**
 * Story-only demos for the internal layout animation layer, standing in for
 * the `<cds-motion-surface>` elements that land in a later phase. The React
 * spike uses a story-only `DemoDialog` for the same reason: threading a
 * surface through a production component is a separate integration step.
 */

const expand = resolveMotionSurface('expand');

const demoStyles = css`
  :host {
    display: block;
    color: var(--cds-text-primary, #161616);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .card {
    display: block;
    inline-size: 14rem;
    padding: 0;
    border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
    background: var(--cds-layer-01, #f4f4f4);
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
    overflow: hidden;
  }

  .media {
    block-size: 6rem;
    background: var(--cds-interactive, #0f62fe);
  }

  .body {
    padding: 1rem;
  }

  .eyebrow {
    margin: 0 0 0.25rem;
    font-size: 0.75rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--cds-text-secondary, #525252);
  }

  h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 400;
  }

  p {
    line-height: 1.5;
  }

  .layer {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .layer:empty {
    display: none;
  }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: 8999;
    background: var(--cds-overlay, rgb(22 22 22 / 50%));
  }

  /* The morph target is a static child of the fixed layer rather than being
     fixed itself, so the engine never treats it as a scroll root. */
  .dialog {
    inline-size: min(34rem, 90vw);
    background: var(--cds-layer-01, #fff);
    overflow: hidden;
  }

  .dialog .media {
    block-size: 12rem;
  }

  .dialog h3 {
    font-size: 1.75rem;
  }
`;

/** Markup shared by a card and the dialog it morphs into. */
function cardContent(eyebrow: string, title: string, body?: string) {
  return `
    <div class="media" data-layout-id="expand-media" data-layout="preserve-aspect"></div>
    <div class="body">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
      ${body ? `<p>${body}</p>` : ''}
    </div>`;
}

/* -------------------------------------------------------------------------
 * Shared-element morph — the `expand` surface
 * ---------------------------------------------------------------------- */

class StoryMotionExpand extends LitElement {
  static styles = demoStyles;

  private get scope() {
    return this.shadowRoot as ShadowRoot;
  }

  private async open() {
    const build = () => {
      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      // Pairs this element with the card carrying the same id. Everything
      // else about the morph is measured by the engine.
      dialog.dataset.layoutId = 'expand-card';
      dialog.innerHTML = cardContent(
        'Expand surface',
        'Morphed from the tile',
        'The engine measured both boxes and interpolated between them. Click to close.'
      );
      dialog.addEventListener('click', () => this.close());

      const scrim = document.createElement('div');
      scrim.className = 'scrim';
      scrim.addEventListener('click', () => this.close());

      (this.scope.querySelector('.layer') as Element).append(scrim, dialog);
    };

    // Reduced motion skips the engine entirely and applies the change
    // immediately, matching how the React surfaces bail.
    if (!isMotionEnabled()) return build();

    await animateLayout(this.scope, build, expand.enterTransition);
  }

  private async close() {
    const teardown = () =>
      (this.scope.querySelector('.layer') as Element).replaceChildren();

    if (!isMotionEnabled()) return teardown();

    await animateLayout(this.scope, teardown, expand.exitTransition);
  }

  render() {
    return html`
      <div class="grid">
        <button
          class="card"
          data-layout-id="expand-card"
          @click=${() => this.open()}>
          <div
            class="media"
            data-layout-id="expand-media"
            data-layout="preserve-aspect"></div>
          <div class="body">
            <p class="eyebrow">Expand surface</p>
            <h3>Open me</h3>
          </div>
        </button>
      </div>
      <div class="layer"></div>
    `;
  }
}

/* -------------------------------------------------------------------------
 * Plain layout change — no pairing, just `data-layout`
 * ---------------------------------------------------------------------- */

class StoryMotionLayout extends LitElement {
  static styles = [
    demoStyles,
    css`
      .tile {
        padding: 1rem;
        border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
        background: var(--cds-layer-01, #f4f4f4);
      }

      .tile.wide {
        inline-size: 28rem;
      }

      .tile.narrow {
        inline-size: 12rem;
      }

      button.toggle {
        margin-block-end: 1rem;
        padding: 0.75rem 1.5rem;
        border: 0;
        background: var(--cds-button-primary, #0f62fe);
        color: var(--cds-text-on-color, #fff);
        font: inherit;
        cursor: pointer;
      }
    `,
  ];

  // Stories are excluded from tsconfig, so Lit decorators are not compiled —
  // use the static properties API instead (same pattern as other story demos).
  static properties = {
    wide: { type: Boolean, state: true },
  };

  wide = false;

  private async toggle() {
    const apply = () => {
      this.wide = !this.wide;
      // The engine measures synchronously after the callback, so Lit has to
      // have flushed the class change by then.
      return this.updateComplete.then(() => undefined);
    };

    if (!isMotionEnabled()) return apply();

    await animateLayout(
      this.shadowRoot as ShadowRoot,
      apply,
      expand.enterTransition
    );
  }

  render() {
    return html`
      <button class="toggle" @click=${() => this.toggle()}>
        ${this.wide ? 'Shrink' : 'Grow'}
      </button>
      <div class="tile ${this.wide ? 'wide' : 'narrow'}" data-layout>
        <h3>Resizes</h3>
        <p>
          Marked with <code>data-layout</code>, so it animates its own layout
          change rather than pairing with another element.
        </p>
      </div>
    `;
  }
}

/* -------------------------------------------------------------------------
 * Morph across two shadow roots
 * ---------------------------------------------------------------------- */

class StoryMotionShadowDialog extends LitElement {
  static styles = demoStyles;

  get layer() {
    return (this.shadowRoot as ShadowRoot).querySelector(
      '.layer'
    ) as HTMLElement;
  }

  render() {
    return html`<div class="layer"></div>`;
  }
}

class StoryMotionShadowOrigin extends LitElement {
  static styles = demoStyles;

  private get target() {
    return (this.parentElement as HTMLElement).querySelector(
      'story-motion-shadow-dialog'
    ) as StoryMotionShadowDialog;
  }

  private async open() {
    const build = () => {
      const dialog = document.createElement('div');
      dialog.className = 'dialog';
      dialog.dataset.layoutId = 'shadow-card';
      dialog.innerHTML = cardContent(
        'Two shadow roots',
        'Crossed the boundary',
        'The origin and this dialog live in different shadow roots. Click to close.'
      );
      dialog.addEventListener('click', () => this.close());
      this.target.layer.append(dialog);
    };

    if (!isMotionEnabled()) return build();

    // Each builder only searches its own scope, but builders constructed in
    // the same tick flush as one commit — so every participating shadow root
    // joins the same morph.
    await animateLayoutScopes(
      [this.target.shadowRoot as ShadowRoot, this.shadowRoot as ShadowRoot],
      build,
      expand.enterTransition
    );
  }

  private async close() {
    const teardown = () => this.target.layer.replaceChildren();

    if (!isMotionEnabled()) return teardown();

    await animateLayoutScopes(
      [this.target.shadowRoot as ShadowRoot, this.shadowRoot as ShadowRoot],
      teardown,
      expand.exitTransition
    );
  }

  render() {
    return html`
      <div class="grid">
        <button
          class="card"
          data-layout-id="shadow-card"
          @click=${() => this.open()}>
          <div class="media"></div>
          <div class="body">
            <p class="eyebrow">Two shadow roots</p>
            <h3>Open me</h3>
          </div>
        </button>
      </div>
    `;
  }
}

// Guarded so hot reloading a story doesn't throw on re-registration.
const define = (tag: string, ctor: CustomElementConstructor) => {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
};

define('story-motion-expand', StoryMotionExpand);
define('story-motion-layout', StoryMotionLayout);
define('story-motion-shadow-origin', StoryMotionShadowOrigin);
define('story-motion-shadow-dialog', StoryMotionShadowDialog);

/* -------------------------------------------------------------------------
 * Stories
 * ---------------------------------------------------------------------- */

const meta = {
  title: 'Internal/Motion',
};

export default meta;

export const SharedElementMorph = {
  name: 'Shared element morph',
  parameters: {
    docs: {
      description: {
        story:
          'Two elements carrying the same `data-layout-id` morph into each ' +
          'other, the web components equivalent of `layoutId` in ' +
          '`motion/react`. Timing comes from the `expand` surface in ' +
          '`@carbon/motion`, so it matches `@carbon/react` exactly.',
      },
    },
  },
  render: () => html`<story-motion-expand></story-motion-expand>`,
};

// export const LayoutChange = {
//   name: 'Plain layout change',
//   parameters: {
//     docs: {
//       description: {
//         story:
//           'A single element marked with `data-layout` animates its own size ' +
//           'change. No pairing involved, and previously unanimatable changes ' +
//           'like a flex or grid reflow work the same way.',
//       },
//     },
//   },
//   render: () => html`<story-motion-layout></story-motion-layout>`,
// };

export const AcrossShadowRoots = {
  name: 'Across shadow roots',
  parameters: {
    docs: {
      description: {
        story:
          'The origin and the dialog live in separate shadow roots. ' +
          '`animateLayoutScopes()` registers both roots in the same tick so ' +
          'they flush as one commit, which is what makes shared-element ' +
          'morphs possible between encapsulated components.',
      },
    },
  },
  render: () => html`
    <story-motion-shadow-origin></story-motion-shadow-origin>
    <story-motion-shadow-dialog></story-motion-shadow-dialog>
  `,
};
