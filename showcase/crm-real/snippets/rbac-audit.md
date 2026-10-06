# Module RBAC + Audit Context Pattern

The private CRM combines role fallback rules with module-level read/write grants.

```python
from rest_framework.permissions import BasePermission, SAFE_METHODS


class HasModuleAccess(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser or user.role == "system_admin":
            return True

        module = resolve_module_for_view(view)
        if not module:
            return False

        configured = user.module_accesses.filter(module=module).first()
        if configured:
            if request.method in SAFE_METHODS:
                return configured.can_read or configured.can_write
            return configured.can_write

        fallback_roles = getattr(view, "required_roles", set())
        return user.role in fallback_roles
```

Audit context is carried separately so model changes can be attributed to the authenticated actor without passing that actor through every service call.

```python
from contextvars import ContextVar

_current_actor = ContextVar("current_actor", default=None)


def set_current_actor(user):
    _current_actor.set(user if getattr(user, "is_authenticated", False) else None)


def diff_values(before, after):
    return {
        key: {"before": before.get(key), "after": value}
        for key, value in after.items()
        if before.get(key) != value
    }
```

## Why this matters

- Navigation visibility is not treated as authorization.
- Read and write access can differ per module.
- System administrators retain an explicit override.
- Operational changes can preserve actor + before/after context.
- Audit records are indexed for project and entity lookups.
