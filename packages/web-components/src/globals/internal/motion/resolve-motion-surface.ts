/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  getMotionSurface,
  resolveDuration,
  resolveEasing,
  type EasingMode,
  type EasingName,
  type MotionSurfaceDefinition,
  type MotionSurfaceName,
} from '@carbon/motion';
import type { TargetAndTransition, Transition } from 'motion';
import { isMotionEnabled } from './motion-enabled';

// Motion transitions in seconds; Carbon tokens are `ms` strings
const toSeconds = (duration: string) => Number.parseInt(duration, 10) / 1000;

// Motion expects cubic-bezier tuple
const toEase = (name: EasingName, mode: EasingMode) =>
  [...resolveEasing(name, mode)] as [number, number, number, number];

interface ResolvedSurfaceBase {
  /**
   * Whether surface motion should run at all, see `isMotionEnabled()`.
   */
  enabled: boolean;
  /**
   * Timing for the enter direction.
   */
  enterTransition: Transition;
  /**
   * Timing for the exit direction.
   */
  exitTransition: Transition;
}

/**
 * A surface that animates a single element between two sets of styles.
 */
export interface ResolvedRevealSurface extends ResolvedSurfaceBase {
  kind: 'reveal';
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

/**
 * A surface that morphs one element into another.
 */
export interface ResolvedSharedElementSurface extends ResolvedSurfaceBase {
  kind: 'shared-element';
  origin?: 'trigger';
  // present when the surface definition includes CSS-replicable keyframes
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
}

export type ResolvedMotionSurface =
  | ResolvedRevealSurface
  | ResolvedSharedElementSurface;

/**
 * Resolves a named Carbon motion surface to Motion-ready values.
 *
 * Definitions stay in `@carbon/motion`; this only translates tokens
 * (duration/easing names) into the numeric forms the Motion engine consumes.
 * @param name name of the surface to resolve
 */
export function resolveMotionSurface(
  name: MotionSurfaceName
): ResolvedMotionSurface {
  const enabled = isMotionEnabled();
  // `getMotionSurface()` is declared by `@carbon/motion`'s generated output,
  // which widens `kind`, `duration` and `origin` to `string`.
  // `MotionSurfaceDefinition` is the hand-authored contract for the same data.
  const surface = getMotionSurface(name) as MotionSurfaceDefinition;
  const duration = toSeconds(resolveDuration(surface.duration));
  const [enterName, enterMode] = surface.enterEasing;
  const [exitName, exitMode] = surface.exitEasing;
  const enterTransition: Transition = {
    duration,
    ease: toEase(enterName, enterMode),
  };
  const exitTransition: Transition = {
    duration,
    ease: toEase(exitName, exitMode),
  };

  if (surface.kind === 'reveal') {
    return {
      kind: 'reveal',
      enabled,
      enterTransition,
      exitTransition,
      initial: { ...surface.exit } as TargetAndTransition,
      animate: {
        ...surface.enter,
        transition: enterTransition,
      } as TargetAndTransition,
      exit: {
        ...surface.exit,
        transition: exitTransition,
      } as TargetAndTransition,
    };
  }

  const sharedElement: ResolvedSharedElementSurface = {
    kind: 'shared-element',
    enabled,
    enterTransition,
    exitTransition,
    origin: 'origin' in surface ? surface.origin : undefined,
  };

  // optional enter/exit keyframes layer opacity/scale on top of the
  // layout morph (expand); invoke has neither and stays morph-only
  if ('enter' in surface && surface.enter) {
    sharedElement.animate = {
      ...surface.enter,
      transition: enterTransition,
    } as TargetAndTransition;
  }
  if ('exit' in surface && surface.exit) {
    sharedElement.exit = {
      ...surface.exit,
      transition: exitTransition,
    } as TargetAndTransition;
  }

  return sharedElement;
}
