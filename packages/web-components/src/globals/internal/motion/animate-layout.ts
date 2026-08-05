/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { AnimationOptions } from 'motion';
import { isMotionEnabled } from './motion-enabled';
import {
  commitLayout,
  type LayoutAnimation,
  type LayoutScope,
  type LayoutUpdate,
} from './layout-projection';

export type { LayoutAnimation, LayoutScope, LayoutUpdate };

/**
 * `animateLayout()` — the vanilla-JS equivalent of React's `layoutId` — ships
 * only in the paid, closed-source `motion-plus` package, and the MIT class it is
 * built on is only reachable through undocumented `motion-dom` exports that
 * carry no semver protection. This recovers the same API on top of the FLIP
 * engine in `layout-projection.ts`, which depends on nothing but the documented
 * `animate()` from `motion`.
 */

const settled: LayoutAnimation = {
  finished: Promise.resolve(),
  animations: [],
  stop() {},
};

/**
 * Animates the layout change caused by `updateDom`. Elements carrying a
 * matching `data-layout-id` on either side of the update morph into each other;
 * elements carrying `data-layout` animate their own layout change.
 *
 * Resolves once the update has been applied and the animations have started,
 * with a handle whose `finished` resolves when they end.
 * @param updateDom DOM mutation to animate
 * @param options default transition for every target
 */
export function animateLayout(
  updateDom: LayoutUpdate,
  options?: AnimationOptions
): Promise<LayoutAnimation>;
/**
 * @param scope subtree to search for layout targets
 * @param updateDom DOM mutation to animate
 * @param options default transition for every target
 */
export function animateLayout(
  scope: LayoutScope,
  updateDom: LayoutUpdate,
  options?: AnimationOptions
): Promise<LayoutAnimation>;
export function animateLayout(
  scopeOrUpdateDom: LayoutScope | LayoutUpdate,
  updateDomOrOptions?: LayoutUpdate | AnimationOptions,
  options?: AnimationOptions
): Promise<LayoutAnimation> {
  return typeof scopeOrUpdateDom === 'function'
    ? animateLayoutScopes(
        [document],
        scopeOrUpdateDom,
        updateDomOrOptions as AnimationOptions | undefined
      )
    : animateLayoutScopes(
        [scopeOrUpdateDom],
        updateDomOrOptions as LayoutUpdate,
        options
      );
}

/**
 * Multi-scope form, needed for morphs that cross a shadow boundary.
 *
 * A scope is only searched for layout targets, never mutated, so a scope can
 * join an update it does not itself own. Pass every participating shadow root,
 * plus `document` for anything in the light tree.
 * @param scopes participating scopes
 * @param updateDom DOM mutation to animate
 * @param options default transition for every target
 */
export async function animateLayoutScopes(
  scopes: readonly LayoutScope[],
  updateDom: LayoutUpdate,
  options?: AnimationOptions
): Promise<LayoutAnimation> {
  if (scopes.length === 0) {
    throw new Error(
      'animateLayoutScopes() needs at least one scope to search for layout ' +
        'targets.'
    );
  }

  // Surfaces bail before doing any motion work when users ask for reduced
  // motion, so the layout change still happens, just immediately.
  if (!isMotionEnabled()) {
    await updateDom();

    return settled;
  }

  return commitLayout(scopes, updateDom, options);
}
