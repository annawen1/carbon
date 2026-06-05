/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Public registration API for `@carbon/web-components`
 *
 * Carbon's component classes are side-effect free: importing a class does not
 * register it. Registration is the consumer's choice, performed with
 * `defineCustomElement`. The auto-registering barrels
 * (`@carbon/web-components/es/components/<name>`) call this for you under the
 * default `cds-` tag names, so common use cases need nothing extra.
 *
 * To register a component under a custom tag name - i.e. to avoid a
 * collision with another library that already defines `cds-button` - import the
 * pure class and register it yourself:
 *
 * ```js
 * import CDSButton from '@carbon/web-components/es/components/button/button.js';
 * import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';
 *
 * defineCustomElement(CDSButton, { name: 'cwc-button' }); // <cwc-button>
 * ```
 *
 * Note: a custom element constructor may only be registered once per registry,
 * so use the custom-name path with the pure class import rather than the
 * auto-registering barrel (which already defines the default name).
 */

/**
 * Custom element constructor that carries the registered tag name
 * as a static `is` property
 *
 * Carbon component classes declare `static is = '${prefix}-name'` instead of
 * baking the tag name into a self-registering decorator. This keeps the class
 * modules pure (no side-effects) and importing a class no longer registers it
 */
export interface CarbonCustomElementConstructor
  extends CustomElementConstructor {
  /**
   * The tag name this element should be registered under
   */
  is: string;
}

/**
 * Options for {@link defineCustomElement}
 */
export interface DefineCustomElementOptions {
  /**
   * The tag name to register under. Defaults to the class's static `is`
   *
   * Pass custom name to avoid global-registry collisions, e.g.
   * `defineCustomElement(CDSButton, { name: 'cwc-button' })`
   */
  name?: string;
  /**
   * The registry to define the element in. Defaults to the global
   * `customElements`.
   *
   * Pass a scoped `CustomElementRegistry` (created with
   * `new CustomElementRegistry()` and attached to a shadow root via
   * `attachShadow({ customElementRegistry })`) to isolate registration from
   * global namespace — e.g. to run multiple versions, or a different
   * prefix, of Carbon elements on the same page without collisions. Requires
   * native support (Firefox 150+) or the
   * `@webcomponents/scoped-custom-element-registry` polyfill.
   */
  registry?: CustomElementRegistry;
}

/**
 * Register a custom element class, under `options.name` (or its static `is` by
 * default) in `options.registry` (or the global `customElements` by default).
 * Idempotent - defining an existing tag in the registry is a no-op. Called by
 * the registering barrels so importing a class stays pure.
 *
 * @param clazz The custom element class to register
 * @param options Registration options
 * @returns The same class, for convenient re-export
 */
export const defineCustomElement = <T extends CarbonCustomElementConstructor>(
  clazz: T,
  options: DefineCustomElementOptions = {}
): T => {
  const registry = options.registry ?? customElements;
  const name = options.name ?? clazz.is;
  if (name && !registry.get(name)) {
    registry.define(name, clazz as unknown as CustomElementConstructor);
  }
  return clazz;
};

export default defineCustomElement;
