"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api";
import {
  customerApi,
  displayName,
  fieldSpecs,
  labels,
  type Customer,
  type Kind,
} from "../lib/customers";
import { ActionButton, Feedback, LoadingAccount } from "./account-ui";
import { ConfirmPanel, FormField } from "./customer-controls";
import { CustomerPicker } from "./customer-picker";

type Choice = "target" | "source" | "union";
type Body = {
  source_id: string;
  source_version: number;
  target_version: number;
  fields: Record<string, Choice>;
  relation_choices: Record<string, "target" | "source">;
  confirmation?: string;
};
export type MergeDraft = {
  target: Customer;
  source: Customer | null;
  fields: Record<string, Choice>;
  relations: Record<string, "target" | "source">;
  attempt?: Body;
};
type Plan = {
  source: Customer;
  target: Customer;
  result: Record<string, string | string[]>;
  confirmation: string;
  relations: {
    other_id: string;
    label: string;
    source_title: string | null;
    target_title: string | null;
    title: string;
    choice: "target" | "source";
    conflict: boolean;
  }[];
  requestKey: string;
};
const valueLabel = (value: unknown, field?: string) =>
  field === "customer_type"
    ? value === "legal"
      ? "حقوقی"
      : "حقیقی"
    : field === "status" && value === "potential"
      ? "مشتری بالقوه"
      : Array.isArray(value)
        ? value.join("، ") || "ثبت نشده"
        : field === "status" && value === "active"
          ? "فعال"
          : field === "status" && value === "inactive"
            ? "غیرفعال"
            : String(value || "ثبت نشده");

export function CustomerMerge({
  kind,
  organizationId,
  organizationName,
  userId,
  draft,
  onChange,
  disabled,
  onPendingChange,
  onComplete,
  onAccessError,
}: {
  kind: Kind;
  organizationId: string;
  organizationName: string;
  userId: number;
  draft: MergeDraft;
  onChange: (draft: MergeDraft) => void;
  disabled: boolean;
  onPendingChange: (value: boolean) => void;
  onComplete: (target: string, replayed: boolean) => void;
  onAccessError: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const ctrl = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const fields = [
    ...fieldSpecs[kind],
    ...(kind === "people"
      ? [
          { name: "status", label: "وضعیت شخص", lines: false },
          {
            name: "primary_company_id",
            label: "شرکت اصلی مشتری",
            lines: false,
          },
        ]
      : []),
  ];
  const body: Body | null = draft.source
    ? {
        source_id: draft.source.id,
        source_version: draft.source.version,
        target_version: draft.target.version,
        fields: draft.fields,
        relation_choices: draft.relations,
      }
    : null;
  const validPlan = !!plan && plan.requestKey === JSON.stringify(body);
  const locked = disabled || busy || review || !!draft.attempt;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ctrl.current?.abort();
      onPendingChange(false);
    };
  }, [onPendingChange]);
  useEffect(() => {
    const access = new AbortController();
    setChecked(false);
    setAccessError("");
    Promise.all(
      [draft.target, ...(draft.source ? [draft.source] : [])].map((record) =>
        customerApi<Customer>(organizationId, `${kind}/${record.id}/`, {
          signal: access.signal,
          expectedUserId: userId,
        }),
      ),
    )
      .then(() => {
        if (!access.signal.aborted) setChecked(true);
      })
      .catch((failure) => {
        if (!access.signal.aborted)
          setAccessError(
            failure instanceof Error ? failure.message : "دسترسی تأیید نشد.",
          );
      });
    return () => access.abort();
  }, [organizationId, userId, kind, draft.target.id, draft.source?.id]);
  useEffect(() => {
    if (plan) resultHeading.current?.focus();
  }, [plan]);
  useEffect(() => {
    if (disabled && !draft.attempt) {
      ctrl.current?.abort();
      pending.current = false;
      setBusy(false);
    }
  }, [disabled, draft.attempt]);

  async function preview() {
    if (!body || locked || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setFieldErrors({});
    const abort = new AbortController();
    ctrl.current = abort;
    const key = JSON.stringify(body);
    try {
      const result = await customerApi<Plan>(
        organizationId,
        `${kind}/${draft.target.id}/merge-preview/`,
        { body, signal: abort.signal, expectedUserId: userId },
      );
      if (!abort.signal.aborted) setPlan({ ...result, requestKey: key });
    } catch (failure) {
      if (abort.signal.aborted) return;
      setPlan(null);
      setError(
        failure instanceof Error ? failure.message : "پیش‌نمایش دریافت نشد.",
      );
      if (failure instanceof ApiError) {
        const details = [
          "fields",
          "relation_choices",
          "relations",
          "source_version",
          "target_version",
        ]
          .flatMap((key) => failure.fields[key] || [])
          .join(" ");
        if (details) setError(details);
        setFieldErrors(
          Object.fromEntries(
            Object.entries(failure.fields).map(([key, values]) => [
              key,
              values.join(" "),
            ]),
          ),
        );
        if (failure.status === 403) onAccessError();
      }
      setTimeout(
        () =>
          document
            .querySelector<HTMLElement>('.customer-merge [aria-invalid="true"]')
            ?.focus(),
        0,
      );
    } finally {
      if (ctrl.current === abort) {
        pending.current = false;
        if (!abort.signal.aborted) setBusy(false);
      }
    }
  }
  async function refreshRecords() {
    if (locked || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setPlan(null);
    const abort = new AbortController();
    ctrl.current = abort;
    try {
      const target = await customerApi<Customer>(
        organizationId,
        `${kind}/${draft.target.id}/`,
        { signal: abort.signal, expectedUserId: userId },
      );
      const source = draft.source
        ? await customerApi<Customer>(
            organizationId,
            `${kind}/${draft.source.id}/`,
            { signal: abort.signal, expectedUserId: userId },
          )
        : null;
      if (!abort.signal.aborted) {
        onChange({ ...draft, target, source, relations: {} });
        setMessage(
          "نسخه‌های تازه دریافت شد؛ مقادیر و انتخاب‌ها را بررسی و پیش‌نمایش تازه بگیرید.",
        );
      }
    } catch (failure) {
      if (!abort.signal.aborted)
        setError(
          failure instanceof Error ? failure.message : "اطلاعات دریافت نشد.",
        );
    } finally {
      if (ctrl.current === abort) {
        pending.current = false;
        if (!abort.signal.aborted) setBusy(false);
      }
    }
  }
  async function commit() {
    if (disabled || pending.current || !mounted.current) return;
    const attempt =
      draft.attempt ||
      (body && validPlan && plan
        ? { ...body, confirmation: plan.confirmation }
        : null);
    if (!attempt) return;
    pending.current = true;
    setBusy(true);
    onPendingChange(true);
    setReview(false);
    setPlan(null);
    setError("");
    setMessage("");
    onChange({ ...draft, attempt });
    const abort = new AbortController();
    ctrl.current = abort;
    try {
      const result = await customerApi<{
        target_id: string;
        replayed: boolean;
      }>(organizationId, `${kind}/${draft.target.id}/merge/`, {
        body: attempt,
        signal: abort.signal,
        expectedUserId: userId,
      });
      if (!abort.signal.aborted) onComplete(result.target_id, result.replayed);
    } catch (failure) {
      if (abort.signal.aborted) return;
      if (failure instanceof ApiError && [400, 409].includes(failure.status)) {
        onChange({ ...draft, attempt: undefined });
        setError(
          "ادغام تازه تأیید نشد؛ نسخه‌های تازه را دریافت و دوباره نتیجه را بازبینی کنید. ممکن است درخواست قبلی قبلاً انجام شده باشد.",
        );
      } else if (failure instanceof ApiError && failure.status === 403) {
        setError(failure.message);
        onAccessError();
      } else
        setError(
          "نتیجه ادغام مشخص نیست؛ همان درخواست را بررسی و در صورت نیاز تکمیل کنید.",
        );
    } finally {
      if (ctrl.current === abort) {
        pending.current = false;
        onPendingChange(false);
        if (!abort.signal.aborted) setBusy(false);
      }
    }
  }
  if (accessError)
    return (
      <section className="account-panel">
        <h2>دسترسی ادغام تأیید نشد</h2>
        <Feedback message={accessError} />
        <ActionButton onClick={onAccessError}>بررسی دوباره حساب</ActionButton>
      </section>
    );
  if (!checked) return <LoadingAccount />;
  return (
    <section className="customer-merge">
      <p className="account-description">
        پرونده اصلی «<bdi>{displayName(draft.target)}</bdi>» و مسئولش «
        <bdi>{draft.target.owner_label}</bdi>» حفظ می‌شوند. پرونده دوم به سابقه
        فقط‌خواندنی تبدیل می‌شود؛ شناسه و ارتباط‌های تاریخی آن حذف نمی‌شوند.
        بازگشت خودکار از ادغام وجود ندارد.
      </p>
      <Feedback message={error || message} kind={error ? "error" : "info"} />
      {draft.attempt ? (
        <section
          className="account-panel customer-review"
          aria-label="بررسی نتیجه ادغام"
        >
          <p>
            ممکن است درخواست قبلی انجام شده باشد. همان بدنه برای بازیابی رسید یا
            تکمیل ادغام حفظ شده است؛ درخواست خودکار تکرار نمی‌شود.
          </p>
          <ActionButton
            busy={busy}
            disabled={disabled}
            onClick={() => void commit()}
          >
            بررسی و تکمیل ادغام
          </ActionButton>
        </section>
      ) : (
        <>
          <CustomerPicker
            organizationId={organizationId}
            userId={userId}
            kind={kind}
            label="پرونده دوم برای ادغام"
            value={draft.source?.id || ""}
            currentLabel={draft.source ? displayName(draft.source) : ""}
            error={fieldErrors.source_id}
            disabled={locked}
            onChange={(_id, _label, source) => {
              if (source?.id === draft.target.id) {
                setFieldErrors({
                  source_id: "پرونده دوم باید با پرونده اصلی متفاوت باشد.",
                });
                return;
              }
              setFieldErrors({});
              setPlan(null);
              onChange({
                ...draft,
                source: source || null,
                fields: {},
                relations: {},
              });
            }}
          />
          {draft.source && (
            <form
              className="account-panel"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void preview();
              }}
              aria-busy={busy}
            >
              <h2>انتخاب مقدار نهایی فیلدها</h2>
              <p>
                اصلی: <bdi>{displayName(draft.target)}</bdi> · دوم:{" "}
                <bdi>{displayName(draft.source)}</bdi>
              </p>
              {fields.map((field) => (
                <section className="customer-merge-field" key={field.name}>
                  <dl className="customer-merge-values">
                    <div>
                      <dt>اصلی — {field.label}</dt>
                      <dd>
                        <bdi>
                          {valueLabel(
                            field.name === "primary_company_id"
                              ? draft.target.primary_company_label
                              : draft.target[field.name as keyof Customer],
                            field.name,
                          )}
                        </bdi>
                      </dd>
                    </div>
                    <div>
                      <dt>دوم — {field.label}</dt>
                      <dd>
                        <bdi>
                          {valueLabel(
                            field.name === "primary_company_id"
                              ? draft.source!.primary_company_label
                              : draft.source![field.name as keyof Customer],
                            field.name,
                          )}
                        </bdi>
                      </dd>
                    </div>
                  </dl>
                  <FormField
                    id={`merge-field-${field.name}`}
                    label={`مقدار نهایی ${field.label}`}
                    error={fieldErrors[field.name]}
                  >
                    <select
                      id={`merge-field-${field.name}`}
                      value={draft.fields[field.name] || "target"}
                      disabled={locked}
                      aria-invalid={!!fieldErrors[field.name]}
                      aria-describedby={`merge-field-${field.name}-error`}
                      onChange={(event) => {
                        setFieldErrors({});
                        onChange({
                          ...draft,
                          fields: {
                            ...draft.fields,
                            [field.name]: event.target.value as Choice,
                          },
                        });
                      }}
                    >
                      <option value="target">مقدار پرونده اصلی</option>
                      <option value="source">مقدار پرونده دوم</option>
                      {field.lines && (
                        <option value="union">
                          ترکیب دو فهرست بدون مقدار تکراری
                        </option>
                      )}
                    </select>
                  </FormField>
                </section>
              ))}
              <div className="session-actions">
                <ActionButton
                  type="submit"
                  busy={busy}
                  disabled={disabled || review}
                >
                  پیش‌نمایش ادغام
                </ActionButton>
                <ActionButton
                  className="secondary"
                  type="button"
                  disabled={locked}
                  onClick={() => void refreshRecords()}
                >
                  دریافت نسخه‌های تازه
                </ActionButton>
              </div>
            </form>
          )}
          {plan && (
            <section
              className="account-panel"
              aria-label="نتیجه پیشنهادی ادغام"
            >
              <h2 ref={resultHeading} tabIndex={-1}>
                نتیجه پیشنهادی ادغام
              </h2>
              {!validPlan && (
                <p role="status">
                  انتخاب‌ها تغییر کرده‌اند؛ پیش‌نمایش تازه لازم است.
                </p>
              )}
              <dl className="customer-import-columns">
                {fields.map((field) => (
                  <div key={field.name}>
                    <dt>{field.label}</dt>
                    <dd>
                      <bdi>
                        {valueLabel(plan.result[field.name], field.name)}
                      </bdi>
                    </dd>
                  </div>
                ))}
              </dl>
              <h3>ارتباط‌ها و سمت نهایی</h3>
              <p>
                ارتباط‌های جاری به پرونده اصلی می‌رسند؛ نسخه تاریخی ارتباط‌های
                پرونده دوم باقی می‌ماند. مسئول اصلی تغییر نمی‌کند.
              </p>
              {!plan.relations.length && <p>ارتباطی برای ادغام وجود ندارد.</p>}
              {plan.relations.map((relation) => (
                <div className="customer-merge-field" key={relation.other_id}>
                  <strong>
                    <bdi>{relation.label}</bdi>
                  </strong>
                  <p>
                    سمت اصلی: {relation.target_title ?? "ارتباطی ندارد"} · سمت
                    دوم: {relation.source_title ?? "ارتباطی ندارد"}
                  </p>
                  <p>سمت در پیش‌نمایش: {relation.title || "ثبت نشده"}</p>
                  {relation.conflict && (
                    <FormField
                      id={`merge-relation-${relation.other_id}`}
                      label={`سمت نهایی در ارتباط با ${relation.label}`}
                    >
                      <select
                        id={`merge-relation-${relation.other_id}`}
                        disabled={locked}
                        value={draft.relations[relation.other_id] || "target"}
                        onChange={(event) =>
                          onChange({
                            ...draft,
                            relations: {
                              ...draft.relations,
                              [relation.other_id]: event.target.value as
                                | "target"
                                | "source",
                            },
                          })
                        }
                      >
                        <option value="target">سمت پرونده اصلی</option>
                        <option value="source">سمت پرونده دوم</option>
                      </select>
                    </FormField>
                  )}
                </div>
              ))}
              <ActionButton
                ref={reviewButton}
                className="danger"
                disabled={locked || !validPlan}
                onClick={() => {
                  setReview(true);
                  onPendingChange(true);
                }}
              >
                بازبینی نهایی ادغام
              </ActionButton>
            </section>
          )}
          {review && (
            <ConfirmPanel
              title="تأیید ادغام پرونده‌ها"
              description={`در سازمان «${organizationName}»، «${displayName(draft.source!)}» در «${displayName(draft.target)}» ادغام می‌شود. مسئول اصلی «${draft.target.owner_label}» باقی می‌ماند. پرونده دوم فقط‌خواندنی می‌شود و بازگشت خودکار وجود ندارد. مقادیر و سمت‌ها مطابق پیش‌نمایش اعمال می‌شوند.`}
              danger
              label="ادغام طبق پیش‌نمایش"
              busy={busy}
              onCancel={() => {
                setReview(false);
                onPendingChange(false);
                requestAnimationFrame(() => reviewButton.current?.focus());
              }}
              onConfirm={() => void commit()}
            />
          )}
        </>
      )}
    </section>
  );
}
