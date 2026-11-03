"use client";

import { useEffect, useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { api } from "../lib/api";
import type { Pipeline } from "../lib/sales";
import { LoadFailure } from "./account-ui";
import { PipelineSummary } from "./pipeline-summary";

export function DashboardPipeline({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: number;
}) {
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPipelines(null);
    setSelected("");
    setError("");
    api<{ results: Pipeline[] }>("pipelines/?page=1", {
      namespace: "sales",
      organizationId,
      expectedUserId: userId,
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setPipelines(result.results);
          setSelected(result.results[0]?.id || "");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "قیف‌ها دریافت نشدند.",
          );
      });
    return () => controller.abort();
  }, [organizationId, userId, revision]);
  return (
    <section
      className="account-panel crm-pipeline"
      aria-labelledby="dashboard-pipeline-title"
    >
      <div className="crm-panel-heading">
        <div>
          <span className="crm-card-icon">
            <ChartNoAxesCombined size={21} aria-hidden="true" />
          </span>
          <h2 id="dashboard-pipeline-title">تصویر امروزِ قیف فروش</h2>
        </div>
        <a className="customer-link" href="/opportunities">
          جزئیات فروش <span aria-hidden="true">←</span>
        </a>
      </div>
      {error ? (
        <LoadFailure
          title="قیف‌ها بارگذاری نشدند"
          message={error}
          retry={() => setRevision((value) => value + 1)}
        />
      ) : !pipelines ? (
        <p role="status">در حال دریافت قیف‌ها…</p>
      ) : !pipelines.length ? (
        <div className="crm-pipeline-empty">
          <ChartNoAxesCombined size={36} aria-hidden="true" />
          <h3>قیف فروش هنوز تعریف نشده</h3>
          <p>پس از تعریف قیف، فرصت‌ها و مبلغ هر مرحله را اینجا می‌بینید.</p>
          <a className="account-button secondary" href="/opportunities">
            رفتن به فرصت‌های فروش
          </a>
        </div>
      ) : (
        <>
          <div className="account-field crm-pipeline-select">
            <label htmlFor="dashboard-pipeline">قیف فروش</label>
            <select
              id="dashboard-pipeline"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
            <small>نمایش ۵۰ قیف اول؛ فهرست کامل در بخش فرصت‌هاست.</small>
          </div>
          {selected && (
            <PipelineSummary
              key={selected}
              organizationId={organizationId}
              userId={userId}
              pipelineId={selected}
              variant="dashboard"
            />
          )}
        </>
      )}
    </section>
  );
}
