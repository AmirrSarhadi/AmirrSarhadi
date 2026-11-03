# Tab-by-Tab Portfolio Coverage

Each project has a source index, a coverage table linking pages to code, and an expandable screenshot gallery. Captures show actual source interfaces using disposable demo records or explicit presentation fixtures. They are not live customer data, production metrics or claims that every workflow has been integration-tested.

| Project | Published source files | New captured views | Explore |
| --- | ---: | ---: | --- |
| School LMS | 177 | 50 | [Tab / code map](lms-real/COVERAGE.md) · [Gallery](lms-real/GALLERY.md) · [Source](lms-real/SOURCE_INDEX.md) |
| NewCRM | 97 | 24 | [Tab / code map](newcrm-real/COVERAGE.md) · [Gallery](newcrm-real/GALLERY.md) · [Source](newcrm-real/SOURCE_INDEX.md) |
| Cafe Accounting | 90 | 18 | [Tab / code map](cafe-accounting/COVERAGE.md) · [Gallery](cafe-accounting/GALLERY.md) · [Source](cafe-accounting/SOURCE_INDEX.md) |
| Local Accounting | 243 | 99 | [Tab / code map](local-accounting/COVERAGE.md) · [Gallery](local-accounting/GALLERY.md) · [Source](local-accounting/SOURCE_INDEX.md) |
| Kerman Cars | 206 | 55 | [Tab / code map](kerman-cars/COVERAGE.md) · [Gallery](kerman-cars/GALLERY.md) · [Source](kerman-cars/SOURCE_INDEX.md) |
| Smart Home AI | 5 | 6 | [Tab / code map](smart-home-ai/COVERAGE.md) · [Gallery](smart-home-ai/GALLERY.md) · [Source](smart-home-ai/SOURCE_INDEX.md) |

**Total: 818 source files and 252 new desktop captures**, in addition to the earlier curated desktop/mobile examples. Views include main navigation, public pages, selected create forms, subtabs and smart-home workflow states. Dynamic record-edit/detail states are represented by selected examples rather than a separate screenshot for every possible record.

## Scope limits

- Local Accounting: 99 of 100 discovered static route targets were captured. The remaining target is an internal warehouse-wizard step that requires an existing draft and redirects on direct navigation. Its source is published and the limitation appears in the project map. Temporary preview import-order and API fixtures are documented; no real financial data is used.
- NewCRM: the source sidebar marks Users and Roles/Access as pending; no functioning screens are invented for them.
- Smart Home AI: the floor plan is newly drawn and fictional. The proposal screen uses an explicitly labelled synthetic response, not a model result. No external AI, SMS or payment request was made for the capture work.
- Actual authentication, tenant enforcement, financial posting, costing internals, provider integrations, secrets, databases and customer uploads are not part of the public release. See [source scope](SOURCE_SCOPE.md).

The earlier curated galleries remain available. These additions extend the project showcases and their profile links; unrelated profile sections are preserved.

[← Profile](../README.md)
