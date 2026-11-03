import { api, ApiError } from "./api";
export async function customerFileRequest(
  path: string,
  organizationId: string,
  userId: number,
  options: {
    file?: File;
    key?: string;
    version?: number;
    signal?: AbortSignal;
  } = {},
) {
  const headers: Record<string, string> = {
    "X-CRM-Organization": organizationId,
    "X-CRM-User": String(userId),
  };
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
    : AbortSignal.timeout(30_000);
  let body: FormData | undefined;
  if (options.file) {
    const { csrfToken } = await api<{ csrfToken: string }>("auth/csrf/", {
      signal,
    });
    headers["X-CSRFToken"] = csrfToken;
    if (options.key) headers["Idempotency-Key"] = options.key;
    body = new FormData();
    body.append("file", options.file);
    if (options.version !== undefined)
      body.append("version", String(options.version));
  }
  let response: Response;
  try {
    response = await fetch(
      path.startsWith("tenancy/") ||
        path.startsWith("products/") ||
        path.startsWith("sales/") ||
        path.startsWith("leads/") ||
        path.startsWith("activities/")
        ? "/api/v1/" + path
        : "/api/v1/customers/" + path,
      {
        method: body ? "POST" : "GET",
        body,
        headers,
        signal,
        credentials: "same-origin",
      },
    );
  } catch {
    throw new ApiError(0, "پاسخ دریافت نشد؛ نتیجه را بررسی کنید.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      Array.isArray(data?.file)
        ? data.file.join(" ")
        : typeof data?.detail === "string"
          ? data.detail
          : "درخواست فایل انجام نشد.",
      Array.isArray(data?.file) ? { file: data.file } : {},
    );
  }
  return response;
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
