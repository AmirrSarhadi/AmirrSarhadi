"use client";
import { RecordStatus } from "./record-fields";
import { PipelineSummary } from "./pipeline-summary";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "../lib/api";
import { useAccount } from "../lib/use-account";
import { useDraftNavigation } from "../lib/use-draft-navigation";
import { type Page } from "../lib/customers";
import {
  salesApi,
  blankSale,
  saleDraft,
  saleInput,
  type SaleDraft,
  type Opportunity,
  type Pipeline,
  type SaleEvent,
} from "../lib/sales";
import { formatToman, displayPersianDate } from "../lib/sales-entry";
import { formatAccountDate } from "../lib/format";
import {
  ActionButton,
  Feedback,
  LoadingAccount,
  LoadFailure,
} from "./account-ui";
import {
  AutoTextarea,
  ConfirmPanel,
  FormField,
  Pager,
  SearchBox,
} from "./customer-controls";
import { OpportunityFields } from "./opportunity-fields";
import { CustomerPicker } from "./customer-picker";

type Editor = {
  base: Opportunity | null;
  value: SaleDraft;
  baseline: SaleDraft;
  customerKind: "people" | "companies";
  customer: string;
  customerLabel: string;
  owner: string;
  ownerLabel: string;
  key: string;
};
type Config = {
  base: Pipeline | null;
  name: string;
  open: string;
  stages: Pipeline["stages"];
  key: string;
};
type Write = {
  path: string;
  body: Record<string, unknown>;
  key?: string;
  method?: "POST" | "PATCH";
  kind: "create" | "edit" | "move" | "pipeline";
};
const states = { open: "باز", won: "برد", lost: "باخت" };

export function SalesWorkspace() {
  const { account, refresh } = useAccount();
  const router = useRouter();
  const identity =
    account.phase === "ready" && account.data.current
      ? `${account.data.user.user_id}:${account.data.current.organization_id}`
      : "";
  const org =
    account.phase === "ready"
      ? account.data.current?.organization_id || ""
      : "";
  const user = account.phase === "ready" ? account.data.user.user_id : 0;
  const [scope, setScope] = useState("");
  const scopeRef = useRef("");
  const first = useRef(true);
  const [selected, setSelected] = useState("");
  const [record, setRecord] = useState<Opportunity | null>(null);
  const [stamp, setStamp] = useState<object | null>(null);
  const [detailError, setDetailError] = useState("");
  const [list, setList] = useState<Page<Opportunity> | null>(null);
  const [listStamp, setListStamp] = useState<object | null>(null);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [pipelines, setPipelines] = useState<Page<Pipeline> | null>(null);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [pipelineError, setPipelineError] = useState("");
  const [detailPipeline, setDetailPipeline] = useState<Pipeline | null>(null);
  const [latestPipeline, setLatestPipeline] = useState<Pipeline | null>(null);
  const [history, setHistory] = useState<Page<SaleEvent> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [targetStage, setTargetStage] = useState("");
  const [reason, setReason] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [review, setReview] = useState<{
    write: Write;
    title: string;
    description: string;
    label: string;
  } | null>(null);
  const [uncertain, setUncertain] = useState<Write | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewTrigger = useRef<HTMLElement | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const dirty =
    !!uncertain ||
    !!config ||
    (!!editor &&
      (JSON.stringify(editor.value) !== JSON.stringify(editor.baseline) ||
        !!editor.customer ||
        (!!editor.owner &&
          (!editor.base || Number(editor.owner) !== editor.base.owner_id)))) ||
    !!reason;
  const nav = useDraftNavigation(dirty, busy, () => {
    setEditor(null);
    setConfig(null);
    setUncertain(null);
    setReview(null);
    setReason("");
  });
  const request = useCallback(
    <T,>(path: string, options: Parameters<typeof salesApi<T>>[3] = {}) =>
      salesApi<T>(org, user, path, options),
    [org, user],
  );
  const can = (name: string) =>
    account.phase === "ready" && account.data.operations.includes(name);
  useEffect(() => {
    if (identity && identity !== scopeRef.current) {
      mutation.current?.abort();
      scopeRef.current = identity;
      setScope(identity);
      setEditor(null);
      setConfig(null);
      setUncertain(null);
      setReview(null);
      nav.reset();
      const id = first.current
        ? new URLSearchParams(window.location.search).get("record")
        : null;
      first.current = false;
      setSelected(id && /^[0-9a-f-]{36}$/i.test(id) ? id : "");
      setRecord(null);
      setHistory(null);
      setPipelines(null);
      setLatestPipeline(null);
      setQuery("");
      setSearch("");
      setPage(1);
      setState("");
      setPipelineId("");
      setStageFilter("");
      setPipelinePage(1);
      setReason("");
      setError("");
      setMessage("");
      setFields({});
    }
    if (account.phase === "anonymous" && !dirty) router.replace("/login");
    if (account.phase === "ready" && !account.data.current && !dirty)
      router.replace("/organizations");
  }, [account, identity, dirty, router]);
  useEffect(() => {
    if (account.phase !== "ready" || identity !== scope || !identity) return;
    const ctrl = new AbortController();
    setListStamp(null);
    setListError("");
    request<Page<Opportunity>>(
      `opportunities/?q=${encodeURIComponent(search)}&page=${page}&state=${state}&pipeline_id=${pipelineId}&stage_id=${stageFilter}`,
      { signal: ctrl.signal },
    )
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setList(data);
          setListStamp(account);
        }
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 404 && page > 1) {
          setPage(1);
          return;
        }
        setListError(e.message);
        setListStamp(account);
      });
    return () => ctrl.abort();
  }, [
    account,
    identity,
    scope,
    request,
    search,
    page,
    state,
    pipelineId,
    stageFilter,
    revision,
  ]);
  useEffect(() => {
    if (account.phase !== "ready" || identity !== scope || !identity) return;
    const ctrl = new AbortController();
    setPipelines(null);
    setPipelineError("");
    request<Page<Pipeline>>(`pipelines/?page=${pipelinePage}`, {
      signal: ctrl.signal,
    })
      .then((data) => {
        if (!ctrl.signal.aborted) setPipelines(data);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setPipelineError(e.message);
      });
    return () => ctrl.abort();
  }, [account, identity, scope, request, pipelinePage, revision]);
  useEffect(() => {
    setReview(null);
    setDetailPipeline(null);
    setStamp(null);
    setDetailError("");
    setHistory(null);
    if (!selected || account.phase !== "ready" || identity !== scope) return;
    const ctrl = new AbortController();
    (async () => {
      const sale = await request<Opportunity>(`opportunities/${selected}/`, {
        signal: ctrl.signal,
      });
      const [p, h] = await Promise.all([
        request<Pipeline>(`pipelines/${sale.pipeline_id}/`, {
          signal: ctrl.signal,
        }),
        request<Page<SaleEvent>>(
          `opportunities/${selected}/history/?page=${historyPage}`,
          { signal: ctrl.signal },
        ),
      ]);
      if (!ctrl.signal.aborted) {
        setRecord(sale);
        setDetailPipeline(p);
        setHistory(h);
        setStamp(account);
      }
    })().catch((e) => {
      if (!ctrl.signal.aborted) {
        setDetailError(e.message);
        setStamp(account);
      }
    });
    return () => ctrl.abort();
  }, [selected, account, identity, scope, request, historyPage, revision]);
  useEffect(() => {
    if (busy) return;
    for (const key of Object.keys(fields)) {
      const field =
        document.getElementById(`sale-${key}`) ||
        document.getElementById(`pipeline-${key}`) ||
        document.getElementById(
          key === "owner_id"
            ? "pick-owners"
            : key === "person_id"
              ? "pick-people"
              : key === "company_id"
                ? "pick-companies"
                : "",
        );
      if (field instanceof HTMLElement) {
        field.focus();
        break;
      }
    }
  }, [fields, busy]);
  useEffect(() => () => mutation.current?.abort(), []);
  function focus() {
    requestAnimationFrame(() => heading.current?.focus());
  }
  function reset() {
    setEditor(null);
    setConfig(null);
    setReview(null);
    setError("");
    setFields({});
    setReason("");
    setTargetStage("");
  }
  function back() {
    nav.navigate(() => {
      reset();
      setSelected("");
      setHistoryPage(1);
      focus();
    });
  }
  function start(base: Opportunity | null) {
    const value = base ? saleDraft(base) : blankSale();
    reset();
    setEditor({
      base,
      value,
      baseline: value,
      customerKind: base?.company_id ? "companies" : "people",
      customer: "",
      customerLabel: base?.customer_label || "",
      owner: base ? String(base.owner_id) : "",
      ownerLabel: base?.owner_label || "",
      key: crypto.randomUUID(),
    });
    focus();
  }
  function confirm(
    write: Write,
    title: string,
    description: string,
    label: string,
  ) {
    reviewTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setReview({ write, title, description, label });
  }
  async function write(operation: Write) {
    if (pending.current || scopeRef.current !== identity) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setFields({});
    setReview(null);
    const ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      const result = await request<Opportunity | Pipeline>(operation.path, {
        body: operation.body,
        method: operation.method || "POST",
        idempotencyKey: operation.key,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setUncertain(null);
      reset();
      setRevision((v) => v + 1);
      setMessage(
        operation.kind === "pipeline"
          ? "تنظیمات قیف ذخیره شد."
          : operation.kind === "move"
            ? "تغییر مرحله ثبت شد."
            : operation.kind === "edit"
              ? "فرصت به‌روز شد."
              : "فرصت ثبت شد.",
      );
      if (operation.kind === "create") {
        setSelected("");
        setQuery("");
        setSearch("");
        setState("");
        setPipelineId("");
        setStageFilter("");
        setPage(1);
      } else if (operation.kind !== "pipeline") {
        setRecord(result as Opportunity);
        setStamp(account);
      }
      focus();
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if (
        uncertain ||
        !(e instanceof ApiError) ||
        e.status === 0 ||
        e.status >= 500
      ) {
        setUncertain(operation);
        setError(
          "نتیجه عملیات مشخص نیست. همان درخواست را پیگیری کنید؛ بستن صفحه اطلاعات پیگیری را از حافظه پاک می‌کند.",
        );
      } else {
        const values =
          e instanceof ApiError
            ? Object.fromEntries(
                Object.entries(e.fields).map(([k, v]) => [k, v.join(" ")]),
              )
            : {};
        setFields(values);
        setError([e.message, ...Object.values(values)].join(" "));
        if (e.status === 403) void refresh();
        if (e.status === 409)
          setError(
            "اطلاعات تغییر کرده است؛ پیش‌نویس حفظ شده و باید نسخه تازه را بررسی کنید.",
          );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy || uncertain || review) return;
    const { body, errors } = saleInput(editor.value, !editor.base);
    if (!editor.base && !editor.customer)
      errors.person_id = "مشتری فرصت را انتخاب کنید.";
    setFields(errors);
    if (Object.keys(errors).length) return;
    if (editor.base) body.version = editor.base.version;
    else
      body[editor.customerKind === "people" ? "person_id" : "company_id"] =
        editor.customer;
    if (editor.owner) body.owner_id = Number(editor.owner);
    const operation: Write = {
      path: editor.base ? `opportunities/${editor.base.id}/` : "opportunities/",
      body,
      key: editor.key,
      kind: editor.base ? "edit" : "create",
      method: editor.base ? "PATCH" : "POST",
    };
    if (
      editor.owner &&
      (!editor.base || Number(editor.owner) !== editor.base.owner_id)
    )
      confirm(
        operation,
        "تأیید مسئول فرصت",
        `مسئول فرصت «${editor.ownerLabel}» می‌شود. مسئول تازه باید به مشتری مرتبط نیز دسترسی داشته باشد.`,
        "ذخیره فرصت با این مسئول",
      );
    else void write(operation);
  }
  function saveConfig(event: FormEvent) {
    event.preventDefault();
    if (!config || busy || uncertain) return;
    const operation: Write = {
      path: config.base ? `pipelines/${config.base.id}/` : "pipelines/",
      body: config.base
        ? {
            version: config.base.version,
            name: config.name,
            stages: config.stages.map((s) => ({ id: s.id, name: s.name })),
          }
        : {
            name: config.name,
            open_stages: config.open
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean),
          },
      key: config.key,
      method: config.base ? "PATCH" : "POST",
      kind: "pipeline",
    };
    confirm(
      operation,
      "تأیید تنظیمات قیف",
      "این تنظیمات برای کل سازمان اعمال می‌شود؛ نام‌های ثبت‌شده در تاریخچه فرصت‌ها تغییر نمی‌کنند.",
      "ذخیره تنظیمات قیف",
    );
  }
  async function readLatest() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      if (selected) {
        const value = await request<Opportunity>(`opportunities/${selected}/`, {
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        setRecord(value);
        setRevision((v) => v + 1);
      } else if (config?.base) {
        const value = await request<Pipeline>(`pipelines/${config.base.id}/`, {
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        setLatestPipeline(value);
      }
      if (ctrl.signal.aborted) return;
      if (uncertain?.method === "PATCH") setUncertain(null);
      setMessage(
        "اطلاعات تازه خوانده شد. پیش‌نویس قبلی حفظ شده است؛ برای جایگزینی آن تأیید لازم است.",
      );
      setError("");
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "دریافت اطلاعات انجام نشد.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (account.phase === "error")
    return (
      <LoadFailure message={account.message} retry={() => void refresh()} />
    );
  if (account.phase !== "ready" || !account.data.current) {
    if (dirty && account.phase !== "loading")
      return (
        <section className="account-panel">
          <h1>حساب را دوباره بررسی کنید</h1>
          <p>
            پیش‌نویس پنهان و در حافظه حفظ شده است. در همان حساب و سازمان وارد
            شوید.
          </p>
          <a href="/login" target="_blank" rel="noreferrer">
            ورود در برگه دیگر
          </a>
          <ActionButton onClick={() => void refresh()}>
            بررسی دوباره حساب
          </ActionButton>
        </section>
      );
    return <LoadingAccount />;
  }
  if (identity !== scope) return <LoadingAccount />;
  const blocked = busy || nav.confirming || !!review;
  const readable = !selected || (stamp === account && !detailError);
  const disabled = blocked || !!uncertain || !readable;
  const filterPipeline = pipelines?.results.find((p) => p.id === pipelineId);
  const selectedTarget = detailPipeline?.stages.find(
    (s) => s.id === targetStage,
  );
  return (
    <section className="customer-workspace">
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{account.data.current.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            {config
              ? "تنظیمات قیف فروش"
              : editor
                ? editor.base
                  ? "ویرایش فرصت"
                  : "ثبت فرصت"
                : selected
                  ? "پرونده فرصت"
                  : "فرصت‌ها و قیف فروش"}
          </h1>
          <p className="account-description">
            مبلغ‌ها به تومان‌اند؛ وضعیت هر فرصت از مرحلهٔ قیف آن مشخص می‌شود.
          </p>
        </div>
        <a className="customer-link" href="/workspace">
          بازگشت به فضای کار
        </a>
      </div>
      <Feedback message={error} />
      <Feedback message={message} kind="info" />
      {nav.confirming && (
        <ConfirmPanel
          title="تغییرات ذخیره نشده‌اند"
          description="با ادامه پیش‌نویس و اطلاعات پیگیری درخواست نامشخص کنار گذاشته می‌شود."
          label="کنار گذاشتن پیش‌نویس"
          busy={busy}
          onCancel={nav.cancel}
          onConfirm={nav.confirm}
        />
      )}
      {uncertain && (
        <section className="account-panel">
          <h2>بررسی نتیجه عملیات</h2>
          <p>
            ثبت و تغییر مرحله با همان کلید پیگیری می‌شوند. ویرایش نامشخص فقط با
            خواندن نسخه تازه بررسی می‌شود.
          </p>
          <ActionButton
            busy={busy}
            onClick={() =>
              uncertain.method === "PATCH"
                ? void readLatest()
                : void write(uncertain)
            }
          >
            بررسی نتیجه عملیات
          </ActionButton>
        </section>
      )}
      {(selected || editor || config) && (
        <ActionButton className="secondary" disabled={blocked} onClick={back}>
          بازگشت به فهرست فرصت‌ها
        </ActionButton>
      )}
      {selected &&
        !readable &&
        (stamp !== account ? (
          <p role="status">در حال بررسی دسترسی فرصت…</p>
        ) : (
          <section className="account-panel">
            <h2>فرصت در دسترس نیست</h2>
            <Feedback message={detailError} />
            <ActionButton onClick={() => setRevision((v) => v + 1)}>
              تلاش دوباره
            </ActionButton>
          </section>
        ))}
      {editor &&
        readable &&
        (can(editor.base ? "sale.update" : "sale.create") ? (
          <form
            className="account-panel customer-editor"
            noValidate
            onSubmit={save}
            aria-busy={busy}
          >
            <OpportunityFields
              org={org}
              user={user}
              value={editor.value}
              onChange={(value) => setEditor({ ...editor, value })}
              errors={fields}
              disabled={disabled}
              includeStage={!editor.base}
            />
            {!editor.base && (
              <>
                <FormField id="sale-customer-kind" label="نوع مشتری">
                  <select
                    id="sale-customer-kind"
                    value={editor.customerKind}
                    disabled={disabled}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        customerKind: e.target.value as "people" | "companies",
                        customer: "",
                        customerLabel: "",
                      })
                    }
                  >
                    <option value="people">شخص</option>
                    <option value="companies">شرکت</option>
                  </select>
                </FormField>
                <CustomerPicker
                  organizationId={org}
                  userId={user}
                  kind={editor.customerKind}
                  value={editor.customer}
                  currentLabel={editor.customerLabel}
                  label="مشتری فرصت"
                  disabled={disabled}
                  error={fields.person_id || fields.company_id}
                  onChange={(id, label) =>
                    setEditor({ ...editor, customer: id, customerLabel: label })
                  }
                />
              </>
            )}
            {can("sale.assign") && (
              <CustomerPicker
                organizationId={org}
                userId={user}
                kind="owners"
                value={editor.owner}
                currentLabel={editor.ownerLabel}
                label="مسئول فرصت"
                defaultLabel="خودم"
                disabled={disabled}
                error={fields.owner_id}
                onChange={(id, label) =>
                  setEditor({ ...editor, owner: id, ownerLabel: label })
                }
              />
            )}
            <div className="session-actions">
              <ActionButton type="submit" busy={busy} disabled={disabled}>
                {editor.base ? "ذخیره فرصت" : "ثبت فرصت"}
              </ActionButton>
              <ActionButton
                type="button"
                className="secondary"
                disabled={blocked}
                onClick={() => nav.navigate(() => setEditor(null))}
              >
                انصراف از ویرایش
              </ActionButton>
            </div>
            {editor.base && (
              <div className="session-actions">
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked}
                  onClick={() => void readLatest()}
                >
                  خواندن دوباره فرصت
                </ActionButton>
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked || !!uncertain || !record}
                  onClick={() => nav.navigate(() => record && start(record))}
                >
                  بارگذاری نسخه تازه در فرم
                </ActionButton>
              </div>
            )}
          </form>
        ) : (
          <p role="status">مجوز ویرایش فرصت ندارید؛ پیش‌نویس پنهان است.</p>
        ))}
      {config &&
        (can("pipeline.manage") ? (
          <form
            className="account-panel customer-editor"
            noValidate
            onSubmit={saveConfig}
            aria-busy={busy}
          >
            <FormField id="pipeline-name" label="نام قیف" error={fields.name}>
              <input
                id="pipeline-name"
                value={config.name}
                maxLength={160}
                disabled={disabled}
                aria-invalid={!!fields.name}
                aria-describedby="pipeline-name-error"
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </FormField>
            {!config.base ? (
              <FormField
                id="pipeline-open_stages"
                label="مراحل باز قیف"
                error={fields.open_stages}
                hint="هر مرحله در یک سطر؛ ۱ تا ۲۰ مرحله با نام متفاوت. مرحله‌های برد و باخت خودکار اضافه می‌شوند."
              >
                <AutoTextarea
                  id="pipeline-open_stages"
                  value={config.open}
                  disabled={disabled}
                  aria-invalid={!!fields.open_stages}
                  aria-describedby="pipeline-open_stages-error pipeline-open_stages-hint"
                  onChange={(e) =>
                    setConfig({ ...config, open: e.target.value })
                  }
                />
              </FormField>
            ) : (
              <>
                <p>
                  نام و ترتیب مراحل را تغییر دهید. نوع مرحله، حذف یا افزودن
                  مرحله در این نسخه قابل تغییر نیست.
                </p>
                {config.stages.map((stage, i) => (
                  <div className="account-panel" key={stage.id}>
                    <FormField
                      id={`pipeline-stage-${stage.id}`}
                      label={`نام مرحله ${i + 1} (${states[stage.kind]})`}
                    >
                      <input
                        id={`pipeline-stage-${stage.id}`}
                        value={stage.name}
                        maxLength={160}
                        disabled={disabled}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            stages: config.stages.map((s) =>
                              s.id === stage.id
                                ? { ...s, name: e.target.value }
                                : s,
                            ),
                          })
                        }
                      />
                    </FormField>
                    <div className="session-actions">
                      {[-1, 1].map((direction) => (
                        <ActionButton
                          key={direction}
                          type="button"
                          className="secondary"
                          disabled={
                            disabled ||
                            i + direction < 0 ||
                            i + direction >= config.stages.length
                          }
                          aria-label={`${direction < 0 ? "جلو بردن" : "عقب بردن"} مرحله ${stage.name}`}
                          onClick={() => {
                            const stages = [...config.stages];
                            [stages[i], stages[i + direction]] = [
                              stages[i + direction],
                              stages[i],
                            ];
                            setConfig({ ...config, stages });
                          }}
                        >
                          {direction < 0 ? "مرحله قبل" : "مرحله بعد"}
                        </ActionButton>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
            <ActionButton type="submit" busy={busy} disabled={disabled}>
              بررسی تنظیمات قیف
            </ActionButton>
            {config.base && (
              <div className="session-actions">
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked}
                  onClick={() => void readLatest()}
                >
                  خواندن دوباره تنظیمات قیف
                </ActionButton>
                {latestPipeline && latestPipeline.id === config.base.id && (
                  <ActionButton
                    type="button"
                    className="secondary"
                    disabled={blocked || !!uncertain}
                    onClick={() =>
                      nav.navigate(() =>
                        setConfig({
                          base: latestPipeline,
                          name: latestPipeline.name,
                          open: "",
                          stages: latestPipeline.stages,
                          key: crypto.randomUUID(),
                        }),
                      )
                    }
                  >
                    بارگذاری نسخه تازه قیف
                  </ActionButton>
                )}
              </div>
            )}
          </form>
        ) : (
          <p role="status">تنظیم قیف فقط برای مدیر سازمان مجاز است.</p>
        ))}
      {review && (
        <ConfirmPanel
          title={review.title}
          description={review.description}
          label={review.label}
          busy={busy}
          onCancel={() => {
            setReview(null);
            requestAnimationFrame(() => reviewTrigger.current?.focus());
          }}
          onConfirm={() => void write(review.write)}
        />
      )}
      {!editor && !config && selected && record && readable && (
        <>
          <section className="account-panel customer-profile">
            <h2>{record.title}</h2>
            <dl className="customer-definition">
              <div>
                <dt>مشتری</dt>
                <dd>{record.customer_label}</dd>
              </div>
              <div>
                <dt>مبلغ</dt>
                <dd>{formatToman(record.amount)}</dd>
              </div>
              <div>
                <dt>قیف و مرحله</dt>
                <dd>
                  {record.pipeline_name} — {record.stage_name} (
                  {states[record.state]})
                </dd>
              </div>
              <div>
                <dt>مسئول</dt>
                <dd>{record.owner_label}</dd>
              </div>
              <div>
                <dt>تاریخ احتمالی بسته‌شدن</dt>
                <dd>
                  {record.expected_close_date
                    ? displayPersianDate(record.expected_close_date)
                    : "مشخص نشده"}
                </dd>
              </div>
              {record.closed_at && (
                <div>
                  <dt>زمان بسته‌شدن</dt>
                  <dd>{formatAccountDate(record.closed_at)}</dd>
                </div>
              )}
              {record.loss_reason && (
                <div>
                  <dt>دلیل باخت</dt>
                  <dd>{record.loss_reason}</dd>
                </div>
              )}
            </dl>
            <p>
              <a
                className="customer-link"
                href={`/activities?target_type=opportunity&target_id=${record.id}`}
              >
                فعالیت‌ها و پیگیری این فرصت
              </a>
            </p>
            {record.state === "open" && can("sale.update") && (
              <ActionButton disabled={disabled} onClick={() => start(record)}>
                ویرایش فرصت
              </ActionButton>
            )}
            {!busy && !uncertain && (
              <p>
                <a
                  className="customer-link"
                  href={`/customers?kind=${record.person_id ? "people" : "companies"}&record=${record.person_id || record.company_id}`}
                >
                  مشاهده مشتری فرصت
                </a>
              </p>
            )}
          </section>
          {(record.state === "open"
            ? can("sale.move")
            : can("sale.reopen")) && (
            <form
              className="account-panel customer-editor"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!targetStage || disabled) return;
                confirm(
                  {
                    path: `opportunities/${record.id}/${record.state === "open" ? "move" : "reopen"}/`,
                    body: {
                      version: record.version,
                      stage_id: targetStage,
                      reason,
                    },
                    key: crypto.randomUUID(),
                    kind: "move",
                  },
                  record.state === "open"
                    ? "تأیید تغییر مرحله"
                    : "تأیید بازگشایی فرصت",
                  `فرصت «${record.title}» به مرحله «${selectedTarget?.name}» می‌رود. ${formatToman(record.amount)}. تاریخچه این تغییر حفظ می‌شود.`,
                  "ثبت تغییر مرحله",
                );
              }}
            >
              <h2>
                {record.state === "open" ? "تغییر مرحله فرصت" : "بازگشایی فرصت"}
              </h2>
              <FormField
                id="sale-stage_id"
                label="مرحله مقصد"
                error={fields.stage_id}
              >
                <select
                  id="sale-stage_id"
                  value={targetStage}
                  disabled={disabled}
                  aria-invalid={!!fields.stage_id}
                  aria-describedby="sale-stage_id-error"
                  onChange={(e) => setTargetStage(e.target.value)}
                >
                  <option value="">انتخاب مرحله مقصد</option>
                  {detailPipeline?.stages
                    .filter(
                      (s) =>
                        s.id !== record.stage_id &&
                        (record.state === "open" || s.kind === "open"),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({states[s.kind]})
                      </option>
                    ))}
                </select>
              </FormField>
              <FormField
                id="sale-reason"
                label={
                  record.state === "open"
                    ? "توضیح تغییر مرحله / دلیل باخت"
                    : "دلیل بازگشایی"
                }
                error={fields.reason}
                hint="برای باخت و بازگشایی، دلیل لازم است."
              >
                <AutoTextarea
                  id="sale-reason"
                  maxLength={500}
                  value={reason}
                  disabled={disabled}
                  aria-invalid={!!fields.reason}
                  aria-describedby="sale-reason-error sale-reason-hint"
                  onChange={(e) => setReason(e.target.value)}
                />
              </FormField>
              <ActionButton type="submit" disabled={disabled || !targetStage}>
                بررسی تغییر مرحله
              </ActionButton>
            </form>
          )}
          {history && (
            <section className="account-panel customer-editor">
              <h2>تاریخچه فرصت</h2>
              <ul className="session-list">
                {history.results.map((item) => (
                  <li key={item.id}>
                    <p>
                      {item.action === "created"
                        ? "ایجاد فرصت"
                        : item.action === "updated"
                          ? "ویرایش فرصت"
                          : item.action === "reopened"
                            ? "بازگشایی"
                            : "تغییر مرحله"}
                      :{" "}
                      {item.previous_stage_name
                        ? `${item.previous_stage_name} ← `
                        : ""}
                      {item.stage_name}
                    </p>
                    <p>
                      {formatToman(item.amount)} —{" "}
                      {formatAccountDate(item.created_at)}
                    </p>
                    {item.reason && <p>{item.reason}</p>}
                  </li>
                ))}
              </ul>
              <Pager
                page={historyPage}
                count={history.count}
                previous={!!history.previous}
                next={!!history.next}
                busy={blocked}
                onPage={setHistoryPage}
              />
            </section>
          )}
        </>
      )}
      {!editor && !config && !selected && (
        <>
          <div className="customer-toolbar">
            <SearchBox
              id="sale-search"
              label="جست‌وجوی فرصت‌ها"
              value={query}
              onChange={setQuery}
              onCommit={(value) => {
                setSearch(value);
                setPage(1);
              }}
              disabled={blocked}
            />
            <FormField id="sale-state" label="وضعیت فرصت">
              <select
                id="sale-state"
                value={state}
                disabled={blocked}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(states).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            {can("sale.create") && (
              <ActionButton disabled={blocked} onClick={() => start(null)}>
                ثبت فرصت
              </ActionButton>
            )}
          </div>
          <Feedback message={pipelineError} />
          {pipelineError && (
            <ActionButton onClick={() => setRevision((v) => v + 1)}>
              تلاش دوباره برای دریافت قیف‌ها
            </ActionButton>
          )}
          <FormField id="sale-filter-pipeline" label="فیلتر قیف">
            <select
              id="sale-filter-pipeline"
              value={pipelineId}
              disabled={blocked || !pipelines}
              onChange={(e) => {
                setPipelineId(e.target.value);
                setStageFilter("");
                setPage(1);
              }}
            >
              <option value="">همه قیف‌ها</option>
              {pipelines?.results.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          {pipelines && (
            <Pager
              page={pipelinePage}
              count={pipelines.count}
              previous={!!pipelines.previous}
              next={!!pipelines.next}
              busy={blocked}
              onPage={(value) => {
                setPipelinePage(value);
                setPipelineId("");
                setStageFilter("");
                setPage(1);
              }}
            />
          )}
          {filterPipeline && listStamp === account && (
            <PipelineSummary
              key={`${identity}:${filterPipeline.id}:${filterPipeline.version}:${revision}`}
              organizationId={org}
              userId={user}
              pipelineId={filterPipeline.id}
            />
          )}
          {filterPipeline && (
            <nav
              className="customer-kind"
              aria-label="مراحل قیف"
              style={{ flexWrap: "wrap" }}
            >
              <ActionButton
                className="secondary"
                aria-pressed={!stageFilter}
                onClick={() => {
                  setStageFilter("");
                  setPage(1);
                }}
              >
                همه مراحل
              </ActionButton>
              {filterPipeline.stages.map((stage) => (
                <ActionButton
                  className="secondary"
                  key={stage.id}
                  aria-pressed={stageFilter === stage.id}
                  onClick={() => {
                    setStageFilter(stage.id);
                    setPage(1);
                  }}
                >
                  {stage.name}
                </ActionButton>
              ))}
            </nav>
          )}
          {can("pipeline.manage") && (
            <div className="session-actions">
              <ActionButton
                className="secondary"
                disabled={blocked}
                onClick={() => {
                  reset();
                  setConfig({
                    base: null,
                    name: "",
                    open: "نیازسنجی\nپیشنهاد\nمذاکره",
                    stages: [],
                    key: crypto.randomUUID(),
                  });
                  focus();
                }}
              >
                تعریف قیف فروش
              </ActionButton>
              {filterPipeline && (
                <ActionButton
                  className="secondary"
                  disabled={blocked}
                  onClick={() => {
                    reset();
                    setConfig({
                      base: filterPipeline,
                      name: filterPipeline.name,
                      open: "",
                      stages: filterPipeline.stages,
                      key: crypto.randomUUID(),
                    });
                    focus();
                  }}
                >
                  ویرایش مراحل قیف
                </ActionButton>
              )}
            </div>
          )}
          {pipelines?.count === 0 && (
            <p>
              هنوز قیفی تعریف نشده است. مدیر سازمان باید ابتدا قیف فروش را
              بسازد.
            </p>
          )}
          {listStamp !== account ? (
            <p role="status">در حال دریافت فرصت‌ها…</p>
          ) : listError ? (
            <section className="account-panel">
              <h2>فهرست دریافت نشد</h2>
              <Feedback message={listError} />
              <ActionButton onClick={() => setRevision((v) => v + 1)}>
                تلاش دوباره
              </ActionButton>
            </section>
          ) : (
            list &&
            (list.count ? (
              <>
                <div
                  className="customer-table-scroll"
                  role="region"
                  aria-label="فهرست فرصت‌ها"
                  tabIndex={0}
                >
                  <table className="customer-table">
                    <thead>
                      <tr>
                        <th scope="col">فرصت</th>
                        <th scope="col">مشتری</th>
                        <th scope="col">مرحله</th>
                        <th scope="col">مبلغ (تومان)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.results.map((sale) => (
                        <tr key={sale.id}>
                          <td>
                            <button
                              className="customer-record-link"
                              type="button"
                              aria-label={`مشاهده فرصت ${sale.title}`}
                              onClick={() => {
                                setSelected(sale.id);
                                setHistoryPage(1);
                                setReason("");
                                setTargetStage("");
                                setError("");
                                focus();
                              }}
                            >
                              {sale.title}
                            </button>
                          </td>
                          <td>{sale.customer_label}</td>
                          <td>
                            <RecordStatus>
                              {sale.stage_name} ({states[sale.state]})
                            </RecordStatus>
                          </td>
                          <td>{formatToman(sale.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  page={page}
                  count={list.count}
                  previous={!!list.previous}
                  next={!!list.next}
                  busy={blocked}
                  onPage={setPage}
                />
              </>
            ) : (
              <section className="account-panel customer-empty">
                <h2>
                  {search || state || pipelineId
                    ? "نتیجه‌ای پیدا نشد"
                    : "هنوز فرصتی ثبت نشده است"}
                </h2>
                <p>برای مشتری موجود، فرصت و مرحله آغاز آن را مشخص کنید.</p>
              </section>
            ))
          )}
        </>
      )}
    </section>
  );
}
