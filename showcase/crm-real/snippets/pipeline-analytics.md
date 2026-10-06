# CRM Pipeline Analytics Pattern

The private CRM calculates operational sales signals from leads and interactions rather than exposing only raw lead counts.

```python
from collections import defaultdict
from decimal import Decimal


def summarize_pipeline(leads, latest_interactions, now, stale_cutoff, min_score=70):
    active_states = {"new", "qualifying", "approved", "follow_up"}

    summary = {
        "total_leads": 0,
        "active_leads": 0,
        "converted_leads": 0,
        "hot_leads": 0,
        "stale_leads": 0,
    }
    weighted_by_currency = defaultdict(Decimal)

    for lead in leads:
        summary["total_leads"] += 1

        if lead.status in active_states:
            summary["active_leads"] += 1
        if lead.status == "converted":
            summary["converted_leads"] += 1
        if lead.status in active_states and lead.lead_score >= min_score:
            summary["hot_leads"] += 1

        last_interaction = latest_interactions.get(lead.id)
        if (
            lead.status in active_states
            and (last_interaction is None or last_interaction.happened_at < stale_cutoff)
        ):
            summary["stale_leads"] += 1

        opportunity = lead.expected_value or lead.estimated_budget or Decimal("0")
        weighted = opportunity * Decimal(lead.probability_percent) / Decimal("100")
        weighted_by_currency[lead.currency] += weighted

    if summary["total_leads"]:
        summary["conversion_rate"] = (
            Decimal(summary["converted_leads"])
            / Decimal(summary["total_leads"])
            * Decimal("100")
        ).quantize(Decimal("0.01"))
    else:
        summary["conversion_rate"] = Decimal("0")

    summary["weighted_opportunity_by_currency"] = {
        currency: str(value.quantize(Decimal("0.01")))
        for currency, value in weighted_by_currency.items()
    }
    return summary
```

## Signals verified in the real source

- Hot leads based on score threshold
- Stale leads based on interaction age
- Overdue follow-ups
- Overdue next actions
- Conversion rate
- Budget totals by currency
- Weighted opportunity value
- Status/source/opportunity-stage breakdowns

The production implementation also supports report filters such as date range, lead source, status, project use, build kind, currency, and assignee.
