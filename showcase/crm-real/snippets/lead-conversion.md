# Lead → Project Conversion Pattern

This excerpt preserves the transaction shape of the private CRM while removing organization-specific naming and surrounding modules.

```python
from django.db import transaction


def convert_lead_to_project(*, lead, actor, stage, accepted_offer=None):
    if lead.customer_id is None:
        raise ValueError("A customer is required before conversion")

    existing = Project.objects.filter(source_lead=lead).first()
    if existing:
        return existing

    with transaction.atomic():
        project = Project.objects.create(
            customer=lead.customer,
            source_lead=lead,
            title=lead.title,
            current_stage=stage,
            owner=lead.assigned_to,
            budget=accepted_offer.total if accepted_offer else lead.estimated_budget,
            currency=accepted_offer.currency if accepted_offer else lead.currency,
        )

        ProjectStageHistory.objects.create(
            project=project,
            to_stage=stage,
            changed_by=actor,
            note="Project created from lead",
        )

        if accepted_offer:
            contract = Contract.objects.create(
                project=project,
                amount=accepted_offer.total,
                currency=accepted_offer.currency,
            )
            create_default_payment_schedule(contract)

        ProjectTask.objects.create(
            project=project,
            title="Initial project follow-up",
            assigned_to=lead.assigned_to or actor,
        )

        lead.status = "converted"
        lead.save(update_fields=["status", "updated_at"])

    return project
```

## Why this matters

The conversion is more than changing a lead status. Related project history, contract data, payment planning, and the first operational task must remain consistent if any step fails.

That is why the actual implementation groups the mutation inside a database transaction and treats repeated conversion requests idempotently.
