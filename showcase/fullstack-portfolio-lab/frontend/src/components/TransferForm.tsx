import { FormEvent, useState } from "react";

import { ApiError, createTransfer } from "../api/transfers";

type AccountOption = {
  id: number;
  name: string;
};

type Props = {
  accounts: AccountOption[];
};

export function TransferForm({ accounts }: Props) {
  const [sourceId, setSourceId] = useState<number | "">("");
  const [destinationId, setDestinationId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!sourceId || !destinationId || !amount) {
      setMessage("Please complete all required fields.");
      return;
    }

    if (sourceId === destinationId) {
      setMessage("Source and destination must be different.");
      return;
    }

    try {
      setIsSubmitting(true);
      const transfer = await createTransfer({
        sourceId,
        destinationId,
        amount,
        reference,
      });

      setMessage(`Transfer #${transfer.id} completed successfully.`);
      setAmount("");
      setReference("");
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(`Request failed (${error.status}). Please review the transfer data.`);
      } else {
        setMessage("Unexpected error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} aria-busy={isSubmitting}>
      <label>
        Source account
        <select
          value={sourceId}
          onChange={(event) => setSourceId(Number(event.target.value) || "")}
          disabled={isSubmitting}
        >
          <option value="">Select source</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Destination account
        <select
          value={destinationId}
          onChange={(event) => setDestinationId(Number(event.target.value) || "")}
          disabled={isSubmitting}
        >
          <option value="">Select destination</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Amount
        <input
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          disabled={isSubmitting}
        />
      </label>

      <label>
        Reference
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          maxLength={80}
          disabled={isSubmitting}
        />
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Processing…" : "Create transfer"}
      </button>

      {message && <p role="status">{message}</p>}
    </form>
  );
}
