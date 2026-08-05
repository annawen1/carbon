/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export {
  animateLayout,
  animateLayoutScopes,
  type LayoutAnimation,
  type LayoutScope,
  type LayoutUpdate,
} from './animate-layout';
export { isMotionEnabled, onMotionEnabledChange } from './motion-enabled';
export {
  resolveMotionSurface,
  type ResolvedMotionSurface,
  type ResolvedRevealSurface,
  type ResolvedSharedElementSurface,
} from './resolve-motion-surface';
