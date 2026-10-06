# Treasury reversal excerpt

Sanitized from the private ERP treasury service.

```python
@transaction.atomic
def reverse_voucher(*, voucher, actor):
    if voucher.is_reversed:
        raise ValidationError("Voucher has already been reversed.")

    if voucher.status != "APPROVED" or not voucher.is_locked:
        raise ValidationError("Only locked approved vouchers can be reversed.")

    if not voucher.accounting_document:
        raise ValidationError("Linked accounting document is missing.")

    fiscal_year = find_open_fiscal_year(voucher.date)
    validate_accounting_period_is_open(
        document_date=voucher.date,
        fiscal_year=fiscal_year,
    )

    reverse_document = reverse_accounting_document(
        document=voucher.accounting_document,
        actor=actor,
    )

    treasury_account = lock_treasury_account(voucher)
    amount = Decimal(voucher.amount)

    if voucher.voucher_type == "RECEIPT":
        if treasury_account.balance < amount:
            raise ValidationError("Insufficient balance for reversal.")
        treasury_account.balance -= amount
    else:
        treasury_account.balance += amount

    treasury_account.save(update_fields=["balance"])

    reverse_voucher = create_reverse_voucher(
        original=voucher,
        accounting_document=reverse_document,
        actor=actor,
    )

    voucher.is_reversed = True
    voucher.reverse_voucher = reverse_voucher
    voucher.save(update_fields=["is_reversed", "reverse_voucher"])

    return reverse_voucher
```

## What this demonstrates

- Reversal instead of destructive mutation
- Coupled treasury + accounting rollback semantics
- Closed-period protection
- Atomicity across related financial records
- Row locking before balance mutation
- Explicit prevention of double reversal
