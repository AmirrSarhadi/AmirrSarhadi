# CRM / Sales Operations — Real-World Code Showcase

> Sanitized, source-verified engineering excerpts from a private customer CRM/ERP.

This showcase is derived from the actual project source. Customer identity, production configuration, environment values, local database files, backup artifacts, credentials, phone numbers, and organization-specific content are intentionally excluded.

## Verified stack

### Frontend
- React 19.2
- TypeScript 5.9
- Vite 7

### Backend
- Django 6
- Django REST Framework 3.16
- PostgreSQL in production
- SQLite for local development

## Product scope verified in source

The product is broader than a simple lead tracker. The workflow spans:

```text
Lead
  ↓
Qualification / Follow-up
  ↓
Site Visit / Design
  ↓
BOM / Proposal
  ↓
Contract
  ↓
Procurement / Installation
  ↓
Handover
  ↓
Warranty / Support / Periodic Service
```

## Selected engineering cases

### 1. Lead → Project conversion

Conversion is treated as a domain transaction rather than a status-only change. The workflow can:

- verify conversion permissions
- reject customer-less leads
- remain idempotent when a project already exists
- choose the correct first project stage
- carry an accepted proposal into the project
- create a building snapshot when relevant
- create project stage history
- generate a draft contract and payment schedule
- create the first operational task
- mark the lead converted only inside the same database transaction

[**View sanitized conversion pattern →**](snippets/lead-conversion.md)

### 2. CRM pipeline analytics

The backend exposes a source-verified pipeline report with filters and decision-support metrics including:

- active vs. converted leads
- conversion rate
- hot leads by score
- stale leads
- overdue follow-ups
- overdue next actions
- budget totals grouped by currency
- weighted opportunity value
- status / source / opportunity-stage breakdowns

[**View analytics pattern →**](snippets/pipeline-analytics.md)

### 3. Scalability hardening

The source contains deliberate performance work:

- optional, backward-compatible pagination
- maximum page-size limits
- `select_related` / `prefetch_related` usage
- composite indexes for notifications, work items, audit logs, support tickets, events, and service schedules
- source checks that guard query-optimization changes

Both included project checks for pagination/indexes and query-optimization guards were run against the uploaded source and passed.

[**View performance pattern →**](snippets/scalability.md)

### 4. Role-based access + auditability

The application supports module-aware permissions in addition to role fallbacks. It also captures audit context and structured before/after changes for operational records.

[**View RBAC / audit pattern →**](snippets/rbac-audit.md)

## Frontend workflow verified in source

The React application includes:

- Persian RTL CRM screens
- board and table lead views
- drag-and-drop status changes
- lead scoring and opportunity probability
- next-action tracking
- customer / lead search and filtering
- follow-up interactions
- proposal creation from a lead
- guarded conversion to project
- CRM pipeline reporting UI
- XLSX import / export

## Accuracy note

The uploaded snapshot already contains backend scalability primitives, but the current lead workspace still keeps the loaded lead collection in frontend state and performs some filtering client-side. For very large lead datasets, the next architectural step is to connect server-side pagination/search directly to the lead workspace instead of relying on an all-leads dashboard payload.

That distinction is intentionally documented here: the showcase represents what the source actually implements, not an overstated scalability claim.

## Sanitization policy

No production secrets, `.env` values, backup contents, customer names, contact details, internal deployment paths, or private business data are published in this showcase.

[← Back to profile](../../README.md)
