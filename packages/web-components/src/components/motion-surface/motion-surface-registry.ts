/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Maps `surfaceId` → origin root element for shared-element pairing.
 * `cds-motion-surface-origin` registers; `cds-motion-surface` resolves.
 */
const origins = new Map<string, HTMLElement>();

export function registerMotionSurfaceOrigin(
  surfaceId: string,
  element: HTMLElement
) {
  if (!surfaceId) {
    return;
  }
  origins.set(surfaceId, element);
}

export function unregisterMotionSurfaceOrigin(
  surfaceId: string,
  element: HTMLElement
) {
  if (!surfaceId) {
    return;
  }
  if (origins.get(surfaceId) === element) {
    origins.delete(surfaceId);
  }
}

export function getMotionSurfaceOrigin(
  surfaceId: string
): HTMLElement | undefined {
  if (!surfaceId) {
    return undefined;
  }
  return origins.get(surfaceId);
}
