from django.contrib.contenttypes.models import ContentType
from rest_framework.exceptions import ValidationError


def validate_person_reference(content_type, object_id):
    from Persons.models import (
        Customer,
        Drivers,
        Seller,
        ShareHolder,
        Staff,
        Vendor,
    )

    if not content_type or not object_id:
        raise ValidationError(
            "نوع و شناسه شخص الزامی هستند."
        )

    if not isinstance(content_type, ContentType):
        content_type = ContentType.objects.filter(
            pk=content_type
        ).first()

    model_class = (
        content_type.model_class()
        if content_type
        else None
    )

    allowed_models = {
        Customer,
        Vendor,
        Seller,
        Staff,
        Drivers,
        ShareHolder,
    }

    if model_class not in allowed_models:
        raise ValidationError(
            "مدل انتخاب‌شده برای شخص مجاز نیست."
        )

    person = model_class.objects.filter(
        pk=object_id,
        is_deleted=0,
        is_active=True,
    ).first()

    if not person:
        raise ValidationError(
            "شخص انتخاب‌شده پیدا نشد یا غیرفعال است."
        )

    return person


def validate_receiver_reference(receiver_type, receiver_id):
    from Banking.models import Bank, CashBox, Imprest
    from Persons.models import Cheque

    receiver_models = {
        "bank": Bank,
        "cashbox": CashBox,
        "imprest": Imprest,
        "cheque": Cheque,
    }

    model_class = receiver_models.get(receiver_type)

    if not model_class:
        raise ValidationError({
            "receiver_type": "نوع مقصد مالی معتبر نیست."
        })

    if not receiver_id:
        raise ValidationError({
            "receiver_id": "شناسه مقصد مالی الزامی است."
        })

    queryset = model_class.objects.filter(
        pk=receiver_id,
        is_deleted=0,
    )

    if hasattr(model_class, "is_active"):
        queryset = queryset.filter(is_active=True)

    receiver = queryset.first()

    if not receiver:
        raise ValidationError({
            "receiver_id": (
                "مقصد مالی با نوع انتخاب‌شده پیدا نشد "
                "یا غیرفعال است."
            )
        })

    return receiver