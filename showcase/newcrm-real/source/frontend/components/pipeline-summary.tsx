"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { formatToman } from "../lib/sales-entry";
import { formatAccountDate } from "../lib/format";
import { ActionButton, LoadFailure } from "./account-ui";
type Summary = {
  pipeline_name: string;
  generated_at: string;
  stages: {
    id: string;
    name: string;
    count: number;
    known_amount: string;
    unknown_amount_count: number;
  }[];
};
export function PipelineSummary({
  organizationId,
  userId,
  pipelineId,
  variant = "list",
}: {
  organizationId: string;
  userId: number;
  pipelineId: string;
  variant?: "list" | "dashboard";
}) {
  const [result, setResult] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    api<Summary>(`pipelines/${pipelineId}/summary/`, {
      namespace: "sales",
      organizationId,
      expectedUserId: userId,
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setResult(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof ApiError ? error.message : "گزارش دریافت نشد.",
          );
      });
    return () => controller.abort();
  }, [organizationId, userId, pipelineId, revision]);
  return (
    <section
      className={
        variant === "dashboard"
          ? "crm-stage-report workspace-details"
          : "account-panel workspace-details"
      }
      aria-label="گزارش قیف فروش"
    >
      <h2>گزارش مرحله‌های قیف</h2>
      <p>
        وضعیت فعلی فرصت‌های بایگانی‌نشده در دسترسی شما؛ فیلتر جست‌وجو و وضعیت
        فهرست روی این گزارش اثر ندارد.
      </p>
      {error ? (
        <LoadFailure
          title="گزارش قیف دریافت نشد"
          message={error}
          retry={() => setRevision((value) => value + 1)}
        />
      ) : !result ? (
        <p role="status">در حال دریافت گزارش قیف…</p>
      ) : (
        <>
          <h3>{result.pipeline_name}</h3>
          <ul className="session-list">
            {result.stages.map((stage) => (
              <li className="session-item" key={stage.id}>
                <div className="crm-stage-heading">
                  <h4>
                    {stage.name}
                    {variant === "dashboard" && (
                      <>
                        {" "}
                        ({new Intl.NumberFormat("fa-IR").format(
                          stage.count,
                        )}{" "}
                        فرصت)
                      </>
                    )}
                  </h4>
                  {variant === "dashboard" && (
                    <span>{formatToman(stage.known_amount)}</span>
                  )}
                </div>
                {variant === "dashboard" && (
                  <div className="crm-stage-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${Math.round((stage.count / Math.max(1, ...result.stages.map((item) => item.count))) * 100)}%`,
                      }}
                    />
                  </div>
                )}
                {variant === "dashboard" ? (
                  stage.unknown_amount_count > 0 && (
                    <small className="crm-context-note">
                      {new Intl.NumberFormat("fa-IR").format(
                        stage.unknown_amount_count,
                      )}{" "}
                      فرصت با مبلغ نامشخص
                    </small>
                  )
                ) : (
                  <dl>
                    <div>
                      <dt>تعداد فرصت</dt>
                      <dd>
                        {new Intl.NumberFormat("fa-IR").format(stage.count)}
                      </dd>
                    </div>
                    <div>
                      <dt>جمع مبلغ معلوم</dt>
                      <dd>{formatToman(stage.known_amount)}</dd>
                    </div>
                    <div>
                      <dt>مبلغ نامشخص</dt>
                      <dd>
                        {new Intl.NumberFormat("fa-IR").format(
                          stage.unknown_amount_count,
                        )}{" "}
                        فرصت
                      </dd>
                    </div>
                  </dl>
                )}
              </li>
            ))}
          </ul>
          <p>
            به‌روزرسانی: {formatAccountDate(result.generated_at)}. این ارقام
            درآمد دوره‌ای یا نرخ تبدیل نیستند.
          </p>
          <ActionButton
            className="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            تازه‌سازی گزارش قیف
          </ActionButton>
        </>
      )}
    </section>
  );
}
