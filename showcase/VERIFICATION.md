# Portfolio Preparation Checks

This verification covers the public source selection, documentation and interface captures. It is not a full application security audit, integration test or production-readiness certification.

- **818 complete source files** match their manifest hashes. **79 Python files** parse successfully. **540 JavaScript / TypeScript / JSX / TSX files** parse successfully; styles and markup are retained separately.
- **252 newly published interface captures** match their capture-manifest hashes and link to published source files. Earlier curated desktop/mobile examples are retained.
- Local documentation/image/source references are checked for missing targets. The per-project coverage maps include the single uncaptured draft-dependent warehouse-wizard step rather than presenting it as successful.
- The copied NewCRM `sales-entry.cjs` test passes: exact integer money beyond JavaScript Number precision, invalid amount formats, Persian calendar round-trip and leap-day boundaries.
- Selected source files were checked for recognizable private-key/access-token patterns and literal mobile/email contact values. Neutral school labels and four contact placeholders are documented individually in source manifests. This scoped pattern check is not a guarantee that all possible sensitive information can be detected automatically.
- LMS, NewCRM and Kerman Cars screenshots use actual source interfaces with isolated local Django demo databases. Cafe Accounting uses the source project's isolated API fixtures. School branding/contact links are redacted where applicable.
- Local Accounting's ordinary entry point has an initialization issue. The capture harness temporarily moves the existing React import before lazy declarations and supplies synthetic API responses. It checks the requested route did not redirect to login; the published application source is not silently repaired. No accounting operation or data write is certified by these images.
- Smart Home AI uses a newly drawn fictional plan. The proposal presentation is populated by an explicitly labelled synthetic API response, not model inference. No external AI, SMS or payment request was made for capture work.
- Actual authentication/session artifacts, test databases, preview shims and capture-runner fixtures remain outside this public repository. The collection intentionally omits private modules/configuration, so it is not a standalone runnable application.
- Full application test suites, builds, PostgreSQL concurrency and external integrations were not validated by this portfolio edit.

[Tab coverage](COVERAGE.md) · [Source scope](SOURCE_SCOPE.md) · [Project index](README.md)
