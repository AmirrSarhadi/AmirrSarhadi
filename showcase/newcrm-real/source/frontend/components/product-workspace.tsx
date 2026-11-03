"use client";
import { Package } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAccount } from "../lib/use-account";
import { useDraftNavigation } from "../lib/use-draft-navigation";
import { formatToman } from "../lib/sales-entry";
import { formatAccountDate } from "../lib/format";
import {
  blankProduct,
  productDraft,
  productFields,
  productInput,
  productStatus,
  quantityDisplay,
  stockMoney,
  type Product,
  type ProductDraft,
} from "../lib/products";
import type { Page } from "../lib/customers";
import {
  ActionButton,
  Feedback,
  LoadingAccount,
  LoadFailure,
} from "./account-ui";
import { ConfirmPanel, FormField, Pager, SearchBox } from "./customer-controls";
import { RecordFields, RecordStatus } from "./record-fields";
import { CustomerFileActions } from "./customer-file-actions";
import {
  CustomerImportPreview,
  type ImportDraft,
} from "./customer-import-preview";
import { ModalFormSurface } from "./modal-form-surface";
import { ProductSales } from "./product-sales";

function Fields({
  draft,
  onChange,
  names,
  errors,
  disabled,
}: {
  draft: ProductDraft;
  onChange: (d: ProductDraft) => void;
  names: string[];
  errors: Record<string, string>;
  disabled: boolean;
}) {
  return (
    <RecordFields
      prefix="product"
      fields={productFields.filter((f) => names.includes(f.name))}
      draft={draft}
      errors={errors}
      disabled={disabled}
      onChange={(key, value) => onChange({ ...draft, [key]: value })}
    />
  );
}
type Write = { body: Record<string, unknown>; key: string; id?: string };
export function ProductWorkspace() {
  const { account, refresh } = useAccount(),
    ready = account.phase === "ready" && account.data.current;
  const context = useRef({ org: "", user: 0 });
  if (ready)
    context.current = {
      org: account.data.current!.organization_id,
      user: account.data.user.user_id,
    };
  const { org, user } = context.current;
  const identity = org + ":" + user;
  const scope = useRef(""),
    pending = useRef(false),
    mutation = useRef<AbortController | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    first = useRef(true);
  const [view, setView] = useState<"list" | "detail" | "edit" | "import">(
      "list",
    ),
    [record, setRecord] = useState<Product | null>(null),
    [base, setBase] = useState<Product | null>(null),
    [draft, setDraft] = useState<ProductDraft | null>(null),
    [baseline, setBaseline] = useState<ProductDraft | null>(null),
    [quick, setQuick] = useState(false),
    [list, setList] = useState<Page<Product> | null>(null),
    [listStamp, setListStamp] = useState<object | null>(null),
    [listKey, setListKey] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [category, setCategory] = useState(""),
    [archived, setArchived] = useState("active"),
    [categories, setCategories] = useState<string[]>([]),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [attempt, setAttempt] = useState<Write | null>(null),
    [importDraft, setImportDraft] = useState<ImportDraft | null>(null),
    [fileBusy, setFileBusy] = useState(false),
    [action, setAction] = useState<{
      record: Product;
      restore: boolean;
    } | null>(null),
    [detailStamp, setDetailStamp] = useState<object | null>(null),
    [detailError, setDetailError] = useState(""),
    [retry, setRetry] = useState(0),
    [latest, setLatest] = useState<Product | null>(null);
  const updatePending = useCallback((v: boolean) => setFileBusy(v), []);
  const dirty =
    !!attempt ||
    !!importDraft ||
    (!!draft && JSON.stringify(draft) !== JSON.stringify(baseline));
  const discard = () => {
    setDraft(null);
    setBaseline(null);
    setAttempt(null);
    setImportDraft(null);
    setQuick(false);
    setAction(null);
  };
  const nav = useDraftNavigation(dirty, busy || fileBusy, discard);
  const can = (operation: string) =>
    !!ready && account.data.operations.includes("product." + operation);
  const request = useCallback(
    <T,>(path: string, options: Parameters<typeof api>[1] = {}) =>
      api<T>(path, {
        ...options,
        namespace: "products",
        organizationId: org,
        expectedUserId: user,
      }),
    [org, user],
  );
  const filter = new URLSearchParams({
    q: search,
    status,
    category,
    archived,
    page: String(page),
  }).toString();
  const focus = () => requestAnimationFrame(() => heading.current?.focus());
  useEffect(() => {
    if (ready && scope.current !== identity) {
      mutation.current?.abort();
      scope.current = identity;
      discard();
      setRecord(null);
      setBase(null);
      setLatest(null);
      setView("list");
      setList(null);
      setListStamp(null);
      setQuery("");
      setSearch("");
      setCategory("");
      setStatus("");
      setArchived("active");
      setPage(1);
      setError("");
      setMessage("");
      setFields({});
      setCategories([]);
      nav.reset();
      if (first.current) {
        first.current = false;
        const id = new URLSearchParams(window.location.search).get("record");
        if (id && /^[0-9a-f-]{36}$/i.test(id)) void open(id);
      }
    }
  }, [ready, identity]);
  useEffect(() => {
    if (!ready || scope.current !== identity) return;
    const ctrl = new AbortController();
    setListStamp(null);
    setError("");
    request<Page<Product>>("?" + filter, { signal: ctrl.signal })
      .then((v) => {
        if (!ctrl.signal.aborted) {
          setList(v);
          setListKey(filter);
          setListStamp(account);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          if (e instanceof ApiError && e.status === 404 && page > 1) {
            setPage(1);
            return;
          }
          setError(e.message);
          setList(null);
          setListStamp(account);
          setListKey(filter);
        }
      });
    return () => ctrl.abort();
  }, [request, account, identity, filter, revision]);
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    setCategories([]);
    request<string[]>("categories/", { signal: ctrl.signal })
      .then((v) => {
        if (!ctrl.signal.aborted) setCategories(v);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [request, account, revision]);
  const accessId =
    view === "detail" ? record?.id : view === "edit" ? base?.id : null;
  useEffect(() => {
    if (!ready || !accessId) return;
    const ctrl = new AbortController();
    setDetailStamp(null);
    setDetailError("");
    request<Product>(accessId + "/", { signal: ctrl.signal })
      .then((v) => {
        if (!ctrl.signal.aborted) {
          if (view === "detail") setRecord(v);
          setDetailStamp(account);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setDetailError(e.message);
          setDetailStamp(account);
        }
      });
    return () => ctrl.abort();
  }, [request, account, accessId, retry]);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    if (Object.keys(fields).length)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            '.product-workspace [aria-invalid="true"],dialog [aria-invalid="true"]',
          )
          ?.focus(),
      );
  }, [fields]);
  function edit(r: Product | null, isQuick = false, copy = false) {
    setError("");
    setFields({});
    setLatest(null);
    setAttempt(null);
    const value = r ? productDraft(r) : blankProduct();
    if (copy) {
      value.name = r!.name + " (کپی)";
      value.sku = blankProduct().sku;
      value.stock = "0";
      value.barcode = "";
    }
    setBase(copy ? null : r);
    setDraft(value);
    setBaseline({ ...value });
    setQuick(isQuick);
    if (!isQuick) setView("edit");
    focus();
  }
  async function open(id: string, editing = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const ctrl = new AbortController();
    mutation.current = ctrl;
    const stamp = scope.current;
    try {
      const value = await request<Product>(id + "/", { signal: ctrl.signal });
      if (!ctrl.signal.aborted && stamp === scope.current) {
        setRecord(value);
        setDetailStamp(account);
        if (editing) edit(value);
        else {
          setView("detail");
          setDraft(null);
        }
        focus();
      }
    } catch (e) {
      if (!ctrl.signal.aborted && stamp === scope.current)
        setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save(recover = false) {
    if (!draft || pending.current) return;
    let operation = attempt;
    if (!recover) {
      const result = productInput(draft);
      setFields(result.errors);
      if (Object.keys(result.errors).length) return;
      operation = {
        body: { ...result.body, ...(base ? { version: base.version } : {}) },
        key: crypto.randomUUID(),
        id: base?.id,
      };
    }
    if (!operation) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const ctrl = new AbortController();
    mutation.current = ctrl;
    const stamp = scope.current;
    try {
      const value = await request<Product>(
        operation.id ? operation.id + "/" : "",
        {
          body: operation.body,
          method: operation.id ? "PATCH" : "POST",
          idempotencyKey: operation.key,
          signal: ctrl.signal,
        },
      );
      if (ctrl.signal.aborted || stamp !== scope.current) return;
      setAttempt(null);
      setDraft(null);
      setBaseline(null);
      setQuick(false);
      setRecord(value);
      setDetailStamp(account);
      setView("detail");
      setRevision((v) => v + 1);
      setMessage("محصول ذخیره شد.");
      focus();
    } catch (e) {
      if (ctrl.signal.aborted || stamp !== scope.current) return;
      if (!(e instanceof ApiError) || e.status === 0 || e.status >= 500) {
        setAttempt(operation);
        setError("نتیجه ذخیره مشخص نیست؛ با همان درخواست نتیجه را بررسی کنید.");
      } else {
        setError(e.fields?.__all__?.join(" ") || e.message);
        setFields(
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
  async function readLatest() {
    if (!base || pending.current) return;
    pending.current = true;
    setBusy(true);
    setLatest(null);
    const stamp = scope.current,
      ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      const r = await request<Product>(base.id + "/", { signal: ctrl.signal });
      if (!ctrl.signal.aborted && stamp === scope.current) setLatest(r);
    } catch (e) {
      if (!ctrl.signal.aborted && stamp === scope.current)
        setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function archive() {
    if (!action || pending.current) return;
    pending.current = true;
    setBusy(true);
    const stamp = scope.current,
      ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      const value = await request<Product>(
        action.record.id + (action.restore ? "/restore/" : "/archive/"),
        { body: { version: action.record.version }, signal: ctrl.signal },
      );
      if (!ctrl.signal.aborted && stamp === scope.current) {
        setAction(null);
        if (record?.id === value.id) setRecord(value);
        setRevision((v) => v + 1);
        setMessage(
          action.restore ? "محصول بازگردانی شد." : "محصول بایگانی شد.",
        );
      }
    } catch (e) {
      if (!ctrl.signal.aborted && stamp === scope.current) {
        setError((e as Error).message);
        setAction(null);
        setRevision((v) => v + 1);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function printLabel() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const stamp = scope.current;
    try {
      const img = document.querySelector<HTMLImageElement>(
        ".product-print-label img",
      );
      if (img) await img.decode();
      if (stamp !== scope.current) return;
      document.body.classList.add("print-product-label");
      window.print();
    } catch {
      if (stamp === scope.current)
        setError("بارکد برای چاپ دریافت نشد؛ دسترسی و اتصال را بررسی کنید.");
    } finally {
      document.body.classList.remove("print-product-label");
      pending.current = false;
      setBusy(false);
    }
  }
  const back = () =>
    nav.navigate(() => {
      discard();
      setView("list");
      setBase(null);
      setLatest(null);
      focus();
    });
  const navPrompt = (
    <ConfirmPanel
      title="تغییرات ذخیره نشده‌اند"
      description="با ادامه پیش‌نویس کنار گذاشته می‌شود."
      label="کنار گذاشتن پیش‌نویس"
      busy={busy}
      onCancel={nav.cancel}
      onConfirm={nav.confirm}
    />
  );
  if (!ready || scope.current !== identity)
    return account.phase === "error" ? (
      <LoadFailure message={account.message} retry={() => void refresh()} />
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
  if (accessId && (detailStamp !== account || detailError))
    return (
      <section className="account-panel">
        <h1>بررسی دسترسی محصول</h1>
        {detailStamp !== account ? (
          <p role="status">در حال بررسی دسترسی…</p>
        ) : (
          <>
            <Feedback message={detailError} />
            <ActionButton onClick={() => setRetry((v) => v + 1)}>
              تلاش دوباره
            </ActionButton>
            <ActionButton className="secondary" onClick={back}>
              بازگشت به فهرست محصولات
            </ActionButton>
          </>
        )}
      </section>
    );
  const blocked = busy || fileBusy || nav.confirming || !!action,
    locked = blocked || !!attempt;
  const visibleList = listStamp === account && listKey === filter ? list : null;
  const editorFields = (names: string[]) => (
    <Fields
      draft={draft!}
      onChange={setDraft}
      names={names}
      errors={fields}
      disabled={locked}
    />
  );
  let parsed: Record<string, unknown> | null = null;
  if (draft) {
    const result = productInput(draft);
    if (!Object.keys(result.errors).length) parsed = result.body;
  }
  const recovery = attempt ? (
    <section className="account-panel">
      <h2>بررسی نتیجه ذخیره</h2>
      <p>
        اطلاعات همان درخواست حفظ شده است. برای ویرایش نامشخص، نسخهٔ فعلی را
        مقایسه کنید.
      </p>
      <ActionButton
        type="button"
        disabled={blocked}
        onClick={() => (attempt.id ? void readLatest() : void save(true))}
      >
        {attempt.id ? "دریافت نسخه فعلی برای مقایسه" : "بررسی نتیجه ثبت محصول"}
      </ActionButton>
    </section>
  ) : null;
  return (
    <section className="customer-workspace customer-reference-workspace product-workspace">
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{account.data.current!.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            {view === "edit"
              ? base
                ? "ویرایش محصول"
                : "محصول جدید"
              : view === "detail"
                ? "جزئیات محصول"
                : view === "import"
                  ? "ورود فایل محصولات"
                  : "مدیریت محصولات"}
          </h1>
          <p className="account-description">
            محصولات و خدمات، قیمت‌گذاری و اطلاعات موجودی
          </p>
        </div>
        <a className="customer-link" href="/sales">
          مدیریت فروش
        </a>
      </div>
      {!(quick && draft && can("create")) && <Feedback message={error} />}
      <Feedback message={message} kind="info" />
      {nav.confirming && !(quick && draft && can("create")) && navPrompt}
      {view !== "list" && (
        <div className="session-actions no-print">
          <ActionButton className="secondary" disabled={blocked} onClick={back}>
            بازگشت به فهرست محصولات
          </ActionButton>
          {view === "detail" && record && (
            <>
              <ActionButton
                className="secondary"
                disabled={blocked}
                onClick={() => window.print()}
              >
                چاپ
              </ActionButton>
              {can("update") && !record.archived_at && (
                <ActionButton disabled={blocked} onClick={() => edit(record)}>
                  ویرایش محصول
                </ActionButton>
              )}
              {can("archive") && (
                <ActionButton
                  className="secondary"
                  disabled={blocked}
                  onClick={() =>
                    setAction({ record, restore: !!record.archived_at })
                  }
                >
                  {record.archived_at ? "بازگردانی محصول" : "بایگانی محصول"}
                </ActionButton>
              )}
            </>
          )}
        </div>
      )}
      {quick && draft && !can("create") && (
        <section className="account-panel">
          <p>مجوز ثبت محصول ندارید؛ پیش‌نویس در حافظه حفظ شده است.</p>
          <ActionButton
            className="secondary"
            disabled={blocked}
            onClick={() =>
              nav.navigate(() => {
                setQuick(false);
                setDraft(null);
                setBaseline(null);
                setAttempt(null);
              })
            }
          >
            کنار گذاشتن پیش‌نویس محصول
          </ActionButton>
        </section>
      )}
      {view === "list" && (
        <>
          <div className="customer-toolbar">
            <SearchBox
              id="product-search"
              label="جست‌وجوی محصولات"
              value={query}
              onChange={setQuery}
              onCommit={(v) => {
                setSearch(v);
                setPage(1);
              }}
              disabled={blocked}
            />
            {can("create") && (
              <div className="session-actions">
                <ActionButton disabled={blocked} onClick={() => edit(null)}>
                  افزودن محصول جدید
                </ActionButton>
                <ActionButton
                  className="secondary"
                  disabled={blocked}
                  onClick={() => edit(null, true)}
                >
                  افزودن سریع
                </ActionButton>
              </div>
            )}
          </div>
          <div className="customer-fields">
            <FormField id="product-category-filter" label="فیلتر دسته‌بندی">
              <input
                id="product-category-filter"
                list="product-categories"
                value={category}
                maxLength={100}
                disabled={blocked}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              />
            </FormField>
            <FormField id="product-status-filter" label="فیلتر وضعیت">
              <select
                id="product-status-filter"
                value={status}
                disabled={blocked}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(productStatus).map(([v, l]) => (
                  <option value={v} key={v}>
                    {l}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="product-archive-filter" label="نمای بایگانی">
              <select
                id="product-archive-filter"
                value={archived}
                disabled={blocked}
                onChange={(e) => {
                  setArchived(e.target.value);
                  setPage(1);
                }}
              >
                <option value="active">بایگانی‌نشده</option>
                <option value="only">بایگانی‌شده</option>
                <option value="all">همه</option>
              </select>
            </FormField>
          </div>
          {(category || status || archived !== "active") && (
            <ActionButton
              className="secondary"
              disabled={blocked}
              onClick={() => {
                setCategory("");
                setStatus("");
                setArchived("active");
                setPage(1);
              }}
            >
              پاک کردن فیلترها
            </ActionButton>
          )}
          <CustomerFileActions
            kind="products"
            organizationId={org}
            userId={user}
            query={filter}
            canExport={can("export")}
            canImport={can("create")}
            disabled={blocked}
            onImport={() => setView("import")}
          />
          <div className="customer-list-heading">
            <h2>لیست محصولات</h2>
            <span>
              {visibleList
                ? new Intl.NumberFormat("fa-IR").format(visibleList.count) +
                  " محصول"
                : "…"}
            </span>
          </div>
          {!visibleList ? (
            error ? (
              <LoadFailure
                message={error}
                retry={() => setRevision((v) => v + 1)}
              />
            ) : (
              <p role="status">در حال دریافت محصولات…</p>
            )
          ) : (
            <>
              {visibleList.count ? (
                <div
                  className="customer-table-scroll"
                  role="region"
                  aria-label="لیست محصولات"
                  tabIndex={0}
                >
                  <table className="customer-table">
                    <thead>
                      <tr>
                        {[
                          "SKU",
                          "نام محصول",
                          "دسته‌بندی",
                          "قیمت",
                          "موجودی",
                          "وضعیت",
                          "تاریخ ایجاد",
                          "عملیات",
                        ].map((t) => (
                          <th key={t} scope="col">
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleList.results.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <RecordStatus>{p.sku}</RecordStatus>
                          </td>
                          <td>
                            <button
                              className="customer-record-link"
                              onClick={() => void open(p.id)}
                            >
                              {p.name}
                            </button>
                            <span className="customer-secondary">
                              {p.description}
                            </span>
                          </td>
                          <td>{p.category || "ثبت نشده"}</td>
                          <td>
                            {formatToman(p.price)}
                            <span className="customer-secondary">
                              هزینه: {formatToman(p.cost)}
                            </span>
                          </td>
                          <td>
                            <RecordStatus
                              tone={p.low_stock ? "warning" : "success"}
                            >
                              {quantityDisplay(p.stock)} {p.unit}
                            </RecordStatus>
                            {p.low_stock && (
                              <span className="customer-secondary">
                                کمتر از حداقل
                              </span>
                            )}
                          </td>
                          <td>
                            <RecordStatus
                              tone={
                                p.status === "active" ? "success" : "neutral"
                              }
                            >
                              {productStatus[p.status]}
                            </RecordStatus>
                            {p.archived_at && <span> — بایگانی</span>}
                          </td>
                          <td>{formatAccountDate(p.created_at)}</td>
                          <td>
                            <div className="session-actions">
                              {can("update") && !p.archived_at && (
                                <ActionButton
                                  className="secondary"
                                  disabled={blocked}
                                  onClick={() => void open(p.id, true)}
                                >
                                  ویرایش {p.sku}
                                </ActionButton>
                              )}
                              {can("archive") && (
                                <ActionButton
                                  className="secondary"
                                  disabled={blocked}
                                  onClick={() =>
                                    setAction({
                                      record: p,
                                      restore: !!p.archived_at,
                                    })
                                  }
                                >
                                  {p.archived_at ? "بازگردانی" : "بایگانی"}{" "}
                                  {p.sku}
                                </ActionButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <section className="account-panel customer-empty">
                  <h2>محصولی یافت نشد</h2>
                  <p>فیلترها را تغییر دهید یا محصول تازه ثبت کنید.</p>
                </section>
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
      <datalist id="product-categories">
        {categories.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      {quick && draft && can("create") && (
        <ModalFormSurface
          title="افزودن سریع محصول"
          busy={busy || fileBusy}
          onClose={() =>
            nav.navigate(() => {
              setQuick(false);
              setDraft(null);
              setBaseline(null);
            })
          }
        >
          {nav.confirming && navPrompt}
          <Feedback message={error} />
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {editorFields(["name", "price", "category"])}
            <p className="crm-context-note">
              کد یکتا: {draft.sku}؛ محصول فعال، موجودی صفر و قیمت خرید ثبت‌نشده
              خواهد بود.
            </p>
            {recovery}
            <div className="session-actions">
              <ActionButton type="submit" busy={busy} disabled={locked}>
                افزودن محصول
              </ActionButton>
              <ActionButton
                type="button"
                className="secondary"
                disabled={blocked}
                onClick={() =>
                  nav.navigate(() => {
                    setQuick(false);
                    setDraft(null);
                    setBaseline(null);
                  })
                }
              >
                انصراف
              </ActionButton>
            </div>
          </form>
        </ModalFormSurface>
      )}
      {view === "edit" && draft && can(base ? "update" : "create") && (
        <form
          className="order-grid"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="order-main">
            <section className="account-panel customer-editor">
              <h2>اطلاعات محصول</h2>
              {editorFields([
                "name",
                "sku",
                "description",
                "category",
                "unit",
                "status",
                "barcode",
                "tags",
              ])}
            </section>
            <section className="account-panel customer-editor">
              <h2>مشخصات فیزیکی</h2>
              {editorFields(["weight_grams", "dimensions"])}
            </section>
            <section className="account-panel customer-editor">
              <h2>یادداشت‌های داخلی</h2>
              {editorFields(["internal_notes"])}
            </section>
          </div>
          <aside className="order-aside">
            <section className="account-panel customer-editor">
              <h2>قیمت‌گذاری</h2>
              {editorFields(["price", "cost"])}
            </section>
            <section className="account-panel customer-editor">
              <h2>مدیریت موجودی</h2>
              {editorFields(["stock", "min_stock"])}
              <p className="crm-context-note">
                مقدار ثبت‌شده دستی است و ثبت فروش آن را خودکار تغییر نمی‌دهد.
              </p>
            </section>
            <section className="account-panel customer-editor">
              <h2>خلاصه محصول</h2>
              {parsed ? (
                <>
                  <p>
                    ارزش بر مبنای بهای خرید:{" "}
                    {stockMoney(
                      parsed.cost === null ? null : String(parsed.cost),
                      String(parsed.stock),
                    )}
                  </p>
                  <p>
                    اختلاف قیمت و بها برای موجودی فعلی:{" "}
                    {stockMoney(
                      parsed.cost === null
                        ? null
                        : (
                            BigInt(String(parsed.price)) -
                            BigInt(String(parsed.cost))
                          ).toString(),
                      String(parsed.stock),
                    )}
                  </p>
                </>
              ) : (
                <p>برای محاسبه خلاصه، مقادیر معتبر وارد کنید.</p>
              )}
              <ActionButton type="submit" busy={busy} disabled={locked}>
                {base ? "به‌روزرسانی محصول" : "ثبت محصول"}
              </ActionButton>
            </section>
            {recovery}
          </aside>
        </form>
      )}
      {view === "edit" && base && (
        <section className="account-panel no-print">
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
                نسخه فعلی: {latest.version} — {latest.name} —{" "}
                {formatToman(latest.price)} — موجودی{" "}
                {quantityDisplay(latest.stock)}
              </p>
              <ActionButton
                disabled={blocked}
                onClick={() => nav.navigate(() => edit(latest))}
              >
                بارگذاری نسخه فعلی در فرم
              </ActionButton>
            </>
          )}
        </section>
      )}
      {view === "detail" && record && (
        <div className="activity-profile-grid product-profile">
          <aside className="activity-profile-aside">
            <section className="account-panel activity-detail-card">
              <h2>اطلاعات محصول</h2>
              <div className="activity-identity">
                <span className="activity-identity-icon" aria-hidden="true">
                  <Package size={28} aria-hidden="true" />
                </span>
                <h3>{record.name}</h3>
                <RecordStatus>{record.sku}</RecordStatus>
                <RecordStatus
                  tone={record.status === "active" ? "success" : "neutral"}
                >
                  {productStatus[record.status]}
                  {record.archived_at ? " — بایگانی" : ""}
                </RecordStatus>
                <strong>{formatToman(record.price)}</strong>
                <span>
                  موجودی: {quantityDisplay(record.stock)} {record.unit}
                </span>
                {record.cost !== null && (
                  <>
                    <span>
                      اختلاف قیمت و بها:{" "}
                      {formatToman(
                        (BigInt(record.price) - BigInt(record.cost)).toString(),
                      )}
                    </span>
                    {BigInt(record.cost) > BigInt(0) && (
                      <small>
                        افزوده بر بها ≈{" "}
                        {new Intl.NumberFormat("fa-IR", {
                          maximumFractionDigits: 2,
                        }).format(
                          (Number(BigInt(record.price) - BigInt(record.cost)) *
                            100) /
                            Number(record.cost),
                        )}
                        ٪
                      </small>
                    )}
                  </>
                )}
              </div>
            </section>
            <section className="account-panel activity-detail-card">
              <h2>اطلاعات موجودی</h2>
              <dl className="customer-definition">
                {[
                  [
                    "موجودی فعلی",
                    quantityDisplay(record.stock) + " " + record.unit,
                  ],
                  ["حداقل موجودی", quantityDisplay(record.min_stock)],
                  ["ارزش بر مبنای بها", stockMoney(record.cost, record.stock)],
                  ["بارکد", record.barcode || "ثبت نشده"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {record.low_stock && (
                <RecordStatus tone="warning">موجودی کمتر از حداقل</RecordStatus>
              )}
            </section>
          </aside>
          <div className="activity-profile-main">
            <section className="account-panel activity-detail-card">
              <h2>اطلاعات تفصیلی</h2>
              <dl className="customer-definition">
                {[
                  ["کد محصول", record.sku],
                  ["دسته‌بندی", record.category || "ثبت نشده"],
                  ["واحد شمارش", record.unit],
                  ["قیمت فروش", formatToman(record.price)],
                  ["قیمت خرید/تولید", formatToman(record.cost)],
                  [
                    "وزن (گرم)",
                    record.weight_grams === null
                      ? "ثبت نشده"
                      : quantityDisplay(record.weight_grams),
                  ],
                  ["ابعاد", record.dimensions || "ثبت نشده"],
                  ["ایجادکننده", record.creator_label],
                  ["تاریخ ایجاد", formatAccountDate(record.created_at)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <h3>توضیحات محصول</h3>
              <p className="activity-notes">
                {record.description || "ثبت نشده"}
              </p>
              <p>برچسب‌ها: {record.tags.join("، ") || "ثبت نشده"}</p>
              <h3>یادداشت‌های داخلی</h3>
              <p className="activity-notes">
                {record.internal_notes || "ثبت نشده"}
              </p>
            </section>
            <section className="account-panel customer-editor no-print">
              <h2>اقدامات سریع</h2>
              <div className="session-actions">
                {can("create") && (
                  <ActionButton
                    className="secondary"
                    disabled={blocked}
                    onClick={() => edit(record, false, true)}
                  >
                    کپی محصول
                  </ActionButton>
                )}
                {account.data.operations.includes("sale.create") &&
                  !record.archived_at &&
                  record.status === "active" && (
                    <a
                      className="account-button secondary"
                      href={"/sales?product=" + record.id}
                    >
                      فروش جدید این محصول
                    </a>
                  )}
                <ActionButton
                  className="secondary"
                  disabled={blocked}
                  onClick={() => {
                    void printLabel();
                  }}
                >
                  چاپ برچسب
                </ActionButton>
              </div>
            </section>
            <ProductSales
              key={record.id + ":" + revision}
              id={record.id}
              org={org}
              user={user}
            />
            <div className="product-print-label">
              <h2>{record.name}</h2>
              <p>{record.sku}</p>
              <strong>{formatToman(record.price)}</strong>
              <p dir="ltr">{record.barcode || "بارکد ثبت نشده"}</p>
              {record.barcode && (
                <img
                  src={`/api/v1/products/${record.id}/barcode/`}
                  alt={`بارکد ${record.barcode}`}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {view === "import" && can("create") && (
        <CustomerImportPreview
          kind="people"
          productMode
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
            setQuery("");
            setSearch("");
            setCategory("");
            setStatus("");
            setArchived("active");
            setPage(1);
            setRevision((v) => v + 1);
            setMessage("فایل محصولات ثبت شد.");
          }}
        />
      )}
      {action && (
        <ConfirmPanel
          title={action.restore ? "بازگردانی محصول" : "بایگانی محصول"}
          description={`«${action.record.name}» ${action.restore ? "به فهرست برمی‌گردد." : "برای انتخاب تازه در فروش پنهان می‌شود؛ سوابق فروش حفظ می‌شوند."}`}
          label={action.restore ? "تأیید بازگردانی" : "تأیید بایگانی"}
          danger={!action.restore}
          busy={busy}
          onCancel={() => setAction(null)}
          onConfirm={() => void archive()}
        />
      )}
    </section>
  );
}
