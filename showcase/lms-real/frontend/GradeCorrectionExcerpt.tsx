"use client";

import { FormEvent, useState } from "react";

export type GradeCorrection = {
  id: number;
  student: string;
  currentGrade: number | null;
  proposedGrade: number | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
};

type Props = {
  request: GradeCorrection;
  busy: boolean;
  onReview: (decision: "approved" | "rejected", note: string) => Promise<void>;
};

export function GradeCorrectionReview({ request, busy, onReview }: Props) {
  const [decision, setDecision] = useState<"approved" | "rejected" | "">("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    const data = new FormData(event.currentTarget);
    await onReview(decision, String(data.get("note") ?? ""));
  }

  return (
    <article>
      <header>
        <strong>{request.student}</strong>
        <span>{request.status}</span>
      </header>

      <div>
        <section>
          <small>Current result</small>
          <strong>{request.currentGrade ?? "No grade"}</strong>
        </section>
        <section>
          <small>Teacher proposal</small>
          <strong>{request.proposedGrade ?? "No grade"}</strong>
        </section>
      </div>

      <p>{request.reason}</p>

      {request.status === "pending" && (
        <form onSubmit={submit}>
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value as typeof decision)}
            required
          >
            <option value="">Choose decision</option>
            <option value="approved">Approve correction</option>
            <option value="rejected">Reject request</option>
          </select>

          <textarea
            name="note"
            maxLength={2000}
            required={decision === "rejected"}
            placeholder="Review note"
          />

          <button disabled={busy || !decision}>Save decision</button>
        </form>
      )}
    </article>
  );
}
