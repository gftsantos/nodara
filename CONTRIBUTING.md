# Contributing to Nodara

Nodara uses one public contract and thin framework adapters. Changes should be
made at the lowest layer that owns the behavior.

## Local workflow

1. Install dependencies with `npm install`.
2. Create a focused branch and add a changeset for user-visible behavior.
3. Run `npm run typecheck`, `npm run test:lib`, and `npm run build`.
4. Open a pull request describing the contract change and migration impact.

## Engineering rules

- Keep `@nodara/core` framework-agnostic and side-effect free on import.
- Never introduce breaking behavior without a migration note and major change.
- Every data error needs a stable `ND_*` code and actionable message.
- Every interaction must work with keyboard and reduced-motion preferences.
- Adapters expose core controllers; they do not reimplement renderers.
- Public types require documentation and at least one contract test.

## Commit and release model

Use semantic changesets. Packages are versioned together while the public API
is in alpha. CI verifies types, contracts, the package build, and the portal.
