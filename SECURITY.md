# Security policy — alpha

This alpha does not yet publish a private vulnerability-reporting contact or a guaranteed response SLA. A verified reporting channel, named responder and supported-version policy are required before public package release. Do not post exploit details, credentials or sensitive customer data in public issues.

## Dependency gate

Run `npm run security:check`. The full npm audit response and production-only audit are preserved under `outputs/technical-confidence/`.

Production dependency vulnerabilities fail the gate. Development exceptions in `security-exceptions.json` require an exact advisory, installed path/version, reviewed caller-file SHA-256, owner, reason and expiry. New, changed, high/critical or expired findings fail. An exception is a temporary risk acceptance, not a vulnerability fix or a guarantee that no other dependency risk exists.

At review on 2026-09-14, two esbuild development-server advisories remain through build/migration tooling. The inspected callers use transformation/build APIs, not the affected server APIs. These tools must not be used to expose an esbuild development server. Review expires on 2026-10-14; changing a caller invalidates its recorded hash.

- [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)

Do not force incompatible dependency overrides merely to remove an audit warning. The production-only audit is narrower than a complete security assessment of the portal, build system or deployment.

## Release boundaries

The CI/release-candidate workflows have read-only repository permissions and no npm registry token. Public npm publication, license changes and Site audience changes remain separate decisions. Never place GitHub tokens or deployment credentials in project files, examples, reports or browser bundles.
