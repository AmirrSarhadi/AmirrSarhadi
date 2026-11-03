"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { customerFileRequest } from "../lib/customer-files";
import {
  activityFileFields,
  activityStatuses,
  activityKinds,
  targetKinds,
  activityPriorities,
} from "../lib/activities";
import { formatAccountDate } from "../lib/format";
import { productFields, quantityDisplay } from "../lib/products";
import { leadFields, statusLabel } from "../lib/leads";
import { formatToman, displayPersianDate } from "../lib/sales-entry";
import { api, type ApiOptions, ApiError } from "../lib/api";
import {
  duplicateReasons,
  fieldSpecs,
  labels,
  number,
  type Kind,
  type DuplicatePreview,
} from "../lib/customers";
import { ActionButton, Feedback } from "./account-ui";
import { ConfirmPanel, FormField, Pager } from "./customer-controls";

type ImportAttempt = {
  content: string;
  confirmation: string;
  acknowledge_duplicates: boolean;
};
export type ImportDraft = { name: string; file: File; attempt?: ImportAttempt };
type Preview = {
  confirmation: string | null;
  summary: { total: number; valid: number; invalid: number; warnings: number };
  rows: {
    line: number;
    data: Record<string, string | number | string[] | null> | null;
    errors: Record<string, string[]>;
    existing: DuplicatePreview;
    in_file: { line: number; reasons: (keyof typeof duplicateReasons)[] }[];
  }[];
};
const MAX_BYTES = 256 * 1024;

export function CustomerImportPreview({
  kind,
  leadMode = false,
  activityMode = false,
  orderMode = false,
  productMode = false,
  organizationId,
  organizationName,
  userId,
  draft,
  onChange,
  disabled,
  onAccessError,
  onPendingChange,
  onComplete,
}: {
  kind: Kind;
  leadMode?: boolean;
  activityMode?: boolean;
  orderMode?: boolean;
  productMode?: boolean;
  organizationId: string;
  organizationName: string;
  userId: number;
  draft: ImportDraft | null;
  onChange: (draft: ImportDraft | null) => void;
  disabled: boolean;
  onAccessError: () => void;
  onPendingChange: (pending: boolean) => void;
  onComplete: (count: number, replayed: boolean) => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const commitTrigger = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [commitError, setCommitError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [page, setPage] = useState(1);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const previewContent = useRef("");
  const fields = [
    ...(productMode
      ? productFields
      : orderMode
        ? [
            "number",
            "sale_date",
            "person_id",
            "company_id",
            "source_lead_id",
            "status",
            "payment_status",
            "payment_method",
            "notes",
            "tax",
            "discount",
            "shipping",
            "items",
          ].map((name) => ({
            name,
            label: (
              {
                number: "شماره فروش",
                sale_date: "تاریخ فروش (میلادی)",
                person_id: "شناسه شخص",
                company_id: "شناسه شرکت",
                source_lead_id: "شناسه لید مرتبط",
                status: "وضعیت فروش",
                payment_status: "وضعیت پرداخت",
                payment_method: "روش پرداخت",
                notes: "یادداشت‌ها",
                tax: "مالیات (تومان)",
                discount: "تخفیف (تومان)",
                shipping: "ارسال (تومان)",
                items: "اقلام (JSON)",
              } as Record<string, string>
            )[name],
          }))
        : activityMode
          ? activityFileFields
          : leadMode
            ? leadFields
            : fieldSpecs[kind]),
    ...(!productMode &&
    !orderMode &&
    !activityMode &&
    !leadMode &&
    kind === "people"
      ? [{ name: "status", label: "وضعیت شخص" }]
      : []),
  ];
  const recordLabels = productMode
    ? { plural: "محصولات", single: "محصول" }
    : orderMode
      ? { plural: "فروش‌ها", single: "فروش" }
      : activityMode
        ? { plural: "وظایف", single: "وظیفه" }
        : leadMode
          ? { plural: "لیدها", single: "لید" }
          : labels[kind];
  const resourceKind = productMode
    ? "products"
    : orderMode
      ? "sales/orders"
      : activityMode
        ? "activities"
        : leadMode
          ? "leads"
          : kind;
  const recordApi = <T,>(
    organizationId: string,
    path: string,
    options: ApiOptions,
  ) =>
    api<T>(
      productMode
        ? path.replace(/^people\//, "")
        : orderMode
          ? path.replace(/^people\//, "orders/")
          : leadMode || activityMode
            ? path.replace(/^people\//, "")
            : path,
      {
        ...options,
        organizationId,
        namespace: productMode
          ? "products"
          : orderMode
            ? "sales"
            : activityMode
              ? "activities"
              : leadMode
                ? "leads"
                : "customers",
      },
    );
  function displayValue(
    field: string,
    value: string | number | string[] | null,
  ) {
    if (Array.isArray(value)) return value.join("، ");
    if (productMode) {
      if (value === null) return "ثبت نشده";
      if (field === "status") return value === "active" ? "فعال" : "غیرفعال";
      if (["price", "cost"].includes(field)) return formatToman(String(value));
      if (["stock", "min_stock", "weight_grams"].includes(field))
        return quantityDisplay(String(value));
      return value;
    }
    if (orderMode) return value === null ? "ثبت نشده" : String(value);
    if (activityMode) {
      if (value === null || value === "") return "ثبت نشده";
      const maps: Record<string, Record<string, string>> = {
        status: activityStatuses,
        kind: activityKinds,
        target_type: targetKinds,
        priority: activityPriorities,
      };
      if (maps[field]) return maps[field][String(value)] || String(value);
      if (field === "due_at" || field === "remind_at")
        return formatAccountDate(String(value));
      if (field === "progress") return number(Number(value)) + "٪";
      return value;
    }
    if (leadMode) {
      if (field === "status") return statusLabel(String(value));
      if (field === "priority")
        return (
          { high: "بالا", normal: "عادی", low: "پایین" }[String(value)] ||
          "نامشخص"
        );
      if (field === "probability")
        return `${new Intl.NumberFormat("fa-IR").format(Number(value))}٪`;
      if (field === "estimated_amount")
        return formatToman(value === null ? null : String(value));
      if (field === "expected_close_date" && value)
        return displayPersianDate(String(value));
    }
    if (field === "status")
      return value === "active"
        ? "فعال"
        : value === "potential"
          ? "مشتری بالقوه"
          : "غیرفعال";
    if (field === "customer_type") return value === "legal" ? "حقوقی" : "حقیقی";
    return value;
  }
  const fieldLabels: Record<string, string> = Object.fromEntries(
    fields.map((field) => [field.name, field.label]),
  );
  useEffect(
    () => () => {
      controller.current?.abort();
      onPendingChange(false);
    },
    [onPendingChange],
  );
  useEffect(() => {
    if (preview) resultHeading.current?.focus();
  }, [preview]);
  function restorePicker(file?: File) {
    if (!picker.current) return;
    if (!file) {
      picker.current.value = "";
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    picker.current.files = transfer.files;
  }
  useEffect(() => {
    restorePicker(draft?.file);
  }, [draft]);
  useEffect(() => {
    if (disabled) {
      controller.current?.abort();
      pending.current = false;
      setBusy(false);
    }
  }, [disabled]);

  function selectFile(file?: File) {
    if (!file || disabled || reviewing || draft?.attempt || pending.current)
      return;
    setError("");
    setCommitError("");
    setMessage("");
    setPreview(null);
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      restorePicker(draft?.file);
      setError(
        "فایل CSV با UTF-8 یا Excel با پسوند xlsx پذیرفته می‌شود؛ فایل قبلی، اگر وجود داشته باشد، حفظ شده است.",
      );
      return;
    }
    if (!file.size || file.size > MAX_BYTES) {
      restorePicker(draft?.file);
      setError(
        "فایل باید غیرخالی و حداکثر ۲۵۶ کیلوبایت باشد؛ فایل قبلی حفظ شده است.",
      );
      return;
    }
    // Store the File synchronously in the parent: closing the OS picker may
    // trigger account revalidation before an asynchronous read can finish.
    onChange({ name: file.name, file });
  }
  function downloadTemplate() {
    const blob = new Blob(
      ["\ufeff" + fields.map((field) => field.name).join(",") + "\r\n"],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `newcrm-${resourceKind.replaceAll("/", "-")}-template.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || disabled || reviewing || draft?.attempt) return;
    if (!draft) {
      setError("ابتدا فایل CSV یا Excel را انتخاب کنید.");
      picker.current?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    setCommitError("");
    setMessage("");
    setPreview(null);
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const buffer = await draft.file.arrayBuffer();
      if (ctrl.signal.aborted) return;
      const content = /\.xlsx$/i.test(draft.file.name)
        ? ((
            await (
              await customerFileRequest(
                `${resourceKind}/spreadsheet/`,
                organizationId,
                userId,
                { file: draft.file, signal: ctrl.signal },
              )
            ).json()
          ).content as string)
        : new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      const result = await recordApi<Preview>(
        organizationId,
        `${kind}/import-preview/`,
        {
          body: { content },
          signal: ctrl.signal,
          expectedUserId: userId,
        },
      );
      if (ctrl.signal.aborted) return;
      previewContent.current = content;
      setPreview(result);
      setAcknowledged(false);
      setPage(1);
    } catch (failure) {
      if (ctrl.signal.aborted) return;
      setError(
        failure instanceof TypeError
          ? "فایل با UTF-8 خوانده نشد؛ آن را با CSV UTF-8 ذخیره و دوباره انتخاب کنید."
          : failure instanceof ApiError && failure.fields.content?.length
            ? failure.fields.content.join(" ")
            : failure instanceof Error
              ? failure.message
              : "پیش‌نمایش دریافت نشد؛ دوباره تلاش کنید.",
      );
      if (failure instanceof ApiError && [403, 409].includes(failure.status))
        onAccessError();
      else picker.current?.focus();
    } finally {
      if (controller.current === ctrl) {
        pending.current = false;
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }
  }
  function closeReview() {
    setReviewing(false);
    onPendingChange(false);
    requestAnimationFrame(() => commitTrigger.current?.focus());
  }
  async function commitImport() {
    if (!draft || pending.current || disabled) return;
    const attempt =
      draft.attempt ||
      (preview?.confirmation
        ? {
            content: previewContent.current,
            confirmation: preview.confirmation,
            acknowledge_duplicates: acknowledged,
          }
        : null);
    if (!attempt || pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    onPendingChange(true);
    setReviewing(false);
    setPreview(null);
    setError("");
    setCommitError("");
    setMessage("");
    onChange({ ...draft, attempt });
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const result = await recordApi<{ count: number; replayed: boolean }>(
        organizationId,
        `${kind}/import/`,
        {
          body: attempt,
          signal: ctrl.signal,
          expectedUserId: userId,
        },
      );
      if (!ctrl.signal.aborted) onComplete(result.count, result.replayed);
    } catch (failure) {
      if (ctrl.signal.aborted) return;
      if (failure instanceof ApiError && [400, 409].includes(failure.status)) {
        onChange({ ...draft, attempt: undefined });
        setCommitError(
          "ثبت تازه تأیید نشد؛ پیش‌نمایش فایل را دوباره بگیرید و نتیجه و شباهت‌ها را بررسی کنید. اگر این فایل قبلاً ثبت شده باشد، دوباره ساخته نمی‌شود.",
        );
      } else if (failure instanceof ApiError && failure.status === 403) {
        setCommitError(failure.message);
        onAccessError();
      } else {
        setCommitError(
          "نتیجه ورود فایل مشخص نیست؛ با همان فایل، نتیجه را بررسی و در صورت نیاز ثبت را تکمیل کنید.",
        );
      }
    } finally {
      if (controller.current === ctrl) {
        pending.current = false;
        onPendingChange(false);
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }
  }
  const locked = disabled || reviewing || !!draft?.attempt;
  return (
    <>
      <p className="account-description">
        فایل {recordLabels.plural} ابتدا بررسی می‌شود. ثبت همه ردیف‌ها پس از
        بازبینی و تأیید شما انجام می‌شود و مسئول پرونده‌ها خود شما خواهید بود.
        هیچ ادغام یا بازنویسی خودکاری انجام نمی‌شود. فایل فقط در حافظه این صفحه
        نگهداری می‌شود.
      </p>
      <section
        className="account-panel customer-import-help"
        aria-label="قالب فایل"
      >
        <h2>فایل را آماده کنید</h2>
        <p>
          فایل CSV با UTF-8، جداکننده ویرگول، حداکثر ۲۵۶ کیلوبایت و ۱۰۰ ردیف
          داده. فایل XLSX باید یک شیت و بدون فرمول یا ماکرو باشد. عنوان ستون‌ها
          باید دقیقاً مانند قالب باشد؛ ستون‌های اختیاری را می‌توانید حذف کنید.
        </p>
        <p>
          {productMode
            ? "نام، کد SKU و قیمت صحیح تومان لازم است. کد در سازمان یکتا است. موجودی، حداقل و وزن حداکثر سه اعشار دارند؛ قیمت خرید اختیاری است. واحد شمارش و وضعیت active یا inactive را از قالب رعایت کنید. ورود فایل هیچ محصول موجودی را بازنویسی نمی‌کند."
            : orderMode
              ? "شماره و تاریخ فروش، UUID یک مشتری (person_id یا company_id) و items لازم است. اقلام به صورت رشته JSON از نام، کد، شرح، تعداد و unit_price صحیح تومان هستند؛ از خروجی یک فروش به عنوان الگو استفاده کنید. وضعیت پرداخت صرفاً ثبت دستی است."
              : activityMode
                ? "عنوان، نوع و سررسید لازم است؛ kind برابر task، call یا meeting؛ status برابر planned یا in_progress؛ priority برابر low، normal یا high است. برای وظیفهٔ مستقل target_type را none و target_id را خالی بگذارید. تماس و جلسه به نوع و UUID پروندهٔ مجاز نیاز دارند. زمان‌ها باید ISO 8601 با Z یا اختلاف منطقهٔ زمانی باشند. مسئول ردیف‌های فایل خود شما هستید. تکمیل یا لغو از صفحهٔ فعالیت انجام می‌شود."
                : leadMode
                  ? "عنوان لید لازم است. لید تبدیل‌شده از فایل ساخته نمی‌شود؛ تبدیل را از صفحهٔ همان لید و با بازبینی انجام دهید."
                  : kind === "people"
                    ? "حداقل نام یا نام خانوادگی لازم است. وضعیت مشتری active، potential یا inactive است؛ خالی بماند فعال در نظر گرفته می‌شود."
                    : "نام تجاری لازم است."}{" "}
          برای چند تلفن، ایمیل، برچسب یا نشانی از | بین مقدارها استفاده کنید.
          مقدار دارای ویرگول یا سطر جدید باید داخل نقل‌قول باشد.
        </p>
        <ActionButton
          className="secondary"
          disabled={locked || busy}
          onClick={downloadTemplate}
        >
          دریافت قالب CSV
        </ActionButton>
        <details>
          <summary>راهنمای ستون‌ها</summary>
          <dl className="customer-import-columns">
            {fields.map((field) => (
              <div key={field.name}>
                <dt>
                  <code dir="ltr">{field.name}</code>
                </dt>
                <dd>{field.label}</dd>
              </div>
            ))}
          </dl>
        </details>
      </section>
      <Feedback
        message={
          commitError ||
          (error
            ? "بررسی فایل انجام نشد؛ پیام کنار انتخاب فایل را بررسی کنید."
            : message)
        }
        kind={error || commitError ? "error" : "info"}
      />
      <form
        className="account-panel customer-import-file"
        noValidate
        aria-busy={busy}
        onSubmit={inspect}
      >
        <FormField
          id="customer-csv"
          label="فایل CSV یا Excel"
          error={error}
          hint="فقط یک فایل CSV یا XLSX؛ انتخاب فایل جدید، پیش‌نمایش قبلی را باطل می‌کند."
        >
          <input
            ref={picker}
            id="customer-csv"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-invalid={!!error}
            aria-describedby="customer-csv-error customer-csv-hint"
            disabled={locked || busy}
            onChange={(event) => {
              void selectFile(event.target.files?.[0]);
            }}
          />
        </FormField>
        <p className="customer-import-filename">
          {draft ? (
            <>
              فایل انتخاب‌شده: <bdi>{draft.name}</bdi>
            </>
          ) : (
            "هنوز فایلی انتخاب نشده است."
          )}
        </p>
        {busy && (
          <p role="status">
            {draft?.attempt
              ? "در حال ثبت فایل…"
              : "در حال خواندن و بررسی فایل…"}
          </p>
        )}
        <div className="session-actions">
          <ActionButton type="submit" busy={busy} disabled={locked}>
            بررسی و پیش‌نمایش فایل
          </ActionButton>
          {busy && !draft?.attempt && (
            <ActionButton
              type="button"
              className="secondary"
              onClick={() => {
                controller.current?.abort();
                pending.current = false;
                setBusy(false);
                setError("");
                setMessage(
                  "بررسی لغو شد؛ فایل حفظ شده است و چیزی ثبت نشده است.",
                );
              }}
            >
              لغو بررسی
            </ActionButton>
          )}
          {draft && (
            <ActionButton
              type="button"
              className="secondary"
              disabled={locked || busy}
              onClick={() => {
                onChange(null);
                setPreview(null);
                setError("");
                setMessage("");
                picker.current?.focus();
              }}
            >
              کنار گذاشتن فایل
            </ActionButton>
          )}
        </div>
      </form>
      {draft?.attempt && !busy && (
        <section
          className="account-panel customer-review"
          aria-label="بررسی نتیجه ورود فایل"
        >
          <p>
            ممکن است ثبت قبلی انجام شده باشد. اطلاعات همان درخواست حفظ شده است؛
            تلاش دوباره، رسید قبلی را بازیابی می‌کند یا ثبت انجام‌نشده را تکمیل
            می‌کند. درخواست خودکار تکرار نمی‌شود.
          </p>
          <ActionButton
            onClick={() => void commitImport()}
            disabled={disabled}
            busy={busy}
          >
            بررسی و تکمیل ورود فایل
          </ActionButton>
        </section>
      )}
      {reviewing && (
        <ConfirmPanel
          title="تأیید ورود فایل"
          description={`همه ${number(preview?.summary.total || 0)} ردیف فایل «${draft?.name || ""}» در سازمان «${organizationName}» به صورت ${recordLabels.single} جدید با مسئولیت شما ثبت می‌شوند. هیچ پرونده قبلی تغییر نمی‌کند؛ اگر یک ردیف خطا داشته باشد هیچ ردیفی ثبت نمی‌شود.`}
          label="ثبت همه ردیف‌های فایل"
          busy={busy}
          onCancel={closeReview}
          onConfirm={() => void commitImport()}
        />
      )}
      {preview && !draft?.attempt && (
        <section
          className="account-panel customer-import-results"
          aria-label="نتیجه بررسی فایل"
        >
          <h2 ref={resultHeading} tabIndex={-1}>
            نتیجه بررسی فایل
          </h2>
          <p role="status">
            {number(preview.summary.total)} ردیف؛{" "}
            {number(preview.summary.valid)} ردیف معتبر،{" "}
            {number(preview.summary.invalid)} ردیف دارای خطا و{" "}
            {number(preview.summary.warnings)} ردیف با هشدار شباهت.
          </p>
          <p>
            هیچ داده‌ای ثبت نشده است. خطاها را در فایل اصلاح و دوباره انتخاب
            کنید. شباهت به معنی یکی‌بودن پرونده‌ها نیست؛ فقط پرونده‌های قابل
            مشاهده و ردیف‌های معتبر همین فایل بررسی شده‌اند.
          </p>
          {preview.rows.slice((page - 1) * 10, page * 10).map((row) => (
            <details
              className="customer-import-row"
              key={row.line}
              open={Object.keys(row.errors).length ? true : undefined}
            >
              <summary>
                ردیف {number(row.line)} —{" "}
                <bdi>
                  {row.data
                    ? String(
                        row.data.name ||
                          (leadMode || activityMode ? row.data.title : null) ||
                          `${row.data.first_name || ""} ${row.data.last_name || ""}`.trim(),
                      )
                    : "نیاز به اصلاح"}
                </bdi>{" "}
                —{" "}
                {Object.keys(row.errors).length
                  ? "دارای خطا"
                  : row.existing.results.length || row.in_file.length
                    ? "معتبر، با هشدار شباهت"
                    : "معتبر"}
              </summary>
              {Object.entries(row.errors).map(([field, messages]) => (
                <p className="customer-import-error" key={field}>
                  {fieldLabels[field] || "ردیف"}: {messages.join(" ")}
                </p>
              ))}
              {row.data && (
                <dl className="customer-import-columns">
                  {Object.entries(row.data).map(([field, value]) =>
                    value !== null &&
                    value !== "" &&
                    (!Array.isArray(value) || value.length > 0) ? (
                      <div key={field}>
                        <dt>{fieldLabels[field] || field}</dt>
                        <dd>
                          <bdi>{displayValue(field, value)}</bdi>
                        </dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              )}
              {row.existing.results.length > 0 && (
                <>
                  <h3>پرونده‌های مشابه در دسترس</h3>
                  <ul>
                    {row.existing.results.map((match) => (
                      <li key={match.id}>
                        <bdi>{match.label}</bdi>
                        {match.archived ? " (بایگانی‌شده)" : ""}:{" "}
                        {match.reasons
                          .map((reason) => duplicateReasons[reason])
                          .join("، ")}
                      </li>
                    ))}
                  </ul>
                  {row.existing.has_more && (
                    <p>۵ مورد نخست؛ موارد مشابه بیشتری وجود دارد.</p>
                  )}
                </>
              )}
              {row.in_file.length > 0 && (
                <>
                  <h3>ردیف‌های مشابه همین فایل</h3>
                  <ul>
                    {row.in_file.map((match) => (
                      <li key={match.line}>
                        ردیف {number(match.line)}:{" "}
                        {match.reasons
                          .map((reason) => duplicateReasons[reason])
                          .join("، ")}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </details>
          ))}
          {preview.summary.invalid > 0 ? (
            <p className="customer-import-error">
              برای ثبت، ابتدا همه خطاهای فایل را اصلاح و پیش‌نمایش تازه بگیرید.
            </p>
          ) : (
            <>
              {preview.summary.warnings > 0 && (
                <label
                  className="customer-import-ack"
                  htmlFor="customer-import-ack"
                >
                  <input
                    id="customer-import-ack"
                    type="checkbox"
                    checked={acknowledged}
                    disabled={locked || busy}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  <span>
                    شباهت‌ها را بررسی کردم و ثبت همه ردیف‌ها به صورت پرونده‌های
                    جداگانه را تأیید می‌کنم.
                  </span>
                </label>
              )}
              <ActionButton
                ref={commitTrigger}
                disabled={
                  locked ||
                  busy ||
                  !preview.confirmation ||
                  (!!preview.summary.warnings && !acknowledged)
                }
                onClick={() => {
                  setReviewing(true);
                  onPendingChange(true);
                }}
              >
                بازبینی و ثبت فایل
              </ActionButton>
            </>
          )}
          <Pager
            page={page}
            count={preview.rows.length}
            previous={page > 1}
            next={page * 10 < preview.rows.length}
            onPage={(value) => {
              setPage(value);
              resultHeading.current?.focus();
            }}
          />
        </section>
      )}
    </>
  );
}
