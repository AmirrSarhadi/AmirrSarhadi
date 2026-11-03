"use client";
import { useNavigationRequest } from "../lib/request-navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type ApiOptions } from "../lib/api";
import { useAccount } from "../lib/use-account";
import {
  LeadInputError,
  leadDraft,
  leadFields,
  leadPayload,
  statuses,
  statusLabel,
  type Lead,
} from "../lib/leads";
import { number, type Page } from "../lib/customers";
import { formatAccountDate } from "../lib/format";
import {
  ActionButton,
  Feedback,
  LoadingAccount,
  LoadFailure,
} from "./account-ui";
import { ConfirmPanel, FormField, Pager, SearchBox } from "./customer-controls";
import { RecordStatus } from "./record-fields";
import { CustomerPicker } from "./customer-picker";
import { LeadConversion, type ConversionDraft } from "./lead-conversion";

import { LeadReferenceFields } from "./lead-reference-fields";
import {
  LeadReferenceProfile,
  LeadProbability,
} from "./lead-reference-profile";
import { LeadSummary } from "./lead-summary";
import {
  CustomerAttachments,
  type AttachmentDraft,
} from "./customer-attachments";
import { CustomerFileActions } from "./customer-file-actions";
import {
  CustomerImportPreview,
  type ImportDraft,
} from "./customer-import-preview";
import { RelatedList } from "./customer-related-records";
import { formatToman, displayPersianDate } from "../lib/sales-entry";
import { Eye, Pencil, Archive, UserCheck, Plus, RotateCcw } from "lucide-react";
type Editor = {
  base: Lead | null;
  draft: Record<string, string>;
  baseline: Record<string, string>;
  key: string;
};
type Confirmation = {
  title: string;
  description: string;
  label: string;
  danger?: boolean;
  action: () => void;
};
export function LeadWorkspace() {
  const { account, refresh } = useAccount(),
    router = useRouter();
  const identity =
    account.phase === "ready" && account.data.current
      ? `${account.data.user.user_id}:${account.data.current.organization_id}`
      : null;
  const [scope, setScope] = useState("");
  const scopeRef = useRef("");
  const accountRef = useRef<object>(account);
  accountRef.current = account;
  const org =
    account.phase === "ready"
      ? account.data.current?.organization_id || ""
      : "";
  const request = useCallback(
    <T,>(path: string, options: ApiOptions = {}) =>
      api<T>(path, {
        ...options,
        namespace: "leads",
        organizationId: scope.split(":")[1],
        expectedUserId: Number(scope.split(":")[0]),
      }),
    [scope],
  );
  const [view, setView] = useState<
      "list" | "detail" | "form" | "convert" | "import"
    >("list"),
    [id, setId] = useState<string | null>(null);
  const [attachmentDraft, setAttachmentDraft] =
    useState<AttachmentDraft | null>(null);
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [sourceFilter, setSourceFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [related, setRelated] = useState(false);
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [priority, setPriority] = useState(""),
    [status, setStatus] = useState(""),
    [archived, setArchived] = useState("active"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [list, setList] = useState<Page<Lead> | null>(null),
    [record, setRecord] = useState<Lead | null>(null),
    [readError, setReadError] = useState(""),
    [readKey, setReadKey] = useState(""),
    [stamp, setStamp] = useState<object | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null),
    [conversion, setConversion] = useState<ConversionDraft | null>(null);
  const [formStamp, setFormStamp] = useState<object | null>(null),
    [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [flowLocked, setFlowLocked] = useState(false);
  const pending = useRef(false),
    flowPending = useRef(false),
    mutation = useRef<AbortController | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const first = useRef(true),
    focusId = useRef("");
  const dirty =
    !!attachmentDraft ||
    !!importDraft ||
    (!!editor &&
      Object.keys(editor.draft).some(
        (key) =>
          key !== "owner_label" && editor.draft[key] !== editor.baseline[key],
      )) ||
    (!!conversion &&
      (!!conversion.person ||
        !!conversion.company ||
        !!conversion.attempt ||
        !!conversion.opportunity));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const can = (operation: string) =>
    account.phase === "ready" &&
    account.data.operations.includes(`lead.${operation}`);
  const updatePending = useCallback((value: boolean) => {
    flowPending.current = value;
    setFlowLocked(value);
  }, []);
  const clear = () => {
    setEditor(null);
    setAttachmentDraft(null);
    setImportDraft(null);
    setRelated(false);
    setConversion(null);
    setConfirmation(null);
    setUncertain(false);
    setConflict(false);
    setFields({});
    setError("");
  };
  useEffect(() => {
    if (account.phase === "anonymous" && !dirtyRef.current && !uncertain)
      router.replace("/login");
    if (account.phase === "ready" && !account.data.current && !dirtyRef.current)
      router.replace("/organizations");
    if (identity && scopeRef.current !== identity) {
      const initial = first.current;
      first.current = false;
      const params = new URLSearchParams(window.location.search);
      setPriority(
        ["low", "normal", "high"].includes(params.get("priority") || "")
          ? params.get("priority")!
          : "",
      );
      scopeRef.current = identity;
      setScope(identity);
      clear();
      setSourceFilter("");
      setOwnerFilter("");
      setRecord(null);
      setList(null);
      setQuery("");
      setSearch("");
      setStatus(
        initial &&
          [...statuses.map((item) => item.value), "converted", "open"].includes(
            params.get("status") || "",
          )
          ? params.get("status")!
          : "",
      );
      setArchived(
        initial &&
          ["active", "only", "all"].includes(params.get("archived") || "")
          ? params.get("archived")!
          : "active",
      );
      const requested = Number(params.get("page"));
      setPage(
        initial &&
          Number.isInteger(requested) &&
          requested > 0 &&
          requested < 100000
          ? requested
          : 1,
      );
      const linked = initial ? params.get("record") : null;
      const valid =
        linked &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          linked,
        )
          ? linked
          : null;
      setId(valid);
      setView(valid ? "detail" : "list");
      setMessage(initial ? "" : "زمینه حساب تغییر کرد؛ داده قبلی پاک شد.");
    }
  }, [account, identity, router, uncertain]);
  useEffect(() => {
    if (identity === scope && identity) {
      const params = new URLSearchParams({
        priority,
        status,
        archived,
        page: String(page),
      });
      if (view === "detail" && id) params.set("record", id);
      window.history.replaceState(null, "", `/leads?${params}`);
    }
  }, [identity, scope, priority, status, archived, page, view, id]);
  useEffect(() => {
    document.title = "سرنخ‌ها | NewCRM";
  }, []);
  function ask(action: Confirmation) {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setConfirmation(action);
  }
  function close() {
    setConfirmation(null);
    const target = trigger.current;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
      else heading.current?.focus();
    });
  }
  function leave(action: () => void) {
    if (pending.current || flowPending.current) return;
    if (dirtyRef.current)
      ask({
        title: "تغییرات ذخیره نشده‌اند",
        description:
          "با ادامه، پیش‌نویس این صفحه کنار گذاشته می‌شود. برای حفظ آن انصراف دهید.",
        label: "کنار گذاشتن پیش‌نویس",
        action: () => {
          dirtyRef.current = false;
          clear();
          action();
        },
      });
    else {
      clear();
      action();
    }
  }
  useNavigationRequest(leave);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !dirtyRef.current ||
        !link ||
        link.target === "_blank" ||
        link.getAttribute("href")?.startsWith("#") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      leave(() => window.location.assign(link.href));
    };
    const blur = () => {
      focusId.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.id
          : "";
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
      window.removeEventListener("blur", blur);
      mutation.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (account.phase === "ready" && identity === scope) {
      if (focusId.current) {
        document.getElementById(focusId.current)?.focus();
        focusId.current = "";
      } else heading.current?.focus();
    }
  }, [account.phase, identity, scope, view]);
  const expectedRead =
    view === "list"
      ? `${search}:${priority}:${status}:${sourceFilter}:${ownerFilter}:${archived}:${page}`
      : `detail:${id}`;
  useEffect(() => {
    if (
      account.phase !== "ready" ||
      !identity ||
      identity !== scope ||
      (view !== "list" && view !== "detail")
    )
      return;
    const abort = new AbortController(),
      current = account;
    setReadError("");
    setStamp(null);
    request<Page<Lead> | Lead>(
      view === "list"
        ? `?q=${encodeURIComponent(search)}&priority=${priority}&status=${status}&archived=${archived}&page=${page}&source=${encodeURIComponent(sourceFilter)}${ownerFilter ? `&owner_id=${ownerFilter}` : ""}`
        : `${id}/`,
      { signal: abort.signal },
    )
      .then((result) => {
        if (!abort.signal.aborted) {
          if (view === "list") setList(result as Page<Lead>);
          else setRecord(result as Lead);
          setStamp(current);
          setReadKey(expectedRead);
        }
      })
      .catch((failure) => {
        if (!abort.signal.aborted) {
          setReadError(
            failure instanceof Error ? failure.message : "داده دریافت نشد.",
          );
          setStamp(current);
          setReadKey(expectedRead);
        }
      });
    return () => abort.abort();
  }, [
    account,
    identity,
    scope,
    view,
    id,
    search,
    status,
    priority,
    sourceFilter,
    ownerFilter,
    archived,
    page,
    revision,
    request,
    expectedRead,
  ]);
  useEffect(() => {
    if (
      account.phase !== "ready" ||
      !identity ||
      identity !== scope ||
      view !== "form"
    )
      return;
    if (!editor?.base) {
      setFormStamp(account);
      setFormError("");
      return;
    }
    const abort = new AbortController(),
      current = account;
    request<Lead>(`${editor.base.id}/`, { signal: abort.signal })
      .then(() => {
        if (!abort.signal.aborted) {
          setFormStamp(current);
          setFormError("");
        }
      })
      .catch((failure) => {
        if (!abort.signal.aborted) {
          setFormStamp(current);
          setFormError(
            failure instanceof Error ? failure.message : "دسترسی تأیید نشد.",
          );
        }
      });
    return () => abort.abort();
  }, [account, identity, scope, view, editor?.base?.id, request]);
  function open(item: Lead) {
    clear();
    setRecord(null);
    setId(item.id);
    setView("detail");
    setMessage("");
  }
  function start(base: Lead | null) {
    const draft = leadDraft(base || undefined);
    setEditor({
      base,
      draft,
      baseline: { ...draft },
      key: crypto.randomUUID(),
    });
    setFormError("");
    setFields({});
    setView("form");
    setError("");
    setMessage("");
    setConflict(false);
    setUncertain(false);
  }
  function change(name: string, value: string) {
    setEditor((previous) => {
      if (!previous) return null;
      const draft = { ...previous.draft, [name]: value };
      const canonical =
        name === "contact_phone"
          ? "phones"
          : name === "contact_email"
            ? "emails"
            : null;
      if (canonical) {
        const values = (draft[canonical] || "").split(/\r?\n/).filter(Boolean);
        if (values.length) values[0] = value;
        else values.push(value);
        draft[canonical] = values.filter(Boolean).join("\n");
      }
      if (name === "phones")
        draft.contact_phone = value.split(/\r?\n/)[0] || "";
      if (name === "emails")
        draft.contact_email = value.split(/\r?\n/)[0] || "";
      return { ...previous, draft };
    });
    setFields((previous) => ({ ...previous, [name]: "" }));
  }
  const focusInvalid = () =>
    setTimeout(
      () =>
        document
          .querySelector<HTMLElement>('.lead-workspace [aria-invalid="true"]')
          ?.focus(),
      0,
    );
  async function mutate(
    task: (signal: AbortSignal) => Promise<unknown>,
    success: () => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const bound = scope;
    const abort = new AbortController();
    mutation.current = abort;
    try {
      await task(abort.signal);
      if (!abort.signal.aborted && scopeRef.current === bound) {
        setConfirmation(null);
        setStamp(null);
        setUncertain(false);
        setConflict(false);
        success();
      }
    } catch (failure) {
      if (abort.signal.aborted || scopeRef.current !== bound) return;
      setConfirmation(null);
      if (failure instanceof ApiError && failure.status === 400) {
        setFields(
          Object.fromEntries(
            Object.entries(failure.fields).map(([key, values]) => [
              key,
              values.join(" "),
            ]),
          ),
        );
        setError("اطلاعات فرم را بررسی و موارد مشخص‌شده را اصلاح کنید.");
        focusInvalid();
      } else if (failure instanceof ApiError && failure.status === 409) {
        setConflict(true);
        setError(failure.message);
      } else if (
        failure instanceof ApiError &&
        [403, 404].includes(failure.status)
      ) {
        setError(failure.message);
        if (failure.status === 403) void refresh();
      } else {
        setUncertain(true);
        setError(
          "نتیجه عملیات مشخص نیست؛ پیش از تلاش دوباره، نتیجه را بررسی کنید.",
        );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function save(approved = false, recover = false) {
    if (!editor || pending.current || (conflict && !recover)) return;
    const invalid: Record<string, string> = {};
    if (!editor.draft.title.trim()) invalid.title = "عنوان سرنخ را وارد کنید.";
    if (
      editor.draft.status === "rejected" &&
      !editor.draft.rejection_reason.trim()
    )
      invalid.rejection_reason = "دلیل رد سرنخ را وارد کنید.";
    setFields(invalid);
    if (Object.keys(invalid).length) {
      focusInvalid();
      return;
    }
    if (
      !approved &&
      editor.draft.owner_id &&
      (!editor.base || editor.draft.owner_id !== String(editor.base.owner_id))
    ) {
      ask({
        title: "تأیید تغییر مسئول سرنخ",
        description: `مسئول «${editor.draft.title}» به «${editor.draft.owner_label}» تغییر می‌کند و دسترسی افراد ممکن است تغییر کند.`,
        label: "تغییر مسئول و ذخیره",
        action: () => save(true),
      });
      return;
    }
    let body: Record<string, unknown>;
    try {
      body = leadPayload(editor.draft);
    } catch (error) {
      setFields({
        [error instanceof LeadInputError ? error.field : "estimated_amount"]:
          error instanceof Error ? error.message : "مبلغ معتبر نیست.",
      });
      focusInvalid();
      return;
    }
    if (editor.base) body.version = editor.base.version;
    void mutate(
      (signal) =>
        request(editor.base ? `${editor.base.id}/` : "", {
          body,
          method: editor.base ? "PATCH" : "POST",
          signal,
          ...(!editor.base ? { idempotencyKey: editor.key } : {}),
        }),
      () => {
        dirtyRef.current = false;
        setEditor(null);
        setView("list");
        setId(null);
        if (!editor.base) {
          setPriority("");
          setSourceFilter("");
          setOwnerFilter("");
          setPage(1);
          setQuery("");
          setSearch("");
          setStatus("");
          setArchived("active");
        }
        setRevision((value) => value + 1);
        setMessage(editor.base ? "تغییرات سرنخ ذخیره شد." : "سرنخ ثبت شد.");
      },
    );
  }
  async function fresh() {
    if (pending.current) return;
    if (editor && !editor.base) {
      save(true, true);
      return;
    }
    pending.current = true;
    setBusy(true);
    const abort = new AbortController();
    mutation.current = abort;
    const bound = scope;
    try {
      const current = await request<Lead>(`${editor?.base?.id || id}/`, {
        signal: abort.signal,
      });
      if (abort.signal.aborted || scopeRef.current !== bound) return;
      if (editor) {
        const baseline = leadDraft(current),
          draft = { ...baseline };
        for (const key of Object.keys(editor.draft))
          if (editor.draft[key] !== editor.baseline[key])
            draft[key] = editor.draft[key];
        setEditor({ ...editor, base: current, draft, baseline });
        if (current.status === "converted")
          setMessage(
            "این سرنخ قبلاً تبدیل شده و قابل ویرایش نیست؛ پیش‌نویس شما حفظ شده است.",
          );
        else
          setMessage(
            "نسخه تازه دریافت شد؛ تغییرات خود را بررسی و سپس ذخیره کنید.",
          );
      } else {
        setRecord(current);
        setRevision((value) => value + 1);
      }
      setConflict(false);
      setUncertain(false);
      setError("");
    } catch (failure) {
      if (!abort.signal.aborted)
        setError(
          failure instanceof Error ? failure.message : "اطلاعات دریافت نشد.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function archive(target: Lead | null = record) {
    if (!target) return;
    setId(target.id);
    setRecord(target);
    ask({
      title: target.archived_at ? "بازگردانی سرنخ" : "بایگانی سرنخ",
      description: `«${target.title}» ${target.archived_at ? "به فهرست فعال بازمی‌گردد." : "از فهرست فعال کنار می‌رود؛ اطلاعات و نتیجه تبدیل حفظ می‌شوند."}`,
      label: target.archived_at ? "بازگردانی سرنخ" : "بایگانی سرنخ",
      danger: !target.archived_at,
      action: () =>
        void mutate(
          (signal) =>
            request(
              `${target.id}/${target.archived_at ? "restore" : "archive"}/`,
              { body: { version: target.version }, signal },
            ),
          () => {
            setRevision((value) => value + 1);
            setMessage("وضعیت بایگانی سرنخ تغییر کرد.");
          },
        ),
    });
  }
  if (account.phase === "error")
    return (
      <LoadFailure message={account.message} retry={() => void refresh()} />
    );
  if (account.phase === "loading") return <LoadingAccount />;
  if (
    (account.phase === "anonymous" ||
      (account.phase === "ready" && !account.data.current)) &&
    (dirty || uncertain)
  )
    return (
      <section className="account-panel">
        <h1>زمینه حساب نیاز به بررسی دارد</h1>
        <p>
          پیش‌نویس در حافظه این صفحه حفظ و پنهان است؛ در زبانه تازه وارد همان
          حساب و سازمان شوید.
        </p>
        <a
          className="account-button secondary"
          href="/login"
          target="_blank"
          rel="noopener"
        >
          ورود در زبانه جدید
        </a>
        <ActionButton onClick={() => void refresh()}>
          بررسی دوباره حساب
        </ActionButton>
      </section>
    );
  if (account.phase !== "ready" || !account.data.current || identity !== scope)
    return <LoadingAccount />;
  const blocked = busy || !!confirmation,
    unsupported =
      !!editor &&
      !can("assign") &&
      !!editor.draft.owner_id &&
      editor.draft.owner_id !== editor.baseline.owner_id;
  const controlsDisabled =
    blocked ||
    uncertain ||
    conflict ||
    (!!editor?.base &&
      (editor.base.status === "converted" || !!editor.base.archived_at)) ||
    !can(editor?.base ? "update" : "create");
  return (
    <section className="customer-workspace lead-workspace customer-reference-workspace lead-reference-workspace">
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{account.data.current.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            {view === "form"
              ? editor?.base
                ? "ویرایش سرنخ"
                : "ثبت سرنخ"
              : view === "convert"
                ? "تبدیل سرنخ"
                : view === "detail" && stamp === account && record
                  ? record.title
                  : view === "import"
                    ? "ورود فایل لیدها"
                    : "مدیریت لیدها"}
          </h1>
          <p className="account-description">
            {account.data.scope === "organization"
              ? "سرنخ‌های سازمان"
              : account.data.scope === "team"
                ? "سرنخ‌های من و تیم‌های مشترک"
                : "سرنخ‌های من"}
          </p>
        </div>
        <a href="/workspace" className="customer-link">
          بازگشت به فضای کار
        </a>
      </div>
      <Feedback message={error || message} kind={error ? "error" : "info"} />
      {confirmation && (
        <ConfirmPanel
          {...confirmation}
          busy={busy}
          onCancel={close}
          onConfirm={confirmation.action}
        />
      )}
      {(conflict || uncertain) && (
        <section className="account-panel customer-review">
          <p>
            {editor && !editor.base
              ? "همان درخواست بررسی می‌شود تا سرنخ دوم ساخته نشود."
              : "نسخه تازه را دریافت کنید؛ پیش‌نویس حفظ می‌شود و ذخیره دوباره خودکار نیست."}
          </p>
          <ActionButton busy={busy} onClick={() => void fresh()}>
            {editor && !editor.base
              ? "بررسی و تکمیل ثبت"
              : "دریافت نسخه تازه برای بازبینی"}
          </ActionButton>
        </section>
      )}
      {view === "list" && (
        <>
          <LeadSummary
            organizationId={org}
            userId={account.data.user.user_id}
            revision={revision}
          />
          <div className="customer-toolbar">
            <SearchBox
              id="lead-search"
              label="جست‌وجوی سرنخ‌ها"
              value={query}
              onChange={setQuery}
              onCommit={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <FormField id="lead-priority-filter" label="فیلتر اولویت">
              <select
                id="lead-priority-filter"
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه اولویت‌ها</option>
                <option value="high">بالا</option>
                <option value="normal">عادی</option>
                <option value="low">پایین</option>
              </select>
            </FormField>
            <FormField id="lead-status-filter" label="فیلتر وضعیت">
              <select
                id="lead-status-filter"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه وضعیت‌ها</option>
                {[
                  ...statuses,
                  { value: "converted", label: "تبدیل‌شده" },
                  { value: "open", label: "باز (غیرردشده)" },
                ].map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="lead-archive-filter" label="وضعیت بایگانی">
              <select
                id="lead-archive-filter"
                value={archived}
                onChange={(event) => {
                  setArchived(event.target.value);
                  setPage(1);
                }}
              >
                <option value="active">فعال</option>
                <option value="only">بایگانی‌شده</option>
                <option value="all">همه پرونده‌ها</option>
              </select>
            </FormField>
            <FormField id="lead-source-filter" label="فیلتر منبع">
              <input
                id="lead-source-filter"
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="نام دقیق منبع"
              />
            </FormField>
            <CustomerPicker
              namespace="leads"
              kind="owners"
              compact
              organizationId={org}
              userId={account.data.user.user_id}
              value={ownerFilter}
              label="فیلتر مسئول"
              defaultLabel="همه مسئولان مجاز"
              disabled={blocked || flowLocked}
              onChange={(value) => {
                setOwnerFilter(value);
                setPage(1);
              }}
            />
          </div>
          <div className="customer-list-heading">
            <h2>
              لیست لیدها{" "}
              {stamp === account && list && (
                <RecordStatus>{number(list.count)}</RecordStatus>
              )}
            </h2>
            <div className="customer-list-tools">
              <CustomerFileActions
                kind="leads"
                organizationId={org}
                userId={account.data.user.user_id}
                canExport={can("export")}
                canImport={can("create")}
                disabled={
                  blocked ||
                  flowLocked ||
                  stamp !== account ||
                  readKey !== expectedRead
                }
                query={new URLSearchParams({
                  q: search,
                  status,
                  priority,
                  source: sourceFilter,
                  archived,
                  ...(ownerFilter ? { owner_id: ownerFilter } : {}),
                }).toString()}
                onImport={() => {
                  setView("import");
                  setError("");
                  setMessage("");
                }}
              />
              {can("create") && (
                <ActionButton
                  disabled={blocked || flowLocked}
                  onClick={() => start(null)}
                >
                  <Plus size={17} aria-hidden="true" />
                  ثبت سرنخ
                </ActionButton>
              )}
            </div>
          </div>
          {stamp !== account || readKey !== expectedRead ? (
            <LoadingAccount />
          ) : readError ? (
            <LoadFailure
              title="فهرست دریافت نشد"
              message={readError}
              retry={() => setRevision((value) => value + 1)}
            />
          ) : (
            list && (
              <>
                {!list.count ? (
                  <section
                    className="account-panel customer-empty"
                    role="status"
                  >
                    <h2>
                      {search ? "نتیجه‌ای پیدا نشد" : "سرنخی در این فهرست نیست"}
                    </h2>
                    <p>
                      {search
                        ? "عبارت یا فیلترها را تغییر دهید."
                        : can("create")
                          ? "برای شروع، سرنخ جدید ثبت کنید."
                          : "سرنخی به شما اختصاص داده نشده است."}
                    </p>
                  </section>
                ) : (
                  <div
                    className="customer-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="فهرست سرنخ‌ها"
                  >
                    <table className="customer-table">
                      <caption className="sr-only">سرنخ‌های مجاز</caption>
                      <thead>
                        <tr>
                          <th scope="col">عنوان</th>
                          <th scope="col">نام و نام خانوادگی</th>
                          <th scope="col">شرکت</th>
                          <th scope="col">تماس</th>
                          <th scope="col">ارزش</th>
                          <th scope="col">احتمال</th>
                          <th scope="col">اولویت</th>
                          <th scope="col">وضعیت</th>
                          <th scope="col">مسئول</th>
                          <th scope="col">تاریخ بسته‌شدن مورد انتظار</th>
                          <th scope="col">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.results.map((item) => (
                          <tr key={item.id} data-record-id={item.id}>
                            <td>
                              <button
                                className="customer-record-link"
                                onClick={() => open(item)}
                                aria-label={`مشاهده سرنخ ${item.title}`}
                              >
                                {item.title}
                              </button>
                              {item.source && (
                                <span className="customer-secondary">
                                  {item.source}
                                </span>
                              )}
                            </td>
                            <td>
                              {[item.first_name, item.last_name]
                                .filter(Boolean)
                                .join(" ") || "ثبت نشده"}
                            </td>
                            <td>{item.company_name || "—"}</td>
                            <td>
                              {item.emails?.map((v) => (
                                <span className="customer-secondary" key={v}>
                                  <bdi>{v}</bdi>
                                </span>
                              ))}
                              {item.phones?.map((v) => (
                                <span className="customer-secondary" key={v}>
                                  <bdi>{v}</bdi>
                                </span>
                              ))}
                            </td>
                            <td>{formatToman(item.estimated_amount)}</td>
                            <td>
                              <LeadProbability value={item.probability} />
                            </td>
                            <td>
                              <RecordStatus
                                tone={
                                  item.priority === "high"
                                    ? "warning"
                                    : "neutral"
                                }
                              >
                                {{ high: "بالا", normal: "عادی", low: "پایین" }[
                                  item.priority
                                ] || "نامشخص"}
                              </RecordStatus>
                            </td>
                            <td>
                              <RecordStatus
                                tone={
                                  item.status === "converted"
                                    ? "success"
                                    : item.status === "qualified" ||
                                        item.status === "proposal"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {statusLabel(item.status)}
                              </RecordStatus>
                              {item.archived_at ? " · بایگانی‌شده" : ""}
                            </td>
                            <td>
                              <bdi>{item.owner_label}</bdi>
                            </td>
                            <td>
                              {item.expected_close_date
                                ? displayPersianDate(item.expected_close_date)
                                : "ثبت نشده"}
                            </td>
                            <td>
                              <div className="customer-row-actions">
                                <ActionButton
                                  className="secondary"
                                  title="جزئیات لید"
                                  aria-label={`جزئیات لید ${item.title}`}
                                  disabled={blocked || flowLocked}
                                  onClick={() => open(item)}
                                >
                                  <Eye size={16} aria-hidden="true" />
                                </ActionButton>
                                {can("update") &&
                                  !item.archived_at &&
                                  item.status !== "converted" && (
                                    <ActionButton
                                      className="secondary"
                                      title="ویرایش لید"
                                      aria-label={`ویرایش لید ${item.title}`}
                                      disabled={blocked || flowLocked}
                                      onClick={() => start(item)}
                                    >
                                      <Pencil size={16} aria-hidden="true" />
                                    </ActionButton>
                                  )}
                                {can("convert") &&
                                  item.status === "qualified" &&
                                  !item.archived_at && (
                                    <ActionButton
                                      className="secondary"
                                      title="تبدیل به مشتری"
                                      aria-label={`تبدیل لید ${item.title}`}
                                      disabled={blocked || flowLocked}
                                      onClick={() =>
                                        leave(() => {
                                          setId(item.id);
                                          setRecord(item);
                                          setConversion({
                                            lead: item,
                                            person: null,
                                            company: null,
                                          });
                                          setView("convert");
                                        })
                                      }
                                    >
                                      <UserCheck size={16} aria-hidden="true" />
                                    </ActionButton>
                                  )}
                                {can("archive") && !item.archived_at && (
                                  <ActionButton
                                    className="secondary customer-quiet-danger"
                                    title="بایگانی لید"
                                    aria-label={`بایگانی لید ${item.title}`}
                                    disabled={blocked || flowLocked}
                                    onClick={() => archive(item)}
                                  >
                                    <Archive size={16} aria-hidden="true" />
                                  </ActionButton>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pager
                  page={page}
                  count={list.count}
                  next={!!list.next}
                  previous={!!list.previous}
                  onPage={setPage}
                />
              </>
            )
          )}
        </>
      )}
      {view === "form" &&
        editor &&
        (formStamp !== account ? (
          <LoadingAccount />
        ) : formError ? (
          <LoadFailure
            title="دسترسی سرنخ تأیید نشد"
            message={formError}
            retry={() => void refresh()}
          />
        ) : (
          <>
            <p className="account-description">
              عنوان الزامی است. نام شخص و شرکت را برای تبدیل تکمیل کنید؛
              پیش‌نویس فقط در حافظه این صفحه می‌ماند.
            </p>
            {unsupported && (
              <section className="account-panel">
                <p>
                  مجوز تغییر مسئول در دسترسی فعلی وجود ندارد؛ سایر تغییرات حفظ
                  شده‌اند.
                </p>
                <ActionButton
                  onClick={() => {
                    change("owner_id", editor.baseline.owner_id);
                    change("owner_label", editor.baseline.owner_label);
                  }}
                >
                  حفظ مسئول فعلی یا پیش‌فرض
                </ActionButton>
              </section>
            )}
            <form
              className="account-panel customer-editor"
              noValidate
              aria-busy={busy}
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <LeadReferenceFields
                draft={editor.draft}
                errors={fields}
                disabled={controlsDisabled}
                onChange={change}
                ownerControl={
                  can("assign") && (
                    <CustomerPicker
                      namespace="leads"
                      compact
                      organizationId={org}
                      userId={account.data.user.user_id}
                      kind="owners"
                      label="مسئول سرنخ"
                      value={editor.draft.owner_id}
                      currentLabel={editor.draft.owner_label}
                      defaultLabel={editor.base ? "حفظ مسئول فعلی" : undefined}
                      error={fields.owner_id}
                      disabled={controlsDisabled}
                      onChange={(value, label) => {
                        change(
                          "owner_id",
                          value ||
                            (editor.base ? String(editor.base.owner_id) : ""),
                        );
                        change(
                          "owner_label",
                          value ? label : editor.base?.owner_label || "",
                        );
                      }}
                    />
                  )
                }
              />
              <div className="session-actions customer-form-actions">
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={controlsDisabled}
                  onClick={() => leave(() => start(editor.base))}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  پاک کردن فرم
                </ActionButton>
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked}
                  onClick={() => leave(() => setView("list"))}
                >
                  بازگشت به فهرست
                </ActionButton>
                <ActionButton
                  type="submit"
                  busy={busy}
                  disabled={controlsDisabled || unsupported}
                >
                  {editor.base ? "ذخیره تغییرات" : "ثبت سرنخ"}
                </ActionButton>
              </div>
            </form>
          </>
        ))}
      {view === "detail" && (
        <>
          <ActionButton
            className="secondary"
            disabled={blocked || flowLocked}
            onClick={() =>
              leave(() => {
                setView("list");
                setId(null);
              })
            }
          >
            بازگشت به فهرست
          </ActionButton>
          {stamp !== account || readKey !== expectedRead ? (
            <LoadingAccount />
          ) : readError ? (
            <LoadFailure
              title="سرنخ دریافت نشد"
              message={readError}
              retry={() => setRevision((value) => value + 1)}
            />
          ) : (
            record && (
              <>
                <LeadReferenceProfile
                  record={record}
                  actions={
                    <div className="session-actions">
                      {can("update") &&
                        !record.archived_at &&
                        record.status !== "converted" && (
                          <ActionButton
                            className={
                              record.status === "qualified"
                                ? "secondary"
                                : "customer-primary-edit"
                            }
                            disabled={
                              blocked || flowLocked || conflict || uncertain
                            }
                            onClick={() => leave(() => start(record))}
                          >
                            ویرایش سرنخ
                          </ActionButton>
                        )}
                      {can(record.archived_at ? "restore" : "archive") && (
                        <ActionButton
                          className={
                            record.archived_at
                              ? "secondary"
                              : "secondary customer-quiet-danger"
                          }
                          disabled={
                            blocked || flowLocked || conflict || uncertain
                          }
                          onClick={() => leave(() => archive())}
                        >
                          {record.archived_at
                            ? "بازگردانی سرنخ"
                            : "بایگانی سرنخ"}
                        </ActionButton>
                      )}
                      {can("convert") &&
                        record.status === "qualified" &&
                        !record.archived_at && (
                          <ActionButton
                            disabled={
                              blocked || flowLocked || conflict || uncertain
                            }
                            onClick={() =>
                              leave(() => {
                                setConversion({
                                  lead: record,
                                  person: null,
                                  company: null,
                                });
                                setView("convert");
                                setMessage("");
                              })
                            }
                          >
                            تبدیل به شخص یا شرکت
                          </ActionButton>
                        )}
                    </div>
                  }
                >
                  <CustomerAttachments
                    kind="leads"
                    customerId={record.id}
                    organizationId={org}
                    userId={account.data.user.user_id}
                    editable={
                      can("update") &&
                      !record.archived_at &&
                      record.status !== "converted"
                    }
                    draft={
                      attachmentDraft?.recordId === record.id
                        ? attachmentDraft
                        : null
                    }
                    onChange={setAttachmentDraft}
                    onPendingChange={updatePending}
                  />
                  <section className="account-panel customer-ref-panel">
                    <div className="customer-ref-panel-heading">
                      <h2>وظایف و اقدامات سریع</h2>
                    </div>
                    <div className="customer-ref-panel-body">
                      {can("convert") &&
                        record.status !== "qualified" &&
                        record.status !== "converted" &&
                        !record.archived_at && (
                          <p className="crm-context-note">
                            برای تبدیل به مشتری، ابتدا لید را بررسی و وضعیت آن
                            را به «واجد شرایط» تغییر دهید.
                          </p>
                        )}
                      <a
                        className="customer-link"
                        href={`/activities?target_type=lead&target_id=${record.id}`}
                      >
                        فعالیت‌ها و پیگیری این سرنخ
                      </a>{" "}
                      <ActionButton
                        className="secondary"
                        onClick={() => setRelated((v) => !v)}
                        aria-expanded={related}
                      >
                        وظایف این لید
                      </ActionButton>
                      {related && (
                        <RelatedList
                          kind="leads"
                          section="activities"
                          organizationId={org}
                          userId={account.data.user.user_id}
                          customerId={record.id}
                        />
                      )}
                    </div>
                  </section>
                </LeadReferenceProfile>
                {record.status === "converted" && (
                  <section className="account-panel customer-review">
                    <h2>این سرنخ تبدیل شده است</h2>
                    <p>
                      اطلاعات لید به عنوان سابقه فقط‌خواندنی حفظ شده است.
                      نتیجه‌های تبدیل در محدودهٔ دسترسی شما در زیر نمایش داده
                      می‌شوند.
                    </p>
                    <div className="session-actions">
                      {record.converted_person_id && (
                        <a
                          className="account-button secondary"
                          href={`/customers?kind=people&record=${record.converted_person_id}`}
                        >
                          مشاهده شخص تبدیل‌شده
                        </a>
                      )}
                      {record.converted_opportunity_id && (
                        <p>
                          <a
                            className="customer-link"
                            href={`/opportunities?record=${record.converted_opportunity_id}`}
                          >
                            مشاهده فرصت سرنخ
                          </a>
                        </p>
                      )}
                      {record.converted_company_id && (
                        <a
                          className="account-button secondary"
                          href={`/customers?kind=companies&record=${record.converted_company_id}`}
                        >
                          مشاهده شرکت تبدیل‌شده
                        </a>
                      )}
                    </div>
                    {!record.converted_person_id &&
                      !record.converted_company_id && (
                        <p>نتیجه تبدیل در دسترس فعلی شما نیست.</p>
                      )}
                  </section>
                )}
              </>
            )
          )}
        </>
      )}
      {view === "import" && (
        <>
          <ActionButton
            className="secondary"
            disabled={blocked || flowLocked}
            onClick={() => leave(() => setView("list"))}
          >
            بازگشت به فهرست
          </ActionButton>
          {can("create") && (
            <CustomerImportPreview
              kind="people"
              leadMode
              organizationId={org}
              organizationName={account.data.current.name}
              userId={account.data.user.user_id}
              draft={importDraft}
              onChange={setImportDraft}
              disabled={blocked}
              onPendingChange={updatePending}
              onAccessError={() => void refresh()}
              onComplete={(count, replayed) => {
                dirtyRef.current = false;
                setImportDraft(null);
                setStamp(null);
                setQuery("");
                setSearch("");
                setPriority("");
                setStatus("");
                setSourceFilter("");
                setOwnerFilter("");
                setArchived("active");
                setPage(1);
                setView("list");
                setRevision((v) => v + 1);
                setMessage(
                  replayed
                    ? "نتیجه ورود فایل بازیابی شد."
                    : `${number(count)} لید از فایل ثبت شد.`,
                );
              }}
            />
          )}
        </>
      )}
      {view === "convert" && conversion && (
        <>
          <ActionButton
            className="secondary"
            disabled={blocked || flowLocked}
            onClick={() =>
              leave(() => {
                setView("detail");
                setRevision((value) => value + 1);
              })
            }
          >
            بازگشت به سرنخ
          </ActionButton>
          {can("convert") ? (
            <LeadConversion
              canCreateOpportunity={account.data.operations.includes(
                "sale.create",
              )}
              organizationId={org}
              organizationName={account.data.current.name}
              userId={account.data.user.user_id}
              draft={conversion}
              onChange={setConversion}
              disabled={blocked}
              onPendingChange={updatePending}
              onAccessError={() => void refresh()}
              onComplete={() => {
                dirtyRef.current = false;
                setConversion(null);
                setView("detail");
                setRecord(null);
                setRevision((value) => value + 1);
                setMessage(
                  "تبدیل انجام شد یا نتیجه قبلی بازیابی شد؛ پرونده‌ها و سابقه سرنخ حفظ شدند.",
                );
              }}
            />
          ) : (
            <p role="status">
              مجوز تبدیل در دسترسی فعلی شما وجود ندارد؛ داده قبلی پنهان است.
            </p>
          )}
        </>
      )}
    </section>
  );
}
