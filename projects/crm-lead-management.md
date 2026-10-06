# CRM & Sales Operations Platform

> Source-verified CRM/ERP for lead qualification, opportunity tracking, project conversion, delivery workflows, support, reporting, and operational automation.

[← Back to profile](../README.md)

---

## Source-Verified

This case study was revised after reviewing the actual customer project source.

**Verified stack:**

- React 19.2
- TypeScript 5.9
- Vite 7
- Django 6
- Django REST Framework 3.16
- PostgreSQL for production
- SQLite for local development

[**Browse sanitized real-code showcase →**](../showcase/crm-real/README.md)

---

## Overview

The project is a project-centric CRM/ERP designed for a business workflow that starts with customer acquisition and continues through execution and after-sales service.

The application is not limited to static lead records. The verified domain spans:

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

---

## CRM Domain

Lead records include operational sales fields such as:

- source
- lifecycle status
- estimated budget and currency
- building area and type
- project use
- build type and construction phase
- decision maker
- lead score
- opportunity stage
- probability percentage
- expected opportunity value
- expected close date
- next action and due time
- win/loss reason
- expected project start date
- assignee
- notes

The system also models customer contacts and interaction records with follow-up dates.

---

## Lead Workspace

The React frontend contains both board and table workflows.

Verified UX includes:

- Persian RTL interface
- search across lead/customer fields
- status filters
- source filters
- drag-and-drop lead status changes
- hot / warm / cold visual scoring
- opportunity stage and probability display
- next-action visibility
- customer follow-up interactions
- proposal creation from a lead
- guarded project conversion
- XLSX import and export

The UI intentionally blocks moving a lead directly into the `converted` state through drag-and-drop. Conversion must use the dedicated domain action so the project and related data are created consistently.

---

## Lead → Project Conversion

One of the strongest verified workflows is lead conversion.

The backend conversion action can:

1. enforce role permissions,
2. require a customer,
3. return the existing project if conversion already happened,
4. run the mutation inside `transaction.atomic`,
5. select the initial project stage,
6. carry an accepted proposal into the project,
7. create a building snapshot when relevant,
8. write project stage history,
9. create a draft contract from an accepted proposal,
10. generate a default payment schedule,
11. create the first operational task,
12. mark the lead as converted.

This makes conversion a real business workflow instead of a simple status update.

[**View sanitized conversion sample →**](../showcase/crm-real/snippets/lead-conversion.md)

---

## CRM Pipeline Analytics

The verified backend contains a dedicated CRM pipeline report.

It supports filters for:

- date range / as-of date
- source
- status
- project use
- build kind
- currency
- assignee
- minimum lead score
- stale threshold

The report calculates:

- total leads
- active leads
- converted leads
- conversion rate
- hot leads
- stale leads
- overdue follow-ups
- overdue next actions
- estimated budget by currency
- weighted opportunity value by currency
- status breakdown
- source breakdown
- opportunity-stage breakdown
- follow-up queue

The test suite includes assertions for these sales metrics and weighted pipeline calculations.

[**View sanitized analytics sample →**](../showcase/crm-real/snippets/pipeline-analytics.md)

---

## Permissions

Authorization is enforced server-side.

The verified permission layer supports:

- explicit user roles
- module-level read/write grants
- fallback role sets
- system-admin override
- mapping from API resources to access modules

This means hiding a frontend menu is not considered sufficient authorization.

[**View RBAC pattern →**](../showcase/crm-real/snippets/rbac-audit.md)

---

## Auditability

The workflow subsystem includes audit context and model diff helpers.

Representative capabilities include:

- actor attribution
- create/update/delete audit actions
- structured before/after changes
- project association where possible
- entity type + object ID lookups
- audit indexes for operational history queries

---

## Notifications & Work Queues

The project also contains workflow automation and system notification logic for events such as:

- overdue tickets
- ending warranties
- overdue invoices
- low inventory
- upcoming periodic services
- project tasks approaching their deadline

The work subsystem supports assignee, project, ticket, customer, status and due-time filtering.

---

## Performance Hardening

The supplied source contains explicit performance-stabilization work.

### Optional pagination

List endpoints can retain the original plain-array response unless the caller supplies `page` or `page_size`.

When pagination is requested, standard DRF pagination is used with:

```text
Default page size: 50
Maximum page size: 250
```

This approach was introduced to improve large-list behavior without breaking older frontend contracts.

### Query optimization

The project includes targeted use of:

- `select_related`
- `prefetch_related`
- `Prefetch`
- aggregation / annotations
- reuse of prefetched data
- serializer-level calculation caching

### Database indexes

Composite indexes are present for high-use workflow and support lookups, including:

```text
notifications: recipient + status + created_at
work items: assignee + status + due date
work items: project + status + due date
chat messages: thread + created_at
audit logs: project + created_at
audit logs: entity type + object ID
tickets: project + status + created_at
tickets: assignee + status + due date
ticket events: ticket + created_at
periodic services: project / assignee + scheduled date
```

The project includes source-check scripts for these performance changes. Both relevant checks passed against the uploaded snapshot:

```text
V5 pagination/index checks: OK
Query optimization source checks: OK
```

[**View scalability notes →**](../showcase/crm-real/snippets/scalability.md)

---

## Current Scalability Boundary

The backend already exposes pagination infrastructure, but the current lead workspace still loads a lead collection into React state and performs some search/status/source filtering client-side.

Therefore I do **not** claim that the uploaded snapshot already has complete server-side pagination for the lead board itself.

For a very large lead dataset, the next step is to wire the existing backend pagination/search primitives directly into the lead workspace and stop depending on an all-leads dashboard payload.

This distinction is deliberately documented to keep the portfolio technically accurate.

---

## Testing

The backend test suite covers real CRM behavior, including:

- successful lead conversion
- idempotent re-conversion
- permission denial for unauthorized roles
- customer requirement before conversion
- carrying an accepted proposal into the project
- contract generation
- payment schedule generation
- initial project task generation
- complete lead fields
- lead score / probability validation
- XLSX lead import
- CRM pipeline analytics
- customer duplicate checks

---

## Broader Product Modules

The reviewed repository also contains modules for:

```text
CRM
Projects
Workflow
Accounting
Inventory
Operations / Installation
Support
Notifications
Communications / SMS
Configuration
Audit logging
```

The CRM is therefore part of a wider operational platform rather than an isolated sales screen.

---

## Repository Visibility

The customer source remains private.

The public showcase intentionally excludes:

- customer and lead records
- private contact information
- environment secrets
- local database contents
- backup files
- production configuration
- organization-specific deployment paths
- internal credentials

Only sanitized, representative engineering patterns are published.

---

## Status

**Active development / performance refinement**

[**Browse verified CRM code showcase →**](../showcase/crm-real/README.md)

---

[← Back to Amir Sarhadi's GitHub profile](../README.md)
