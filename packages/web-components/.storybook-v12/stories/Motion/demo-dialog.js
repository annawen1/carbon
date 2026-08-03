/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html, nothing } from 'lit';
import '../../../src/components/button/index';
import '../../../src/components/motion-surface/index';
import styles from './motion-surface-demo.scss?lit';

/**
 * Story-only dialog chrome that consumes `cds-motion-surface` (reveal demos).
 * Shared-element Expand/Invoke stories compose the surface in light DOM
 * instead so View Transitions can pair host elements. Not a published
 * Carbon component.
 */
export class MotionSurfaceDemoDialog extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    surface: { type: String },
    surfaceId: { type: String, attribute: 'surface-id' },
    heading: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this.open = false;
    this.surface = 'contextual';
    this.surfaceId = undefined;
    this.heading = 'Dialog';
  }

  _onClose = () => {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
  };

  _onExitComplete = () => {
    this.dispatchEvent(
      new CustomEvent('exit-complete', {
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    return html`
      <div
        class="motion-surface-demo__backdrop"
        ?data-open=${this.open}
        role="presentation"
        @click=${this._onClose}></div>
      <div class="motion-surface-demo__surface-stage">
        <cds-motion-surface
          class="motion-surface-demo__surface"
          surface=${this.surface}
          surface-id=${this.surfaceId ?? nothing}
          ?open=${this.open}
          @cds-motion-surface-exit-complete=${this._onExitComplete}>
          <div
            class="motion-surface-demo__container"
            role="dialog"
            aria-modal="true"
            aria-label=${this.heading}>
            <h3 class="motion-surface-demo__heading">${this.heading}</h3>
            <div class="motion-surface-demo__body">
              <slot></slot>
            </div>
            <div class="motion-surface-demo__footer">
              <cds-button kind="secondary" @click=${this._onClose}>
                Close
              </cds-button>
            </div>
          </div>
        </cds-motion-surface>
      </div>
    `;
  }
}

if (!customElements.get('motion-surface-demo-dialog')) {
  customElements.define('motion-surface-demo-dialog', MotionSurfaceDemoDialog);
}
