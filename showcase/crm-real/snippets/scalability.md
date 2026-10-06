# CRM Scalability / Compatibility Pattern

The uploaded source includes a backward-compatible pagination layer so large screens can opt into server-side paging without breaking older consumers that expect a plain array.

```python
from rest_framework.pagination import PageNumberPagination


class OptionalPageNumberPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 250

    def paginate_queryset(self, queryset, request, view=None):
        wants_paging = (
            self.page_query_param in request.query_params
            or self.page_size_query_param in request.query_params
        )
        if not wants_paging:
            return None
        return super().paginate_queryset(queryset, request, view=view)
```

## Database-side hardening verified in source

Representative composite indexes include:

```text
(recipient, status, created_at)
(assigned_to, status, due_at)
(project, status, due_at)
(thread, created_at)
(project, created_at) for audit records
(entity_type, object_id) for audit lookups
(project, ticket status, created_at)
(ticket, event created_at)
(project, service scheduled_for)
```

The codebase also uses `select_related`, `prefetch_related`, annotations, and precomputed serializer caches in high-traffic reporting and inventory/accounting paths.

## Verification

Two source-level performance guard scripts included with the uploaded project were executed against the supplied snapshot:

```text
V5 pagination/index checks: OK
Query optimization source checks: OK
```

## Important limitation

The current React lead workspace still stores the fetched lead collection in local state and performs some filtering on the client. The backend can page list endpoints, but the lead screen is not yet fully wired to server-side pagination/search. For very large lead sets, connecting those backend primitives directly to the workspace is the next optimization step.
