/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, LitElement } from 'lit';
import '../../../src/components/button/index';
import '../../../src/components/motion-surface/index';
import './demo-dialog';
import './motion-surface-demo.scss';

export default {
  title: 'Elements/Motion',
  parameters: {
    docs: {
      description: {
        component:
          '`cds-motion-surface` / `cds-motion-surface-origin` wrappers drive ' +
          'MotionController. Reveal surfaces use native CSS; shared-element ' +
          'surfaces use the View Transitions API.',
      },
    },
  },
};

function openDemoDialog(event) {
  const root = event.currentTarget.closest('.motion-surface-demo');
  const dialog = root.querySelector('motion-surface-demo-dialog');
  dialog.open = true;
}

function closeDemoDialog(event) {
  event.currentTarget.open = false;
}

/**
 * Stretch reveal via `cds-motion-surface` (native CSS `surface()` mixin).
 */
export const Stretch = {
  render: () => html`
    <div class="motion-surface-demo">
      <cds-button @click=${openDemoDialog}>Open stretch</cds-button>
      <motion-surface-demo-dialog
        surface="stretch"
        heading="Stretch surface"
        @close=${closeDemoDialog}>
        <p>
          Reveal using the <code>stretch</code> surface (opacity + clip-path)
          driven by <code>cds-motion-surface</code> and native CSS.
        </p>
      </motion-surface-demo-dialog>
    </div>
  `,
};

const solutionTiles = [
  {
    id: 'multicloud-management',
    name: 'Multicloud management',
    description:
      'Increase operational efficiency with intelligent data analysis.',
  },
  {
    id: 'cloud-pak-integration',
    name: 'Cloud Pak for integration',
    description: 'Integrate applications and data across environments.',
  },
  {
    id: 'cloud-pak-automation',
    name: 'Cloud Pak for automation',
    description: 'Design, build, and run automation on any cloud.',
  },
];

/**
 * Shared-element demos keep origin + destination hosts in the same light-DOM
 * tree so View Transitions can pair `view-transition-name` across them.
 */
function renderSharedDialog({
  surface,
  surfaceId,
  open,
  heading,
  onClose,
  onExitComplete,
  body,
}) {
  return html`
    <div
      class="motion-surface-demo__backdrop"
      ?data-open=${open}
      role="presentation"
      @click=${onClose}></div>
    <div class="motion-surface-demo__surface-stage">
      <cds-motion-surface
        class="motion-surface-demo__surface"
        surface=${surface}
        surface-id=${surfaceId}
        ?open=${open}
        @cds-motion-surface-exit-complete=${onExitComplete}>
        <div
          class="motion-surface-demo__container"
          role="dialog"
          aria-modal="true"
          aria-label=${heading}>
          <h3 class="motion-surface-demo__heading">${heading}</h3>
          <div class="motion-surface-demo__body">${body}</div>
          <div class="motion-surface-demo__footer">
            <cds-button kind="secondary" @click=${onClose}>Close</cds-button>
          </div>
        </div>
      </cds-motion-surface>
    </div>
  `;
}

/**
 * Host for Expand shared-element demo (needs reactive state).
 */
class ExpandDemoHost extends LitElement {
  static properties = {
    open: { type: Boolean, state: true },
    selected: { state: true },
  };

  constructor() {
    super();
    this.open = false;
    this.selected = null;
  }

  createRenderRoot() {
    return this;
  }

  _openTile(tile) {
    this.selected = tile;
    this.open = true;
  }

  _close = () => {
    this.open = false;
  };

  _onExitComplete = () => {
    this.selected = null;
  };

  render() {
    const surfaceId = `expand-${this.selected?.id ?? 'none'}`;
    return html`
      <div class="motion-surface-demo">
        <div class="motion-surface-demo__tiles">
          ${solutionTiles.map(
            (tile) => html`
              <cds-motion-surface-origin
                surface="expand"
                surface-id=${`expand-${tile.id}`}>
                <button
                  type="button"
                  class="motion-surface-demo__tile"
                  @click=${() => this._openTile(tile)}>
                  <h3 class="motion-surface-demo__tile-heading">
                    ${tile.name}
                  </h3>
                  <p class="motion-surface-demo__tile-description">
                    ${tile.description}
                  </p>
                </button>
              </cds-motion-surface-origin>
            `
          )}
        </div>
        ${renderSharedDialog({
          surface: 'expand',
          surfaceId,
          open: this.open,
          heading: this.selected?.name ?? '',
          onClose: this._close,
          onExitComplete: this._onExitComplete,
          body: html`
            <p>
              The tile you clicked morphs into this dialog through the
              <code>expand</code> shared-element surface (View Transitions).
            </p>
          `,
        })}
      </div>
    `;
  }
}

if (!customElements.get('motion-expand-demo-host')) {
  customElements.define('motion-expand-demo-host', ExpandDemoHost);
}

export const Expand = {
  render: () => html`<motion-expand-demo-host></motion-expand-demo-host>`,
};

/**
 * Host for Invoke shared-element demo.
 */
class InvokeDemoHost extends LitElement {
  static properties = {
    open: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.open = false;
  }

  createRenderRoot() {
    return this;
  }

  _close = () => {
    this.open = false;
  };

  render() {
    return html`
      <div class="motion-surface-demo">
        <cds-motion-surface-origin surface="invoke" surface-id="invoke-demo">
          <cds-button @click=${() => (this.open = true)}>
            Create resource
          </cds-button>
        </cds-motion-surface-origin>
        ${renderSharedDialog({
          surface: 'invoke',
          surfaceId: 'invoke-demo',
          open: this.open,
          heading: 'Create resource',
          onClose: this._close,
          onExitComplete: () => {},
          body: html`
            <p>
              The trigger morphs into this dialog through the
              <code>invoke</code> shared-element surface (View Transitions).
            </p>
          `,
        })}
      </div>
    `;
  }
}

if (!customElements.get('motion-invoke-demo-host')) {
  customElements.define('motion-invoke-demo-host', InvokeDemoHost);
}

export const Invoke = {
  render: () => html`<motion-invoke-demo-host></motion-invoke-demo-host>`,
};
