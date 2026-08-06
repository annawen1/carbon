# `@carbon/web-components`

> Web components for the Carbon Design System

## Getting started

To install `@carbon/web-components` in your project, you will need to run the
following command using [npm](https://www.npmjs.com/):

```bash
npm install -S @carbon/web-components
```

If you prefer [Yarn](https://yarnpkg.com/en/), use the following command
instead:

```bash
yarn add @carbon/web-components
```

### Usage

The `@carbon/web-components` package provides components for the Carbon Design
System.

To use a component, import it from the package. Importing a component registers
it under its standard `cds-*` tag name:

```javascript
import '@carbon/web-components/es/components/dropdown/index.js';
```

Once you've imported the component, you can use it in the same manner as native
HTML tags:

```html
<cds-dropdown trigger-content="Select an item">
  <cds-dropdown-item value="all">Option 1</cds-dropdown-item>
  <cds-dropdown-item value="cloudFoundry">Option 2</cds-dropdown-item>
  <cds-dropdown-item value="staging">Option 3</cds-dropdown-item>
  <cds-dropdown-item value="dea">Option 4</cds-dropdown-item>
  <cds-dropdown-item value="router">Option 5</cds-dropdown-item>
</cds-dropdown>
```

#### CDN

CDN artifacts are also available and can be added directly to the page (starting
at version `v1.16.0`):

```html
<!doctype html>
<html>
  <head>
    <script
      type="module"
      src="https://1.www.s81c.com/common/carbon/web-components/version/v2.24.0/dropdown.min.js"></script>
    <style type="text/css">
      <!-- hide custom element until it has been defined //-->
      cds-dropdown:not(:defined),
      cds-dropdown-item:not(:defined) {
        visibility: hidden;
      }
    </style>
  </head>
  <body>
    <div id="app">
      <cds-dropdown trigger-content="Select an item">
        <cds-dropdown-item value="all">Option 1</cds-dropdown-item>
        <cds-dropdown-item value="cloudFoundry">Option 2</cds-dropdown-item>
        <cds-dropdown-item value="staging">Option 3</cds-dropdown-item>
        <cds-dropdown-item value="dea">Option 4</cds-dropdown-item>
        <cds-dropdown-item value="router">Option 5</cds-dropdown-item>
      </cds-dropdown>
    </div>
  </body>
</html>
```

### Other ways to register components

#### Import class without registering anything

```js
import CDSButton from '@carbon/web-components/es/components/button/button.js';
import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';

// now <cds-button /> is registered
defineCustomElement(CDSButton);
```

#### Register under a custom tag name

If `cds-button` is already taken on the page — for example an app using both
`carbon-components-angular` and this package — register Carbon's element under a
different name and use that tag instead:

```javascript
import CDSButton from '@carbon/web-components/es/components/button/button.js';
import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';

// register as <cwc-button />
defineCustomElement(CDSButton, { name: 'cwc-button' });
```

Note: if the base class is already registered under its default tag — because
the barrel is already imported, either explicitly or transitively,
`defineCustomElement` will still register an identical subclass under your
custom tag so it still works, instead of throwing. Those elements stay
`instanceof CDSButton`.

#### Run multiple versions on one page

To keep the `cds-button` tag but isolate a version to part of the page, register
into a scoped `CustomElementRegistry` attached to a shadow root:

```javascript
// polyfill needed until browsers ship scoped registries (Firefox 150+ has it)
import '@webcomponents/scoped-custom-element-registry';
import CDSButton from '@carbon/web-components/es/components/button/button.js';
import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';

const registry = new CustomElementRegistry();
defineCustomElement(CDSButton, { name: 'cds-button', registry });

const shadow = host.attachShadow({ mode: 'open', registry });
// resolves to your version
shadow.innerHTML = '<cds-button></cds-button>';
```

Note: `{ name }` and `{ registry }` apply only to the elements you register
yourself. A composite (e.g. a modal that renders `<cds-button>` in its own
shadow DOM) resolves those internal tags against the global registry — so to
re-prefix a whole component tree, use the prefix build below.

#### Defining your own custom elements

Earlier versions exported a self-registering `carbonElement` decorator
(`es/globals/decorators/carbon-element.js`) that consumers used to define their
own elements. It is **deprecated and will be removed in `v3.0.0`** — use Lit's
own `customElement` decorator, or the `static is` + `defineCustomElement`
pattern above. See the
[v3 migration guide](../../docs/guides/cwc-v3-migration.md#the-carbonelement-decorator-is-removed).

#### Re-prefix the whole package (any prefix)

To put every Carbon element — including the ones a composite renders internally
— under your own prefix (e.g. to coexist with another Carbon version on a page
you don't control), generate a prefixed build:

```bash
npx -p @carbon/web-components create-prefixed-build --prefix foo --out ./vendor/carbon-foo
```

Then import from the generated directory; everything is `foo-*`:

```javascript
import './vendor/carbon-foo/components/modal/index.js';
// <foo-modal>, internally <foo-button>
```

This is a build-time rename — no polyfill, no runtime, no load-order constraints
— so it covers composites. Pick a unique prefix to avoid clashing with other
Carbon copies. Shared `--cds` design tokens are preserved so theming stays
consistent.

Write the output into your project (commit it, or regenerate it as part of your
build) — not into `node_modules`, which is ephemeral and read-only under pnpm /
Yarn PnP.

To import it with a package-style specifier instead of a relative path, add a
bundler alias so `import 'carbon-foo/components/button/index.js'` resolves to
the generated directory:

```js
// vite.config.js
import { resolve } from 'node:path';

export default {
  resolve: {
    alias: {
      'carbon-foo': resolve(__dirname, 'vendor/carbon-foo'),
    },
  },
};
```

```js
// webpack.config.js
const path = require('node:path');

module.exports = {
  resolve: {
    alias: {
      'carbon-foo': path.resolve(__dirname, 'vendor/carbon-foo'),
    },
  },
};
```

<!-- proseWrap mangles multi-line GitHub alerts; see https://github.com/prettier/prettier/issues/15479 -->
<!-- prettier-ignore -->
> [!IMPORTANT]
> **Deprecated:** the `es-custom` build (`cds-custom-*` elements) is deprecated
> and will be removed in `v3.0.0` in favor of this approach.

#### What you can and cannot do

| Goal                                                  | Supported                                           |
| ----------------------------------------------------- | --------------------------------------------------- |
| Use components under the default `cds-*` tags         | ✅ import the component (`.../index.js`)            |
| Import a class without registering it                 | ✅ import the class file (`.../button.js`)          |
| Register under a custom tag to avoid a collision      | ✅ `defineCustomElement(Class, { name })`           |
| Run multiple versions on one page (inside shadow DOM) | ✅ `defineCustomElement(Class, { name, registry })` |
| Re-prefix a whole tree, including composite internals | ✅ `create-prefixed-build` (prefix build above)     |

**CDN users:** The pre-built CDN bundles (`*.min.js`) register their elements
under the default `cds-*` tags on load, and do not expose the class or
`defineCustomElement`. The only way to use custom tags from the CDN is to import
the ES modules from an ESM CDN instead:

```js
import CDSButton from 'https://esm.sh/@carbon/web-components/es/components/button/button.js';
import { defineCustomElement } from 'https://esm.sh/@carbon/web-components/es/globals/register.js';

defineCustomElement(CDSButton, { name: 'cwc-button' });
```

### Other usage guides

- [Using components in a form](./docs/form.md)
- [Using custom styles in components](./docs/styling.md)

## 📖 API Documentation

If you're looking for `@carbon/web-components` API documentation, check out:

- [Storybook](https://web-components.carbondesignsystem.com/)

## 🙌 Contributing

We're always looking for contributors to help us fix bugs, build new features,
or help us improve the project documentation. If you're interested, definitely
check out our [Contributing Guide](/.github/CONTRIBUTING.md)! 👀

## 📝 License

Licensed under the [Apache 2.0 License](/LICENSE).

## <picture><source height="20" width="20" media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ibm-telemetry/telemetry-js/main/docs/images/ibm-telemetry-dark.svg"><source height="20" width="20" media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/ibm-telemetry/telemetry-js/main/docs/images/ibm-telemetry-light.svg"><img height="20" width="20" alt="IBM Telemetry" src="https://raw.githubusercontent.com/ibm-telemetry/telemetry-js/main/docs/images/ibm-telemetry-light.svg"></picture> IBM Telemetry

This package uses IBM Telemetry to collect de-identified and anonymized metrics
data. By installing this package as a dependency you are agreeing to telemetry
collection. To opt out, see
[Opting out of IBM Telemetry data collection](https://github.com/ibm-telemetry/telemetry-js/tree/main#opting-out-of-ibm-telemetry-data-collection).
For more information on the data being collected, please see the
[IBM Telemetry documentation](https://github.com/ibm-telemetry/telemetry-js/tree/main#ibm-telemetry-collection-basics).
