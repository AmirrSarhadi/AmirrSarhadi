export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

export type ApiOptions = {
  body?: object;
  signal?: AbortSignal;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  namespace?:
    | "tenancy"
    | "customers"
    | "leads"
    | "sales"
    | "activities"
    | "products";
  organizationId?: string;
  expectedUserId?: number;
  idempotencyKey?: string;
};

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
    : AbortSignal.timeout(20_000);
  let response: Response;
  try {
    const headers: Record<string, string> = {};
    if (options.organizationId)
      headers["X-CRM-Organization"] = options.organizationId;
    if (options.expectedUserId)
      headers["X-CRM-User"] = String(options.expectedUserId);
    if (options.idempotencyKey)
      headers["Idempotency-Key"] = options.idempotencyKey;
    if (options.body) {
      const csrf = await api<{ csrfToken: string }>("auth/csrf/", { signal });
      headers["X-CSRFToken"] = csrf.csrfToken;
      headers["Content-Type"] = "application/json";
    }
    response = await fetch(
      `/api/v1/${options.namespace || "tenancy"}/` + path,
      {
        method: options.method || (options.body ? "POST" : "GET"),
        credentials: "same-origin",
        cache: "no-store",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal,
      },
    );
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "ارتباط با سامانه برقرار نشد. اتصال خود را بررسی کنید و دوباره تلاش کنید.",
    );
  }
  if (!response.ok) {
    const message =
      response.status === 429
        ? "تعداد تلاش‌های ورود بیش از حد مجاز است. تا ۱۵ دقیقه دیگر دوباره تلاش کنید."
        : response.status === 403
          ? "دسترسی تأیید نشد. وضعیت حساب را دوباره بررسی کنید."
          : response.status === 409
            ? "اطلاعات تغییر کرده است. نسخه تازه را بخوانید و تغییرات را بررسی کنید."
            : response.status === 404
              ? "پرونده در دسترس نیست یا دسترسی شما تغییر کرده است."
              : "درخواست انجام نشد. دوباره تلاش کنید؛ اگر مشکل ادامه داشت با مدیر سامانه تماس بگیرید.";
    const fields: Record<string, string[]> = {};
    if (response.status === 400) {
      const payload = await response.json().catch(() => null);
      for (const name of [
        "username",
        "password",
        "password_confirm",
        "new_password",
        "new_password_confirm",
        "token",
        "customer_type",
        "primary_company_id",
        "industry",
        "street",
        "city",
        "province",
        "postal_code",
        "website",
        "file",
        "first_name",
        "last_name",
        "title",
        "source",
        "status",
        "phones",
        "emails",
        "tags",
        "name",
        "legal_name",
        "registration_number",
        "company_name",
        "tax_rate",
        "page_size",
        "log_retention_days",
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "smtp_security",
        "sender_email",
        "sender_name",
        "phone",
        "email",
        "address",
        "industry",
        "size",
        "website",
        "addresses",
        "owner_id",
        "version",
        "content",
        "source_id",
        "source_version",
        "target_version",
        "fields",
        "relation_choices",
        "relations",
        "contact_title",
        "company_name",
        "probability",
        "description",
        "priority",
        "estimated_amount",
        "rejection_reason",
        "notes",
        "person_id",
        "person_version",
        "company_id",
        "company_version",
        "acknowledge_duplicates",
        "stage_id",
        "amount",
        "expected_close_date",
        "reason",
        "open_stages",
        "stages",
        "due_at",
        "remind_at",
        "target_type",
        "target_id",
        "outcome",
        "number",
        "sale_date",
        "items",
        "tax",
        "discount",
        "shipping",
        "payment_status",
        "payment_method",
        "source_lead_id",
        "date_from",
        "date_to",
        "days",
        "sku",
        "price",
        "cost",
        "stock",
        "min_stock",
        "barcode",
        "weight_grams",
        "dimensions",
        "internal_notes",
        "category",
        "unit",
        "progress",
        "non_field_errors",
        "__all__",
      ]) {
        if (Array.isArray(payload?.[name]))
          fields[name] = payload[name]
            .filter((value: unknown) => typeof value === "string")
            .slice(0, 2)
            .map((value: string) => value.slice(0, 300));
      }
    }
    throw new ApiError(response.status, message, fields);
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(0, "پاسخ سامانه قابل خواندن نیست. دوباره تلاش کنید.");
  }
}

export function announceAccountChange() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("newcrm-account");
    channel.postMessage("changed");
    channel.close();
  }
}

export const roleNames: Record<string, string> = {
  owner: "مدیر سازمان",
  admin: "مدیر",
  sales_manager: "مدیر فروش",
  sales_agent: "کارشناس فروش",
  support: "کارشناس پشتیبانی",
  viewer: "ناظر",
};
