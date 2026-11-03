"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { LoadFailure } from "./account-ui";
export function LeadSummary({
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
      namespace: "leads",
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
        title="آمار لیدها دریافت نشد"
        message={error}
        retry={() => setRetry((v) => v + 1)}
      />
    );
  return (
    <section aria-label="آمار لیدها" className="lead-summary-section">
      <div className="lead-summary-grid">
        {[
          ["total", "کل لیدها"],
          ["new", "جدید"],
          ["working", "در حال پیگیری"],
          ["qualified", "واجد شرایط"],
          ["converted", "تبدیل‌شده"],
          ["rejected", "ردشده"],
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
        لیدهای بایگانی‌نشده در محدودهٔ دسترسی شما؛ مستقل از فیلترهای فهرست.
        تبدیل‌شده، نتیجهٔ تبدیل واقعی به مشتری است.
      </p>
    </section>
  );
}
