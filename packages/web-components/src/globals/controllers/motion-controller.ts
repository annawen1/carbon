/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ReactiveController, ReactiveElement } from 'lit';
import type { MotionSurfaceName } from '@carbon/motion';

export type MotionControllerOptions = {
  surface: MotionSurfaceName;
  target: HTMLElement;
  open: boolean;
  onExitComplete?: () => void;
};

const SURFACE_ATTR = 'data-carbon-surface';
const SURFACE_STATE_ATTR = 'data-carbon-surface-state';

/**
 * ReactiveController that applies a named Carbon reveal surface via native
 * CSS. Sets `data-carbon-surface` / `data-carbon-surface-state` for the Sass
 * `surface()` mixin; listens for `transitionend` to signal exit completion.
 *
 * Hosts own presence: keep `target` mounted until `onExitComplete` (or while
 * `isExiting` is true).
 *
 * Styles are not applied by this controller — the host (or page) must
 * `@include motion.surface(<name>)` on the target selector.
 */
export default class MotionController implements ReactiveController {
  private host: ReactiveElement;

  private options?: MotionControllerOptions;

  private reducedMotionQuery?: MediaQueryList;

  private _isExiting = false;

  private _wasOpen = false;

  private _exitTarget?: HTMLElement;

  private _exitListener?: (event: TransitionEvent) => void;

  get isExiting() {
    return this._isExiting;
  }

  get enabled() {
    return !this.reducedMotionQuery?.matches;
  }

  constructor(host: ReactiveElement) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    this.reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );
    this.reducedMotionQuery.addEventListener(
      'change',
      this._handleReducedMotionChange
    );
  }

  hostDisconnected(): void {
    this._clearExitListener();
    this.reducedMotionQuery?.removeEventListener(
      'change',
      this._handleReducedMotionChange
    );
    this.reducedMotionQuery = undefined;
    this._isExiting = false;
  }

  /**
   * Drive enter/exit for the named reveal surface on `target`. Call from the
   * host whenever `open` (or surface/target) changes — typically `updated()`.
   */
  setOpen(options: MotionControllerOptions): void {
    const previousOpen = this._wasOpen;
    this.options = options;
    this._wasOpen = options.open;

    const { target, open, onExitComplete, surface } = options;

    if (!target) {
      return;
    }

    this._clearExitListener();

    target.setAttribute(SURFACE_ATTR, surface);

    if (!this.enabled) {
      this._setExiting(false);
      if (open) {
        target.setAttribute(SURFACE_STATE_ATTR, 'enter');
      } else if (previousOpen) {
        target.setAttribute(SURFACE_STATE_ATTR, 'exit');
        onExitComplete?.();
      }
      return;
    }

    if (open) {
      this._setExiting(false);
      target.setAttribute(SURFACE_STATE_ATTR, 'enter');
      return;
    }

    if (!previousOpen) {
      return;
    }

    this._setExiting(true);
    target.setAttribute(SURFACE_STATE_ATTR, 'exit');

    // No CSS transition (styles missing, or duration 0) — complete immediately
    if (this._maxTransitionMs(target) === 0) {
      this._setExiting(false);
      onExitComplete?.();
      return;
    }

    this._exitTarget = target;
    this._exitListener = (event: TransitionEvent) => {
      if (event.target !== target) {
        return;
      }
      // Reveal surfaces all animate opacity; one event is enough to unmount
      if (event.propertyName !== 'opacity') {
        return;
      }
      if (this.options !== options || !this._isExiting) {
        return;
      }
      this._clearExitListener();
      this._setExiting(false);
      onExitComplete?.();
    };
    target.addEventListener('transitionend', this._exitListener);
  }

  private _handleReducedMotionChange = () => {
    this.host.requestUpdate();
  };

  private _setExiting(value: boolean) {
    if (this._isExiting === value) {
      return;
    }
    this._isExiting = value;
    this.host.requestUpdate();
  }

  private _clearExitListener() {
    if (this._exitTarget && this._exitListener) {
      this._exitTarget.removeEventListener('transitionend', this._exitListener);
    }
    this._exitTarget = undefined;
    this._exitListener = undefined;
  }

  private _maxTransitionMs(element: HTMLElement) {
    const { transitionDuration, transitionDelay } = getComputedStyle(element);
    const toMs = (value: string) =>
      value
        .split(',')
        .map((part) => {
          const trimmed = part.trim();
          const n = Number.parseFloat(trimmed);
          if (Number.isNaN(n)) {
            return 0;
          }
          return trimmed.endsWith('ms') ? n : n * 1000;
        })
        .reduce((max, n) => Math.max(max, n), 0);

    return toMs(transitionDuration) + toMs(transitionDelay);
  }
}
