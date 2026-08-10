/**
 * Copyright IBM Corp. 2019, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * IMPORTANT: For compatibility with tsickle and the Closure JS compiler, all
 * property decorators (but not class decorators) in this file that have
 * an @ExportDecoratedItems annotation must be defined as a regular function,
 * not an arrow function.
 */

/**
 * Deprecated parity shim
 *
 * `@carbon/web-components` no longer self-registers its own components: classes
 * declare `static is = '${prefix}-name'` and registration is opt-in via
 * `defineCustomElement` (see `../register.js`). This `carbonElement` decorator
 * is deprecated and will be removed in v3.
 *
 * Migrate to either Lit's own decorator:
 *
 * ```js
 * import { customElement } from 'lit/decorators.js';
 * ```
 *
 * or the pure-class + explicit registration model:
 *
 * ```js
 * import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';
 *
 * class MyElement extends LitElement {
 *   static is = 'my-element';
 * }
 * defineCustomElement(MyElement);
 * ```
 */

export declare type Constructor<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- https://github.com/carbon-design-system/carbon/issues/20452
  new (...args: any[]): T;
};

type Finisher =
  | (<T>(clazz: Constructor<T>) => Constructor<T>)
  | (<T>(clazz: Constructor<T>) => void);

export interface ClassDescriptor {
  kind: 'class';
  elements: ClassElement[];
  finisher?: Finisher;
}

export interface ClassElement {
  kind: 'field' | 'method';
  key: PropertyKey;
  placement: 'static' | 'prototype' | 'own';
  initializer?: () => unknown;
  extras?: ClassElement[];
  finisher?: Finisher;
  descriptor?: PropertyDescriptor;
}

/**
 * Allow for custom element classes with private constructors
 */
type CustomElementClass = Omit<typeof HTMLElement, 'new'>;

const legacyCustomElement = (tagName: string, clazz: CustomElementClass) => {
  try {
    customElements.define(tagName, clazz as CustomElementConstructor);
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`Attempting to re-define ${tagName}`);
  }
  // Cast as any because TS doesn't recognize the return type as being a
  // subtype of the decorated class when clazz is typed as
  // `Constructor<HTMLElement>` for some reason.
  // `Constructor<HTMLElement>` is helpful to make sure the decorator is
  // applied to elements however.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return clazz as any;
};

const standardCustomElement = (
  tagName: string,
  descriptor: ClassDescriptor
) => {
  const { kind, elements } = descriptor;
  return {
    kind,
    elements,
    // called once the class fully defined
    finisher(clazz: Constructor<HTMLElement>) {
      try {
        customElements.define(tagName, clazz);
      } catch {
        // eslint-disable-next-line no-console
        console.warn(`Attempting to re-define ${tagName}`);
      }
    },
  };
};

let deprecationWarned = false;

const warnDeprecatedOnce = () => {
  if (deprecationWarned || process.env.NODE_ENV !== 'development') {
    return;
  }
  deprecationWarned = true;

  globalThis.console?.warn(
    `[@carbon/web-components] the \`carbonElement\` decorator ` +
      `(es/globals/decorators/carbon-element.js) is deprecated and will be ` +
      `removed in v3. Author your custom elements with Lit's \`customElement\` ` +
      `decorator (import { customElement } from 'lit/decorators.js'), or with ` +
      `\`static is\` + \`defineCustomElement\` from ` +
      `@carbon/web-components/es/globals/register.js. Migration guide: ` +
      `https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md#the-carbonelement-decorator-is-removed`
  );
};

/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * ```js
 * @customElement('my-element')
 * class MyElement extends LitElement {
 *   render() {
 *     return html``;
 *   }
 * }
 * ```
 *
 * @deprecated Removed in v3
 *   Migration guide:
 *   https://github.com/carbon-design-system/carbon/blob/main/docs/guides/cwc-v3-migration.md#the-carbonelement-decorator-is-removed
 * @category Decorator
 * @param tagName The tag name of the custom element to define.
 */
export const carbonElement =
  (tagName: string) =>
  (classOrDescriptor: CustomElementClass | ClassDescriptor) => {
    warnDeprecatedOnce();
    return typeof classOrDescriptor === 'function'
      ? legacyCustomElement(tagName, classOrDescriptor)
      : standardCustomElement(tagName, classOrDescriptor as ClassDescriptor);
  };
