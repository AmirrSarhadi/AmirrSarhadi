# Accounting document form excerpt

Sanitized from the real React/Vite accounting interface.

```jsx
const totalDebit = useMemo(
  () => rows.reduce((sum, row) => sum + toNumber(row.debit), 0),
  [rows]
);

const totalCredit = useMemo(
  () => rows.reduce((sum, row) => sum + toNumber(row.credit), 0),
  [rows]
);

const difference = totalDebit - totalCredit;
const isBalanced = Math.round(difference * 100) / 100 === 0 && totalDebit > 0;

const updateRow = (index, key, value) => {
  setRows((current) => {
    const next = [...current];

    if (key === "debit") {
      next[index] = {
        ...next[index],
        debit: cleanMoney(value),
        credit: cleanMoney(value) ? "" : next[index].credit,
      };
    } else if (key === "credit") {
      next[index] = {
        ...next[index],
        credit: cleanMoney(value),
        debit: cleanMoney(value) ? "" : next[index].debit,
      };
    } else {
      next[index] = { ...next[index], [key]: value };
    }

    return next;
  });
};

const validateBeforeSubmit = () => {
  const validRows = rows.filter(
    (row) => row.account && (toNumber(row.debit) > 0 || toNumber(row.credit) > 0)
  );

  if (validRows.length < 2) return false;

  if (validRows.some(
    (row) => toNumber(row.debit) > 0 && toNumber(row.credit) > 0
  )) return false;

  return isBalanced;
};
```

## What this demonstrates

- Live debit / credit balance feedback
- Mutually exclusive debit and credit input behavior
- Derived totals with `useMemo`
- Client-side validation for better UX
- Backend remains the final authority for financial correctness
