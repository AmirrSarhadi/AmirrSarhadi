# Architecture Notes

## Goal

Keep transport, business rules, persistence, and presentation responsibilities separate enough that each layer can evolve and be tested independently.

## Backend boundaries

```text
HTTP request
   ↓
Serializer / transport validation
   ↓
Application service
   ↓
Domain invariants + transaction boundary
   ↓
ORM models / database
```

The API view is intentionally thin. It does not own financial rules or multi-model write logic.

The transfer service is responsible for:

- loading mutable accounts with row-level locks
- validating business invariants
- performing balance changes inside one database transaction
- creating balanced ledger entries
- publishing one completed transfer result

## Frontend boundaries

```text
Form UI
   ↓
Local interaction validation
   ↓
Typed API client
   ↓
Backend validation / business rules
```

The frontend does not duplicate backend authority. Local checks improve UX, while the server remains the source of truth.

## Why `select_for_update`

Financial writes can race when two requests attempt to use the same balance concurrently. Row-level locks make the example explicit about concurrency rather than assuming requests execute sequentially.

## Why a service layer

A serializer or view can easily become overloaded once a workflow writes multiple models. Keeping the orchestration in a service function makes it easier to:

- unit test business behavior
- reuse workflows from different transports
- audit transaction boundaries
- reduce controller complexity

## What is deliberately omitted

This portfolio sample is focused on architecture, not product completeness. Authentication setup, migrations, routing, styling, deployment files, and production observability would normally exist in a full application but are omitted here to keep the review surface concise.
