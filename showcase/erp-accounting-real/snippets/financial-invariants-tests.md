# Financial invariant test excerpts

Sanitized from the private ERP test suite.

```python
def test_closed_period_blocks_financial_posting(self):
    lock_period(
        fiscal_year=self.fiscal_year,
        start_date=date(2026, 4, 1),
        end_date=date(2026, 4, 30),
    )

    voucher = make_approved_voucher(date=date(2026, 4, 15))

    with self.assertRaises(ValidationError):
        create_accounting_document_for_voucher(voucher, actor=self.user)


def test_voucher_can_only_be_reversed_once(self):
    voucher = make_approved_voucher()
    create_accounting_document_for_voucher(voucher, actor=self.user)

    reverse_voucher(voucher=voucher, actor=self.user)

    with self.assertRaises(ValidationError):
        reverse_voucher(voucher=voucher, actor=self.user)


def test_approved_voucher_must_be_locked_and_have_approver(self):
    with self.assertRaises(IntegrityError):
        create_voucher(
            status="APPROVED",
            is_locked=False,
            approved_by=None,
        )


def test_non_owner_cannot_submit_draft(self):
    voucher = make_draft_voucher(owner=self.user)

    response = submit_voucher_as(voucher, actor=self.other_user)

    self.assertEqual(response.status_code, 403)
```

## What this demonstrates

- Business invariants are covered by automated tests
- Authorization rules are testable behavior, not only UI assumptions
- Accounting period locks are enforced in backend logic
- Reversal idempotency is intentionally protected
- Database constraints backstop application-level validation
