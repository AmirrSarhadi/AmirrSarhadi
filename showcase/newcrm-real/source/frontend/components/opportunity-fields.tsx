"use client";
import { useEffect, useState } from "react";
import type { Page } from "../lib/customers";
import { salesApi, type Pipeline, type SaleDraft } from "../lib/sales";
import { Feedback } from "./account-ui";
import { FormField, Pager } from "./customer-controls";
import { RecordFields } from "./record-fields";

/** One owner for opportunity data entry, shared with atomic lead conversion. */
export function OpportunityFields({
  org,
  user,
  value,
  onChange,
  errors = {},
  disabled = false,
  includeStage = true,
}: {
  org: string;
  user: number;
  value: SaleDraft;
  onChange: (value: SaleDraft) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  includeStage?: boolean;
}) {
  const [pipelines, setPipelines] = useState<Page<Pipeline> | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!includeStage) return;
    const ctrl = new AbortController();
    setPipelines(null);
    setError("");
    salesApi<Page<Pipeline>>(org, user, `pipelines/?page=${page}`, {
      signal: ctrl.signal,
    })
      .then((data) => {
        if (!ctrl.signal.aborted) setPipelines(data);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [org, user, page, revision, includeStage]);
  useEffect(() => {
    setPipeline(null);
    if (!includeStage || !value.pipeline_id) return;
    const ctrl = new AbortController();
    salesApi<Pipeline>(org, user, `pipelines/${value.pipeline_id}/`, {
      signal: ctrl.signal,
    })
      .then((data) => {
        if (!ctrl.signal.aborted) setPipeline(data);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [org, user, value.pipeline_id, includeStage, revision]);
  const change = (name: keyof SaleDraft, text: string) =>
    onChange({ ...value, [name]: text });
  return (
    <>
      <RecordFields
        prefix="sale"
        fields={[{ name: "title", label: "عنوان فرصت", length: 200 }]}
        draft={value}
        errors={errors}
        disabled={disabled}
        onChange={(_name, text) => change("title", text)}
      />
      {includeStage && (
        <>
          <Feedback message={error} />
          {error && (
            <button
              type="button"
              className="customer-link"
              disabled={disabled}
              onClick={() => setRevision((v) => v + 1)}
            >
              تلاش دوباره برای دریافت قیف‌ها
            </button>
          )}
          <FormField
            id="sale-pipeline"
            label="قیف فروش"
            hint="اگر قیفی تعریف نشده، مدیر سازمان باید آن را بسازد."
          >
            <select
              id="sale-pipeline"
              value={value.pipeline_id}
              disabled={disabled || !pipelines}
              onChange={(e) =>
                onChange({
                  ...value,
                  pipeline_id: e.target.value,
                  stage_id: "",
                })
              }
            >
              <option value="">انتخاب قیف</option>
              {pipeline &&
                !pipelines?.results.some((p) => p.id === pipeline.id) && (
                  <option value={pipeline.id}>{pipeline.name}</option>
                )}
              {pipelines?.results.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          {pipelines && (
            <Pager
              page={page}
              count={pipelines.count}
              previous={!!pipelines.previous}
              next={!!pipelines.next}
              busy={disabled}
              onPage={setPage}
            />
          )}
          <FormField
            id="sale-stage_id"
            label="مرحله آغاز فرصت"
            error={errors.stage_id}
          >
            <select
              id="sale-stage_id"
              value={value.stage_id}
              disabled={disabled || !pipeline}
              aria-invalid={!!errors.stage_id}
              aria-describedby="sale-stage_id-error"
              onChange={(e) => change("stage_id", e.target.value)}
            >
              <option value="">انتخاب مرحله باز</option>
              {pipeline?.stages
                .filter((s) => s.kind === "open")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </FormField>
        </>
      )}
      <FormField
        id="sale-amount"
        label="مبلغ فرصت (تومان)"
        error={errors.amount}
        hint="تومانِ صحیح؛ خالی یعنی مبلغ هنوز مشخص نیست. ریال وارد نکنید."
      >
        <input
          id="sale-amount"
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={value.amount}
          disabled={disabled}
          aria-invalid={!!errors.amount}
          aria-describedby="sale-amount-error sale-amount-hint"
          onChange={(e) => change("amount", e.target.value)}
        />
      </FormField>
      <FormField
        id="sale-expected_close_date"
        label="تاریخ احتمالی بسته‌شدن (شمسی)"
        error={errors.expected_close_date}
        hint="سال/ماه/روز، مانند ۱۴۰۵/۰۸/۰۴؛ اختیاری است."
      >
        <input
          id="sale-expected_close_date"
          type="text"
          dir="ltr"
          inputMode="text"
          placeholder="۱۴۰۵/۰۸/۰۴"
          value={value.expected_close_date}
          disabled={disabled}
          aria-invalid={!!errors.expected_close_date}
          aria-describedby="sale-expected_close_date-error sale-expected_close_date-hint"
          onChange={(e) => change("expected_close_date", e.target.value)}
        />
      </FormField>
    </>
  );
}
