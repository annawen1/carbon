/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ReactiveController, ReactiveElement } from 'lit';
import { getMotionSurface, type MotionSurfaceName } from '@carbon/motion';

export type MotionControllerOptions = {
  surface: MotionSurfaceName;
  target?: HTMLElement;
  open: boolean;
  onExitComplete?: () => void;
  /** Required when `surface` is a shared-element morph. */
  surfaceId?: string;
  /** Persistent origin element; required for shared-element surfaces. */
  origin?: HTMLElement;
  /**
   * Mount the shared-element target inside `startViewTransition` so the old
   * snapshot still shows only the origin. Returns the animated root.
   */
  mountTarget?: () => HTMLElement | Promise<HTMLElement>;
  /**
   * Unmount the shared-element target inside the exit `startViewTransition`
   * so the new snapshot shows only the origin.
   */
  unmountTarget?: () => void | Promise<void>;
};

const SURFACE_ATTR = 'data-carbon-surface';
const SURFACE_STATE_ATTR = 'data-carbon-surface-state';
const SURFACE_ID_ATTR = 'data-carbon-surface-id';
/** On the origin while the destination owns `view-transition-name`. */
const SURFACE_ACTIVE_ATTR = 'data-carbon-surface-active';

/**
 * ReactiveController that drives named Carbon motion surfaces.
 *
 * Reveal surfaces: sets `data-carbon-surface` / `data-carbon-surface-state`
 * for the Sass `surface()` mixin; listens for `transitionend` on exit.
 *
 * Shared-element surfaces: morphs between `origin` and `target` via the
 * View Transitions API. The controller only orchestrates
 * `document.startViewTransition` and pairing attrs (`data-carbon-surface-id`,
 * `data-carbon-surface-active`). Duration / easing / `view-transition-name`
 * come from `@include motion.surface(<name>)` in document CSS.
 *
 * Hosts own presence: keep `target` mounted until `onExitComplete` (or while
 * `isExiting` is true).
 *
 * Styles are not applied by this controller — the host (or page) must
 * `@include motion.surface(<name>)` on the participating selectors.
 */
export default class MotionController implements ReactiveController {
  /** Lit host that owns this controller and re-renders on exit state changes. */
  private host: ReactiveElement;

  /** Latest `setOpen` options; used to ignore stale exit callbacks. */
  private options?: MotionControllerOptions;

  /** Tracks `prefers-reduced-motion: reduce` for the `enabled` getter. */
  private reducedMotionQuery?: MediaQueryList;

  /** True while a reveal/shared-element exit animation is in progress. */
  private _isExiting = false;

  /** Previous `open` value so we can detect open→closed (and ignore no-ops). */
  private _wasOpen = false;

  /** Reveal target currently listening for `transitionend` during exit. */
  private _exitTarget?: HTMLElement;

  /** Bound `transitionend` handler for the active reveal exit. */
  private _exitListener?: (event: TransitionEvent) => void;

  /** Fallback timer if `transitionend` never fires during reveal exit. */
  private _exitTimeout?: number;

  /**
   * Bumped on each `setOpen` / disconnect so async shared-element work can
   * bail if a newer call superseded it.
   */
  private _generation = 0;

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
    this._generation += 1;
    this._clearExitListener();
    this._clearSharedElementPairing();
    this.reducedMotionQuery?.removeEventListener(
      'change',
      this._handleReducedMotionChange
    );
    this.reducedMotionQuery = undefined;
    this._isExiting = false;
  }

  /**
   * Drive enter/exit for the named surface on `target`. Call from the host
   * whenever `open` (or surface/target/origin) changes — typically `updated()`.
   */
  setOpen(options: MotionControllerOptions): void {
    const previousOpen = this._wasOpen;
    this.options = options;
    this._wasOpen = options.open;
    this._generation += 1;
    const generation = this._generation;

    const { target, surface } = options;

    this._clearExitListener();

    const def = getMotionSurface(surface);

    if (def.kind === 'shared-element') {
      if (!options.surfaceId || !options.origin) {
        throw new Error(
          `Motion surface \`${surface}\` is a shared-element morph and ` +
            `requires \`surfaceId\` and \`origin\`.`
        );
      }
      if (options.open && !target && !options.mountTarget) {
        throw new Error(
          `Motion surface \`${surface}\` requires \`target\` or \`mountTarget\`.`
        );
      }
      if (!options.open && previousOpen && !target && !options.unmountTarget) {
        throw new Error(
          `Motion surface \`${surface}\` requires \`target\` or \`unmountTarget\` on exit.`
        );
      }
      void this._setOpenSharedElement(options, previousOpen, generation);
      return;
    }

    if (!target) {
      return;
    }

    this._setOpenReveal(options, previousOpen);
  }

  private _setOpenReveal(
    options: MotionControllerOptions,
    previousOpen: boolean
  ): void {
    const { target, open, onExitComplete, surface } = options;
    if (!target) {
      return;
    }

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

    const completeExit = () => {
      if (this.options !== options || !this._isExiting) {
        return;
      }
      this._clearExitListener();
      this._setExiting(false);
      onExitComplete?.();
    };

    // No CSS transition (styles missing, or duration 0) — complete immediately
    const durationMs = this._maxTransitionMs(target);
    if (durationMs === 0) {
      completeExit();
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
      completeExit();
    };
    target.addEventListener('transitionend', this._exitListener);
    // Fallback if transitionend is skipped (display changes, browser quirks)
    this._exitTimeout = window.setTimeout(completeExit, durationMs + 50);
  }

  private async _setOpenSharedElement(
    options: MotionControllerOptions,
    previousOpen: boolean,
    generation: number
  ): Promise<void> {
    const {
      origin,
      surfaceId,
      surface,
      open,
      onExitComplete,
      mountTarget,
      unmountTarget,
    } = options;
    // Validated by setOpen before calling
    const id = surfaceId as string;
    const originEl = origin as HTMLElement;

    const supportsVt =
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function';

    const resolveTarget = async () => {
      if (mountTarget) {
        const mounted = await mountTarget();
        options.target = mounted;
        this.options = { ...options, target: mounted };
        return mounted;
      }
      return options.target as HTMLElement;
    };

    if (!this.enabled || !supportsVt) {
      this._setExiting(false);
      if (open) {
        if (previousOpen) {
          return;
        }
        const target = await resolveTarget();
        // Hide origin while destination is shown (same active contract as VT)
        this._pairElement(originEl, surface, id);
        this._releaseName(originEl);
        this._pairElement(target, surface, id);
      } else if (previousOpen) {
        if (unmountTarget) {
          await unmountTarget();
        } else if (options.target) {
          this._clearPairing(options.target);
        }
        this._clearPairing(originEl);
        onExitComplete?.();
      }
      return;
    }

    if (open) {
      // Ignore re-entrant sync while already open (e.g. mount flipping present)
      if (previousOpen) {
        return;
      }
      this._setExiting(false);
      // Old snapshot: only the origin is named — target must mount inside VT
      this._pairElement(originEl, surface, id);
      this._claimName(originEl);
      // Force layout so the origin box is current before capture
      originEl.getBoundingClientRect();
      const transition = document.startViewTransition(async () => {
        // Destination owns the name; origin releases via active
        this._releaseName(originEl);
        const target = await resolveTarget();
        this._pairElement(target, surface, id);
        this._claimName(target);
        // Force layout of the newly mounted target before the new snapshot
        target.getBoundingClientRect();
      });
      try {
        await transition.finished;
      } catch {
        // Transition was skipped/aborted
      }
      return;
    }

    if (!previousOpen) {
      return;
    }

    this._setExiting(true);
    const target = options.target;
    if (target) {
      this._pairElement(target, surface, id);
      this._claimName(target);
      this._pairElement(originEl, surface, id);
      this._releaseName(originEl);
      target.getBoundingClientRect();
    }
    const transition = document.startViewTransition(async () => {
      if (target) {
        this._clearPairing(target);
      }
      if (unmountTarget) {
        await unmountTarget();
      }
      this._pairElement(originEl, surface, id);
      this._claimName(originEl);
      originEl.getBoundingClientRect();
    });
    try {
      await transition.finished;
    } catch {
      // Transition was skipped/aborted
    }

    if (generation !== this._generation || !this._isExiting) {
      return;
    }
    this._setExiting(false);
    this._clearPairing(originEl);
    onExitComplete?.();
  }

  /** Stamp surface + pairing id for the Sass `surface()` mixin. */
  private _pairElement(
    element: HTMLElement,
    surface: MotionSurfaceName,
    id: string
  ) {
    element.setAttribute(SURFACE_ATTR, surface);
    element.setAttribute(SURFACE_ID_ATTR, id);
  }

  /** Element owns `view-transition-name` (no active flag). */
  private _claimName(element: HTMLElement) {
    element.removeAttribute(SURFACE_ACTIVE_ATTR);
  }

  /** Release `view-transition-name` while a paired element owns it. */
  private _releaseName(element: HTMLElement) {
    element.setAttribute(SURFACE_ACTIVE_ATTR, '');
  }

  private _clearPairing(element: HTMLElement) {
    element.removeAttribute(SURFACE_ATTR);
    element.removeAttribute(SURFACE_ID_ATTR);
    element.removeAttribute(SURFACE_ACTIVE_ATTR);
  }

  private _clearSharedElementPairing() {
    const { target, origin } = this.options ?? {};
    if (target) {
      this._clearPairing(target);
    }
    if (origin) {
      this._clearPairing(origin);
    }
  }

  private _handleReducedMotionChange = () => {
    this.host.requestUpdate();
  };

  private _setExiting(value: boolean) {
    if (this._isExiting === value) {
      return;
    }
    this._isExiting = value;
    // Defer so setOpen can finish attaching listeners before the host re-renders
    queueMicrotask(() => {
      this.host.requestUpdate();
    });
  }

  private _clearExitListener() {
    if (this._exitTimeout !== undefined) {
      window.clearTimeout(this._exitTimeout);
      this._exitTimeout = undefined;
    }
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
