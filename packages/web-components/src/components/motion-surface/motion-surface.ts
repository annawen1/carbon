/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { prefix } from '../../globals/settings';
import { carbonElement as customElement } from '../../globals/decorators/carbon-element';
import { getMotionSurface, type MotionSurfaceName } from '@carbon/motion';
import MotionController from '../../globals/controllers/motion-controller';
import { ensureMotionSurfaceDocumentStyles } from './ensure-document-styles';
import { getMotionSurfaceOrigin } from './motion-surface-registry';
import styles from './motion-surface.scss?lit';

const ROOT_CLASS = `${prefix}--motion-surface__root`;

/**
 * Animated destination for a named Carbon motion surface. Owns presence and
 * drives `MotionController`. Slotted children ride along inside the animated
 * root — they are not instrumented.
 *
 * @element cds-motion-surface
 * @fires cds-motion-surface-exit-complete - The exit animation finished and content may unmount.
 */
@customElement(`${prefix}-motion-surface`)
class CDSMotionSurface extends LitElement {
  /**
   * Named surface from `@carbon/motion`.
   */
  @property({ reflect: true })
  surface: MotionSurfaceName = 'contextual';

  /**
   * Pairing id for shared-element morphs; must match a
   * `cds-motion-surface-origin`.
   */
  @property({ attribute: 'surface-id', reflect: true })
  surfaceId?: string;

  /**
   * Whether the surface content should be shown. Remains mounted through exit
   * until `cds-motion-surface-exit-complete`.
   */
  @property({ type: Boolean, reflect: true })
  open = false;

  @state()
  private _present = false;

  @query(`.${ROOT_CLASS}`)
  private _surfaceRoot!: HTMLDivElement;

  private _motion = new MotionController(this);

  /**
   * The name of the custom event fired when exit animation completes.
   */
  static get eventExitComplete() {
    return `${prefix}-motion-surface-exit-complete`;
  }

  get isExiting() {
    return this._motion.isExiting;
  }

  private get _isSharedElement() {
    try {
      return getMotionSurface(this.surface).kind === 'shared-element';
    } catch {
      return false;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._isSharedElement) {
      ensureMotionSurfaceDocumentStyles();
    }
  }

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('surface') && this._isSharedElement) {
      ensureMotionSurfaceDocumentStyles();
    }
    // Reveal: mount immediately so CSS enter can run.
    // Shared-element: mount inside startViewTransition via mountTarget.
    if (changed.has('open') && this.open && !this._isSharedElement) {
      this._present = true;
    }
  }

  updated(changed: Map<string, unknown>) {
    // Shared-element mount/unmount flips `_present` from the controller —
    // don't re-enter setOpen for that alone.
    if (
      this._isSharedElement &&
      changed.has('_present') &&
      !changed.has('open') &&
      !changed.has('surface') &&
      !changed.has('surfaceId')
    ) {
      return;
    }

    if (
      changed.has('open') ||
      changed.has('surface') ||
      changed.has('surfaceId') ||
      changed.has('_present')
    ) {
      this.updateComplete.then(() => {
        this._syncMotion();
      });
    }
  }

  private async _mountTarget() {
    if (!this._present) {
      this._present = true;
      await this.updateComplete;
    }
    // Use the host as the VT element so the name lives on the flat tree,
    // not inside this component's shadow root.
    return this;
  }

  private async _unmountTarget() {
    if (this._present) {
      this._present = false;
      await this.updateComplete;
    }
  }

  private _syncMotion() {
    const origin = this.surfaceId
      ? getMotionSurfaceOrigin(this.surfaceId)
      : undefined;

    if (this._isSharedElement) {
      this._motion.setOpen({
        surface: this.surface,
        surfaceId: this.surfaceId,
        // Host may already be present on re-sync; mountTarget handles first open
        target: this._present ? this : undefined,
        origin,
        open: this.open,
        mountTarget: () => this._mountTarget(),
        unmountTarget: () => this._unmountTarget(),
        onExitComplete: () => {
          this.dispatchEvent(
            new CustomEvent(
              (this.constructor as typeof CDSMotionSurface).eventExitComplete,
              {
                bubbles: true,
                composed: true,
              }
            )
          );
        },
      });
      return;
    }

    const target = this._surfaceRoot;
    if (!target) {
      return;
    }

    this._motion.setOpen({
      surface: this.surface,
      surfaceId: this.surfaceId,
      target,
      origin,
      open: this.open,
      onExitComplete: () => {
        this._present = false;
        this.dispatchEvent(
          new CustomEvent(
            (this.constructor as typeof CDSMotionSurface).eventExitComplete,
            {
              bubbles: true,
              composed: true,
            }
          )
        );
      },
    });
  }

  render() {
    if (!this._present) {
      return html``;
    }

    return html`
      <div class="${ROOT_CLASS}" part="surface">
        <slot></slot>
      </div>
    `;
  }

  static styles = styles;
}

export default CDSMotionSurface;
