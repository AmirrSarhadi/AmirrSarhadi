# Accounting & ERP Web Application

> Production-oriented Persian ERP covering accounting, treasury, sales, persons, warehousing, services, reporting, and controlled financial workflows.

[← Back to profile](../README.md) · [View sanitized real-code showcase →](../showcase/erp-accounting-real/README.md)

---

## Overview

This case study is now based on direct review of the project source code.

The platform is a modular full-stack ERP with a Persian RTL frontend and a Django-based backend. Its financial domain goes beyond CRUD: accounting documents have explicit lifecycle rules, numbering, locking, reversal, period controls, audit trails, and automated treasury-to-accounting integration.

---

## Verified Stack

### Frontend

- React **18.3.1**
- Vite 7
- React Router 7
- Axios
- React Hook Form
- Ant Design
- Chart.js / Recharts
- Jalali date libraries
- Persian RTL UI

### Backend

- Python
- Django
- Django REST Framework
- Relational accounting / ERP domain models
- Transaction-aware service layer

### Data & Delivery

- PostgreSQL-oriented data model
- GitHub Actions workflow present in the project
- Environment-based configuration

---

## Core Accounting Engine

The source implements real accounting invariants rather than treating documents as generic records.

### Document numbering

Accounting document numbers are generated per fiscal year using a sequence service. The implementation uses database transactions and row locking so concurrent writers do not casually race on the same sequence boundary.

Representative behavior:

```text
Fiscal Year
    ↓ lock
Sequence Counter ← reconcile → Max Persisted Sequence
    ↓
Next Sequence
    ↓
Formatted Document Number
```

### Balanced journal validation

Before document creation, the service validates that:

- At least one accounting row exists
- Debit and credit values are non-negative
- A row cannot contain both debit and credit
- A row cannot contain neither debit nor credit
- Total debit equals total credit
- Posting is only made to postable accounts

### Fiscal controls

Financial posting checks:

- Fiscal year must be open
- Document date must fall inside the fiscal year
- Accounting period must not be locked
- New documents start as drafts

---

## Document Lifecycle

The project implements an explicit state machine:

```text
DRAFT
  ↓
PENDING
  ├──→ APPROVED
  └──→ REJECTED
          ↓
        DRAFT
```

Approved documents do not transition further through normal status changes.

Status mutations also create audit log records, which means document history is part of the domain model rather than temporary frontend state.

[View sanitized lifecycle excerpt →](../showcase/erp-accounting-real/snippets/document-lifecycle.md)

---

## Locked Documents & Reversal

Approved accounting records are protected from arbitrary mutation.

The project contains explicit reversal behavior:

1. Validate that the original document is approved and not already reversed.
2. Ensure the fiscal year and accounting period are still valid.
3. Generate a new document number.
4. Copy accounting rows while swapping debit and credit.
5. Move the reversal document through the required lifecycle.
6. Lock the generated reversal document.
7. Mark the original document as reversed.
8. Write audit events for both records.

This preserves accounting history rather than deleting or silently rewriting approved financial records.

---

## Treasury → Accounting Integration

Treasury vouchers can operate against multiple treasury account types including:

```text
Bank
Cashbox
Imprest
```

When a treasury voucher generates its accounting document, the service:

- Validates the treasury object and linked accounting account
- Validates the detail account
- Finds the applicable open fiscal year
- Enforces accounting-period locks
- Checks available treasury balance for payments
- Builds balanced debit / credit lines
- Creates an automatic accounting document
- Approves and locks the accounting document
- Updates the treasury balance
- Links the accounting document back to the voucher

Balance mutation uses row locking in the treasury workflow.

---

## Treasury Reversal

Voucher reversal coordinates both the treasury ledger and accounting ledger.

A reversal is rejected when:

- The voucher was already reversed
- The voucher is not approved
- The approved voucher is unexpectedly unlocked
- No accounting document is linked
- The fiscal year / period is closed
- The treasury account is inactive or invalid
- Reversing a receipt would produce an invalid balance

The operation then generates the accounting reversal, restores the treasury balance, creates a linked reverse voucher, and marks the original record as reversed.

[View sanitized treasury reversal excerpt →](../showcase/erp-accounting-real/snippets/treasury-reversal.md)

---

## Permission Model

The treasury module contains object-aware permissions.

Representative rules found in source:

- Authenticated users are required for voucher-owner actions.
- Admin / super-admin roles can act across vouchers.
- Non-admin submission/reopen behavior is restricted to the voucher creator.
- Approval, rejection, and reversal are limited to financial-review roles such as accountant/admin.

This keeps workflow authorization on the backend even when frontend controls are also permission-aware.

---

## Automated Tests

The source includes tests for important financial invariants, including scenarios such as:

- Closed accounting periods blocking posting
- Reversal allowed only once
- Approved vouchers requiring lock + approver state
- Non-approved vouchers not being allowed to masquerade as locked approved records
- PUT/PATCH protection for vouchers that already generated accounting documents
- Ownership restrictions around workflow actions

[View sanitized test excerpts →](../showcase/erp-accounting-real/snippets/financial-invariants-tests.md)

---

## Frontend Accounting UX

The React accounting-document form mirrors key accounting concepts for usability:

- Dynamic journal rows
- Live debit total
- Live credit total
- Difference calculation
- Balanced/unbalanced state
- Mutual exclusion between debit and credit in a single row
- Minimum valid-row checks
- Fiscal year selection
- Automatic next-document-number preview
- Multi-dataset loading for accounts, details, cost centers, branches, and departments

[View sanitized React excerpt →](../showcase/erp-accounting-real/snippets/frontend-accounting-form.md)

The frontend validation improves user feedback, while the backend remains the authority for financial correctness.

---

## Broader ERP Scope

Beyond the verified accounting / treasury engine, the application contains modules for:

```text
Accounting       Fiscal years, documents, ledgers, opening balance, reports
Treasury         Banks, cashboxes, imprest, vouchers, transfers, cheques
Persons          Customers, vendors, sellers, staff and related workflows
Sales            Sales invoices, returns, discounts and installments
Purchases        Purchase invoices and returns
Warehousing      Warehouses, stock and internal transfers
Services         Materials / service records and pricing workflows
Reports          Financial and operational reporting
Dashboards       Accounting, treasury and business KPIs
```

The frontend source also includes dedicated views for trial balance, balance sheet, profit/loss, document summary, treasury ledger, cheque audit, fiscal years, period locks, year-end operations, and document audit timelines.

---

## Security / Sanitization Note

The private archive contains local development configuration and test credentials. Those values are **not** published in the portfolio.

The public showcase intentionally removes:

- Local secret keys
- Test passwords
- Private environment configuration
- Internal identifiers
- Customer/business data
- Full proprietary implementation

Only representative engineering patterns are exposed.

---

## Public Code Showcase

### [Browse production-derived ERP code excerpts →](../showcase/erp-accounting-real/README.md)

The showcase contains sanitized samples derived from the actual application source rather than fabricated portfolio-only examples.

---

## Status

**Active development / production-oriented system**

The current source demonstrates a substantial accounting and treasury domain with explicit financial invariants, workflow controls, permissions, automated tests, and Persian business UX.

---

[← Back to Amir Sarhadi's GitHub profile](../README.md)
