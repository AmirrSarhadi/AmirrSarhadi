import os
import uuid
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET

from .sms import configured as sms_configured


@require_GET
@never_cache
def live(request):
    return JsonResponse({"status": "live", "release": settings.RELEASE_VERSION})


@require_GET
@never_cache
def ready(request):
    checks = {"database": False, "cache": False, "private_storage": False, "sms": True}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            checks["database"] = cursor.fetchone()[0] == 1
    except Exception:
        pass
    key = "health:" + uuid.uuid4().hex
    try:
        cache.set(key, "ok", 5)
        checks["cache"] = cache.get(key) == "ok"
        cache.delete(key)
    except Exception:
        pass
    media_root = Path(settings.MEDIA_ROOT)
    checks["private_storage"] = media_root.is_dir() and os.access(media_root, os.W_OK)
    if settings.REQUIRE_SMS:
        checks["sms"] = sms_configured()
    healthy = all(checks.values())
    return JsonResponse({"status": "ready" if healthy else "unavailable", "checks": checks,
                         "release": settings.RELEASE_VERSION}, status=200 if healthy else 503)
