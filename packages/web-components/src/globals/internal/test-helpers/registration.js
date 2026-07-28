/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Test helper that walks an element's shadow tree (descending) and returns
 * tag names of any Carbon custom elements that are not upgraded, i.e. rendered
 * into the shadow DOM but never registered with `customElements.define`.
 *
 * This guards pure-exports registration, as importing a component's barrel
 * (es/components/some-component/index.js) must register every Carbon element
 * that component renders in its own shadow DOM. A non-empty result means a
 * child was rendered inert, which would be a class regression (see `icon-indicator`
 * and `shape-indicator` components, they would be prone to this regression,
 * and currently consumers of this test).
 *
 * @param {Element} host the mounted component to inspect
 * @returns {string[]} sorted, de-duped tag names of non-upgraded `cds-*`
 *   elements found in the host's shadow tree
 */

export function findUnregisteredCarbonElements(host) {
  const found = new Set();

  const walk = (root) => {
    if (!root) {
      return;
    }

    // `:not(:defined)` is not registered
    for (const el of root.querySelectorAll(':not(:defined)')) {
      if (el.localName.startsWith('cds-')) {
        found.add(el.localName);
      }
    }

    // traverse shadow root of children
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        walk(el.shadowRoot);
      }
    }
  };

  walk(host.shadowRoot ?? host);
  return [...found].sort();
}
