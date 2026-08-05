/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// `motion-dom` exports a `prefersReducedMotion` state object, but it is a bare
// `{ current: boolean | null }` that stays `null` until an internal
// `initPrefersReducedMotion()` happens to run, offers no way to subscribe to
// changes, and matches `(prefers-reduced-motion)` rather than the `reduce`
// value. `matchMedia` gives a live, observable result with no ordering
// dependency on `motion-dom` internals.
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Resolved lazily so importing this module stays safe where there is no DOM,
 * e.g. SSR and Node-based tooling.
 */
let mediaQuery: MediaQueryList | undefined;

/**
 * Returns the reduced-motion media query, or `undefined` outside a browser.
 */
function getMediaQuery(): MediaQueryList | undefined {
  if (!mediaQuery && typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  }

  return mediaQuery;
}

/**
 * Accessibility gate for the surface API.
 *
 * Surface entrypoints check this and bail before doing any motion work. When
 * users request reduced motion, don't run surfaces at all — components fall
 * back to their default rendering (and their baseline CSS transitions, which
 * have their own `prefers-reduced-motion` guards).
 */
export function isMotionEnabled(): boolean {
  return !getMediaQuery()?.matches;
}

/**
 * Subscribes to changes in the reduced-motion preference. Callers must be able
 * to react to a mid-session change, not just the value at construction time.
 * @param listener called with the new gate value whenever the preference changes
 * @returns function that removes the listener
 */
export function onMotionEnabledChange(
  listener: (enabled: boolean) => void
): () => void {
  const query = getMediaQuery();

  if (!query) {
    return () => {};
  }

  const handleChange = (event: MediaQueryListEvent) => listener(!event.matches);
  query.addEventListener('change', handleChange);

  return () => query.removeEventListener('change', handleChange);
}
