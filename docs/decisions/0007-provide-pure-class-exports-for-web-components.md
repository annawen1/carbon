# 7. Provide pure class exports and opt-in registration for `@carbon/web-components`

Date: 2026-07-29

## Status

Accepted

This decision targets `@carbon/web-components` v3. It is tracked in #22416,
discussed in #17718, and a build-time prototype was explored in #22145. The
`@carbon/ai-chat-components` package mirrors this registration model in its own
epic (carbon-ai-chat#1146).

## Context

Through v11 (the `2.x` line of `@carbon/web-components`), every component
registers itself as a side effect of being imported. Each class carries a
`@customElement()`/`carbonElement` decorator that calls
`customElements.define()` at module-evaluation time, and the decorator's
collision handling is a silent `try { define() } catch {}`. Importing a class
file therefore mutates the global custom element registry, and there is no way
to import a class without registering it.

This self-registering model causes several problems:

- **Multiple versions cannot coexist on a page.** When a second copy of the
  package loads, its `define()` calls are swallowed, so its element classes are
  discarded without an error or a warning and its markup is driven by the other
  copy's implementation. Micro-frontend consumers hit this directly.
- **Components cannot be tree-shaken.** Because importing a class registers it,
  a bundler cannot drop a component that is imported but unused, and class
  imports are not safe to defer or run under SSR.
- **There is no supported way to register under a custom tag name**, for example
  to avoid colliding with another library that already defines `cds-*` elements.
- **The only isolation tool we ship is the `es-custom` build**: a full second
  copy of the package with every `cds-*` tag rewritten to `cds-custom-*`. It
  supports exactly one alternate prefix, roughly doubles publish size, and its
  generator carries a `// TODO: remove once ... supports scoped elements`
  comment. It exists to dodge collisions, not to solve versioning.

Separating class definition from registration turns registration into an API
that consumers can reason about instead of an invisible import side effect, and
makes multi-version coexistence a supported, documented path.

## Decision

We will make the component classes side-effect free and move registration to an
explicit, opt-in helper.

1. **Pure classes.** A component declares its tag as
   `static is = '${prefix}-name'` instead of a self-registering decorator.
   Importing a class module registers nothing and has no side effects.
2. **One registration helper.**
   `defineCustomElement(clazz, { name?, registry? })`, exported from
   `@carbon/web-components/es/globals/register.js`, is the single registration
   primitive. The tag defaults to `clazz.is` and the registry defaults to the
   global `customElements`. It is idempotent and returns the registered class so
   barrels can register and re-export inline.
3. **Barrels preserve today's behavior.** Each component's `index.js` re-exports
   its classes _and_ calls `defineCustomElement` for them. Importing
   `@carbon/web-components/es/components/<name>/index.js` still registers the
   component under its default `cds-*` tag exactly as in v11, so the common case
   requires no change.
4. **Scoped `sideEffects`.** Package metadata marks the barrels as having side
   effects while treating the class modules as pure, so bundlers keep barrel
   registration but can tree-shake unused class modules.
5. **`es-custom` is removed in v3**, replaced by custom names, scoped
   registries, and a build-time prefixed build.

We settled the following registration semantics:

- Re-registering the same class under the same tag is an idempotent no-op; the
  auto-registering barrels rely on this.
- When two copies of Carbon claim the same tag with different classes, the first
  definition wins and a development-only warning is emitted. This is inherent —
  two classes cannot share one tag in one registry — and is deliberately not
  treated as a fatal error, because it commonly arises from transitive
  dependency graphs, dual ESM/CJS instances, or micro-frontends rather than
  misuse. Genuine coexistence is served by scoped registries or the prefixed
  build.
- When a class is registered under a custom name but is already registered under
  its default tag (a class may be registered only once per registry),
  `defineCustomElement` registers an identical subclass under the custom name
  rather than throwing. Elements of the custom tag remain `instanceof` the base
  class.

We considered and rejected these alternatives:

- **Strip the decorator at build time into a parallel `scoped-elements` build**
  (the #22145 prototype). Rejected in favor of source-level pure classes, which
  are simpler, avoid maintaining a separate build output, and directly deliver
  the pure class exports that #22416 calls for.
- **Have class files export factories (`createX()`) instead of a shared class**,
  so each registration gets a fresh constructor. Rejected: it would break the
  roughly 60 `extends CDS*` inheritance chains and the `instanceof CDS*` checks
  that both this codebase and consumers depend on, and it contradicts the
  stable-class-identity model — for no benefit over registering a subclass on
  demand.
- **Propagate scoped registries as the primary multi-version mechanism.**
  Rejected as the general answer: scoped registries do not survive a React
  boundary, and large design systems have found the polyfill too slow (Adobe
  Spectrum) or walked back an all-in bet on it (Lion). The build-time prefixed
  build is the supported way to run whole component trees side by side; scoped
  registries remain available for isolating individual leaf elements.

## Consequences

This makes registration an explicit, documented contract and unlocks use cases
the self-registering model could not support.

Positive outcomes:

- Multiple versions of Carbon can coexist on a page via scoped registries or a
  prefixed build.
- Consumers can register components under custom tag names to avoid collisions.
- Unused components tree-shake, and class imports are safe for SSR and deferred
  loading.
- The duplicated `es-custom` build is removed, cutting publish size and deleting
  a second copy of the tag-rewriting logic.
- `@carbon/web-components` and `@carbon/ai-chat-components` share one
  registration mental model.

Tradeoffs and breaking changes (v3):

- Importing a class module no longer registers its element. Code — and tests —
  that imported a class file for its registration side effect must import the
  barrel instead. A static registration-coverage audit runs in `ci-check`, and
  runtime guards were added, to catch this class of regression.
- Incidental cross-component registration is removed. In v11, importing
  component X's barrel also registered unrelated components that X happened to
  import; under pure exports a barrel registers only the elements its component
  actually renders. Consumers that relied on that side effect must import those
  components explicitly. This is intentional.
- `{ name }` and `{ registry }` apply only to the elements a consumer registers
  directly. A composite resolves the child tags it renders against the registry
  it lives in, so those options do not re-prefix a whole component subtree; the
  prefixed build covers that case.
