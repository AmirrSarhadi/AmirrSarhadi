# Accounting document lifecycle excerpt

Sanitized from the private ERP service layer.

```python
ALLOWED_TRANSITIONS = {
    "DRAFT": {"PENDING"},
    "PENDING": {"APPROVED", "REJECTED"},
    "REJECTED": {"DRAFT"},
    "APPROVED": set(),
}


def validate_status_transition(current_status: str, new_status: str) -> None:
    if current_status == new_status:
        return

    if new_status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise ValidationError(
            f"Unsupported transition: {current_status} -> {new_status}"
        )


@transaction.atomic
def change_status(*, document, new_status, actor):
    validate_status_transition(document.status, new_status)

    if document.fiscal_year.is_closed:
        raise ValidationError("The fiscal year is closed.")

    validate_accounting_period_is_open(
        document_date=document.date,
        fiscal_year=document.fiscal_year,
    )

    previous = document.status
    document.status = new_status
    document.save(update_fields=["status"])

    create_audit_log(
        document=document,
        actor=actor,
        description=f"Status changed from {previous} to {new_status}",
    )

    return document
```

## What this demonstrates

- Explicit state machine instead of arbitrary status mutation
- Closed-period enforcement at the domain-service layer
- Atomic status changes
- Auditable lifecycle changes
- Backend authority even when frontend controls are hidden
