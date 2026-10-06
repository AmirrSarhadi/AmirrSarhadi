from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from finance.models import Account, LedgerEntry, Transfer
from finance.services import TransferCommand, create_transfer


@pytest.mark.django_db
def test_create_transfer_updates_balances_and_ledger():
    user = get_user_model().objects.create_user(username="reviewer", password="test-pass")
    source = Account.objects.create(name="Operating", balance=Decimal("1000.00"), currency="EUR")
    destination = Account.objects.create(name="Reserve", balance=Decimal("250.00"), currency="EUR")

    transfer = create_transfer(
        command=TransferCommand(
            source_id=source.id,
            destination_id=destination.id,
            amount=Decimal("125.00"),
            reference="SHOWCASE-001",
        ),
        user=user,
    )

    source.refresh_from_db()
    destination.refresh_from_db()
    transfer.refresh_from_db()

    assert source.balance == Decimal("875.00")
    assert destination.balance == Decimal("375.00")
    assert transfer.status == Transfer.Status.COMPLETED
    assert transfer.ledger_entries.count() == 2
    assert set(transfer.ledger_entries.values_list("direction", flat=True)) == {
        LedgerEntry.Direction.DEBIT,
        LedgerEntry.Direction.CREDIT,
    }


@pytest.mark.django_db
def test_create_transfer_rejects_insufficient_balance():
    user = get_user_model().objects.create_user(username="reviewer2", password="test-pass")
    source = Account.objects.create(name="Operating", balance=Decimal("50.00"), currency="EUR")
    destination = Account.objects.create(name="Reserve", balance=Decimal("0.00"), currency="EUR")

    with pytest.raises(ValidationError, match="Insufficient balance"):
        create_transfer(
            command=TransferCommand(
                source_id=source.id,
                destination_id=destination.id,
                amount=Decimal("75.00"),
            ),
            user=user,
        )

    assert Transfer.objects.count() == 0
    assert LedgerEntry.objects.count() == 0
