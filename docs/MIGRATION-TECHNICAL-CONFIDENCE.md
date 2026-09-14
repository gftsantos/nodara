# Migration notes — technical-confidence candidate

Status: unreleased alpha candidate, 14 September 2026. A changeset records the
intended next release; package versions are not advanced or published by these
notes. Existing candidate tarballs must be identified by their manifest SHA-256,
not only the shared `0.1.0-alpha.1` filename. Public distribution requires unique
versioned artifacts; do not overwrite a published npm version.

## Validate before adopting

- Options previously ignored may now throw a stable validation error. Check
  enum values, callback types, positive dimensions, finite numeric domains,
  renderer support and per-family data schemas.
- Dates must be finite `Date`, string or number values within the JavaScript Date
  range. `null`, booleans and arbitrary objects are not date inputs.
- Histogram, violin and contour recipes now use numerical contracts rather than
  illustrative geometry. See the statistics guide for bin boundaries, bandwidth,
  scalar-grid ordering and work limits. Single-series chart families reject extra
  series instead of silently ignoring them.
- If a change switches both data schema and options, call
  `controller.setState(nextData, nextOptions)`. Sequential `update`/`setOptions`
  can correctly reject the intermediate incompatible state.
- `render` emits `{ data, options }`; interaction events are not fabricated by
  programmatic data updates. `onTaskChange`/`onEventChange` receive pre-commit
  proposals; controller subscriptions receive committed interaction changes.
  Schedule cross-view reconciliation after that local commit, as in the
  operational example. Arbitrary consumer callback side effects are not rolled
  back by the visual controller.
- Do not mutate the references returned by visual `getData`/`getOptions` and
  expect a render. Use the controller methods. The operational store has separate,
  immutable snapshots and transactional semantics.
- Removed plugins receive cleanup. Cleanup errors are reported after all relevant
  cleanup is attempted; a post-commit callback error does not imply state rollback.
- Angular is ESM and requires `>=21.2.21 <22`; there is no Angular CommonJS build.
  React/Vue support ranges do not certify every future framework release.

## Operational data

`OperationalPlan` schema 1 uses elapsed UTC instants, safe integer durations and
resource units, and FS dependencies with non-negative lag. It does not silently
apply working days, daylight-saving rules, business calendars or resource leveling.
The portal deliberately has smaller limits than the model. Export JSON explicitly
before reloading; undo history, selection and revisions are not serialized.

## Distribution and verification

Use all five packages from one candidate manifest. Install the downloaded tarballs
in a clean consumer, import `@nodara/core/styles.css`, and run the examples for the
chosen framework. The release gate tests these installed artifacts rather than
resolving their source through workspace aliases. Browser compatibility, automated
accessibility and numerical fixtures are separate checks, not a claim of complete
WCAG certification or enterprise readiness.
