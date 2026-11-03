"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { LoadFailure } from "./account-ui";
export function ActivitySummary({
  organizationId,
  userId,
  revision,
}: {
  organizationId: string;
  userId: number;
  revision: number;
}) {
  const [data, setData] = useState<Record<string, number> | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError("");
    api<Record<string, number>>("summary/", {
      namespace: "activities",
      organizationId,
      expectedUserId: userId,
      signal: ctrl.signal,
    })
      .then((v) => {
        if (!ctrl.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [organizationId, userId, revision, retry]);
  if (error)
    return (
      <LoadFailure
        title="آمار وظایف دریافت نشد"
        message={error}
        retry={() => setRetry((v) => v + 1)}
      />
    );
  return (
    <section aria-label="آمار وظایف" className="lead-summary-section">
      <div className="lead-summary-grid activity-summary-grid">
        {[
          ["total", "کل وظایف"],
          ["planned", "در انتظار"],
          ["in_progress", "در حال انجام"],
          ["done", "تکمیل‌شده"],
          ["overdue", "عقب‌افتاده"],
        ].map(([key, label]) => (
          <div className={`lead-metric lead-metric-${key}`} key={key}>
            <strong>
              {data ? new Intl.NumberFormat("fa-IR").format(data[key]) : "…"}
            </strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="crm-context-note">
        همهٔ فعالیت‌های قابل مشاهده در محدودهٔ دسترسی شما؛ مستقل از فیلترهای
        فهرست.
      </p>
    </section>
  );
}
