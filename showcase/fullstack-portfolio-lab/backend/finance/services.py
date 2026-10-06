from dataclasses import dataclass
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Account, LedgerEntry, Transfer


@dataclass(frozen=True)
class TransferCommand:
    source_id: int
    destination_id: int
    amount: Decimal
    reference: str = ""


def _validate_transfer(source: Account, destination: Account, amount: Decimal) -> None:
    if source.pk == destination.pk:
        raise ValidationError("Source and destination accounts must be different.")

    if amount <= 0:
        raise ValidationError("Transfer amount must be greater than zero.")

    if not source.is_active or not destination.is_active:
        raise ValidationError("Both accounts must be active.")

    if source.currency != destination.currency:
        raise ValidationError("Cross-currency transfers are not supported in this demo.")

    if source.balance < amount:
        raise ValidationError("Insufficient balance.")


@transaction.atomic
def create_transfer(*, command: TransferCommand, user) -> Transfer:
    source = (
        Account.objects.select_for_update()
        .get(pk=command.source_id)
    )
    destination = (
        Account.objects.select_for_update()
        .get(pk=command.destination_id)
    )

    _validate_transfer(source, destination, command.amount)

    transfer = Transfer.objects.create(
        source=source,
        destination=destination,
        amount=command.amount,
        reference=command.reference,
        status=Transfer.Status.PENDING,
        created_by=user,
    )

    source.balance -= command.amount
    destination.balance += command.amount

    source.save(update_fields=["balance"])
    destination.save(update_fields=["balance"])

    LedgerEntry.objects.bulk_create(
        [
            LedgerEntry(
                transfer=transfer,
                account=source,
                direction=LedgerEntry.Direction.DEBIT,
                amount=command.amount,
            ),
            LedgerEntry(
                transfer=transfer,
                account=destination,
                direction=LedgerEntry.Direction.CREDIT,
                amount=command.amount,
            ),
        ]
    )

    transfer.status = Transfer.Status.COMPLETED
    transfer.save(update_fields=["status"])
    return transfer
