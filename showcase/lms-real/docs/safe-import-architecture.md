# Safe Bulk Import Architecture

This note documents the sanitized workflow used in the LMS for high-impact spreadsheet imports.

## Flow

```text
Upload workbook
   ↓
Validate file type and size
   ↓
Validate headers and row count
   ↓
Reject formulas and malformed rows
   ↓
Build row-level preview
   ↓
Create expiring preview batch
   ↓
User explicitly applies the same workbook
   ↓
Lock preview state
   ↓
Revalidate content identity and rows
   ↓
Apply inside one database transaction
   ↓
Mark batch as consumed
   ↓
Write audit record
```

## Why this matters

Bulk imports can create or connect many records at once. A direct “upload and mutate” approach makes accidental or stale writes difficult to review and recover from.

The preview/apply split provides several safeguards:

- the operator can inspect validation results before mutation;
- an apply request cannot silently use a different workbook;
- a preview expires rather than remaining valid indefinitely;
- a preview can be consumed only once;
- the final apply is transactional;
- the system records the administrative action for later review.

## Additional source-verified constraints

The private implementation also checks workbook expansion size, maximum row counts, formula cells, exact column schemas, account state, duplicate data, and domain consistency before allowing apply.
