"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  customerApi,
  fieldSpecs,
  displayName,
  duplicateReasons,
  type Customer,
  type DuplicatePreview,
} from "../lib/customers";
import type { Lead } from "../lib/leads";
import { ActionButton, Feedback, LoadingAccount } from "./account-ui";
import { ConfirmPanel } from "./customer-controls";
import { RecordValues } from "./record-fields";
import { CustomerPicker } from "./customer-picker";
import { OpportunityFields } from "./opportunity-fields";
import { blankSale, saleInput, type SaleDraft } from "../lib/sales";
import { formatToman } from "../lib/sales-entry";
import { FormField } from "./customer-controls";

type Body = {
  opportunity?: Record<string, unknown>;
  version: number;
  person_id?: string;
  person_version?: number;
  company_id?: string;
  company_version?: number;
  confirmation?: string;
  acknowledge_duplicates?: boolean;
};
export type ConversionDraft = {
  opportunity?: SaleDraft;
  lead: Lead;
  person: Customer | null;
  company: Customer | null;
  attempt?: Body;
};
type Plan = {
  opportunity?: {
    title: string;
    stage_name: string;
    pipeline_name: string;
    amount: string | null;
  };
  lead: Lead;
  person: { mode: "existing" | "new"; data: Record<string, unknown> } | null;
  company: { mode: "existing" | "new"; data: Record<string, unknown> } | null;
  warnings: { person: DuplicatePreview; company: DuplicatePreview };
  relationship: { mode: string; title: string };
  confirmation: string;
  requestKey: string;
};

export function LeadConversion({
  organizationId,
  organizationName,
  userId,
  draft,
  onChange,
  disabled,
  onPendingChange,
  onComplete,
  onAccessError,
  canCreateOpportunity = false,
}: {
  organizationId: string;
  organizationName: string;
  userId: number;
  draft: ConversionDraft;
  onChange: (value: ConversionDraft) => void;
  disabled: boolean;
  onPendingChange: (value: boolean) => void;
  onComplete: () => void;
  onAccessError: () => void;
  canCreateOpportunity?: boolean;
}) {
  const [checked, setChecked] = useState(false),
    [accessError, setAccessError] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [review, setReview] = useState(false),
    [ack, setAck] = useState(false);
  const ctrl = useRef<AbortController | null>(null),
    pending = useRef(false),
    reviewButton = useRef<HTMLButtonElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const options = {
    namespace: "leads" as const,
    organizationId,
    expectedUserId: userId,
  };
  const preparedOpportunity = draft.opportunity
    ? saleInput(draft.opportunity)
    : null;
  const [opportunityErrors, setOpportunityErrors] = useState<
    Record<string, string>
  >({});
  useEffect(() => {
    for (const field of Object.keys(opportunityErrors)) {
      const input = document.getElementById(`sale-${field}`);
      if (input) {
        input.focus();
        break;
      }
    }
  }, [opportunityErrors]);
  const body: Body = {
    ...(preparedOpportunity ? { opportunity: preparedOpportunity.body } : {}),
    version: draft.lead.version,
    ...(draft.person
      ? { person_id: draft.person.id, person_version: draft.person.version }
      : {}),
    ...(draft.company
      ? { company_id: draft.company.id, company_version: draft.company.version }
      : {}),
  };
  const valid = !!plan && plan.requestKey === JSON.stringify(body);
  const locked = disabled || busy || review || !!draft.attempt;
  useEffect(
    () => () => {
      ctrl.current?.abort();
      onPendingChange(false);
    },
    [onPendingChange],
  );
  useEffect(() => {
    const access = new AbortController();
    setChecked(false);
    setAccessError("");
    Promise.all([
      api<Lead>(`${draft.lead.id}/`, { ...options, signal: access.signal }),
      ...[draft.person, draft.company].flatMap((record, index) =>
        record
          ? [
              customerApi<Customer>(
                organizationId,
                `${index === 0 ? "people" : "companies"}/${record.id}/`,
                { signal: access.signal, expectedUserId: userId },
              ),
            ]
          : [],
      ),
    ])
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
  }, [
    organizationId,
    userId,
    draft.lead.id,
    draft.person?.id,
    draft.company?.id,
  ]);
  useEffect(() => {
    if (plan) heading.current?.focus();
  }, [plan]);
  useEffect(() => {
    if (disabled && !draft.attempt) {
      ctrl.current?.abort();
      pending.current = false;
      setBusy(false);
    }
  }, [disabled, draft.attempt]);
  async function preview() {
    if (locked || pending.current) return;
    if (preparedOpportunity && Object.keys(preparedOpportunity.errors).length) {
      setOpportunityErrors(preparedOpportunity.errors);
      return;
    }
    setOpportunityErrors({});
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const abort = new AbortController();
    ctrl.current = abort;
    try {
      const result = await api<Plan>(`${draft.lead.id}/convert-preview/`, {
        ...options,
        body,
        signal: abort.signal,
      });
      if (!abort.signal.aborted) {
        setPlan({ ...result, requestKey: JSON.stringify(body) });
        setAck(false);
      }
    } catch (failure) {
      if (!abort.signal.aborted) {
        setPlan(null);
        setError(
          failure instanceof ApiError
            ? Object.values(failure.fields).flat().join(" ") || failure.message
            : failure instanceof Error
              ? failure.message
              : "پیش‌نمایش دریافت نشد.",
        );
        if (failure instanceof ApiError && failure.status === 403)
          onAccessError();
      }
    } finally {
      if (ctrl.current === abort) {
        pending.current = false;
        if (!abort.signal.aborted) setBusy(false);
      }
    }
  }
  async function fresh() {
    if (locked || pending.current) return;
    pending.current = true;
    setBusy(true);
    setPlan(null);
    setError("");
    const abort = new AbortController();
    ctrl.current = abort;
    try {
      const lead = await api<Lead>(`${draft.lead.id}/`, {
        ...options,
        signal: abort.signal,
      });
      const person = draft.person
        ? await customerApi<Customer>(
            organizationId,
            `people/${draft.person.id}/`,
            { signal: abort.signal, expectedUserId: userId },
          )
        : null;
      const company = draft.company
        ? await customerApi<Customer>(
            organizationId,
            `companies/${draft.company.id}/`,
            { signal: abort.signal, expectedUserId: userId },
          )
        : null;
      if (!abort.signal.aborted) {
        onChange({ ...draft, lead, person, company });
        setMessage(
          "نسخه‌های تازه دریافت شد؛ انتخاب‌ها را بررسی و پیش‌نمایش تازه بگیرید.",
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
    if (pending.current || disabled) return;
    const attempt =
      draft.attempt ||
      (valid && plan
        ? {
            ...body,
            confirmation: plan.confirmation,
            acknowledge_duplicates: ack,
          }
        : null);
    if (!attempt) return;
    pending.current = true;
    setBusy(true);
    setReview(false);
    setPlan(null);
    setError("");
    onPendingChange(true);
    onChange({ ...draft, attempt });
    const abort = new AbortController();
    ctrl.current = abort;
    try {
      await api(`${draft.lead.id}/convert/`, {
        ...options,
        body: attempt,
        signal: abort.signal,
      });
      if (!abort.signal.aborted) onComplete();
    } catch (failure) {
      if (!abort.signal.aborted) {
        if (
          failure instanceof ApiError &&
          [400, 409].includes(failure.status)
        ) {
          onChange({ ...draft, attempt: undefined });
          setError(
            "تبدیل تازه تأیید نشد؛ نسخه‌ها را دریافت و دوباره پیش‌نمایش بگیرید. تبدیل انجام‌شده دوباره پرونده نمی‌سازد.",
          );
        } else if (failure instanceof ApiError && failure.status === 403) {
          setError(failure.message);
          onAccessError();
        } else
          setError(
            "نتیجه تبدیل مشخص نیست؛ همان درخواست را بررسی و در صورت نیاز تکمیل کنید.",
          );
      }
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
        <h2>دسترسی تبدیل تأیید نشد</h2>
        <Feedback message={accessError} />
        <ActionButton onClick={onAccessError}>بررسی دوباره حساب</ActionButton>
      </section>
    );
  if (!checked) return <LoadingAccount />;
  const warnings =
    plan && Object.values(plan.warnings).some((value) => value.results.length);
  return (
    <section>
      <p className="account-description">
        سرنخ «<bdi>{draft.lead.title}</bdi>» پس از تبدیل فقط‌خواندنی می‌شود و
        سابقه‌اش باقی می‌ماند. پرونده‌های تازه با مسئولیت «
        <bdi>{draft.lead.owner_label}</bdi>» ساخته می‌شوند. این مرحله شخص و شرکت
        را آماده می‌کند؛ فرصت فقط با انتخاب صریح شما ساخته می‌شود.
      </p>
      <Feedback message={error || message} kind={error ? "error" : "info"} />
      {draft.attempt ? (
        <section
          className="account-panel customer-review"
          aria-label="بررسی نتیجه تبدیل"
        >
          <p>
            ممکن است تبدیل قبلاً انجام شده باشد. همان درخواست در حافظه حفظ شده
            است؛ ارسال خودکار نداریم.
          </p>
          <ActionButton
            disabled={disabled}
            busy={busy}
            onClick={() => void commit()}
          >
            بررسی و تکمیل تبدیل
          </ActionButton>
        </section>
      ) : (
        <>
          {canCreateOpportunity && (
            <>
              <FormField id="lead-with-opportunity" label="خروجی تبدیل">
                <select
                  id="lead-with-opportunity"
                  value={draft.opportunity ? "opportunity" : "customer"}
                  disabled={locked}
                  onChange={(event) => {
                    setPlan(null);
                    onChange({
                      ...draft,
                      opportunity:
                        event.target.value === "opportunity"
                          ? blankSale()
                          : undefined,
                    });
                  }}
                >
                  <option value="customer">فقط پرونده‌های مشتری</option>
                  <option value="opportunity">مشتری و فرصت فروش</option>
                </select>
              </FormField>
              {draft.opportunity && (
                <OpportunityFields
                  org={organizationId}
                  user={userId}
                  value={draft.opportunity}
                  onChange={(opportunity) => {
                    setPlan(null);
                    onChange({ ...draft, opportunity });
                  }}
                  errors={opportunityErrors}
                  disabled={locked}
                />
              )}
            </>
          )}
          {(["person", "company"] as const).map((kind) => (
            <CustomerPicker
              key={kind}
              organizationId={organizationId}
              userId={userId}
              kind={kind === "person" ? "people" : "companies"}
              label={
                kind === "person"
                  ? "شخص موجود برای تبدیل"
                  : "شرکت موجود برای تبدیل"
              }
              value={draft[kind]?.id || ""}
              currentLabel={draft[kind] ? displayName(draft[kind]!) : ""}
              defaultLabel={
                kind === "person"
                  ? "ساخت شخص فقط در صورت داشتن نام در سرنخ"
                  : "ساخت شرکت فقط در صورت داشتن نام در سرنخ"
              }
              disabled={locked}
              onChange={(_id, _label, record) => {
                setPlan(null);
                onChange({ ...draft, [kind]: record || null });
              }}
            />
          ))}
          {draft.lead.status !== "qualified" && (
            <p role="status">
              برای تبدیل، سرنخ باید واجد شرایط باشد؛ وضعیت تازه را از پرونده
              سرنخ بررسی کنید.
            </p>
          )}
          <div className="session-actions">
            <ActionButton
              busy={busy}
              disabled={locked || draft.lead.status !== "qualified"}
              onClick={() => void preview()}
            >
              پیش‌نمایش تبدیل
            </ActionButton>
            <ActionButton
              className="secondary"
              disabled={locked}
              onClick={() => void fresh()}
            >
              دریافت نسخه‌های تازه
            </ActionButton>
          </div>
          {plan && (
            <section
              className="account-panel"
              aria-label="نتیجه پیشنهادی تبدیل"
            >
              <h2 ref={heading} tabIndex={-1}>
                نتیجه پیشنهادی تبدیل
              </h2>
              {(["person", "company"] as const).map((kind) => (
                <div key={kind}>
                  <h3>{kind === "person" ? "شخص" : "شرکت"}</h3>
                  <p>
                    {plan[kind]
                      ? `${plan[kind]!.mode === "new" ? "ساخت پرونده تازه" : "استفاده از پرونده موجود بدون بازنویسی فیلدها"}: ${String(plan[kind]!.data.name || `${plan[kind]!.data.first_name || ""} ${plan[kind]!.data.last_name || ""}`.trim())}`
                      : "پرونده‌ای از این نوع ساخته یا انتخاب نمی‌شود."}
                  </p>
                  {plan[kind]?.mode === "existing" && (
                    <p>
                      مسئول پرونده موجود «
                      <bdi>{String(plan[kind]!.data.owner_label || "")}</bdi>»
                      حفظ می‌شود.
                    </p>
                  )}
                  {plan[kind] && (
                    <dl className="customer-definition">
                      <RecordValues
                        fields={
                          fieldSpecs[kind === "person" ? "people" : "companies"]
                        }
                        record={plan[kind]!.data}
                      />
                    </dl>
                  )}
                  {plan[kind]?.mode === "new" && (
                    <p>
                      {kind === "person"
                        ? "نام، سمت، تلفن، ایمیل، منبع و برچسب‌های سرنخ کپی می‌شوند."
                        : "نام شرکت و برچسب‌ها کپی می‌شوند."}{" "}
                      یادداشت و دلیل رد در سابقه سرنخ باقی می‌مانند.
                    </p>
                  )}
                  {plan.warnings[kind].results.length > 0 && (
                    <>
                      <h4>هشدار شباهت</h4>
                      <ul>
                        {plan.warnings[kind].results.map((match) => (
                          <li key={match.id}>
                            <bdi>{match.label}</bdi>
                            {match.archived ? " (بایگانی‌شده)" : ""}:{" "}
                            {match.reasons
                              .map((reason) => duplicateReasons[reason])
                              .join("، ")}
                          </li>
                        ))}
                      </ul>
                      {plan.warnings[kind].has_more && (
                        <p>۵ مورد نخست؛ موارد مشابه بیشتری وجود دارد.</p>
                      )}
                    </>
                  )}
                </div>
              ))}
              <p>
                {plan.relationship.mode === "create"
                  ? `ارتباط شخص و شرکت ایجاد می‌شود؛ سمت: ${plan.relationship.title || "ثبت نشده"}`
                  : plan.relationship.mode === "existing"
                    ? `ارتباط قبلی و سمت آن حفظ می‌شوند: ${plan.relationship.title || "ثبت نشده"}`
                    : "ارتباط شخص و شرکت در این تبدیل ایجاد نمی‌شود."}
              </p>
              {plan.opportunity && (
                <p>
                  فرصت «{plan.opportunity.title}» در قیف «
                  {plan.opportunity.pipeline_name}»، مرحله «
                  {plan.opportunity.stage_name}» ساخته می‌شود؛{" "}
                  {formatToman(plan.opportunity.amount)}. مسئول همان مسئول سرنخ
                  است.
                </p>
              )}
              {warnings && (
                <label
                  className="customer-import-ack"
                  htmlFor="lead-conversion-ack"
                >
                  <input
                    id="lead-conversion-ack"
                    type="checkbox"
                    checked={ack}
                    disabled={locked}
                    onChange={(event) => setAck(event.target.checked)}
                  />
                  <span>
                    شباهت‌ها را بررسی کردم و ساخت پرونده‌های تازه را تأیید
                    می‌کنم.
                  </span>
                </label>
              )}
              <ActionButton
                ref={reviewButton}
                className="danger"
                disabled={locked || !valid || (!!warnings && !ack)}
                onClick={() => {
                  setReview(true);
                  onPendingChange(true);
                }}
              >
                بازبینی نهایی تبدیل
              </ActionButton>
            </section>
          )}
          {review && (
            <ConfirmPanel
              title="تأیید تبدیل سرنخ"
              description={`در سازمان «${organizationName}»، سرنخ «${draft.lead.title}» طبق پیش‌نمایش به پرونده‌های مشتری متصل می‌شود. فیلدهای پرونده‌های موجود بازنویسی نمی‌شوند؛ ارتباط لازم طبق پیش‌نمایش ساخته می‌شود. سرنخ فقط‌خواندنی می‌شود و بازگشت خودکار وجود ندارد.${plan?.opportunity ? ` فرصت «${plan.opportunity.title}» نیز ساخته می‌شود؛ ${formatToman(plan.opportunity.amount)}.` : ""}`}
              danger
              label="تبدیل طبق پیش‌نمایش"
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
