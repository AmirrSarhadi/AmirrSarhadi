"use client";
import { ActivitySummary } from "./activity-summary";
import { ActivityReferenceProfile } from "./activity-reference-profile";
import { CustomerFileActions } from "./customer-file-actions";
import {
  CustomerImportPreview,
  type ImportDraft,
} from "./customer-import-preview";
import { tehranInput } from "../lib/persian-time";
import { RecordStatus } from "./record-fields";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type ApiOptions } from "../lib/api";
import { useAccount } from "../lib/use-account";
import { useDraftNavigation } from "../lib/use-draft-navigation";
import { parsePersianDate } from "../lib/sales-entry";
import { formatAccountDate } from "../lib/format";
import { number, type Page } from "../lib/customers";
import {
  activityApi,
  activityDraft,
  activityInput,
  activityKinds,
  activityPriorities,
  activityStatuses,
  blankActivity,
  targetKinds,
  type Activity,
  type ActivityDraft,
  type ActivityEvent,
  type ActivityNotice,
  type TargetKind,
} from "../lib/activities";
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
import { CustomerPicker } from "./customer-picker";
import { ActivityFields } from "./activity-fields";
import { ActivityTargetPicker } from "./activity-target-picker";

type Editor = {
  base: Activity | null;
  value: ActivityDraft;
  baseline: ActivityDraft;
  targetKind: TargetKind;
  target: string;
  targetLabel: string;
  owner: string;
  ownerLabel: string;
  ownerStamp: object;
  key: string;
};
type Write = {
  path: string;
  body: Record<string, unknown>;
  key?: string;
  method?: "POST" | "PATCH";
  kind: "create" | "edit" | "action";
};
type ActionDraft = {
  kind: "complete" | "cancel" | "reopen";
  reason: string;
  outcome: string;
};
type Target = {
  id: string;
  title?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  archived_at?: string | null;
  is_merged?: boolean;
  merged_into_id?: string | null;
};
const targetRequest = (kind: TargetKind) => ({
  namespace: (kind === "lead"
    ? "leads"
    : kind === "opportunity"
      ? "sales"
      : "customers") as ApiOptions["namespace"],
  path:
    kind === "lead"
      ? ""
      : kind === "opportunity"
        ? "opportunities/"
        : kind === "person"
          ? "people/"
          : "companies/",
});

export function ActivityWorkspace() {
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
  const [tab, setTab] = useState<"work" | "inbox">("work");
  const [mine, setMine] = useState("1");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [ownerFilterLabel, setOwnerFilterLabel] = useState("");
  const [priority, setPriority] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [importing, setImporting] = useState(false);
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const updateFilePending = useCallback(
    (value: boolean) => setFileBusy(value),
    [],
  );
  const [status, setStatus] = useState("planned");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [overdue, setOverdue] = useState(false);
  const [dayDraft, setDayDraft] = useState("");
  const [day, setDay] = useState("");
  const [dayError, setDayError] = useState("");
  const [targetFilter, setTargetFilter] = useState<{
    kind: TargetKind;
    id: string;
  } | null>(null);
  const [list, setList] = useState<Page<Activity> | null>(null);
  const [listStamp, setListStamp] = useState<object | null>(null);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState("");
  const [record, setRecord] = useState<Activity | null>(null);
  const [stamp, setStamp] = useState<object | null>(null);
  const [detailError, setDetailError] = useState("");
  const [history, setHistory] = useState<Page<ActivityEvent> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [targetRead, setTargetRead] = useState<{
    stamp: object;
    label: string;
    error: string;
  } | null>(null);
  const [action, setAction] = useState<ActionDraft | null>(null);
  const [review, setReview] = useState<{
    operation: Write;
    title: string;
    description: string;
    label: string;
    danger?: boolean;
  } | null>(null);
  const [uncertain, setUncertain] = useState<Write | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mutation = useRef<AbortController | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const [notices, setNotices] = useState<
    (Page<ActivityNotice> & { unread_count: number }) | null
  >(null);
  const [noticeStamp, setNoticeStamp] = useState<object | null>(null);
  const [noticeError, setNoticeError] = useState("");
  const [noticePage, setNoticePage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [noticeRevision, setNoticeRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const dirty =
    !!importDraft ||
    !!uncertain ||
    (!!editor &&
      (JSON.stringify(editor.value) !== JSON.stringify(editor.baseline) ||
        (!editor.base && !!editor.target) ||
        (!!editor.owner &&
          (!editor.base || Number(editor.owner) !== editor.base.owner_id)))) ||
    (!!action && (!!action.reason || !!action.outcome));
  const nav = useDraftNavigation(dirty, busy || fileBusy, () => {
    setImportDraft(null);
    setEditor(null);
    setAction(null);
    setReview(null);
    setUncertain(null);
  });
  const request = useCallback(
    <T,>(path: string, options: ApiOptions = {}) =>
      activityApi<T>(org, user, path, options),
    [org, user],
  );
  const can = (operation: string) =>
    account.phase === "ready" &&
    account.data.operations.includes(`activity.${operation}`);
  useEffect(() => {
    if (identity && scopeRef.current !== identity) {
      mutation.current?.abort();
      scopeRef.current = identity;
      setScope(identity);
      setImporting(false);
      setImportDraft(null);
      setPriority("");
      setOwnerFilter("");
      setOwnerFilterLabel("");
      setKindFilter("");
      setEditor(null);
      setAction(null);
      setReview(null);
      setUncertain(null);
      nav.reset();
      const params = new URLSearchParams(window.location.search),
        initial = first.current;
      first.current = false;
      const id = initial ? params.get("record") : null;
      setSelected(id && /^[0-9a-f-]{36}$/i.test(id) ? id : "");
      const type = params.get("target_type") as TargetKind,
        target = initial ? params.get("target_id") : null;
      setTargetFilter(
        target && /^[0-9a-f-]{36}$/i.test(target) && type in targetKinds
          ? { kind: type, id: target }
          : null,
      );
      setRecord(null);
      setList(null);
      setHistory(null);
      setNotices(null);
      setNoticePage(1);
      setTargetRead(null);
      setPage(1);
      setQuery("");
      setSearch("");
      setStatus("planned");
      setMine("1");
      setOverdue(false);
      setDay("");
      setDayDraft("");
      setDayError("");
      setError("");
      setMessage("");
      setFields({});
    }
    if (account.phase === "anonymous" && !dirty) router.replace("/login");
    if (account.phase === "ready" && !account.data.current && !dirty)
      router.replace("/organizations");
  }, [identity, account, dirty, router]);
  useEffect(() => {
    if (
      account.phase !== "ready" ||
      !identity ||
      identity !== scope ||
      tab !== "work"
    )
      return;
    const ctrl = new AbortController();
    setListStamp(null);
    setListError("");
    request<Page<Activity>>(
      `?q=${encodeURIComponent(search)}&page=${page}&status=${status}&priority=${priority}&kind=${kindFilter}&owner_id=${ownerFilter}&mine=${mine}&overdue=${overdue ? "1" : "0"}&due_date=${day}${targetFilter ? `&target_type=${targetFilter.kind}&target_id=${targetFilter.id}` : ""}`,
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
    status,
    priority,
    ownerFilter,
    kindFilter,
    mine,
    overdue,
    day,
    targetFilter,
    revision,
    tab,
  ]);
  useEffect(() => {
    setReview(null);
    setStamp(null);
    setDetailError("");
    setHistory(null);
    if (!selected || account.phase !== "ready" || scope !== identity) return;
    const ctrl = new AbortController();
    Promise.all([
      request<Activity>(`${selected}/`, { signal: ctrl.signal }),
      request<Page<ActivityEvent>>(`${selected}/history/?page=${historyPage}`, {
        signal: ctrl.signal,
      }),
    ])
      .then(([record, history]) => {
        if (!ctrl.signal.aborted) {
          setRecord(record);
          setHistory(history);
          setStamp(account);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setDetailError(e.message);
          setStamp(account);
        }
      });
    return () => ctrl.abort();
  }, [selected, account, scope, identity, request, revision, historyPage]);
  useEffect(() => {
    setTargetRead(null);
    if (
      !editor?.target ||
      editor.base ||
      account.phase !== "ready" ||
      identity !== scope
    )
      return;
    const ctrl = new AbortController(),
      target = targetRequest(editor.targetKind);
    api<Target>(`${target.path}${editor.target}/`, {
      namespace: target.namespace,
      organizationId: org,
      expectedUserId: user,
      signal: ctrl.signal,
    })
      .then((record) => {
        if (ctrl.signal.aborted) return;
        const invalid =
          !!record.archived_at ||
          !!record.is_merged ||
          !!record.merged_into_id ||
          (editor.targetKind === "lead" && record.status === "converted");
        setTargetRead({
          stamp: account,
          label:
            record.name ||
            record.title ||
            `${record.first_name || ""} ${record.last_name || ""}`.trim(),
          error: invalid
            ? "برای فعالیت تازه، پرونده فعال و اصلی را انتخاب کنید."
            : "",
        });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setTargetRead({ stamp: account, label: "", error: e.message });
      });
    return () => ctrl.abort();
  }, [
    editor?.target,
    editor?.targetKind,
    editor?.base,
    account,
    org,
    user,
    identity,
    scope,
  ]);
  useEffect(() => {
    if (
      tab !== "inbox" ||
      account.phase !== "ready" ||
      !identity ||
      identity !== scope
    )
      return;
    const ctrl = new AbortController();
    setNoticeStamp(null);
    setNoticeError("");
    request<Page<ActivityNotice> & { unread_count: number }>(
      `notifications/?page=${noticePage}&unread=${unreadOnly ? "1" : "0"}`,
      { signal: ctrl.signal },
    )
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setNotices(data);
          setNoticeStamp(account);
        }
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 404 && noticePage > 1) {
          setNoticePage(1);
          return;
        }
        setNoticeError(e.message);
        setNoticeStamp(account);
      });
    return () => ctrl.abort();
  }, [
    account,
    identity,
    scope,
    tab,
    noticePage,
    unreadOnly,
    noticeRevision,
    revision,
    request,
  ]);
  useEffect(() => {
    if (tab !== "inbox") return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !pending.current)
        setNoticeRevision((v) => v + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, [tab]);
  useEffect(() => {
    if (busy) return;
    for (const name of Object.keys(fields)) {
      const id =
        name === "due_at"
          ? "due_date"
          : name === "remind_at"
            ? "remind_date"
            : name;
      const input =
        document.getElementById(`activity-${id}`) ||
        document.getElementById(
          name === "owner_id"
            ? "pick-owners"
            : name === "target_id"
              ? `pick-${editor?.targetKind === "person" ? "people" : editor?.targetKind === "company" ? "companies" : editor?.targetKind === "lead" ? "leads" : "opportunities"}`
              : "",
        );
      if (input) {
        input.focus();
        break;
      }
    }
  }, [fields, busy]);
  useEffect(() => () => mutation.current?.abort(), []);
  function focus() {
    requestAnimationFrame(() => heading.current?.focus());
  }
  function clear() {
    setEditor(null);
    setAction(null);
    setReview(null);
    setError("");
    setFields({});
  }
  function back() {
    nav.navigate(() => {
      clear();
      setSelected("");
      setHistoryPage(1);
      focus();
    });
  }
  function open(id: string) {
    nav.navigate(() => {
      clear();
      setSelected(id);
      setHistoryPage(1);
      setTab("work");
      focus();
    });
  }
  function edit(base: Activity | null, quick = false, related?: Activity) {
    const value = base ? activityDraft(base) : blankActivity();
    if (quick) {
      const due = tehranInput(new Date(Date.now() + 3600000).toISOString());
      value.kind = "task";
      value.due_date = due.date;
      value.due_time = due.time;
    }

    clear();
    setEditor({
      base,
      value,
      baseline: value,
      targetKind:
        base?.target_type ||
        related?.target_type ||
        targetFilter?.kind ||
        (quick ? "none" : "person"),
      target: base?.target_id || related?.target_id || targetFilter?.id || "",
      targetLabel: base?.target_label || related?.target_label || "",
      owner: base ? String(base.owner_id) : "",
      ownerLabel: base?.owner_label || "",
      ownerStamp: account,
      key: crypto.randomUUID(),
    });
    focus();
  }
  function confirm(
    operation: Write,
    title: string,
    description: string,
    label: string,
    danger = false,
  ) {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setReview({ operation, title, description, label, danger });
  }
  async function write(operation: Write) {
    if (pending.current || identity !== scopeRef.current) return;
    pending.current = true;
    setBusy(true);
    setReview(null);
    setFields({});
    setError("");
    const ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      const result = await request<Activity>(operation.path, {
        body: operation.body,
        method: operation.method || "POST",
        idempotencyKey: operation.key,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setUncertain(null);
      clear();
      setRecord(result);
      setStamp(account);
      setRevision((v) => v + 1);
      setNoticeRevision((v) => v + 1);
      setMessage(
        operation.kind === "create"
          ? "فعالیت ثبت شد."
          : operation.kind === "edit"
            ? "فعالیت به‌روز شد."
            : "وضعیت فعالیت ثبت شد.",
      );
      if (operation.kind === "create") {
        setSelected("");
        setPage(1);
        setQuery("");
        setSearch("");
        setStatus(result.status);
        setPriority("");
        setOwnerFilter("");
        setOwnerFilterLabel("");
        setKindFilter("");
        setOverdue(false);
        setDay("");
        setDayDraft("");
        setMine("0");
        setTargetFilter(null);
        window.history.replaceState(null, "", "/activities");
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
          "نتیجه عملیات مشخص نیست. با همان درخواست نتیجه را بررسی کنید؛ بستن صفحه اطلاعات پیگیری را از حافظه پاک می‌کند.",
        );
      } else {
        const details = Object.fromEntries(
          Object.entries(e.fields).map(([name, values]) => [
            name,
            values.join(" "),
          ]),
        );
        setFields(details);
        setError(
          e.status === 409
            ? "فعالیت تغییر کرده است. پیش‌نویس حفظ شده؛ اطلاعات تازه را بخوانید و بررسی کنید."
            : [e.message, ...Object.values(details)].join(" "),
        );
        if (e.status === 403) void refresh();
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy || uncertain || review) return;
    const { body, errors } = activityInput(editor.value, editor.base);
    if (
      !editor.base &&
      !editor.target &&
      !(editor.targetKind === "none" && editor.value.kind === "task")
    )
      errors.target_id = "پرونده مرتبط را انتخاب کنید.";
    setFields(errors);
    if (Object.keys(errors).length) return;
    if (editor.base) body.version = editor.base.version;
    else {
      body.target_type = editor.targetKind;
      body.target_id = editor.targetKind === "none" ? null : editor.target;
    }
    if (editor.owner) body.owner_id = Number(editor.owner);
    const operation: Write = {
      path: editor.base ? `${editor.base.id}/` : "",
      body,
      key: editor.key,
      method: editor.base ? "PATCH" : "POST",
      kind: editor.base ? "edit" : "create",
    };
    if (
      editor.owner &&
      (!editor.base || Number(editor.owner) !== editor.base.owner_id)
    )
      confirm(
        operation,
        "تأیید مسئول فعالیت",
        `فعالیت به مسئول انتخاب‌شده تخصیص می‌یابد. ${editor.value.reminder === "yes" ? "یادآور برای مسئول تازه ثبت و یادآور قبلی باطل می‌شود." : ""}`,
        "ذخیره با این مسئول",
      );
    else void write(operation);
  }
  function submitAction(event: FormEvent) {
    event.preventDefault();
    if (!action || !record || busy || uncertain) return;
    if (action.kind !== "complete" && !action.reason.trim()) {
      setFields({
        reason:
          action.kind === "cancel"
            ? "دلیل لغو لازم است."
            : "دلیل بازگشایی لازم است.",
      });
      return;
    }
    confirm(
      {
        path: `${record.id}/${action.kind}/`,
        body: {
          version: record.version,
          reason: action.reason,
          outcome: action.outcome,
        },
        key: crypto.randomUUID(),
        kind: "action",
      },
      action.kind === "complete"
        ? "تأیید انجام فعالیت"
        : action.kind === "cancel"
          ? "تأیید لغو فعالیت"
          : "تأیید بازگشایی فعالیت",
      `«${record.title}» ${action.kind === "complete" ? "انجام‌شده ثبت و یادآور آن متوقف می‌شود." : action.kind === "cancel" ? "لغو و یادآور آن متوقف می‌شود." : "دوباره برنامه‌ریزی‌شده می‌شود؛ اگر زمان یادآور گذشته باشد، اعلان تازه ایجاد خواهد شد."}`,
      action.kind === "complete"
        ? "ثبت انجام فعالیت"
        : action.kind === "cancel"
          ? "لغو فعالیت"
          : "بازگشایی فعالیت",
      action.kind === "cancel",
    );
  }
  async function readLatest() {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    const ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      const value = await request<Activity>(`${selected}/`, {
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setRecord(value);
      setStamp(account);
      setRevision((v) => v + 1);
      if (uncertain?.method === "PATCH") setUncertain(null);
      setError("");
      setMessage(
        "نسخه تازه خوانده شد؛ پیش‌نویس قبلی حفظ شده است. برای جایگزینی آن، بارگذاری نسخه تازه را انتخاب کنید.",
      );
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "خواندن انجام نشد.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function markRead(id: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const ctrl = new AbortController();
    mutation.current = ctrl;
    try {
      await request(`notifications/${id}/read/`, {
        body: {},
        signal: ctrl.signal,
      });
      if (!ctrl.signal.aborted) setNoticeRevision((v) => v + 1);
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(
          "علامت خوانده‌شده تأیید نشد؛ اعلان‌ها را دوباره دریافت و نتیجه را بررسی کنید.",
        );
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
  if (scope !== identity) return <LoadingAccount />;
  const blocked = busy || fileBusy || nav.confirming || !!review;
  const readable = !selected || (stamp === account && !detailError);
  const targetReady =
    !editor ||
    !!editor.base ||
    !editor.target ||
    (targetRead?.stamp === account && !targetRead.error);
  const disabled = blocked || !!uncertain || !readable || !targetReady;
  const targetHref = record
    ? record.target_type === "person" || record.target_type === "company"
      ? `/customers?kind=${record.target_type === "person" ? "people" : "companies"}&record=${record.target_id}`
      : record.target_type === "lead"
        ? `/leads?record=${record.target_id}`
        : `/opportunities?record=${record.target_id}`
    : "";
  return (
    <section className="customer-workspace customer-reference-workspace activity-workspace">
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{account.data.current.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            {editor
              ? editor.base
                ? "ویرایش فعالیت"
                : "ثبت فعالیت"
              : selected
                ? "پرونده فعالیت"
                : tab === "inbox"
                  ? "اعلان‌های من"
                  : mine === "1"
                    ? "کارهای من"
                    : "فعالیت‌ها و پیگیری"}
          </h1>
          <p className="account-description">
            تماس، جلسه و کار را با مسئول و موعد مشخص پیگیری کنید؛ زمان‌ها به وقت
            تهران نمایش داده می‌شوند.
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
          description="با ادامه، پیش‌نویس و اطلاعات پیگیری درخواست نامشخص کنار گذاشته می‌شود."
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
            ثبت و تغییر وضعیت با همان کلید پیگیری می‌شوند. ویرایش نامشخص فقط با
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
      {!selected && !editor && !importing && (
        <nav className="customer-kind" aria-label="نمای فعالیت">
          <ActionButton
            className="secondary"
            aria-pressed={tab === "work"}
            disabled={blocked}
            onClick={() =>
              nav.navigate(() => {
                clear();
                setTab("work");
              })
            }
          >
            فعالیت‌ها
          </ActionButton>
          <ActionButton
            className="secondary"
            aria-pressed={tab === "inbox"}
            disabled={blocked}
            onClick={() =>
              nav.navigate(() => {
                clear();
                setTab("inbox");
                setNoticePage(1);
              })
            }
          >
            اعلان‌های من
          </ActionButton>
        </nav>
      )}
      {(selected || editor) && (
        <ActionButton className="secondary" disabled={blocked} onClick={back}>
          بازگشت به فهرست فعالیت‌ها
        </ActionButton>
      )}
      {selected &&
        !readable &&
        (stamp !== account ? (
          <p role="status">در حال بررسی دسترسی فعالیت…</p>
        ) : (
          <section className="account-panel">
            <h2>فعالیت در دسترس نیست</h2>
            <Feedback message={detailError} />
            <ActionButton onClick={() => setRevision((v) => v + 1)}>
              تلاش دوباره
            </ActionButton>
          </section>
        ))}
      {editor &&
        readable &&
        (!can(editor.base ? "update" : "create") ? (
          <p role="status">مجوز ویرایش فعالیت ندارید؛ پیش‌نویس پنهان است.</p>
        ) : !targetReady ? (
          <section className="account-panel">
            <h2>بررسی پرونده مرتبط</h2>
            {targetRead?.stamp === account && targetRead.error ? (
              <>
                <Feedback message={targetRead.error} />
                <ActionButton
                  disabled={blocked}
                  onClick={() =>
                    setEditor({ ...editor, target: "", targetLabel: "" })
                  }
                >
                  انتخاب پرونده دیگر
                </ActionButton>
              </>
            ) : (
              <p role="status">در حال بررسی دسترسی پرونده…</p>
            )}
          </section>
        ) : (
          <form
            className="account-panel customer-editor"
            noValidate
            onSubmit={save}
            aria-busy={busy}
          >
            <ActivityFields
              editing={!!editor.base}
              value={editor.value}
              onChange={(value) =>
                setEditor({
                  ...editor,
                  value,
                  ...(value.kind !== "task" &&
                  editor.targetKind === "none" &&
                  !editor.base
                    ? { targetKind: "person", target: "", targetLabel: "" }
                    : {}),
                })
              }
              errors={fields}
              disabled={
                disabled ||
                (!!editor.base &&
                  !["planned", "in_progress"].includes(record?.status || ""))
              }
            />
            {!editor.base && (
              <>
                <h2>ارتباط با پرونده‌های دیگر</h2>
                <FormField
                  id="activity-target_type"
                  label="نوع پرونده مرتبط"
                  error={fields.target_type}
                >
                  <select
                    id="activity-target_type"
                    value={editor.targetKind}
                    disabled={disabled}
                    aria-invalid={!!fields.target_type}
                    aria-describedby="activity-target_type-error"
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        targetKind: e.target.value as TargetKind,
                        target: "",
                        targetLabel: "",
                      })
                    }
                  >
                    {Object.entries(targetKinds)
                      .filter(
                        ([value]) =>
                          value !== "none" || editor.value.kind === "task",
                      )
                      .map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                  </select>
                </FormField>
                <ActivityTargetPicker
                  org={org}
                  user={user}
                  kind={editor.targetKind}
                  value={editor.target}
                  label={targetRead?.stamp === account ? targetRead.label : ""}
                  disabled={disabled}
                  error={fields.target_id}
                  onChange={(target, targetLabel) =>
                    setEditor({ ...editor, target, targetLabel })
                  }
                />
              </>
            )}
            {can("assign") && (
              <CustomerPicker
                organizationId={org}
                userId={user}
                namespace="activities"
                kind="owners"
                value={editor.owner}
                currentLabel={
                  editor.ownerStamp === account
                    ? editor.ownerLabel
                    : record && record.owner_id === Number(editor.owner)
                      ? record.owner_label
                      : ""
                }
                label="مسئول فعالیت"
                defaultLabel="خودم"
                disabled={disabled}
                error={fields.owner_id}
                onChange={(owner, ownerLabel) =>
                  setEditor({
                    ...editor,
                    owner,
                    ownerLabel,
                    ownerStamp: account,
                  })
                }
              />
            )}
            <div className="session-actions">
              <ActionButton
                type="submit"
                busy={busy}
                disabled={
                  disabled ||
                  (!!editor.base &&
                    !["planned", "in_progress"].includes(record?.status || ""))
                }
              >
                {editor.base ? "ذخیره فعالیت" : "ثبت فعالیت"}
              </ActionButton>
              <ActionButton
                type="button"
                className="secondary"
                disabled={blocked}
                onClick={() => nav.navigate(() => edit(editor.base))}
              >
                بازنشانی فرم
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
                  خواندن دوباره فعالیت
                </ActionButton>
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={
                    blocked ||
                    !!uncertain ||
                    !record ||
                    !["planned", "in_progress"].includes(record.status)
                  }
                  onClick={() => nav.navigate(() => record && edit(record))}
                >
                  بارگذاری نسخه تازه در فرم
                </ActionButton>
              </div>
            )}
          </form>
        ))}
      {review && (
        <ConfirmPanel
          title={review.title}
          description={review.description}
          label={review.label}
          danger={review.danger}
          busy={busy}
          onCancel={() => {
            setReview(null);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
          onConfirm={() => void write(review.operation)}
        />
      )}
      {!editor && selected && record && readable && (
        <>
          <ActivityReferenceProfile record={record} targetHref={targetHref}>
            {can("update") && (
              <div className="session-actions">
                {["planned", "in_progress"].includes(record.status) ? (
                  <>
                    {record.status === "planned" && (
                      <ActionButton
                        disabled={disabled}
                        onClick={() =>
                          confirm(
                            {
                              path: `${record.id}/start/`,
                              body: { version: record.version },
                              key: crypto.randomUUID(),
                              kind: "action",
                            },
                            "شروع فعالیت",
                            `«${record.title}» در حال انجام ثبت می‌شود.`,
                            "تأیید شروع فعالیت",
                          )
                        }
                      >
                        شروع فعالیت
                      </ActionButton>
                    )}
                    <ActionButton
                      disabled={disabled}
                      onClick={() => edit(record)}
                    >
                      ویرایش فعالیت
                    </ActionButton>
                    <ActionButton
                      className="secondary"
                      disabled={disabled}
                      onClick={() => {
                        setAction({
                          kind: "complete",
                          reason: "",
                          outcome: "",
                        });
                        setFields({});
                      }}
                    >
                      ثبت انجام فعالیت
                    </ActionButton>
                    <ActionButton
                      className="secondary danger"
                      disabled={disabled}
                      onClick={() => {
                        setAction({ kind: "cancel", reason: "", outcome: "" });
                        setFields({});
                      }}
                    >
                      لغو فعالیت
                    </ActionButton>
                  </>
                ) : (
                  <ActionButton
                    className="secondary"
                    disabled={disabled}
                    onClick={() => {
                      setAction({ kind: "reopen", reason: "", outcome: "" });
                      setFields({});
                    }}
                  >
                    بازگشایی فعالیت
                  </ActionButton>
                )}
              </div>
            )}
          </ActivityReferenceProfile>
          <section className="account-panel customer-editor">
            <h2>اقدامات سریع</h2>
            <div className="session-actions">
              {can("create") && (
                <ActionButton
                  className="secondary"
                  disabled={disabled}
                  onClick={() => nav.navigate(() => edit(null, true, record))}
                >
                  وظیفه مرتبط جدید
                </ActionButton>
              )}
              <ActionButton
                className="secondary"
                disabled={disabled}
                onClick={() =>
                  nav.navigate(() => {
                    clear();
                    setSelected("");
                    setHistoryPage(1);
                    focus();
                    setMine("0");
                    setOwnerFilter(String(record.owner_id));
                    setOwnerFilterLabel(record.owner_label);
                    setStatus("");
                    setPriority("");
                    setKindFilter("");
                    setSearch("");
                    setQuery("");
                    setOverdue(false);
                    setDay("");
                    setTargetFilter(null);
                    setPage(1);
                  })
                }
              >
                سایر وظایف این مسئول
              </ActionButton>
            </div>
          </section>
          {action && can("update") && (
            <form
              className="account-panel customer-editor"
              noValidate
              onSubmit={submitAction}
            >
              <h2>
                {action.kind === "complete"
                  ? "نتیجه پیگیری"
                  : action.kind === "cancel"
                    ? "لغو فعالیت"
                    : "بازگشایی فعالیت"}
              </h2>
              <FormField
                id={
                  action.kind === "complete"
                    ? "activity-outcome"
                    : "activity-reason"
                }
                label={
                  action.kind === "complete"
                    ? "نتیجه فعالیت (اختیاری)"
                    : action.kind === "cancel"
                      ? "دلیل لغو"
                      : "دلیل بازگشایی"
                }
                error={
                  fields[action.kind === "complete" ? "outcome" : "reason"]
                }
              >
                <AutoTextarea
                  id={
                    action.kind === "complete"
                      ? "activity-outcome"
                      : "activity-reason"
                  }
                  value={
                    action.kind === "complete" ? action.outcome : action.reason
                  }
                  maxLength={action.kind === "complete" ? 1000 : 500}
                  disabled={disabled}
                  aria-invalid={
                    !!fields[action.kind === "complete" ? "outcome" : "reason"]
                  }
                  aria-describedby={
                    action.kind === "complete"
                      ? "activity-outcome-error"
                      : "activity-reason-error"
                  }
                  onChange={(e) =>
                    setAction({
                      ...action,
                      [action.kind === "complete" ? "outcome" : "reason"]:
                        e.target.value,
                    })
                  }
                />
              </FormField>
              <div className="session-actions">
                <ActionButton type="submit" disabled={disabled}>
                  بررسی تغییر وضعیت
                </ActionButton>
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked}
                  onClick={() => nav.navigate(() => setAction(null))}
                >
                  انصراف
                </ActionButton>
              </div>
            </form>
          )}
          {history && (
            <section className="account-panel customer-editor">
              <h2>تاریخچه فعالیت</h2>
              <ul className="session-list">
                {history.results.map((event) => (
                  <li key={event.id}>
                    <p>
                      {(
                        {
                          created: "ثبت فعالیت",
                          start: "شروع فعالیت",
                          updated: "ویرایش",
                          complete: "انجام",
                          cancel: "لغو",
                          reopen: "بازگشایی",
                        } as Record<string, string>
                      )[event.action] || event.action}{" "}
                      — {formatAccountDate(event.created_at)}
                    </p>
                    <p>موعد: {formatAccountDate(event.due_at)}</p>
                    {event.reason && <p>{event.reason}</p>}
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
      {!selected && !editor && !importing && tab === "work" && (
        <>
          <ActivitySummary
            organizationId={org}
            userId={user}
            revision={revision}
          />
          <div className="customer-toolbar">
            <SearchBox
              id="activity-search"
              label="جست‌وجوی فعالیت‌ها"
              value={query}
              onChange={setQuery}
              onCommit={(value) => {
                setSearch(value);
                setPage(1);
              }}
              disabled={blocked}
            />
            {can("create") && (
              <div className="session-actions">
                <ActionButton disabled={blocked} onClick={() => edit(null)}>
                  ثبت فعالیت
                </ActionButton>
                <ActionButton
                  className="secondary"
                  disabled={blocked}
                  onClick={() => edit(null, true)}
                >
                  افزودن سریع وظیفه
                </ActionButton>
              </div>
            )}
          </div>
          <div className="customer-fields activity-filters">
            <FormField id="activity-priority-filter" label="فیلتر اولویت">
              <select
                id="activity-priority-filter"
                value={priority}
                disabled={blocked}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه اولویت‌ها</option>
                {Object.entries(activityPriorities).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="activity-kind-filter" label="فیلتر نوع">
              <select
                id="activity-kind-filter"
                value={kindFilter}
                disabled={blocked}
                onChange={(e) => {
                  setKindFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه انواع</option>
                {Object.entries(activityKinds).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="activity-mine" label="محدوده فهرست">
              <select
                id="activity-mine"
                value={mine}
                disabled={blocked}
                onChange={(e) => {
                  setMine(e.target.value);
                  setPage(1);
                }}
              >
                <option value="1">فقط کارهای من</option>
                <option value="0">همه فعالیت‌های مجاز</option>
              </select>
            </FormField>
            <FormField id="activity-status" label="وضعیت فعالیت">
              <select
                id="activity-status"
                value={status}
                disabled={blocked}
                onChange={(e) => {
                  setStatus(e.target.value);
                  if (e.target.value !== "planned") setOverdue(false);
                  setPage(1);
                }}
              >
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(activityStatuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {can("assign") && (
            <CustomerPicker
              organizationId={org}
              userId={user}
              namespace="activities"
              kind="owners"
              value={ownerFilter}
              currentLabel={ownerFilterLabel}
              label="فیلتر مسئول"
              defaultLabel="همه مسئولان"
              disabled={blocked}
              onChange={(id, label) => {
                setOwnerFilter(id);
                setOwnerFilterLabel(label);
                setMine("0");
                setPage(1);
              }}
            />
          )}
          <form
            noValidate
            className="account-panel customer-editor"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                setDay(parsePersianDate(dayDraft) || "");
                setPage(1);
                setDayError("");
              } catch (e) {
                setDayError((e as Error).message);
                document.getElementById("activity-day")?.focus();
              }
            }}
          >
            <FormField
              id="activity-day"
              label="برنامه روز (تاریخ شمسی)"
              error={dayError}
              hint="مانند ۱۴۰۵/۰۸/۰۶؛ فعالیت‌های همان روز تهران نمایش داده می‌شوند."
            >
              <input
                id="activity-day"
                value={dayDraft}
                dir="ltr"
                disabled={blocked}
                aria-invalid={!!dayError}
                aria-describedby="activity-day-error activity-day-hint"
                onChange={(e) => setDayDraft(e.target.value)}
              />
            </FormField>
            <div className="session-actions">
              <ActionButton type="submit" disabled={blocked}>
                نمایش برنامه روز
              </ActionButton>
              <ActionButton
                type="button"
                className="secondary"
                disabled={blocked}
                onClick={() => {
                  setDay("");
                  setDayDraft("");
                  setDayError("");
                  setPage(1);
                }}
              >
                همه روزها
              </ActionButton>
              <ActionButton
                type="button"
                className="secondary"
                aria-pressed={overdue}
                disabled={blocked}
                onClick={() => {
                  setOverdue(!overdue);
                  setStatus("");
                  setPage(1);
                }}
              >
                عقب‌افتاده‌ها
              </ActionButton>
            </div>
          </form>
          {(priority ||
            kindFilter ||
            ownerFilter ||
            status !== "planned" ||
            mine !== "1" ||
            day ||
            overdue ||
            targetFilter) && (
            <ActionButton
              className="secondary"
              disabled={blocked}
              onClick={() => {
                setPriority("");
                setKindFilter("");
                setOwnerFilter("");
                setOwnerFilterLabel("");
                setStatus("planned");
                setMine("1");
                setDay("");
                setDayDraft("");
                setDayError("");
                setOverdue(false);
                setTargetFilter(null);
                setPage(1);
                window.history.replaceState(null, "", "/activities");
              }}
            >
              پاک کردن فیلترها
            </ActionButton>
          )}
          {targetFilter && (
            <div className="account-panel">
              <p>فهرست به پرونده انتخاب‌شده محدود است.</p>
              <ActionButton
                className="secondary"
                disabled={blocked}
                onClick={() => {
                  setTargetFilter(null);
                  setPage(1);
                  window.history.replaceState(null, "", "/activities");
                }}
              >
                برداشتن فیلتر پرونده
              </ActionButton>
            </div>
          )}
          <div className="customer-list-heading">
            <h2>لیست وظایف</h2>
            <span>
              {listStamp === account && list
                ? number(list.count) + " فعالیت"
                : "…"}
            </span>
          </div>
          <CustomerFileActions
            kind="activities"
            organizationId={org}
            userId={user}
            query={`q=${encodeURIComponent(search)}&status=${status}&priority=${priority}&kind=${kindFilter}&owner_id=${ownerFilter}&mine=${mine}&overdue=${overdue ? "1" : "0"}&due_date=${day}${targetFilter ? `&target_type=${targetFilter.kind}&target_id=${targetFilter.id}` : ""}`}
            canExport={can("export")}
            canImport={can("create")}
            disabled={blocked}
            onImport={() => setImporting(true)}
          />
          {listStamp !== account ? (
            <p role="status">در حال دریافت فعالیت‌ها…</p>
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
                  aria-label="فهرست فعالیت‌ها"
                  tabIndex={0}
                >
                  <table className="customer-table">
                    <thead>
                      <tr>
                        <th scope="col">فعالیت</th>
                        <th scope="col">نوع</th>
                        <th scope="col">اولویت</th>
                        <th scope="col">پرونده</th>
                        <th scope="col">موعد تهران</th>
                        <th scope="col">وضعیت / مسئول</th>
                        <th scope="col">تاریخ ایجاد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.results.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              type="button"
                              className="customer-record-link"
                              aria-label={`مشاهده فعالیت ${item.title}`}
                              onClick={() => open(item.id)}
                            >
                              {item.title}
                            </button>
                            <span className="customer-secondary">
                              {item.notes || "بدون توضیحات"}
                            </span>
                          </td>
                          <td>{activityKinds[item.kind]}</td>
                          <td>
                            <RecordStatus
                              tone={
                                item.priority === "high" ? "warning" : "neutral"
                              }
                            >
                              {activityPriorities[item.priority]}
                            </RecordStatus>
                          </td>
                          <td>{item.target_label}</td>
                          <td>{formatAccountDate(item.due_at)}</td>
                          <td>
                            <RecordStatus
                              tone={
                                item.status === "done"
                                  ? "success"
                                  : item.overdue
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {activityStatuses[item.status]}
                            </RecordStatus>
                            {item.overdue ? " — عقب‌افتاده" : ""}
                            <span className="customer-secondary">
                              {item.owner_label}
                            </span>
                          </td>
                          <td>{formatAccountDate(item.created_at)}</td>
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
                  {search || day || overdue || targetFilter
                    ? "نتیجه‌ای پیدا نشد"
                    : "هنوز فعالیتی در این فهرست نیست"}
                </h2>
                <p>تماس، جلسه یا کار بعدی را با موعد مشخص ثبت کنید.</p>
              </section>
            ))
          )}
        </>
      )}
      {importing && (
        <>
          <ActionButton
            className="secondary"
            disabled={blocked}
            onClick={() =>
              nav.navigate(() => {
                setImporting(false);
                setImportDraft(null);
              })
            }
          >
            بازگشت به فهرست فعالیت‌ها
          </ActionButton>
          {can("create") && (
            <CustomerImportPreview
              kind="people"
              activityMode
              organizationId={org}
              organizationName={account.data.current.name}
              userId={user}
              draft={importDraft}
              onChange={setImportDraft}
              disabled={busy || nav.confirming || !!review}
              onPendingChange={updateFilePending}
              onAccessError={() => void refresh()}
              onComplete={(count, replayed) => {
                setImportDraft(null);
                setImporting(false);
                setStatus("");
                setMine("1");
                setSearch("");
                setQuery("");
                setPriority("");
                setOwnerFilter("");
                setOwnerFilterLabel("");
                setKindFilter("");
                setDay("");
                setDayDraft("");
                setOverdue(false);
                setTargetFilter(null);
                setPage(1);
                setRevision((v) => v + 1);
                setMessage(
                  replayed
                    ? "نتیجه ورود فایل بازیابی شد."
                    : `${number(count)} فعالیت از فایل ثبت شد.`,
                );
              }}
            />
          )}
        </>
      )}
      {!selected && !editor && !importing && tab === "inbox" && (
        <>
          <div className="customer-toolbar">
            <FormField id="activity-unread" label="فیلتر اعلان">
              <select
                id="activity-unread"
                value={unreadOnly ? "unread" : "all"}
                disabled={blocked}
                onChange={(e) => {
                  setUnreadOnly(e.target.value === "unread");
                  setNoticePage(1);
                }}
              >
                <option value="all">همه اعلان‌های جاری</option>
                <option value="unread">فقط خوانده‌نشده‌ها</option>
              </select>
            </FormField>
            <ActionButton
              className="secondary"
              disabled={blocked}
              onClick={() => setNoticeRevision((v) => v + 1)}
            >
              دریافت دوباره اعلان‌ها
            </ActionButton>
          </div>
          {noticeStamp !== account ? (
            <p role="status">در حال دریافت اعلان‌ها…</p>
          ) : noticeError ? (
            <section className="account-panel">
              <h2>اعلان‌ها دریافت نشدند</h2>
              <Feedback message={noticeError} />
            </section>
          ) : (
            notices && (
              <>
                <p role="status">
                  {number(notices.unread_count)} اعلان خوانده‌نشده
                </p>
                {notices.count ? (
                  <ul className="session-list">
                    {notices.results.map((notice) => (
                      <li className="account-panel" key={notice.id}>
                        <h2>{notice.title}</h2>
                        <p>
                          {activityKinds[notice.kind]} — موعد{" "}
                          {formatAccountDate(notice.due_at)}
                        </p>
                        <p>{notice.read_at ? "خوانده‌شده" : "خوانده‌نشده"}</p>
                        <div className="session-actions">
                          <ActionButton
                            disabled={blocked}
                            onClick={() => open(notice.activity_id)}
                          >
                            مشاهده فعالیت {notice.title}
                          </ActionButton>
                          {!notice.read_at && (
                            <ActionButton
                              className="secondary"
                              disabled={blocked}
                              onClick={() => void markRead(notice.id)}
                            >
                              علامت خوانده‌شده برای {notice.title}
                            </ActionButton>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <section className="account-panel customer-empty">
                    <h2>اعلان جاری ندارید</h2>
                    <p>
                      یادآوری‌های رسیده برای فعالیت‌های باز شما اینجا نمایش داده
                      می‌شوند.
                    </p>
                  </section>
                )}
                <Pager
                  page={noticePage}
                  count={notices.count}
                  previous={!!notices.previous}
                  next={!!notices.next}
                  busy={blocked}
                  onPage={setNoticePage}
                />
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
