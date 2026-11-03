"use client";
import type { Product } from "../lib/products";
import { useCallback, useEffect, useRef, useState } from "react";
import { customerFileRequest, downloadBlob } from "../lib/customer-files";
import { api, ApiError } from "../lib/api";
import { useAccount } from "../lib/use-account";
import { useDraftNavigation } from "../lib/use-draft-navigation";
import {
  parseToman,
  formatToman,
  parsePersianDate,
  persianDate,
  displayPersianDate,
  latinDigits,
} from "../lib/sales-entry";
import { ActionButton, Feedback, LoadingAccount } from "./account-ui";
import { FormField, SearchBox, Pager, ConfirmPanel } from "./customer-controls";
import { CustomerPicker } from "./customer-picker";
import { RecordFields, RecordStatus } from "./record-fields";
import { CustomerFileActions } from "./customer-file-actions";
import {
  CustomerAttachments,
  type AttachmentDraft,
} from "./customer-attachments";
import {
  CustomerImportPreview,
  type ImportDraft,
} from "./customer-import-preview";
import type { Page } from "../lib/customers";
const states = {
  pending: "در انتظار",
  confirmed: "تأیید شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};
const payments = {
  unpaid: "پرداخت نشده",
  partial: "پرداخت بخشی",
  paid: "پرداخت شده",
};
const methods = {
  "": "ثبت نشده",
  bank: "انتقال بانکی",
  cash: "نقدی",
  card: "کارت",
};
type Item = {
  product_id?: string;
  name: string;
  code: string;
  description: string;
  quantity: string;
  unit_price: string;
};
type Order = {
  source_lead_id: string | null;
  id: string;
  version: number;
  number: string;
  sale_date: string;
  person_id: string | null;
  company_id: string | null;
  status: keyof typeof states;
  payment_status: keyof typeof payments;
  payment_method: keyof typeof methods;
  notes: string;
  items: Item[];
  tax: string;
  discount: string;
  shipping: string;
  subtotal: string;
  total: string;
  owner_label: string;
  customer_label: string;
  customer: {
    id: string;
    kind: string;
    label: string;
    phones: string[];
    emails: string[];
  };
};
type Draft = {
  source_lead_id: string;
  number: string;
  sale_date: string;
  person_id: string;
  company_id: string;
  status: string;
  payment_status: string;
  payment_method: string;
  notes: string;
  tax: string;
  discount: string;
  shipping: string;
  items: Item[];
};
const line = (): Item => ({
  name: "",
  code: "",
  description: "",
  quantity: "1",
  unit_price: "0",
});
function totals(d: Draft) {
  let subtotal = BigInt("0");
  for (const i of d.items) {
    const qty = latinDigits(i.quantity);
    if (!/^\d+(\.\d{1,2})?$/.test(qty) || Number(qty) <= 0)
      throw Error("تعداد هر قلم باید مثبت و حداکثر دو اعشار باشد.");
    const q =
      BigInt(qty.split(".")[0]) * BigInt("100") +
      BigInt((qty.split(".")[1] || "").padEnd(2, "0"));
    const amount = q * BigInt(parseToman(i.unit_price) || "0");
    if (amount % BigInt("100"))
      throw Error("حاصل هر قلم باید تومان صحیح باشد.");
    subtotal += amount / BigInt("100");
  }
  const total =
    subtotal +
    BigInt(parseToman(d.tax) || "0") +
    BigInt(parseToman(d.shipping) || "0") -
    BigInt(parseToman(d.discount) || "0");
  if (
    total < BigInt("0") ||
    total > BigInt("999999999999999999") ||
    subtotal > BigInt("999999999999999999")
  )
    throw Error("جمع مالی یا تخفیف معتبر نیست.");
  return { subtotal: subtotal.toString(), total: total.toString() };
}
const blank = (): Draft => ({
  source_lead_id: "",
  number: "S-" + crypto.randomUUID().slice(0, 12).toUpperCase(),
  sale_date: persianDate(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" }),
  ),
  person_id: "",
  company_id: "",
  status: "pending",
  payment_status: "unpaid",
  payment_method: "",
  notes: "",
  tax: "0",
  discount: "0",
  shipping: "0",
  items: [],
});
const toDraft = (o: Order): Draft => ({
  source_lead_id: o.source_lead_id || "",
  number: o.number,
  sale_date: persianDate(o.sale_date),
  person_id: o.person_id || "",
  company_id: o.company_id || "",
  status: o.status,
  payment_status: o.payment_status,
  payment_method: o.payment_method,
  notes: o.notes,
  tax: o.tax,
  discount: o.discount,
  shipping: o.shipping,
  items: o.items,
});
export function OrderWorkspace() {
  const { account, refresh } = useAccount();
  const ready = account.phase === "ready" && account.data.current;
  const context = useRef({ org: "", user: 0 });
  if (ready)
    context.current = {
      org: account.data.current!.organization_id,
      user: account.data.user.user_id,
    };
  const { org, user } = context.current;
  const mutation = useRef<AbortController | null>(null),
    pending = useRef(false);
  const [defaultTax, setDefaultTax] = useState<string | null>(null);
  useEffect(() => {
    setDefaultTax(null);
    if (account.phase !== "ready" || !account.data.current) return;
    const controller = new AbortController();
    api<{ tax_rate: string }>("settings/preferences/", {
      organizationId: account.data.current.organization_id,
      expectedUserId: account.data.user.user_id,
      signal: controller.signal,
    })
      .then((value) => {
        if (!controller.signal.aborted) setDefaultTax(value.tax_rate);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [account]);
  const [latest, setLatest] = useState<Order | null>(null);
  useEffect(() => () => mutation.current?.abort(), []);
  const [view, setView] = useState<
      "list" | "edit" | "detail" | "invoice" | "import"
    >("list"),
    [draft, setDraft] = useState<Draft | null>(null),
    [base, setBase] = useState<Order | null>(null),
    [record, setRecord] = useState<Order | null>(null),
    [list, setList] = useState<Page<Order> | null>(null),
    [listStamp, setListStamp] = useState<object | null>(null),
    [listFilter, setListFilter] = useState(""),
    [detailStamp, setDetailStamp] = useState<object | null>(null),
    [detailAccessError, setDetailAccessError] = useState(""),
    [readRetry, setReadRetry] = useState(0),
    [summary, setSummary] = useState<Record<string, string | number> | null>(
      null,
    ),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [payment, setPayment] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [filesBusy, setFilesBusy] = useState(false),
    [attachment, setAttachment] = useState<AttachmentDraft | null>(null),
    [importDraft, setImportDraft] = useState<ImportDraft | null>(null),
    [review, setReview] = useState(false),
    [attempt, setAttempt] = useState<{
      body: object;
      key: string;
      id?: string;
    } | null>(null),
    [errors, setErrors] = useState<Record<string, string>>({});
  const firstProduct = useRef(true);
  const currentScope = useRef(""),
    heading = useRef<HTMLHeadingElement>(null);
  const updatePending = useCallback((v: boolean) => setFilesBusy(v), []);
  const dirty =
    !!attachment ||
    !!importDraft ||
    !!attempt ||
    (!!draft &&
      JSON.stringify(draft) !== JSON.stringify(base ? toDraft(base) : null));
  const nav = useDraftNavigation(dirty, busy || filesBusy, () => {
    setDraft(null);
    setAttempt(null);
    setAttachment(null);
    setImportDraft(null);
    setReview(false);
  });
  const can = (op: string) =>
    !!ready && account.data.operations.includes("sale." + op);
  const request = useCallback(
    <T,>(path: string, options: Parameters<typeof api>[1] = {}) =>
      api<T>("orders/" + path, {
        ...options,
        namespace: "sales",
        organizationId: org,
        expectedUserId: user,
      }),
    [org, user],
  );
  const filter = new URLSearchParams({
    q: search,
    status,
    payment_status: payment,
    page: String(page),
  });
  let filterError = "";
  try {
    if (from) filter.set("date_from", parsePersianDate(from) || "");
    if (to) filter.set("date_to", parsePersianDate(to) || "");
  } catch (e) {
    filterError = (e as Error).message;
  }
  const filterKey = filter.toString();
  useEffect(() => {
    const scope = org + ":" + user;
    if (currentScope.current !== scope) {
      currentScope.current = scope;
      mutation.current?.abort();
      setView("list");
      setDraft(null);
      setBase(null);
      setLatest(null);
      setRecord(null);
      setList(null);
      setSummary(null);
      setAttempt(null);
      setAttachment(null);
      setImportDraft(null);
      setError("");
      nav.reset();
    }
  }, [org, user]);
  useEffect(() => {
    if (!ready) return;
    setListStamp(null);
    setSummary(null);
    if (filterError) {
      setList(null);
      return;
    }
    const ctrl = new AbortController();
    setList(null);
    setError("");
    Promise.all([
      request<Page<Order>>("?" + filterKey, { signal: ctrl.signal }),
      request<Record<string, string | number>>("summary/", {
        signal: ctrl.signal,
      }),
    ])
      .then(([rows, stats]) => {
        if (!ctrl.signal.aborted) {
          setList(rows);
          setListStamp(account);
          setListFilter(filterKey);
          setSummary(stats);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [request, ready, filterKey, filterError, revision]);
  useEffect(() => {
    if (!ready || !firstProduct.current) return;
    const params = new URLSearchParams(window.location.search),
      rid = params.get("record"),
      pid = params.get("product");
    if (rid && /^[0-9a-f-]{36}$/i.test(rid)) {
      firstProduct.current = false;
      void open(rid);
      return;
    }
    if (!pid || !/^[0-9a-f-]{36}$/i.test(pid)) {
      firstProduct.current = false;
      return;
    }
    const ctrl = new AbortController(),
      scope = currentScope.current;
    api<Product>(pid + "/", {
      namespace: "products",
      organizationId: org,
      expectedUserId: user,
      signal: ctrl.signal,
    })
      .then((p) => {
        if (!ctrl.signal.aborted && scope === currentScope.current) {
          firstProduct.current = false;
          if (p.archived_at || p.status !== "active") {
            setError("محصول برای فروش تازه فعال نیست.");
            return;
          }
          edit(null);
          setDraft({
            ...blank(),
            items: [
              {
                product_id: p.id,
                name: p.name,
                code: p.sku,
                description: p.description.slice(0, 500),
                quantity: "1",
                unit_price: p.price,
              },
            ],
          });
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      });
    return () => ctrl.abort();
  }, [ready, org, user]);
  const accessId =
    view === "detail" || view === "invoice"
      ? record?.id
      : view === "edit"
        ? base?.id
        : null;
  useEffect(() => {
    if (!ready || !accessId) return;
    const ctrl = new AbortController();
    setDetailStamp(null);
    setDetailAccessError("");
    request<Order>(accessId + "/", { signal: ctrl.signal })
      .then((value) => {
        if (!ctrl.signal.aborted) {
          if (view !== "edit") setRecord(value);
          setDetailStamp(account);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setDetailAccessError(e.message);
          setDetailStamp(account);
        }
      });
    return () => ctrl.abort();
  }, [request, account, accessId, readRetry]);
  async function open(id: string) {
    if (pending.current) return;
    pending.current = true;
    setError("");
    setBusy(true);
    const scope = currentScope.current;
    try {
      const value = await request<Order>(id + "/");
      if (scope === currentScope.current) {
        setRecord(value);
        setView("detail");
        setDraft(null);
        heading.current?.focus();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function readLatest() {
    if (!base || pending.current) return;
    pending.current = true;
    setBusy(true);
    setLatest(null);
    const ctrl = new AbortController();
    mutation.current = ctrl;
    const scope = currentScope.current;
    try {
      const value = await request<Order>(base.id + "/", {
        signal: ctrl.signal,
      });
      if (!ctrl.signal.aborted && scope === currentScope.current)
        setLatest(value);
    } catch (e) {
      if (!ctrl.signal.aborted && scope === currentScope.current)
        setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function downloadPDF() {
    if (!record || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const ctrl = new AbortController();
    mutation.current = ctrl;
    const scope = currentScope.current;
    try {
      const response = await customerFileRequest(
        `sales/orders/${record.id}/pdf/`,
        org,
        user,
        { signal: ctrl.signal },
      );
      const blob = await response.blob();
      if (scope === currentScope.current && !ctrl.signal.aborted)
        downloadBlob(blob, `invoice-${record.number}.pdf`);
    } catch (e) {
      if (scope === currentScope.current && !ctrl.signal.aborted)
        setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function edit(o: Order | null) {
    setAttempt(null);
    setLatest(null);
    setBase(o);
    setDraft(o ? toDraft(o) : blank());
    setView("edit");
    setError("");
    setErrors({});
  }
  async function save(retry = false) {
    if (pending.current || !draft) return;
    setReview(false);
    let operation = attempt;
    if (!retry) {
      try {
        totals(draft);
        if (!draft.items.length || draft.items.some((i) => !i.name.trim()))
          throw Error("حداقل یک قلم با نام محصول لازم است.");
        if (!draft.person_id && !draft.company_id)
          throw Error("مشتری را انتخاب کنید.");
        const date = parsePersianDate(draft.sale_date);
        if (!date) throw Error("تاریخ فروش لازم است.");
        operation = {
          body: {
            ...draft,
            sale_date: date,
            source_lead_id: draft.source_lead_id || null,
            person_id: draft.person_id || null,
            company_id: draft.company_id || null,
            tax: parseToman(draft.tax) || "0",
            discount: parseToman(draft.discount) || "0",
            shipping: parseToman(draft.shipping) || "0",
            items: draft.items.map((i) => ({
              ...i,
              quantity: latinDigits(i.quantity),
              unit_price: parseToman(i.unit_price) || "0",
            })),
            ...(base ? { version: base.version } : {}),
          },
          key: crypto.randomUUID(),
          id: base?.id,
        };
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    if (!operation) return;
    pending.current = true;
    const ctrl = new AbortController();
    mutation.current = ctrl;
    setBusy(true);
    setReview(false);
    setError("");
    const scope = currentScope.current;
    try {
      const value = await request<Order>(
        operation.id ? operation.id + "/" : "",
        {
          signal: ctrl.signal,
          method: operation.id ? "PATCH" : "POST",
          body: operation.body,
          idempotencyKey: operation.key,
        },
      );
      if (scope !== currentScope.current) return;
      setAttempt(null);
      setDraft(null);
      setRecord(value);
      setView("detail");
      setRevision((v) => v + 1);
      setMessage("فروش ذخیره شد.");
    } catch (e) {
      if (scope !== currentScope.current) return;
      if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) {
        setAttempt(operation);
        setError(
          "نتیجه ثبت مشخص نیست؛ ثبت تازه نزنید و نتیجه همین درخواست را بررسی کنید.",
        );
      } else {
        setAttempt(null);
        setError(
          e.fields?.items?.join(" ") ||
            e.fields?.__all__?.join(" ") ||
            e.message,
        );
        if (e instanceof ApiError)
          setErrors(
            Object.fromEntries(
              Object.entries(e.fields).map(([k, v]) => [k, v.join(" ")]),
            ),
          );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (Object.keys(errors).length) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('.order-workspace [aria-invalid="true"]')
          ?.focus(),
      );
    }
  }, [errors]);
  if (!ready)
    return account.phase === "error" ? (
      <>
        <Feedback message={account.message} />
        <ActionButton onClick={() => void refresh()}>
          بررسی دوباره حساب
        </ActionButton>
      </>
    ) : account.phase === "anonymous" ? (
      <section className="account-panel">
        <h1>برای ادامه وارد حساب شوید</h1>
        <p>پیش‌نویس در این برگه حفظ شده است.</p>
        <a href="/login" target="_blank" rel="noreferrer">
          ورود در برگه دیگر
        </a>
        <ActionButton onClick={() => void refresh()}>
          بررسی دوباره حساب
        </ActionButton>
      </section>
    ) : (
      <LoadingAccount />
    );
  if (accessId && (detailStamp !== account || detailAccessError))
    return (
      <section className="account-panel">
        <h1>بررسی دسترسی فروش</h1>
        {detailStamp !== account ? (
          <p role="status">در حال بررسی دسترسی…</p>
        ) : (
          <>
            <Feedback message={detailAccessError} />
            <ActionButton onClick={() => setReadRetry((v) => v + 1)}>
              تلاش دوباره
            </ActionButton>
            <ActionButton
              className="secondary"
              onClick={() =>
                nav.navigate(() => {
                  setView("list");
                  setRecord(null);
                  setBase(null);
                })
              }
            >
              بازگشت به فهرست فروش
            </ActionButton>
          </>
        )}
      </section>
    );
  const visibleList =
    listStamp === account && listFilter === filterKey && !filterError
      ? list
      : null;
  let computed: { subtotal: string; total: string } | null = null;
  try {
    if (draft) computed = totals(draft);
  } catch {}
  const blocked = busy || filesBusy || review || nav.confirming;
  return (
    <section
      className={
        "customer-workspace customer-reference-workspace order-workspace " +
        (view === "invoice" ? "order-invoice-view" : "")
      }
    >
      <div className="account-page-heading no-print">
        <div>
          <span className="account-kicker">{account.data.current!.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            {view === "list"
              ? "مدیریت فروش"
              : view === "edit"
                ? base
                  ? "ویرایش فروش"
                  : "فروش جدید"
                : view === "invoice"
                  ? "فاکتور فروش"
                  : view === "import"
                    ? "ورود فایل فروش"
                    : "جزئیات فروش"}
          </h1>
          <p className="account-description">
            مدیریت فروش، اقلام و فاکتور — مبالغ به تومان؛ وضعیت پرداخت به صورت
            دستی ثبت می‌شود.
          </p>
        </div>
        <a className="customer-link" href="/opportunities">
          فرصت‌ها و قیف فروش
        </a>
      </div>
      <Feedback message={error || filterError} />
      <Feedback message={message} kind="info" />
      {nav.confirming && (
        <ConfirmPanel
          title="تغییرات ذخیره نشده‌اند"
          description="با ادامه پیش‌نویس کنار گذاشته می‌شود."
          label="کنار گذاشتن پیش‌نویس"
          busy={busy}
          onCancel={nav.cancel}
          onConfirm={nav.confirm}
        />
      )}
      {view !== "list" && (
        <div className="session-actions no-print">
          <ActionButton
            className="secondary"
            disabled={blocked}
            onClick={() => nav.navigate(() => setView("list"))}
          >
            بازگشت به فهرست فروش
          </ActionButton>
          {record && view !== "edit" && view !== "import" && (
            <>
              <ActionButton
                className="secondary"
                disabled={blocked}
                onClick={() =>
                  setView(view === "invoice" ? "detail" : "invoice")
                }
              >
                {view === "invoice" ? "جزئیات فروش" : "مشاهده فاکتور"}
              </ActionButton>
              <ActionButton
                className="secondary"
                onClick={() => window.print()}
              >
                چاپ
              </ActionButton>
              <ActionButton
                className="secondary"
                disabled={blocked}
                onClick={() => void downloadPDF()}
              >
                دانلود PDF
              </ActionButton>
              {can("update") && (
                <ActionButton disabled={blocked} onClick={() => edit(record)}>
                  ویرایش فروش
                </ActionButton>
              )}
            </>
          )}
        </div>
      )}
      {view === "list" && (
        <>
          <section
            className="lead-summary-grid order-metrics"
            aria-label="آمار فروش"
          >
            {[
              ["total", "کل فروش"],
              ["month", "فروش این ماه شمسی"],
              ["pending", "در انتظار"],
              ["confirmed", "تأیید شده"],
            ].map(([key, label]) => (
              <div className="lead-metric" key={key}>
                <strong>
                  {summary
                    ? ["total", "month"].includes(key)
                      ? formatToman(String(summary[key]))
                      : new Intl.NumberFormat("fa-IR").format(
                          Number(summary[key]),
                        )
                    : "…"}
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </section>
          <p className="crm-context-note">
            فروش‌های لغونشده در محدوده دسترسی؛ مستقل از فیلترها. این ارقام به
            معنی وجه وصول‌شده نیستند.
          </p>
          <div className="customer-toolbar">
            <SearchBox
              id="order-search"
              label="جست‌وجوی فروش"
              value={query}
              onChange={setQuery}
              onCommit={(v) => {
                setSearch(v);
                setPage(1);
              }}
              disabled={blocked}
            />
            {can("create") && (
              <ActionButton disabled={blocked} onClick={() => edit(null)}>
                ثبت فروش جدید
              </ActionButton>
            )}
          </div>
          <div className="customer-fields">
            <FormField id="order-state-filter" label="وضعیت">
              <select
                id="order-state-filter"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه</option>
                {Object.entries(states).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="order-payment-filter" label="وضعیت پرداخت">
              <select
                id="order-payment-filter"
                value={payment}
                onChange={(e) => {
                  setPayment(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه</option>
                {Object.entries(payments).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="order-from" label="از تاریخ (شمسی)">
              <input
                id="order-from"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </FormField>
            <FormField id="order-to" label="تا تاریخ (شمسی)">
              <input
                id="order-to"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </FormField>
          </div>
          {(status || payment || from || to) && (
            <ActionButton
              className="secondary"
              disabled={blocked}
              onClick={() => {
                setStatus("");
                setPayment("");
                setFrom("");
                setTo("");
                setPage(1);
              }}
            >
              پاک کردن فیلترها
            </ActionButton>
          )}
          <CustomerFileActions
            kind="sales/orders"
            organizationId={org}
            userId={user}
            query={filterKey}
            canExport={can("export")}
            canImport={can("create")}
            onImport={() => setView("import")}
            disabled={blocked}
          />
          {!visibleList ? (
            <p role="status">
              {error ? "فهرست دریافت نشد." : "در حال دریافت فروش‌ها…"}
              <button
                className="customer-link"
                onClick={() => setRevision((v) => v + 1)}
              >
                تلاش دوباره
              </button>
            </p>
          ) : (
            <>
              <div
                className="customer-table-scroll"
                role="region"
                aria-label="لیست فروش‌ها"
                tabIndex={0}
              >
                <table className="customer-table">
                  <thead>
                    <tr>
                      {[
                        "شماره فروش",
                        "مشتری",
                        "تعداد اقلام",
                        "مبلغ نهایی",
                        "وضعیت",
                        "وضعیت پرداخت",
                        "تاریخ فروش",
                        "ثبت‌کننده",
                      ].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleList.results.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <button
                            className="customer-record-link"
                            onClick={() => void open(o.id)}
                          >
                            {o.number}
                          </button>
                        </td>
                        <td>{o.customer_label}</td>
                        <td>{o.items.length}</td>
                        <td>
                          {formatToman(o.total)}
                          <span className="customer-secondary">
                            تخفیف: {formatToman(o.discount)}
                          </span>
                        </td>
                        <td>
                          <RecordStatus>{states[o.status]}</RecordStatus>
                        </td>
                        <td>
                          <RecordStatus
                            tone={
                              o.payment_status === "paid"
                                ? "success"
                                : "neutral"
                            }
                          >
                            {payments[o.payment_status]}
                          </RecordStatus>
                        </td>
                        <td>{displayPersianDate(o.sale_date)}</td>
                        <td>{o.owner_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visibleList.count && (
                <div className="account-panel customer-empty">
                  <h2>فروشی یافت نشد</h2>
                  <p>فیلترها را تغییر دهید یا فروش جدید ثبت کنید.</p>
                </div>
              )}
              <Pager
                page={page}
                count={visibleList.count}
                previous={!!visibleList.previous}
                next={!!visibleList.next}
                busy={blocked}
                onPage={setPage}
              />
            </>
          )}
        </>
      )}
      {view === "import" && (
        <CustomerImportPreview
          kind="people"
          orderMode
          organizationId={org}
          organizationName={account.data.current!.name}
          userId={user}
          draft={importDraft}
          onChange={setImportDraft}
          disabled={busy || nav.confirming}
          onPendingChange={updatePending}
          onAccessError={() => void refresh()}
          onComplete={() => {
            setImportDraft(null);
            setView("list");
            setRevision((v) => v + 1);
            setMessage("فایل فروش ثبت شد.");
          }}
        />
      )}
      {view === "edit" && draft && can(base ? "update" : "create") && (
        <form
          className="order-grid"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setReview(true);
          }}
        >
          <div className="order-main">
            <section className="account-panel customer-editor">
              <h2>اطلاعات فروش</h2>
              <RecordFields
                prefix="order"
                fields={[
                  { name: "number", label: "شماره فروش", length: 40 },
                  { name: "sale_date", label: "تاریخ فروش (شمسی)" },
                  {
                    name: "status",
                    label: "وضعیت فروش",
                    options: Object.entries(states).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  },
                  {
                    name: "payment_method",
                    label: "روش پرداخت",
                    options: Object.entries(methods).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  },
                  {
                    name: "notes",
                    label: "یادداشت‌ها",
                    lines: true,
                    length: 4000,
                  },
                ]}
                draft={draft as unknown as Record<string, string>}
                errors={errors}
                disabled={blocked || !!attempt}
                onChange={(name, value) =>
                  setDraft({ ...draft, [name]: value })
                }
              />
              <CustomerPicker
                organizationId={org}
                userId={user}
                namespace="leads"
                kind="leads"
                value={draft.source_lead_id}
                label="لید مرتبط (اختیاری)"
                error={errors.source_lead_id}
                disabled={blocked || !!attempt}
                onChange={(id) => setDraft({ ...draft, source_lead_id: id })}
              />
              <CustomerPicker
                organizationId={org}
                userId={user}
                kind="people"
                value={draft.person_id}
                label="مشتری شخص"
                error={errors.person_id}
                disabled={blocked || !!attempt}
                onChange={(id) =>
                  setDraft({ ...draft, person_id: id, company_id: "" })
                }
              />
              <CustomerPicker
                organizationId={org}
                userId={user}
                kind="companies"
                value={draft.company_id}
                label="مشتری شرکت"
                error={errors.company_id}
                disabled={blocked || !!attempt}
                onChange={(id) =>
                  setDraft({ ...draft, company_id: id, person_id: "" })
                }
              />
            </section>
            <section className="account-panel customer-editor">
              <div className="customer-toolbar">
                <h2>اقلام فروش</h2>
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked || !!attempt || draft.items.length >= 100}
                  onClick={() =>
                    setDraft({ ...draft, items: [...draft.items, line()] })
                  }
                >
                  افزودن محصول
                </ActionButton>
              </div>
              {!draft.items.length && (
                <p>
                  هیچ قلمی اضافه نشده است. نام و کد محصول را در اقلام ثبت کنید.
                </p>
              )}
              {draft.items.map((item, index) => (
                <fieldset className="order-line" key={index}>
                  <legend>قلم {index + 1}</legend>
                  {account.data.operations.includes("product.view") && (
                    <CustomerPicker<Product>
                      organizationId={org}
                      userId={user}
                      namespace="products"
                      kind="products"
                      idSuffix={String(index)}
                      value={item.product_id || ""}
                      currentLabel={item.name}
                      label={`محصول کاتالوگ قلم ${index + 1}`}
                      compact
                      disabled={blocked || !!attempt}
                      isOptionDisabled={(p) =>
                        p.status !== "active" || !!p.archived_at
                      }
                      onChange={(id, label, p) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((row, n) =>
                            n !== index
                              ? row
                              : p
                                ? {
                                    ...row,
                                    product_id: id,
                                    name: p.name,
                                    code: p.sku,
                                    description: p.description.slice(0, 500),
                                    unit_price: p.price,
                                  }
                                : { ...row, product_id: undefined },
                          ),
                        })
                      }
                    />
                  )}

                  <RecordFields
                    prefix={"line-" + index}
                    fields={[
                      { name: "name", label: "محصول", length: 200 },
                      { name: "code", label: "کد محصول", length: 80 },
                      { name: "quantity", label: "تعداد", length: 12 },
                      {
                        name: "unit_price",
                        label: "قیمت واحد (تومان)",
                        length: 24,
                      },
                      { name: "description", label: "شرح محصول", length: 500 },
                    ]}
                    draft={item}
                    errors={{}}
                    disabled={blocked || !!attempt}
                    onChange={(name, value) =>
                      setDraft({
                        ...draft,
                        items: draft.items.map((v, n) =>
                          n === index ? { ...v, [name]: value } : v,
                        ),
                      })
                    }
                  />
                  <ActionButton
                    type="button"
                    className="secondary danger"
                    disabled={blocked || !!attempt}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        items: draft.items.filter((_, n) => n !== index),
                      })
                    }
                  >
                    حذف قلم {index + 1}
                  </ActionButton>
                </fieldset>
              ))}
            </section>
          </div>
          <aside className="account-panel customer-editor order-financial">
            <h2>خلاصه مالی</h2>
            <p>
              جمع کل:{" "}
              {computed
                ? formatToman(computed.subtotal)
                : "مقادیر را بررسی کنید"}
            </p>
            <RecordFields
              prefix="order"
              fields={[
                { name: "tax", label: "مالیات (تومان)", length: 24 },
                { name: "discount", label: "تخفیف (تومان)", length: 24 },
                { name: "shipping", label: "هزینه ارسال (تومان)", length: 24 },
                {
                  name: "payment_status",
                  label: "وضعیت پرداخت فروش",
                  options: Object.entries(payments).map(([value, label]) => ({
                    value,
                    label,
                  })),
                },
              ]}
              draft={draft as unknown as Record<string, string>}
              errors={errors}
              disabled={blocked || !!attempt}
              onChange={(name, value) => setDraft({ ...draft, [name]: value })}
            />
            {!base && defaultTax !== null && (
              <ActionButton
                type="button"
                className="secondary"
                disabled={blocked || !!attempt || !computed}
                onClick={() => {
                  if (!computed) return;
                  const [whole, decimal = ""] = defaultTax.split(".");
                  const rate =
                    BigInt(whole) * BigInt(100) +
                    BigInt(decimal.padEnd(2, "0"));
                  const tax =
                    (BigInt(computed.subtotal) * rate + BigInt(5000)) /
                    BigInt(10000);
                  setDraft({ ...draft, tax: tax.toString() });
                }}
              >
                اعمال مالیات پیش‌فرض{" "}
                {new Intl.NumberFormat("fa-IR").format(Number(defaultTax))}٪
              </ActionButton>
            )}
            <strong>
              مبلغ نهایی:{" "}
              {computed ? formatToman(computed.total) : "مقادیر نامعتبر"}
            </strong>
            <ActionButton
              type="submit"
              disabled={blocked || !!attempt}
              busy={busy}
            >
              ذخیره فروش
            </ActionButton>
            {attempt && (
              <>
                <ActionButton
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    attempt.id ? void readLatest() : void save(true)
                  }
                >
                  {attempt.id
                    ? "خواندن نسخه فعلی فروش"
                    : "بررسی نتیجه ثبت فروش"}
                </ActionButton>
                <p>
                  در ویرایش نامشخص، نسخه فعلی را بخوانید و پیش از ویرایش دوباره
                  مقایسه کنید.
                </p>
              </>
            )}
          </aside>
        </form>
      )}
      {view === "edit" && base && (
        <div className="account-panel no-print">
          <ActionButton
            className="secondary"
            disabled={blocked}
            onClick={() => void readLatest()}
          >
            دریافت نسخه فعلی برای مقایسه
          </ActionButton>
          {latest && (
            <>
              <p>
                نسخه فعلی: {latest.version} — مبلغ نهایی:{" "}
                {formatToman(latest.total)} — {states[latest.status]}
              </p>
              <pre className="order-compare">
                {JSON.stringify(
                  {
                    number: latest.number,
                    items: latest.items,
                    notes: latest.notes,
                  },
                  null,
                  2,
                )}
              </pre>
              <ActionButton
                disabled={blocked}
                onClick={() =>
                  nav.navigate(() => {
                    setAttempt(null);
                    edit(latest);
                  })
                }
              >
                بارگذاری نسخه فعلی در فرم
              </ActionButton>
            </>
          )}
        </div>
      )}
      {review && (
        <ConfirmPanel
          title="تأیید ذخیره فروش"
          description="مشتری، اقلام، جمع مالی و وضعیت دستی پرداخت را بررسی کنید؛ انتقال وجه انجام نمی‌شود."
          label="تأیید و ذخیره فروش"
          busy={busy}
          onCancel={() => setReview(false)}
          onConfirm={() => void save()}
        />
      )}
      {record && (view === "detail" || view === "invoice") && (
        <div className={view === "invoice" ? "order-invoice" : "order-grid"}>
          <div className="order-main">
            <section className="account-panel customer-editor">
              <h2>
                {view === "invoice"
                  ? account.data.current!.name + " — فاکتور فروش"
                  : "اطلاعات فروش"}
              </h2>
              <dl className="customer-definition">
                {[
                  ["شماره فروش", record.number],
                  ["تاریخ فروش", displayPersianDate(record.sale_date)],
                  ["وضعیت", states[record.status]],
                  ["وضعیت پرداخت", payments[record.payment_status]],
                  ["روش پرداخت", methods[record.payment_method]],
                  ["ثبت‌کننده", record.owner_label],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="activity-notes">
                {record.notes || "یادداشتی ثبت نشده است."}
              </p>
            </section>
            <section className="account-panel customer-editor">
              <h2>اقلام فروش ({record.items.length} قلم)</h2>
              <div
                className="customer-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="اقلام فروش"
              >
                <table className="customer-table">
                  <thead>
                    <tr>
                      {[
                        "محصول",
                        "کد محصول",
                        "تعداد",
                        "قیمت واحد",
                        "قیمت کل",
                      ].map((t) => (
                        <th key={t} scope="col">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {record.items.map((i, n) => (
                      <tr key={n}>
                        <td>
                          {i.name}
                          <span className="customer-secondary">
                            {i.description}
                          </span>
                        </td>
                        <td>{i.code || "—"}</td>
                        <td>{i.quantity}</td>
                        <td>{formatToman(i.unit_price)}</td>
                        <td>
                          {formatToman(
                            (
                              (BigInt(i.quantity.replace(".", "")) *
                                BigInt(i.unit_price)) /
                              BigInt("10") **
                                BigInt((i.quantity.split(".")[1] || "").length)
                            ).toString(),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <aside className="order-aside">
            <section className="account-panel customer-editor">
              <h2>خلاصه مالی</h2>
              <dl>
                {[
                  ["جمع کل", record.subtotal],
                  ["مالیات", record.tax],
                  ["تخفیف", record.discount],
                  ["هزینه ارسال", record.shipping],
                  ["مبلغ نهایی", record.total],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{formatToman(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="account-panel customer-editor">
              <h2>اطلاعات مشتری</h2>
              <h3>{record.customer_label}</h3>
              {record.customer.emails.map((v) => (
                <p key={v} dir="ltr">
                  {v}
                </p>
              ))}
              {record.customer.phones.map((v) => (
                <p key={v} dir="ltr">
                  {v}
                </p>
              ))}
              <a
                className="customer-link no-print"
                href={
                  "/customers?kind=" +
                  record.customer.kind +
                  "&record=" +
                  record.customer.id
                }
              >
                مشاهده مشتری
              </a>
            </section>
            {view === "detail" && (
              <section className="account-panel customer-editor order-quick-actions no-print">
                <h2>اقدامات سریع</h2>
                {can("create") && (
                  <ActionButton
                    className="secondary"
                    disabled={blocked}
                    onClick={() =>
                      nav.navigate(() => {
                        edit(null);
                        setDraft({
                          ...blank(),
                          person_id: record.person_id || "",
                          company_id: record.company_id || "",
                          source_lead_id: record.source_lead_id || "",
                        });
                      })
                    }
                  >
                    فروش جدید به این مشتری
                  </ActionButton>
                )}
                <a
                  className="customer-link"
                  href={`/activities?target_type=${record.person_id ? "person" : "company"}&target_id=${record.customer.id}`}
                >
                  ثبت وظیفه پیگیری
                </a>
              </section>
            )}
            {view === "detail" && (
              <CustomerAttachments
                kind="sales/orders"
                customerId={record.id}
                organizationId={org}
                userId={user}
                editable={!!can("update")}
                draft={attachment}
                onChange={setAttachment}
                onPendingChange={updatePending}
              />
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
