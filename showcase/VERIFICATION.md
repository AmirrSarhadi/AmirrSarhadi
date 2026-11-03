# Portfolio Preparation Checks

The scope is the expanded source selections and portfolio documentation, not a full application audit.

- 181 selected files match their recorded SHA-256 values. Python source parses successfully; 147 JavaScript / TypeScript / JSX / TSX files parse successfully.
- 340 local Markdown / HTML references resolve, including source indexes and image galleries.
- The copied NewCRM `sales-entry.cjs` test passes: integer money beyond JavaScript Number precision, invalid amount formats, Persian calendar round-trip and leap-day boundaries.
- Selected text files were checked for recognizable private-key / access-token patterns, literal Iranian mobile numbers and email addresses. No matches remained in this selection. This is a scoped pattern check, not a guarantee that a complete security audit has been performed.
- NewCRM captures use the actual frontend with synthetic API responses. LMS and Local Accounting captures render the actual dashboard components in isolated previews. Smart Home AI was captured without external AI calls.
- Existing Kerman Cars and Cafe Accounting captures were visually reviewed and copied from the recorded source revisions. Their original test suites were not rerun for this portfolio change.
- Local Accounting's ordinary entry point currently fails with `Cannot access lazy before initialization`; the source issue is not repaired in this portfolio edit. The dashboard component renders without browser errors in the isolated preview.
- No full application builds, backend integration tests or production-readiness claims are implied by these checks. The source selections intentionally omit modules and configuration required to run the complete products.

[← Project index](README.md)
