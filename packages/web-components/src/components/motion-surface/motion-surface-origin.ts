/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';
import { prefix } from '../../globals/settings';
import { carbonElement as customElement } from '../../globals/decorators/carbon-element';
import type { MotionSurfaceName } from '@carbon/motion';
import { getMotionSurface } from '@carbon/motion';
import { ensureMotionSurfaceDocumentStyles } from './ensure-document-styles';
import {
  registerMotionSurfaceOrigin,
  unregisterMotionSurfaceOrigin,
} from './motion-surface-registry';
import styles from './motion-surface-origin.scss?lit';

const ROOT_CLASS = `${prefix}--motion-surface-origin__root`;

/**
 * Persistent source element for a shared-element motion surface. Registers
 * the host under `surface-id` so `cds-motion-surface` can morph from it.
 * Slotted children are not instrumented.
 *
 * @element cds-motion-surface-origin
 */
@customElement(`${prefix}-motion-surface-origin`)
class CDSMotionSurfaceOrigin extends LitElement {
  /**
   * Named surface from `@carbon/motion`.
   */
  @property({ reflect: true })
  surface: MotionSurfaceName = 'expand';

  /**
   * Pairing id; must match the destination `cds-motion-surface`.
   */
  @property({ attribute: 'surface-id', reflect: true })
  surfaceId = '';

  private _registeredId?: string;

  private _registeredEl?: HTMLElement;

  connectedCallback() {
    super.connectedCallback();
    ensureMotionSurfaceDocumentStyles();
    // Warn for reveal surfaces — origin has no role there
    try {
      const def = getMotionSurface(this.surface);
      if (def.kind === 'reveal') {
        // eslint-disable-next-line no-console
        console.warn(
          `cds-motion-surface-origin: the \`${this.surface}\` surface is a ` +
            `reveal and has no origin. Use cds-motion-surface directly instead.`
        );
      }
    } catch {
      // Unknown surface — getMotionSurface throws; ignore here
    }
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('surfaceId') || changed.has('surface')) {
      this.updateComplete.then(() => {
        this._register();
      });
    }
  }

  firstUpdated() {
    this._register();
  }

  disconnectedCallback() {
    this._unregister();
    super.disconnectedCallback();
  }

  private _register() {
    if (!this.surfaceId) {
      this._unregister();
      return;
    }

    if (this._registeredId === this.surfaceId && this._registeredEl === this) {
      return;
    }

    this._unregister();
    // Register the host (not the shadow root) so View Transitions can pair
    // across the flat tree without nested shadow-DOM capture issues.
    registerMotionSurfaceOrigin(this.surfaceId, this);
    this._registeredId = this.surfaceId;
    this._registeredEl = this;
  }

  private _unregister() {
    if (this._registeredId && this._registeredEl) {
      unregisterMotionSurfaceOrigin(this._registeredId, this._registeredEl);
    }
    this._registeredId = undefined;
    this._registeredEl = undefined;
  }

  /**
   * The origin element used as the View Transition / morph source (the host).
   */
  get originRoot() {
    return this;
  }

  render() {
    return html`
      <div class="${ROOT_CLASS}" part="origin">
        <slot></slot>
      </div>
    `;
  }

  static styles = styles;
}

export default CDSMotionSurfaceOrigin;
