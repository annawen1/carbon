/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
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
   * Pass a custom name to avoid global-registry collisions, e.g.
   * `defineCustomElement(CDSButton, { name: 'cwc-button' })`
   */
  name?: string;
  // CustomElementRegistry here
}

/**
 * Register custom element class in the global registry, under `options.name`
 * or its static `is` by default. Idempotent - defining an existing tag is a
 * no-op. Called by the registering barrels so importing a class stays pure
 *
 * @param clazz The custom element class to register
 * @param options Registration options
 * @returns The same class, for convenient re-export
 */
export const defineCustomElement = <T extends CarbonCustomElementConstructor>(
  clazz: T,
  options: DefineCustomElementOptions = {}
): T => {
  const name = options.name ?? clazz.is;
  if (name && !customElements.get(name)) {
    customElements.define(name, clazz as unknown as CustomElementConstructor);
  }
  return clazz;
};

export default defineCustomElement;
