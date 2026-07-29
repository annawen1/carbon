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
 * register it. Registration is opt-in by the user, performed with
 * `defineCustomElement`. Carbon's auto-registering barrels
 * (`@carbon/web-components/es/components/<name>`) call this automatically with the
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
 * Note: a custom element constructor can only be registered once per registry,
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
 * Called by the registering barrels so importing a class stays pure.
 *
 * Re-registering the same class under the same tag is an idempotent no-op (barrels
 * rely on this). If the tag is already claimed by a different class, i.e. two
 * copies of Carbon on the page, the first definition wins and a warning is
 * emitted in development. If the tag is free but the class is already registered
 * under another name (a custom-name call after the default tag was defined),
 * this throws with an actionable message rather than an opaque platform error,
 * since a class can only be registered once per registry.
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
  if (!name) {
    return clazz;
  }

  const existing = registry.get(name);

  if (existing) {
    // The tag is already defined. Re-defining with the same class is an
    // idempodent no-op. A different class means two copies of Carbon are fighting
    // for the tag: the first definition wins and components can mix versions,
    // so let users know.
    if (existing !== clazz && process.env.NODE_ENV === 'development') {
      globalThis.console?.warn(
        `[@carbon/web-components] <${name}> is already defined by a different ` +
          `class. This usually means more than one copy of ` +
          `@carbon/web-components is on the page; the first definition wins and ` +
          `components may mix versions. Deduplicate the dependency, or register ` +
          `into a scoped registry.`
      );
    }
    return clazz;
  }

  // The tag name is free, but a class may only be registered once per registry.
  // If `clazz` is already registered under another name — e.g. the barrel
  // defined its default `cds-` tag before this custom-name call — `define()`
  // throws an opaque `NotSupportedError`. Rethrow with the cause and remedy.
  try {
    registry.define(name, clazz as unknown as CustomElementConstructor);
  } catch (error) {
    if (
      error != null &&
      (error as { name?: string }).name === 'NotSupportedError'
    ) {
      throw new Error(
        `[@carbon/web-components] Cannot register <${name}>: ${clazz.is} is ` +
          `already registered under another tag name, and a class may only be ` +
          `registered once per registry. To register it under a custom name, ` +
          `import the pure class module (not the auto-registering barrel, which ` +
          `already defines its default tag), or register into a separate ` +
          `scoped registry.`
      );
    }

    throw error;
  }

  return clazz;
};

export default defineCustomElement;
