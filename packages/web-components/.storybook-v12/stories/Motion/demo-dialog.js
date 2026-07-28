/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from 'lit';
import MotionController from '../../../src/globals/controllers/motion-controller';
import '../../../src/components/button/index';
import styles from './motion-surface-demo.scss?lit';

/**
 * Story-only dialog that drives MotionController for CSS reveal demos.
 * Not a published Carbon component.
 */
export class MotionSurfaceDemoDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    surface: { type: String },
    heading: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this.open = false;
    this.surface = 'contextual';
    this.heading = 'Dialog';
    this._mounted = false;
    this._motion = new MotionController(this);
  }

  willUpdate(changed) {
    if (changed.has('open') && this.open) {
      this._mounted = true;
    }
  }

  updated(changed) {
    if (changed.has('open') || changed.has('surface')) {
      this.updateComplete.then(() => {
        const surfaceNode = this.renderRoot.querySelector('[data-target]');
        if (!surfaceNode) {
          return;
        }
        this._motion.setOpen({
          surface: this.surface,
          target: surfaceNode,
          open: this.open,
          onExitComplete: () => {
            this._mounted = false;
            this.requestUpdate();
            this.dispatchEvent(
              new CustomEvent('exit-complete', {
                bubbles: true,
                composed: true,
              })
            );
          },
        });
      });
    }
  }

  _onClose = () => {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true })
    );
  };

  _onOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      this._onClose();
    }
  };

  render() {
    if (!this._mounted) {
      return html``;
    }

    return html`
      <div
        class="motion-surface-demo__modal"
        role="presentation"
        @click=${this._onOverlayClick}>
        <div
          data-target
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
      </div>
    `;
  }
}

if (!customElements.get('motion-surface-demo-dialog')) {
  customElements.define('motion-surface-demo-dialog', MotionSurfaceDemoDialog);
}
