# Full-Stack Engineering Showcase

> Sanitized code samples demonstrating production-oriented backend, frontend, validation, testing, and API design patterns.

This mini-project is intentionally separated from private commercial repositories. It demonstrates representative engineering patterns without exposing client data, credentials, proprietary business rules, or production infrastructure.

## What this showcase demonstrates

- Django / DRF domain modeling
- Transaction-safe service layer design
- Explicit validation and business invariants
- REST API boundaries
- React + TypeScript form architecture
- Typed API clients
- Async UI state handling
- Backend unit tests
- Clean separation between domain, transport, and presentation layers

## Example domain

The sample models a financial transfer between two accounts.

```text
React Form
   ↓
Typed API Client
   ↓
DRF Serializer
   ↓
Transfer Service
   ↓
Database Transaction
   ↓
Transfer + Ledger Entries
```

The important point is not the demo domain itself; it is the architecture around it.

## Structure

```text
backend/
  finance/
    models.py
    serializers.py
    services.py
    views.py
    tests/
      test_transfer_service.py

frontend/
  src/
    api/
      transfers.ts
    components/
      TransferForm.tsx

docs/
  architecture.md
```

## Engineering principles

- Keep business rules out of views/controllers.
- Use explicit service functions for multi-model transactions.
- Validate invariants before mutation.
- Use database transactions for financial writes.
- Keep frontend API access typed and isolated.
- Model loading, validation, and submission states explicitly.
- Make failure modes readable to both developers and users.

## Why this exists

Most of my larger ERP, CRM, LMS, and commercial applications are private. This public code showcase provides a reviewable sample of how I structure production-oriented code while keeping proprietary systems private.

[← Back to GitHub profile](../../README.md)
