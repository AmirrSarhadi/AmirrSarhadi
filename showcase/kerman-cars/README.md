# Kerman Cars — Automotive Marketplace

**[Browse every captured tab and its code](COVERAGE.md) · [Full screenshot gallery](GALLERY.md) · [All 206 source files](SOURCE_INDEX.md)**

An automotive advertising marketplace with buyer discovery, vehicle listings, seller/dealer workflows, moderation and management screens. The repository explicitly separates advertising from vehicle transactions; real payment-provider integration is not claimed.

**Stack:** React · Vite · Django REST API

[← Profile](../../README.md) · [All project showcases](../README.md)

## Expanded source

This collection contains **206 complete source files**. Files retain their original paths; any neutral school-identity or contact-placeholder substitutions are recorded in the manifest. It is a reading-oriented source selection, not a standalone runnable application. Imports into omitted modules are intentionally retained.

- Listing models, API serialization, validation and query filters.
- Vehicle-form helpers and reusable management-table/dialog components.
- Listing, dealership, comparison and saved-search data adapters.
- Persian labels for management and buyer-facing information.

### Start reading

- [Listing filters](source/backend/listings/filters.py)
- [Listing representation](source/backend/listings/serializers.py)
- [Frontend listing normalization](source/frontend/kerman-cars-frontend/src/services/listingData.js)
- [Vehicle form helpers](source/frontend/kerman-cars-frontend/src/features/listings/listingForm.js)

Browse the [complete file index](SOURCE_INDEX.md) and [source manifest](SOURCE_MANIFEST.json), which records the exact source revision (or uploaded archive) and SHA-256 of every copied file. No repository-wide license grant is added by this selection; retain existing notices when reviewing the source.

## Interface gallery

![Kerman Cars — Automotive Marketplace: Existing editorial homepage capture from the source repository. Decorative vehicle photographs are generated illustrations; this is not live inventory.](../../assets/screenshots/kerman-cars-desktop.png)

Existing editorial homepage capture from the source repository. Decorative vehicle photographs are generated illustrations; this is not live inventory.

![Kerman Cars — Automotive Marketplace: Existing mobile editorial-homepage capture from the source repository.](../../assets/screenshots/kerman-cars-mobile.png)

Existing mobile editorial-homepage capture from the source repository.

## Publication boundary

This public selection excludes credentials, environment/deployment configuration, databases, backups, uploaded customer files, authentication/session internals, tenant enforcement, payment-provider code and private business orchestration. Code referring to those omitted modules does not include their implementation.

## Verification scope

Published-file hashes and Python / JavaScript / TypeScript syntax are checked as part of portfolio preparation. Interface captures demonstrate presentation only; they do not establish backend integration, concurrency correctness or production readiness.
