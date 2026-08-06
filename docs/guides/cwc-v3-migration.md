# Carbon Web Components: v3 migration guide

This guide covers breaking changes when upgrading `@carbon/web-components` from
v2 to v3.

The rationale for the new model is captured in
[ADR 0007: Provide pure class exports and opt-in registration](../decisions/0007-provide-pure-class-exports-for-web-components.md).

## What changed

In v2, every component registered itself as a side effect of being imported:
each class carried a self-registering decorator
(`carbonElement`/`customElement`) that called `customElements.define()` at
module-evaluation time.

In v3, component classes are pure — importing a class doesn't register anything.
A class declares its tag with `static is = '${prefix}-name'`, and registration
is opt-in through a single helper, `defineCustomElement`. Carbon's component
barrels (`es/components/<name>/index.js`) still call `defineCustomElement` for
you, so importing a barrel registers the default `cds-*` tag exactly as before —
so so for apps that import this way, no changes are needed.

The break can happen in two places, covered below.

## The `carbonElement` decorator is removed

In v2 the package exported a self-registering class decorator that consumers
imported to define their own custom elements:

```js
import { carbonElement as customElement } from '@carbon/web-components/es/globals/decorators/carbon-element.js';
```

This decorator is **deprecated in v2 and removed in v3**. It emits a one-time
deprecation warning in development. Migrate with one of the two options below.

### Option A — use Lit's `customElement` (smallest change)

If your elements extend `LitElement`, Lit ships an equivalent self-registering
decorator. Only the import changes; every `@customElement('...')` usage site
stays the same.

```diff
- import { carbonElement as customElement } from '@carbon/web-components/es/globals/decorators/carbon-element.js';
+ import { customElement } from 'lit/decorators.js';

  @customElement('my-widget')
  class MyWidget extends LitElement {
    /* ... */
  }
```

**Behavior difference to know:** Carbon's decorator swallowed a duplicate
`define()` and logged `Attempting to re-define <tag>`. Lit's `customElement`
throws a `NotSupportedError` if the tag (or the class) is already registered. If
you relied on the silent re-define — e.g. the same module can load twice in your
app — guard it:

```js
if (!customElements.get('my-widget')) {
  customElements.define('my-widget', MyWidget);
}
```

or use Option B, whose helper is idempotent.

### Option B — pure class + `defineCustomElement` (matches Carbon's model)

Drop the decorator, declare the tag as a static field, and register explicitly.
This mirrors how Carbon's own components are authored in v3.

```diff
- import { carbonElement as customElement } from '@carbon/web-components/es/globals/decorators/carbon-element.js';
+ import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';

- @customElement('my-widget')
  class MyWidget extends LitElement {
+   static is = 'my-widget';
    /* ... */
  }
+ defineCustomElement(MyWidget);
```

`defineCustomElement(clazz, { name?, registry? })` defaults the tag to
`clazz.is` and the registry to the global `customElements`. It is idempotent
(re-registering the same class under the same tag is a no-op), returns the
registered class for convenient re-export, and accepts a custom `name` or a
scoped `registry`. See the
[registration options in the README](../../packages/web-components/README.md#other-ways-to-register-components).

## Importing a class no longer registers it

Because class modules are now pure, importing a class file **for its
registration side effect** no longer registers the element:

```diff
- // v2: importing the class registered <cds-button>
- import '@carbon/web-components/es/components/button/button.js';
+ // v3: import the barrel to register
+ import '@carbon/web-components/es/components/button/index.js';
```

Relatedly, **incidental transitive registration is gone**. In v2, importing
component X's barrel also registered unrelated components that X happened to
import; in v3 a barrel registers only the elements X actually renders. If you
render `<cds-something>` but never import it, it will render inert. The rule is
**import what you render**, and the dev diagnostic is the CSS `:not(:defined)`
selector — any Carbon element matching it was never registered.
