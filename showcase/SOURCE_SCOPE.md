# Public Source Scope

This portfolio exposes broad presentation layers and selected general backend representations and CRUD/query helpers. It deliberately does not publish a complete deployable product. Omitting a sensitive module can leave imports unresolved; retain those references when reading how the real application is structured.

## Included

- The majority of non-sensitive application pages, forms, reusable components, CSS/SCSS and client-side formatting/reporting helpers from the six projects.
- Selected ordinary model/serializer definitions, validators, filters, catalog/floor/product endpoints and general health/query helpers.
- Full files at their original relative paths, with a manifest recording published SHA-256 values and source hashes where additions or sanitization were reviewed.
- A per-tab/page coverage map linking the actual captured screen to its published source.

## Excluded

- Secrets, keys, environment files, deployment configuration, databases, backups, private uploads, media datasets and session/token artifacts.
- Dedicated authentication, token/session and tenant-access enforcement modules, authorization internals, OTP and provider-side security implementation. General model-field constraints remain in the selected data representations.
- Financial posting/reversal engines, transaction orchestration, costing internals, private conversion/merge/import services, payment integrations, proprietary AI prompts/provider orchestration and customer plans.
- Migrations, management/seed commands and most fixture-heavy tests. Earlier curated test examples remain separate.
- Mixed modules containing both generic and sensitive logic, such as the LMS monolithic server model file and Local Accounting account/security models, are withheld as whole files rather than exposing their critical portions.

## Neutral presentation substitutions

Some newly shared school interface files replace the school identity with a neutral label. Four phone placeholders in public form components use neutral contact text. These edits affect presentation literals, not algorithms; each affected manifest entry identifies its sanitization and preserves the original source hash.

Existing notices and copyright remain applicable. This selection does not add a blanket open-source license or imply that third-party components were authored from scratch.

## Screenshot methods

- LMS / NewCRM / Kerman Cars: actual source interfaces connected to isolated local Django demo databases. School branding/contact links are redacted where applicable. Demo records, counts, accounts and listings are not real customer information.
- Cafe Accounting: actual interface with the source repository's isolated API fixtures, including all main sections and inventory subtabs.
- Local Accounting: actual components with a temporary import-order shim and synthetic API responses, including empty states and unsubmitted forms. This does not validate financial operations.
- Smart Home AI: actual interface, a newly drawn fictional plan and explicitly labelled synthetic configuration/proposal responses. No model inference was performed.

All newly published screenshots are indexed and hashed in each project's `CAPTURE_MANIFEST.json`. Earlier image provenance remains in the existing screenshots README. Static pattern checks and syntax checks are scoped evidence, not a complete security audit or proof of production readiness.

[← Coverage index](COVERAGE.md)
