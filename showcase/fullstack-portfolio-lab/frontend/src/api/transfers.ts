export type TransferPayload = {
  sourceId: number;
  destinationId: number;
  amount: string;
  reference?: string;
};

export type Transfer = {
  id: number;
  source_id: number;
  source_name: string;
  destination_id: number;
  destination_name: string;
  amount: string;
  reference: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function createTransfer(payload: TransferPayload): Promise<Transfer> {
  const response = await fetch("/api/transfers/", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_id: payload.sourceId,
      destination_id: payload.destinationId,
      amount: payload.amount,
      reference: payload.reference ?? "",
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError("Transfer could not be created.", response.status, body);
  }

  return body as Transfer;
}
