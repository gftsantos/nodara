# Public API principles

## Stable inputs

Nodara accepts plain serializable objects. Dates accept ISO strings, timestamps,
or `Date` instances. Runtime validation mirrors TypeScript constraints and uses
stable `ND_*` error codes.

## Stable outputs

Callbacks receive a domain object and an interaction source. The same events
are available through the framework-neutral controller.

## Compatibility policy

- Patch: fixes and non-observable performance improvements.
- Minor: additive props, events, types and renderers.
- Major: removals or behavior changes, always with a migration guide.

During alpha, all packages remain version-linked. Deprecated fields receive at
least one minor release before removal.
