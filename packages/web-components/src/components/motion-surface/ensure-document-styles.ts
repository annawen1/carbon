/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import styles from './motion-surface-document.scss?lit';

const STYLE_ATTR = 'data-carbon-motion-surface-vt';

let installed = false;

/**
 * Inject shared-element `surface()` + root cross-fade rules into
 * `document.head` once. Required because `::view-transition-*` pseudos are
 * not styleable from shadow roots.
 */
export function ensureMotionSurfaceDocumentStyles(): void {
  if (installed || typeof document === 'undefined') {
    return;
  }

  if (document.head.querySelector(`style[${STYLE_ATTR}]`)) {
    installed = true;
    return;
  }

  const el = document.createElement('style');
  el.setAttribute(STYLE_ATTR, '');
  el.textContent = styles.cssText;
  document.head.appendChild(el);
  installed = true;
}
