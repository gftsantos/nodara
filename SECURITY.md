# Security — private prerelease

This is not a security certification. No system is impenetrable.

The portal currently has no application accounts, passwords, JWT issuance,
server-side user data, writable API, file uploads, checkout or webhooks.
Authentication and owner-only access belong to the Sites gateway, not to the
React UI or the optional header-reading helper in `app/chatgpt-auth.ts`.
Do not deploy the Worker behind an untrusted gateway or use caller-supplied
`oai-authenticated-*` headers as authentication.

## Reporting

Do not post credentials, personal data or an exploitable proof of concept in a
public GitHub issue. A dedicated private security/privacy contact has not yet
been designated. Before inviting external users, the owner must establish that
channel, an incident response owner and a patch/notification process. Until
then this remains an owner-only evaluation, not a supported commercial service.

## Enforced application controls

- Text-only rendering of data; no execution of JSON, user HTML or code snippets.
- Per-response random CSP nonce, `strict-dynamic`, no inline event handlers,
  no production `eval`, same-origin connections/fonts, no objects/frames.
  Inline styles remain necessary for visualization geometry; CSP is defense
  in depth, not an HTML sanitizer. Trusted runtime plugins execute consumer code.
- Read-only production requests; unused image proxy denied at the Worker entry.
  No wildcard CORS, unused uploads or unnecessary application credentials.
- Security response headers, HTTPS HSTS, no indexing, private/no-store HTML.
- Demo JSON size, depth, node-count and reserved-key limits plus domain validation.
- Build gate for known dependency advisories, internal web assets, source maps
  and common secret patterns. Scan never emits a suspected secret value.

`npm run verify:release` runs the complete gate. Individual commands:
`npm run security:check`; `node scripts/security-artifacts.mjs` after the site
build; the security unit/HTML/Playwright suites. Tests use local owned surfaces,
not exploit scanning or load tests against the hosting provider.

## Outside these checks

The provider must enforce authentication, session invalidation, password recovery,
secure cookies, edge abuse/rate controls and log access/retention. There is no
distributed rate limiter in this Worker; adding an in-memory counter would not
provide reliable protection across isolates. Confirm the provider's controls
before expanding access. An authenticated page's noindex header is not access
control. Static asset delivery and platform auth pages need a separate hosted
configuration review.

Source maps are not emitted as portal browser assets. The intentionally
downloadable MIT library tarballs contain developer source maps; only authorized
site users should be able to download them. JavaScript sent to a browser is
necessarily inspectable. No client bundle may contain secrets.

Current-tree pattern checks are not a complete Git-history secret audit or a
penetration test. Reassess CSRF/IDOR/BOLA, authorization, uploads, SSRF, webhook
signatures and server-side payment verification **before** adding those features.
Never implement authentication or payment enforcement solely in the frontend.

## Dependency and release policy (preserved)

Production dependency vulnerabilities fail the gate. Development exceptions in
`security-exceptions.json` require the exact advisory, installed version/path,
reviewed caller-file SHA-256, owner, reason and expiry. New, changed, high/critical
or expired findings fail. No incompatible overrides merely to silence warnings.
Two development-server advisories remain accepted until 2026-10-14:
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) and
[GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr).
Reviewed callers use transformation/build APIs; do not expose their dev servers.
Changing those callers invalidates their recorded acceptance hashes.

CI and candidate workflows have read-only repository permissions and no npm
registry token. Public npm publication, license changes and Site audience changes
remain separate decisions. A supported-version policy and named responder are
required before public package release. Never store tokens in project files,
examples, reports or browser bundles.
