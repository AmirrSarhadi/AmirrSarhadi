"use client";
import { useNavigationRequest } from "../lib/request-navigation";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Eye,
  Pencil,
  Archive,
  Plus,
  Save,
  RotateCcw,
} from "lucide-react";
import { ApiError, type ApiOptions } from "../lib/api";
import { useAccount } from "../lib/use-account";
import { formatAccountDate } from "../lib/format";
import {
  customerApi as unboundCustomerApi,
  displayName,
  duplicateReasons,
  fieldSpecs,
  labels,
  number,
  payload,
  toDraft,
  type Customer,
  type Draft,
  type DuplicatePreview,
  type Kind,
  type Page,
  type Relation,
} from "../lib/customers";
import {
  ActionButton,
  Feedback,
  LoadingAccount,
  LoadFailure,
} from "./account-ui";
import { ConfirmPanel, FormField, Pager, SearchBox } from "./customer-controls";
import { CustomerReferenceFields } from "./customer-reference-fields";
import { CustomerReferenceProfile } from "./customer-reference-profile";
import { CustomerFileActions } from "./customer-file-actions";
import {
  CustomerAttachments,
  type AttachmentDraft,
} from "./customer-attachments";
import { CustomerRelatedRecords } from "./customer-related-records";
import { CustomerPicker } from "./customer-picker";
import { RecordFields, RecordValues, RecordStatus } from "./record-fields";
import { CustomerMerge, type MergeDraft } from "./customer-merge";
import {
  CustomerImportPreview,
  type ImportDraft,
} from "./customer-import-preview";

type Editor = {
  base: Customer | null;
  draft: Draft;
  baseline: Draft;
  key: string;
};
type Confirmation = {
  title: string;
  description: string;
  label: string;
  danger?: boolean;
  action: () => void;
};
type RelationshipDraft = {
  target: Customer | null;
  title: string;
  baseVersion: number;
};

export function CustomerWorkspace({
  companiesOnly = false,
}: {
  companiesOnly?: boolean;
}) {
  const { account, refresh } = useAccount();
  const router = useRouter();
  const identity =
    account.phase === "ready" && account.data.current
      ? `${account.data.user.user_id}:${account.data.current.organization_id}`
      : null;
  const organizationId =
    account.phase === "ready"
      ? account.data.current?.organization_id || ""
      : "";
  const [scopeKey, setScopeKey] = useState("");
  const customerApi = useCallback(
    <T,>(org: string, path: string, options: ApiOptions = {}) =>
      unboundCustomerApi<T>(org, path, {
        ...options,
        expectedUserId: Number(scopeKey.split(":")[0]),
      }),
    [scopeKey],
  );
  const scopeRef = useRef("");
  const [kind, setKind] = useState<Kind>(
    companiesOnly ? "companies" : "people",
  );
  const [view, setView] = useState<
    "list" | "detail" | "form" | "import" | "merge"
  >("list");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [attachmentDraft, setAttachmentDraft] =
    useState<AttachmentDraft | null>(null);
  const [archived, setArchived] = useState("active");
  const [listStamp, setListStamp] = useState<object | null>(null);
  const [detailStamp, setDetailStamp] = useState<object | null>(null);
  const [formStamp, setFormStamp] = useState<object | null>(null);
  const [formAccessError, setFormAccessError] = useState("");
  const [listReadKey, setListReadKey] = useState("");
  const [detailReadKey, setDetailReadKey] = useState("");
  const readyAccount = useRef<object>(account);
  readyAccount.current = account;
  const [list, setList] = useState<Page<Customer> | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [record, setRecord] = useState<Customer | null>(null);
  const [relations, setRelations] = useState<Page<Relation> | null>(null);
  const [relationPage, setRelationPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [quickCompany, setQuickCompany] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [mergeDraft, setMergeDraft] = useState<MergeDraft | null>(null);
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [flowLocked, setFlowLocked] = useState(false);
  const flowPending = useRef(false);
  const updateFlowPending = useCallback((value: boolean) => {
    flowPending.current = value;
    setFlowLocked(value);
  }, []);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [relationship, setRelationship] = useState<RelationshipDraft | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [duplicateReview, setDuplicateReview] = useState<
    (DuplicatePreview & { approved: boolean; stamp: object }) | null
  >(null);
  useEffect(() => {
    setDuplicateReview(null);
  }, [account]);
  const trigger = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const mutationController = useRef<AbortController | null>(null);
  const [revision, setRevision] = useState(0);
  const first = useRef(true);
  const focusId = useRef("");
  const dirty =
    (!!editor &&
      Object.keys(editor.draft).some(
        (key) =>
          key !== "owner_label" && editor.draft[key] !== editor.baseline[key],
      )) ||
    (!!relationship && (!!relationship.target || !!relationship.title)) ||
    !!importDraft ||
    !!mergeDraft?.source ||
    !!attachmentDraft;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const can = (operation: string) =>
    account.phase === "ready" &&
    account.data.operations.includes(`customer.${operation}`);

  useEffect(() => {
    if (account.phase === "anonymous" && !dirtyRef.current && !uncertain)
      router.replace("/login");
    if (account.phase === "ready" && !account.data.current && !dirtyRef.current)
      router.replace("/organizations");
    if (identity && identity !== scopeRef.current) {
      const params = new URLSearchParams(window.location.search);
      const initial = first.current;
      first.current = false;
      scopeRef.current = identity;
      setScopeKey(identity);
      setKind(
        companiesOnly || params.get("kind") === "companies"
          ? "companies"
          : "people",
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
      setQuery("");
      setSearch("");
      const linkedId = initial ? params.get("record") : null;
      const validId =
        linkedId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          linkedId,
        )
          ? linkedId
          : null;
      setView(validId ? "detail" : "list");
      setSelectedId(validId);
      setRecord(null);
      setList(null);
      setRelations(null);
      setEditor(null);
      setImportDraft(null);
      setAttachmentDraft(null);
      setMergeDraft(null);
      setRelationship(null);
      setConfirmation(null);
      setFields({});
      setError("");
      setReview(false);
      setUncertain(false);
      if (!initial)
        setMessage(
          "زمینه حساب تغییر کرد؛ فهرست سازمان فعلی نمایش داده می‌شود.",
        );
    }
  }, [identity, account, router, uncertain]);
  useEffect(() => {
    if (identity && scopeKey === identity) {
      const params = new URLSearchParams({
        kind,
        archived,
        page: String(page),
      });
      if (view === "detail" && selectedId) params.set("record", selectedId);
      window.history.replaceState(
        null,
        "",
        `${companiesOnly ? "/companies" : "/customers"}?${params}`,
      );
    }
  }, [kind, archived, page, identity, scopeKey, view, selectedId]);
  useEffect(() => {
    document.title = `${labels[kind].plural} | NewCRM`;
  }, [kind]);
  useNavigationRequest(askLeave);
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
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      askLeave(() => {
        window.location.assign(link.href);
      });
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
    };
  }, []);
  useEffect(() => {
    if (account.phase === "ready" && scopeKey === identity) {
      if (focusId.current) {
        document.getElementById(focusId.current)?.focus();
        focusId.current = "";
      } else heading.current?.focus();
    }
  }, [account.phase, identity, scopeKey, view, kind]);
  useEffect(
    () => () => {
      listController.current?.abort();
      detailController.current?.abort();
      mutationController.current?.abort();
    },
    [],
  );

  const loadList = useCallback(async () => {
    if (!organizationId || scopeRef.current !== identity) return;
    listController.current?.abort();
    const ctrl = new AbortController();
    listController.current = ctrl;
    setListLoading(true);
    setListError("");
    try {
      const result = await customerApi<Page<Customer>>(
        organizationId,
        `${kind}/?q=${encodeURIComponent(search)}&archived=${archived}&page=${page}&status=${statusFilter}&customer_type=${typeFilter}${ownerFilter ? `&owner_id=${ownerFilter}` : ""}`,
        { signal: ctrl.signal },
      );
      if (!ctrl.signal.aborted) {
        setList(result);
        setListStamp(account);
        setListReadKey(
          `${kind}:${search}:${archived}:${page}:${statusFilter}:${typeFilter}:${ownerFilter}`,
        );
      }
    } catch (failure) {
      if (ctrl.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 404 && page > 1) {
        setPage(1);
        return;
      }
      if (failure instanceof ApiError && [403, 409].includes(failure.status))
        void refresh();
      setListError(
        failure instanceof Error ? failure.message : "دریافت فهرست انجام نشد.",
      );
      setListStamp(account);
      setListReadKey(
        `${kind}:${search}:${archived}:${page}:${statusFilter}:${typeFilter}:${ownerFilter}`,
      );
    } finally {
      if (!ctrl.signal.aborted) setListLoading(false);
    }
  }, [
    organizationId,
    identity,
    kind,
    search,
    archived,
    statusFilter,
    typeFilter,
    ownerFilter,
    page,
    refresh,
    account,
    customerApi,
  ]);
  useEffect(() => {
    if (account.phase === "ready" && scopeKey === identity) void loadList();
    return () => listController.current?.abort();
  }, [loadList, account.phase, scopeKey, identity, revision]);

  const loadDetail = useCallback(async () => {
    if (!selectedId || !organizationId || scopeRef.current !== identity) return;
    detailController.current?.abort();
    const ctrl = new AbortController();
    detailController.current = ctrl;
    setDetailLoading(true);
    setDetailError("");
    try {
      const [item, links] = await Promise.all([
        customerApi<Customer>(organizationId, `${kind}/${selectedId}/`, {
          signal: ctrl.signal,
        }),
        customerApi<Page<Relation>>(
          organizationId,
          `${kind}/${selectedId}/${kind === "people" ? "companies" : "people"}/?archived=all&page=${relationPage}`,
          { signal: ctrl.signal },
        ),
      ]);
      if (!ctrl.signal.aborted) {
        setRecord(item);
        setRelations(links);
        setDetailStamp(account);
        setDetailReadKey(`${kind}:${selectedId}:${relationPage}`);
        return true;
      }
    } catch (failure) {
      if (ctrl.signal.aborted) return;
      if (
        failure instanceof ApiError &&
        failure.status === 404 &&
        relationPage > 1
      ) {
        setRelationPage(1);
        return;
      }
      setDetailError(
        failure instanceof Error ? failure.message : "دریافت پرونده انجام نشد.",
      );
      setDetailStamp(account);
      setDetailReadKey(`${kind}:${selectedId}:${relationPage}`);
      if (failure instanceof ApiError && [403, 409].includes(failure.status))
        void refresh();
    } finally {
      if (!ctrl.signal.aborted) setDetailLoading(false);
    }
  }, [
    selectedId,
    organizationId,
    identity,
    kind,
    relationPage,
    refresh,
    account,
    customerApi,
  ]);
  useEffect(() => {
    if (view === "detail" && account.phase === "ready" && scopeKey === identity)
      void loadDetail();
    return () => detailController.current?.abort();
  }, [view, account.phase, scopeKey, identity, loadDetail, revision]);

  useEffect(() => {
    if (account.phase !== "ready") {
      setConfirmation(null);
      return;
    }
    if (view !== "form" || !editor?.base || scopeKey !== identity) return;
    const ctrl = new AbortController();
    setFormAccessError("");
    customerApi<Customer>(organizationId, `${kind}/${editor.base.id}/`, {
      signal: ctrl.signal,
    })
      .then(() => {
        if (!ctrl.signal.aborted) setFormStamp(account);
      })
      .catch((failure) => {
        if (!ctrl.signal.aborted) {
          setFormStamp(account);
          setFormAccessError(
            failure instanceof Error
              ? failure.message
              : "دسترسی پرونده تأیید نشد.",
          );
        }
      });
    return () => ctrl.abort();
  }, [
    account,
    view,
    editor?.base?.id,
    scopeKey,
    identity,
    organizationId,
    kind,
  ]);

  function requestConfirmation(action: Confirmation) {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setConfirmation(action);
  }
  function closeConfirmation() {
    setConfirmation(null);
    setDuplicateReview(null);
    const target = trigger.current;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
      else heading.current?.focus();
    });
  }
  function askLeave(action: () => void) {
    if (pending.current || flowPending.current) return;
    if (dirtyRef.current) {
      requestConfirmation({
        title: "تغییرات ذخیره نشده‌اند",
        description:
          "با ادامه، پیش‌نویس این صفحه کنار گذاشته می‌شود. برای حفظ آن انصراف دهید.",
        label: "کنار گذاشتن پیش‌نویس",
        action: () => {
          dirtyRef.current = false;
          setEditor(null);
          setImportDraft(null);
          setAttachmentDraft(null);
          setMergeDraft(null);
          setRelationship(null);
          setConfirmation(null);
          setUncertain(false);
          setReview(false);
          action();
        },
      });
    } else action();
  }
  function backToList() {
    askLeave(() => {
      setView("list");
      setEditor(null);
      setRelationship(null);
      setSelectedId(null);
      setError("");
      setReview(false);
      setUncertain(false);
    });
  }
  function openRecord(item: Pick<Customer, "id">) {
    setSelectedId(item.id);
    setView("detail");
    setRecord(null);
    setRelationPage(1);
    setRelationship(null);
    setError("");
    setMessage("");
    setReview(false);
    setUncertain(false);
  }
  function openLinked(link: Relation) {
    askLeave(() => {
      if (companiesOnly) {
        router.push(`/customers?kind=people&record=${link.person_id}`);
        return;
      }
      setKind(kind === "people" ? "companies" : "people");
      setSelectedId(kind === "people" ? link.company_id : link.person_id);
      setRecord(null);
      setEditor(null);
      setRelationship(null);
      setRelationPage(1);
      setView("detail");
      setError("");
      setMessage("");
      setReview(false);
      setUncertain(false);
      setQuery("");
      setSearch("");
      setPage(1);
    });
  }
  function startEditor(base: Customer | null, quick = false) {
    setQuickCompany(quick);
    const draft = toDraft(kind, base || undefined);
    setEditor({
      base,
      draft,
      baseline: { ...draft },
      key: crypto.randomUUID(),
    });
    setFormAccessError("");
    setView("form");
    setFields({});
    setError("");
    setMessage("");
    setReview(false);
    setUncertain(false);
  }
  function changeField(name: string, value: string) {
    setEditor((previous) => {
      if (!previous) return null;
      const draft = { ...previous.draft, [name]: value };
      const updateList = (field: string, before: string, after: string) => {
        let values = (draft[field] || "").split(/\r?\n/).filter(Boolean);
        const index = values.indexOf(before);
        if (index >= 0) {
          if (after.trim()) values[index] = after;
          else values.splice(index, 1);
        } else if (after.trim()) values.push(after);
        draft[field] = values.join("\n");
      };
      if (name === "contact_mobile" || name === "contact_landline")
        updateList("phones", previous.draft[name] || "", value);
      if (name === "contact_email")
        updateList("emails", previous.draft.contact_email || "", value);
      if (name === "phones") {
        const values = value.split(/\r?\n/).filter(Boolean);
        draft.contact_mobile =
          values.find((v) => /^(?:\+989|09|00989)/.test(v)) || "";
        draft.contact_landline =
          values.find((v) => !/^(?:\+989|09|00989)/.test(v)) || "";
      }
      if (name === "emails")
        draft.contact_email = value.split(/\r?\n/)[0] || "";
      return { ...previous, draft };
    });
    setFields((previous) => ({ ...previous, [name]: "" }));
  }
  async function mutate<T>(
    task: (signal: AbortSignal) => Promise<T>,
    success: (value: T) => void,
    isWrite = () => true,
  ) {
    if (pending.current) return;
    const bound = scopeKey;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const ctrl = new AbortController();
    mutationController.current = ctrl;
    try {
      const result = await task(ctrl.signal);
      if (!ctrl.signal.aborted && scopeRef.current === bound) {
        setConfirmation(null);
        setUncertain(false);
        setReview(false);
        success(result);
      }
    } catch (failure) {
      if (ctrl.signal.aborted || scopeRef.current !== bound) return;
      if (failure instanceof ApiError && failure.status === 400) {
        const errors: Record<string, string> = {};
        for (const [key, values] of Object.entries(failure.fields))
          errors[key] = values.join(" ");
        setFields(errors);
        setConfirmation(null);
        setError(
          "درخواست پذیرفته نشد؛ موارد مشخص‌شده و اطلاعات فرم را بررسی کنید.",
        );
        setTimeout(
          () =>
            document
              .querySelector<HTMLElement>(
                '.customer-workspace [aria-invalid="true"]',
              )
              ?.focus(),
          0,
        );
      } else if (failure instanceof ApiError && failure.status === 409) {
        setReview(true);
        setError(failure.message);
        setConfirmation(null);
        void refresh();
      } else if (failure instanceof ApiError && failure.status === 403) {
        setError(failure.message);
        setConfirmation(null);
        void refresh();
      } else if (failure instanceof ApiError && failure.status === 404) {
        setError(failure.message);
        setConfirmation(null);
      } else {
        setUncertain(isWrite());
        setConfirmation(null);
        setError(
          isWrite()
            ? "نتیجه عملیات مشخص نیست. پیش از ذخیره دوباره، نتیجه را بررسی کنید."
            : "بررسی پرونده‌های مشابه انجام نشد؛ چیزی ذخیره نشد. اتصال را بررسی کنید و دوباره دکمه ثبت یا ذخیره را بزنید.",
        );
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function save(
    event?: FormEvent<HTMLFormElement>,
    approved = false,
    duplicatesApproved = false,
  ) {
    event?.preventDefault();
    if (
      !editor ||
      pending.current ||
      review ||
      (duplicateReview && !duplicatesApproved)
    )
      return;
    const invalid: Record<string, string> = {};
    if (
      kind === "people" &&
      !editor.draft.first_name.trim() &&
      !editor.draft.last_name.trim()
    )
      invalid.first_name = "نام یا نام خانوادگی را وارد کنید.";
    if (kind === "companies" && !editor.draft.name.trim())
      invalid.name = "نام تجاری را وارد کنید.";
    setFields(invalid);
    if (Object.keys(invalid).length) {
      setTimeout(
        () =>
          document
            .querySelector<HTMLElement>(
              '.customer-workspace [aria-invalid="true"]',
            )
            ?.focus(),
        0,
      );
      return;
    }
    if (
      !approved &&
      editor.draft.owner_id &&
      (!editor.base || editor.draft.owner_id !== String(editor.base.owner_id))
    ) {
      requestConfirmation({
        title: "تأیید تغییر مسئول پرونده",
        description: `مسئول «${editor.base ? displayName(editor.base) : editor.draft.name || `${editor.draft.first_name} ${editor.draft.last_name}`.trim()}» به «${editor.draft.owner_label || "مسئول انتخاب‌شده"}» تغییر می‌کند و دسترسی افراد به پرونده ممکن است تغییر کند.`,
        label: "تغییر مسئول و ذخیره",
        action: () => save(undefined, true),
      });
      return;
    }
    const body = payload(kind, editor.draft);
    if (editor.base) body.version = editor.base.version;
    const stamp = account;
    let writing = false;
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDuplicateReview(null);
    void mutate(
      async (signal) => {
        // A lost create response must resolve the original receipt, even if
        // the original write itself now appears among duplicate candidates.
        if (!duplicatesApproved && !uncertain) {
          const { owner_id: _owner, version: _version, ...candidate } = body;
          const preview = await customerApi<DuplicatePreview>(
            organizationId,
            `${kind}/duplicates/`,
            {
              body: {
                ...candidate,
                ...(editor.base ? { exclude_id: editor.base.id } : {}),
              },
              signal,
            },
          );
          if (readyAccount.current !== stamp)
            return { state: "stale" as const };
          if (preview.results.length)
            return { state: "duplicates" as const, preview };
        }
        writing = true;
        await customerApi<Customer>(
          organizationId,
          editor.base ? `${kind}/${editor.base.id}/` : `${kind}/`,
          {
            method: editor.base ? "PATCH" : "POST",
            body,
            signal,
            ...(!editor.base ? { idempotencyKey: editor.key } : {}),
          },
        );
        return { state: "saved" as const };
      },
      (result) => {
        if (result.state === "stale") return;
        if (result.state === "duplicates") {
          setDuplicateReview({ ...result.preview, approved, stamp });
          return;
        }
        const created = !editor.base;
        dirtyRef.current = false;
        setEditor(null);
        setView("list");
        setSelectedId(null);
        if (created) {
          setQuery("");
          setSearch("");
          setArchived("active");
          setPage(1);
        }
        setRevision((value) => value + 1);
        setMessage(
          created ? `${labels[kind].single} ثبت شد.` : "تغییرات ذخیره شد.",
        );
      },
      () => writing,
    );
  }
  async function reviewFresh() {
    if (pending.current) return;
    if (editor && !editor.base) {
      save(undefined, true);
      return;
    }
    const bound = scopeKey;
    pending.current = true;
    setBusy(true);
    const ctrl = new AbortController();
    mutationController.current = ctrl;
    try {
      if (editor?.base) {
        const latest = await customerApi<Customer>(
          organizationId,
          `${kind}/${editor.base.id}/`,
          { signal: ctrl.signal },
        );
        if (scopeRef.current !== bound || ctrl.signal.aborted) return;
        const fresh = toDraft(kind, latest);
        for (const key of Object.keys(editor.draft))
          if (editor.draft[key] !== editor.baseline[key])
            fresh[key] = editor.draft[key];
        setEditor({
          ...editor,
          base: latest,
          baseline: toDraft(kind, latest),
          draft: fresh,
        });
        setMessage(
          "نسخه تازه دریافت شد؛ تغییرات خود را بررسی و سپس ذخیره کنید.",
        );
      } else {
        const loaded = await loadDetail();
        if (!loaded || scopeRef.current !== bound) return;
        if (relationship?.target) {
          const target = await customerApi<Customer>(
            organizationId,
            `${kind === "people" ? "companies" : "people"}/${relationship.target.id}/`,
            { signal: ctrl.signal },
          );
          const parent = await customerApi<Customer>(
            organizationId,
            `${kind}/${selectedId}/`,
            { signal: ctrl.signal },
          );
          if (scopeRef.current !== bound || ctrl.signal.aborted) return;
          setRelationship({
            ...relationship,
            target,
            baseVersion: parent.version,
          });
        }
        setMessage(
          "وضعیت تازه پرونده را بررسی کنید؛ هیچ درخواستی خودکار تکرار نشد.",
        );
      }
      setReview(false);
      setUncertain(false);
      setError("");
    } catch (failure) {
      if (!ctrl.signal.aborted && scopeRef.current === bound)
        setError(
          failure instanceof Error ? failure.message : "دریافت انجام نشد.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function editRelationship(link: Relation) {
    if (pending.current || !record) return;
    const bound = scopeKey;
    const validated = account;
    pending.current = true;
    setBusy(true);
    const ctrl = new AbortController();
    mutationController.current = ctrl;
    try {
      const target = await customerApi<Customer>(
        organizationId,
        `${kind === "people" ? "companies" : "people"}/${kind === "people" ? link.company_id : link.person_id}/`,
        { signal: ctrl.signal },
      );
      if (
        !ctrl.signal.aborted &&
        scopeRef.current === bound &&
        readyAccount.current === validated
      )
        setRelationship({
          target,
          title: link.title,
          baseVersion: record.version,
        });
    } catch (failure) {
      if (!ctrl.signal.aborted && scopeRef.current === bound)
        setError(
          failure instanceof Error ? failure.message : "دریافت شرکت انجام نشد.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function archiveRecord() {
    if (!record) return;
    const action = record.archived_at ? "restore" : "archive";
    requestConfirmation({
      title: record.archived_at ? "بازگردانی پرونده" : "بایگانی پرونده",
      description: `«${displayName(record)}» ${record.archived_at ? "به فهرست فعال بازمی‌گردد." : "از فهرست فعال کنار می‌رود؛ اطلاعات و ارتباط‌ها حفظ می‌شوند و امکان بازگردانی وجود دارد."}`,
      label: record.archived_at ? "بازگردانی پرونده" : "بایگانی پرونده",
      danger: !record.archived_at,
      action: () => {
        void mutate(
          (signal) =>
            customerApi<Customer>(
              organizationId,
              `${kind}/${record.id}/${action}/`,
              { body: { version: record.version }, signal },
            ),
          (item) => {
            setRecord(item);
            setMessage(
              action === "archive"
                ? "پرونده بایگانی شد."
                : "پرونده بازگردانده شد.",
            );
            setRevision((value) => value + 1);
          },
        );
      },
    });
  }
  function linkCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || !relationship?.target) return;
    const person = kind === "people" ? record : relationship.target;
    const company = kind === "companies" ? record : relationship.target;
    void mutate(
      (signal) =>
        customerApi<Relation>(
          organizationId,
          `people/${person.id}/companies/${company.id}/`,
          {
            method: "PUT",
            body: {
              person_version:
                kind === "people" ? relationship.baseVersion : person.version,
              company_version:
                kind === "companies"
                  ? relationship.baseVersion
                  : company.version,
              title: relationship.title,
            },
            signal,
          },
        ),
      () => {
        setRelationship(null);
        setRelationPage(1);
        setRevision((value) => value + 1);
        setMessage("ارتباط ذخیره شد.");
      },
    );
  }
  function unlink(link: Relation) {
    requestConfirmation({
      title: "حذف ارتباط",
      description: `ارتباط «${`${link.first_name} ${link.last_name}`.trim()}» با «${link.company_name}» حذف می‌شود؛ خود پرونده‌ها حفظ می‌شوند.`,
      label: "حذف ارتباط",
      danger: true,
      action: () => {
        void mutate(
          (signal) =>
            customerApi(
              organizationId,
              `people/${link.person_id}/companies/${link.company_id}/`,
              {
                method: "DELETE",
                body: {
                  person_version: link.person_version,
                  company_version: link.company_version,
                },
                signal,
              },
            ),
          () => {
            setRevision((value) => value + 1);
            setMessage("ارتباط حذف شد.");
          },
        );
      },
    });
  }

  if (account.phase === "error")
    return (
      <LoadFailure message={account.message} retry={() => void refresh()} />
    );
  if (
    (account.phase === "anonymous" ||
      (account.phase === "ready" && !account.data.current)) &&
    (dirty || uncertain)
  )
    return (
      <section className="account-panel">
        <h1>زمینه حساب نیاز به بررسی دارد</h1>
        <p>
          پیش‌نویس در حافظه این صفحه حفظ شده است. در زبانه جدید وارد شوید و همان
          سازمان را انتخاب کنید؛ سپس وضعیت را دوباره بررسی کنید.
        </p>
        <a href="/login" target="_blank" rel="noopener noreferrer">
          ورود در زبانه جدید
        </a>
        <ActionButton className="secondary" onClick={() => void refresh()}>
          بررسی دوباره حساب
        </ActionButton>
      </section>
    );
  if (
    account.phase !== "ready" ||
    !account.data.current ||
    scopeKey !== identity
  )
    return <LoadingAccount />;
  const childBlocked = busy || !!confirmation || !!duplicateReview;
  const blocked = childBlocked || flowLocked;
  const unsupportedAssignment =
    !!editor &&
    !can("assign") &&
    editor.draft.owner_id !== editor.baseline.owner_id &&
    !!editor.draft.owner_id;
  const title =
    view === "merge"
      ? `ادغام ${labels[kind].plural}`
      : view === "import"
        ? `پیش‌نمایش فایل ${labels[kind].plural}`
        : view === "form"
          ? `${editor?.base ? "ویرایش" : "ثبت"} ${labels[kind].single}`
          : view === "detail" && detailStamp === account && record
            ? displayName(record)
            : kind === "people"
              ? "مدیریت مشتریان"
              : companiesOnly
                ? "مدیریت شرکت‌ها"
                : labels[kind].plural;
  const ownerControl = editor && can("assign") && (
    <CustomerPicker
      compact
      organizationId={organizationId}
      userId={account.data.user.user_id}
      kind="owners"
      value={editor.draft.owner_id}
      currentLabel={editor.draft.owner_label}
      defaultLabel={editor.base ? "حفظ مسئول فعلی" : undefined}
      error={fields.owner_id}
      label="مسئول پرونده"
      disabled={blocked || uncertain || review}
      onChange={(value, label) => {
        changeField(
          "owner_id",
          value || (editor.base ? String(editor.base.owner_id) : ""),
        );
        changeField(
          "owner_label",
          value ? label : editor.base?.owner_label || "",
        );
      }}
    />
  );
  const referenceActions = record && (
    <div className="session-actions">
      {can("update") && !record.archived_at && (
        <ActionButton
          className={kind === "people" ? "customer-primary-edit" : "secondary"}
          disabled={blocked || review || uncertain}
          onClick={() => askLeave(() => startEditor(record))}
        >
          ویرایش {labels[kind].single}
        </ActionButton>
      )}
      {can("merge") && !record.archived_at && !record.is_merged && (
        <ActionButton
          className="secondary"
          disabled={blocked || review || uncertain}
          onClick={() =>
            askLeave(() => {
              setMergeDraft({
                target: record,
                source: null,
                fields: {},
                relations: {},
              });
              setView("merge");
              setError("");
              setMessage("");
            })
          }
        >
          ادغام پرونده تکراری
        </ActionButton>
      )}
      {!record.is_merged && can(record.archived_at ? "restore" : "archive") && (
        <ActionButton
          className={
            record.archived_at ? "secondary" : "secondary customer-quiet-danger"
          }
          disabled={blocked || review || uncertain}
          onClick={() => askLeave(archiveRecord)}
        >
          {record.archived_at ? "بازگردانی پرونده" : "بایگانی پرونده"}
        </ActionButton>
      )}
    </div>
  );
  return (
    <section
      className={`customer-workspace ${kind === "people" ? "customer-reference-workspace" : ""} customer-view-${view}`}
    >
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{account.data.current.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            {title}
          </h1>
          <p className="account-description">
            {account.data.scope === "organization"
              ? "پرونده‌های سازمان"
              : account.data.scope === "team"
                ? "پرونده‌های من و تیم‌های مشترک"
                : "پرونده‌های من"}
          </p>
        </div>
        <a className="customer-link" href="/workspace">
          بازگشت به فضای کار
        </a>
      </div>
      {!companiesOnly && (
        <nav className="customer-kind" aria-label="نوع پرونده">
          <ActionButton
            className="secondary"
            aria-pressed={kind === "people"}
            disabled={blocked || flowLocked}
            onClick={() =>
              askLeave(() => {
                setStatusFilter("");
                setTypeFilter("");
                setOwnerFilter("");
                setKind("people");
                setView("list");
                setEditor(null);
                setRelationship(null);
                setQuery("");
                setSearch("");
                setPage(1);
                setError("");
              })
            }
          >
            <Users size={18} aria-hidden="true" />
            مشتریان
          </ActionButton>
          <ActionButton
            className="secondary"
            aria-pressed={kind === "companies"}
            disabled={blocked || flowLocked}
            onClick={() =>
              askLeave(() => {
                setStatusFilter("");
                setTypeFilter("");
                setOwnerFilter("");
                setKind("companies");
                setView("list");
                setEditor(null);
                setRelationship(null);
                setQuery("");
                setSearch("");
                setPage(1);
                setError("");
              })
            }
          >
            <Building2 size={18} aria-hidden="true" />
            شرکت‌ها
          </ActionButton>
        </nav>
      )}
      <Feedback message={error || message} kind={error ? "error" : "info"} />
      {confirmation && (
        <ConfirmPanel
          {...confirmation}
          busy={busy}
          onCancel={closeConfirmation}
          onConfirm={confirmation.action}
        />
      )}
      {duplicateReview && duplicateReview.stamp === account && (
        <ConfirmPanel
          title="پرونده‌های مشابه پیدا شد"
          description="این شباهت‌ها به معنی یکی‌بودن پرونده‌ها نیست. موارد زیر را بررسی کنید؛ می‌توانید انصراف دهید و فرم را اصلاح کنید یا همین اطلاعات را جداگانه ذخیره کنید. هیچ ادغامی انجام نمی‌شود."
          label={editor?.base ? "ذخیره با وجود شباهت" : "ثبت پرونده جداگانه"}
          busy={busy}
          onCancel={closeConfirmation}
          onConfirm={() => save(undefined, duplicateReview.approved, true)}
        >
          <div
            className="customer-duplicate-scroll"
            role="region"
            aria-label="فهرست موارد مشابه"
            tabIndex={0}
          >
            <ul className="customer-duplicates">
              {duplicateReview.results.map((match) => (
                <li key={match.id}>
                  <strong>
                    <bdi>{match.label}</bdi>
                  </strong>
                  {match.archived && <span> — بایگانی‌شده</span>}
                  <p>
                    {match.reasons
                      .map((reason) => duplicateReasons[reason])
                      .join("، ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p>
            این بررسی فقط پرونده‌های قابل مشاهده برای شما را پوشش می‌دهد و تضمین
            نبودن پرونده مشابه نیست.
          </p>
          {duplicateReview.has_more && (
            <p>
              ۲۰ مورد نخست نمایش داده شده‌اند؛ موارد مشابه بیشتری در دسترس شما
              وجود دارد.
            </p>
          )}
        </ConfirmPanel>
      )}
      {(review || uncertain) && (
        <div className="account-panel customer-review">
          <p>
            {editor && !editor.base
              ? "ثبت با همان شناسه درخواست بررسی می‌شود تا پرونده تکراری ساخته نشود."
              : "نسخه تازه را دریافت کنید؛ پیش‌نویس شما حفظ می‌شود. پیش از ذخیره بعدی، تغییرات را بررسی کنید."}
          </p>
          <ActionButton
            className="secondary"
            busy={busy}
            onClick={() => void reviewFresh()}
          >
            {editor && !editor.base
              ? "بررسی و تکمیل ثبت"
              : "دریافت نسخه تازه برای بازبینی"}
          </ActionButton>
        </div>
      )}
      {view === "list" && (
        <>
          <div className="customer-toolbar">
            <SearchBox
              id="customer-search"
              label={`جست‌وجوی ${labels[kind].plural}`}
              value={query}
              onChange={setQuery}
              onCommit={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            {kind === "people" && (
              <>
                <FormField id="customer-status-filter" label="وضعیت مشتری">
                  <select
                    id="customer-status-filter"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">همه</option>
                    <option value="active">فعال</option>
                    <option value="potential">مشتری بالقوه</option>
                    <option value="inactive">غیرفعال</option>
                  </select>
                </FormField>
                <FormField id="customer-type-filter" label="نوع مشتری">
                  <select
                    id="customer-type-filter"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">همه</option>
                    <option value="individual">حقیقی</option>
                    <option value="legal">حقوقی</option>
                  </select>
                </FormField>
                <CustomerPicker
                  organizationId={organizationId}
                  userId={account.data.user.user_id}
                  kind="owners"
                  compact
                  label="فیلتر مسئول"
                  value={ownerFilter}
                  defaultLabel="همه مسئولان مجاز"
                  disabled={blocked}
                  onChange={(value) => {
                    setOwnerFilter(value);
                    setPage(1);
                  }}
                />
              </>
            )}
            <FormField id="archive-filter" label="وضعیت بایگانی">
              <select
                id="archive-filter"
                value={archived}
                aria-describedby="archive-filter-error"
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
          </div>
          <div className="customer-list-heading">
            <h2>
              لیست {labels[kind].plural}{" "}
              {listStamp === account && list && (
                <RecordStatus>{number(list.count)}</RecordStatus>
              )}
            </h2>
            {(statusFilter ||
              typeFilter ||
              ownerFilter ||
              archived !== "active") && (
              <button
                type="button"
                className="customer-link customer-filter-reset"
                disabled={blocked}
                onClick={() => {
                  setStatusFilter("");
                  setTypeFilter("");
                  setOwnerFilter("");
                  setArchived("active");
                  setPage(1);
                }}
              >
                {" "}
                <RotateCcw size={14} aria-hidden="true" />
                پاک کردن فیلترها
              </button>
            )}
            <div className="customer-list-tools">
              <CustomerFileActions
                kind={kind}
                organizationId={organizationId}
                userId={account.data.user.user_id}
                query={new URLSearchParams({
                  q: search,
                  archived,
                  status: statusFilter,
                  customer_type: typeFilter,
                  ...(ownerFilter ? { owner_id: ownerFilter } : {}),
                }).toString()}
                canExport={can("export")}
                canImport={can("create")}
                disabled={blocked || listLoading || listStamp !== account}
                onImport={() => {
                  setView("import");
                  setError("");
                  setMessage("");
                }}
              />
              {can("create") && (
                <>
                  {kind === "companies" && (
                    <ActionButton
                      className="secondary"
                      onClick={() => startEditor(null, true)}
                    >
                      افزودن سریع شرکت
                    </ActionButton>
                  )}
                  <ActionButton onClick={() => startEditor(null)}>
                    <Plus size={17} aria-hidden="true" />
                    {kind === "people"
                      ? "افزودن مشتری جدید"
                      : `ثبت ${labels[kind].single}`}
                  </ActionButton>
                </>
              )}
            </div>
          </div>
          {listLoading ||
          listStamp !== account ||
          listReadKey !==
            `${kind}:${search}:${archived}:${page}:${statusFilter}:${typeFilter}:${ownerFilter}` ? (
            <LoadingAccount />
          ) : listError ? (
            <LoadFailure
              title="فهرست دریافت نشد"
              message={listError}
              retry={() => void loadList()}
            />
          ) : (
            list && (
              <>
                {!list.count ? (
                  <div className="account-panel customer-empty" role="status">
                    <h2>
                      {search
                        ? "نتیجه‌ای پیدا نشد"
                        : "پرونده‌ای در این فهرست نیست"}
                    </h2>
                    <p>
                      {search
                        ? "عبارت جست‌وجو یا وضعیت بایگانی را تغییر دهید."
                        : can("create")
                          ? `برای شروع، ${labels[kind].single} جدید ثبت کنید.`
                          : "پرونده‌ای به شما اختصاص داده نشده است؛ با مدیر سازمان تماس بگیرید."}
                    </p>
                  </div>
                ) : (
                  <div
                    className="customer-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label={`فهرست ${labels[kind].plural}`}
                  >
                    <table className="customer-table">
                      <caption className="sr-only">
                        پرونده‌های مجاز {labels[kind].plural}
                      </caption>
                      <thead>
                        <tr>
                          {kind === "people" && <th scope="col">کد مشتری</th>}
                          <th scope="col">
                            {kind === "people" ? "نام و نام خانوادگی" : "نام"}
                          </th>
                          {kind === "people" && (
                            <>
                              <th scope="col">شرکت</th>
                              <th scope="col">تماس</th>
                              <th scope="col">نوع</th>
                            </>
                          )}
                          {kind === "companies" && (
                            <>
                              <th scope="col">شماره ثبت</th>
                              <th scope="col">تماس</th>
                            </>
                          )}
                          <th scope="col">مسئول</th>
                          <th scope="col">وضعیت</th>
                          {kind === "people" && <th scope="col">فعالیت‌ها</th>}
                          <th scope="col">
                            {kind === "people" ? "تاریخ ایجاد" : "آخرین ویرایش"}
                          </th>
                          <th scope="col">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.results.map((item) => (
                          <tr key={item.id}>
                            {kind === "people" && (
                              <td>
                                <RecordStatus>
                                  {item.customer_code || "ثبت نشده"}
                                </RecordStatus>
                              </td>
                            )}
                            <td>
                              <button
                                disabled={blocked}
                                className="customer-record-link"
                                onClick={() => openRecord(item)}
                                aria-label={`مشاهده پرونده ${displayName(item)}`}
                              >
                                {displayName(item)}
                              </button>
                              {kind === "people" && item.title && (
                                <span className="customer-secondary">
                                  {item.title}
                                </span>
                              )}
                            </td>
                            {kind === "people" && (
                              <>
                                <td>
                                  {item.company_label || "—"}
                                  {item.industry && (
                                    <span className="customer-secondary">
                                      {item.industry}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {item.emails?.[0] && (
                                    <span className="customer-secondary">
                                      <bdi>{item.emails[0]}</bdi>
                                    </span>
                                  )}
                                  {item.phones?.map((phone) => (
                                    <span
                                      className="customer-secondary"
                                      key={phone}
                                    >
                                      <bdi>{phone}</bdi>
                                    </span>
                                  ))}
                                </td>
                                <td>
                                  <RecordStatus>
                                    {item.customer_type === "legal"
                                      ? "حقوقی"
                                      : "حقیقی"}
                                  </RecordStatus>
                                </td>
                              </>
                            )}
                            {kind === "companies" && (
                              <>
                                <td>
                                  <bdi>{item.registration_number || "—"}</bdi>
                                </td>
                                <td>
                                  {[
                                    ...(item.phones || []),
                                    ...(item.emails || []),
                                  ].map((value) => (
                                    <span
                                      className="customer-secondary"
                                      key={value}
                                    >
                                      <bdi>{value}</bdi>
                                    </span>
                                  ))}
                                </td>
                              </>
                            )}
                            <td>
                              <bdi>{item.owner_label}</bdi>
                            </td>
                            <td>
                              <RecordStatus
                                tone={
                                  !item.archived_at &&
                                  !item.is_merged &&
                                  item.status === "active"
                                    ? "success"
                                    : !item.archived_at &&
                                        !item.is_merged &&
                                        item.status === "potential"
                                      ? "warning"
                                      : "neutral"
                                }
                              >
                                {item.is_merged
                                  ? "ادغام‌شده"
                                  : item.archived_at
                                    ? "بایگانی‌شده"
                                    : kind === "people" &&
                                        item.status === "inactive"
                                      ? "غیرفعال"
                                      : kind === "people" &&
                                          item.status === "potential"
                                        ? "مشتری بالقوه"
                                        : "فعال"}
                              </RecordStatus>
                            </td>
                            {kind === "people" && (
                              <td>
                                <button
                                  disabled={blocked}
                                  className="customer-link"
                                  onClick={() => openRecord(item)}
                                  aria-label={`فعالیت‌های ${displayName(item)}`}
                                >
                                  {number(item.activity_count || 0)} فعالیت
                                </button>
                              </td>
                            )}
                            <td>
                              {formatAccountDate(
                                kind === "people" && item.created_at
                                  ? item.created_at
                                  : item.updated_at,
                              )}
                            </td>
                            {
                              <td>
                                <div className="customer-row-actions">
                                  <ActionButton
                                    disabled={blocked}
                                    className="secondary"
                                    title={`جزئیات ${labels[kind].single}`}
                                    aria-label={`جزئیات ${labels[kind].single} ${displayName(item)}`}
                                    onClick={() => openRecord(item)}
                                  >
                                    <Eye size={16} aria-hidden="true" />
                                  </ActionButton>
                                  {can("update") &&
                                    !item.archived_at &&
                                    !item.is_merged && (
                                      <ActionButton
                                        disabled={blocked}
                                        className="secondary"
                                        title={`ویرایش ${labels[kind].single}`}
                                        aria-label={`ویرایش ${labels[kind].single} ${displayName(item)}`}
                                        onClick={() => startEditor(item)}
                                      >
                                        <Pencil size={16} aria-hidden="true" />
                                      </ActionButton>
                                    )}
                                  {can("archive") &&
                                    !item.archived_at &&
                                    !item.is_merged && (
                                      <ActionButton
                                        disabled={blocked}
                                        className="secondary danger"
                                        title={`بایگانی ${labels[kind].single}`}
                                        aria-label={`بایگانی ${labels[kind].single} ${displayName(item)}`}
                                        onClick={() => {
                                          requestConfirmation({
                                            title: "بایگانی پرونده",
                                            description: `«${displayName(item)}» از فهرست فعال کنار می‌رود؛ اطلاعات حفظ می‌شود.`,
                                            label: "بایگانی پرونده",
                                            danger: true,
                                            action: () => {
                                              void mutate(
                                                (signal) =>
                                                  customerApi(
                                                    organizationId,
                                                    `${kind}/${item.id}/archive/`,
                                                    {
                                                      body: {
                                                        version: item.version,
                                                      },
                                                      signal,
                                                    },
                                                  ),
                                                () => setRevision((v) => v + 1),
                                              );
                                            },
                                          });
                                        }}
                                      >
                                        <Archive size={16} aria-hidden="true" />
                                      </ActionButton>
                                    )}
                                </div>
                              </td>
                            }
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pager
                  page={page}
                  count={list.count}
                  previous={!!list.previous}
                  next={!!list.next}
                  onPage={setPage}
                />
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
            onClick={backToList}
          >
            بازگشت به فهرست
          </ActionButton>
          {can("create") ? (
            <CustomerImportPreview
              kind={kind}
              organizationId={organizationId}
              organizationName={account.data.current.name}
              userId={account.data.user.user_id}
              draft={importDraft}
              onChange={setImportDraft}
              disabled={childBlocked}
              onAccessError={() => void refresh()}
              onPendingChange={updateFlowPending}
              onComplete={(count, replayed) => {
                dirtyRef.current = false;
                setImportDraft(null);
                setAttachmentDraft(null);
                setMergeDraft(null);
                setView("list");
                setQuery("");
                setSearch("");
                setArchived("active");
                setPage(1);
                setRevision((value) => value + 1);
                setMessage(
                  replayed
                    ? `این فایل قبلاً ثبت شده بود؛ نتیجه ${number(count)} پرونده بازیابی شد.`
                    : `${number(count)} ${labels[kind].single} از فایل ثبت شد.`,
                );
              }}
            />
          ) : (
            <p role="status">
              مجوز بررسی فایل در دسترسی فعلی شما وجود ندارد. فایل قبلی پنهان
              است؛ برای ادامه با مدیر سازمان تماس بگیرید.
            </p>
          )}
        </>
      )}
      {view === "merge" && mergeDraft && (
        <>
          <ActionButton
            className="secondary"
            disabled={blocked || flowLocked}
            onClick={backToList}
          >
            بازگشت به فهرست
          </ActionButton>
          {can("merge") ? (
            <CustomerMerge
              kind={kind}
              organizationId={organizationId}
              organizationName={account.data.current.name}
              userId={account.data.user.user_id}
              draft={mergeDraft}
              onChange={setMergeDraft}
              disabled={childBlocked}
              onPendingChange={updateFlowPending}
              onAccessError={() => void refresh()}
              onComplete={(target, replayed) => {
                dirtyRef.current = false;
                setMergeDraft(null);
                setSelectedId(target);
                setRecord(null);
                setView("detail");
                setRelationPage(1);
                setRevision((value) => value + 1);
                setMessage(
                  replayed
                    ? "نتیجه ادغام قبلی بازیابی شد."
                    : "ادغام انجام شد؛ پرونده اصلی و سابقه پرونده دوم حفظ شدند.",
                );
              }}
            />
          ) : (
            <p role="status">
              مجوز ادغام در دسترسی فعلی شما وجود ندارد؛ داده قبلی پنهان است.
            </p>
          )}
        </>
      )}
      {view === "form" &&
        editor &&
        (editor.base && formStamp !== account ? (
          <LoadingAccount />
        ) : formAccessError ? (
          <LoadFailure
            title="دسترسی پرونده تأیید نشد"
            message={formAccessError}
            retry={() => void refresh()}
          />
        ) : (
          <>
            <p className="account-description">
              {!can(editor.base ? "update" : "create") &&
                "مجوز ذخیره این فرم در دسترسی فعلی شما وجود ندارد. "}
              {kind === "people"
                ? "نام یا نام خانوادگی را وارد کنید؛ سایر اطلاعات اختیاری‌اند."
                : "نام تجاری را وارد کنید؛ سایر اطلاعات اختیاری‌اند."}{" "}
              پیش‌نویس فقط در حافظه این صفحه نگهداری می‌شود.
            </p>
            {kind === "companies" && ownerControl}
            {unsupportedAssignment && (
              <div className="account-panel">
                <p>
                  مجوز تغییر مسئول در دسترسی فعلی شما وجود ندارد. سایر تغییرات
                  پیش‌نویس حفظ شده‌اند.
                </p>
                <ActionButton
                  className="secondary"
                  onClick={() => {
                    changeField("owner_id", editor.baseline.owner_id);
                    changeField("owner_label", editor.baseline.owner_label);
                  }}
                >
                  حفظ مسئول پیش‌فرض فرم
                </ActionButton>
              </div>
            )}
            <form
              ref={formRef}
              className="account-panel customer-editor"
              noValidate
              aria-busy={busy}
              onSubmit={(event) => save(event)}
            >
              {kind === "people" ? (
                <CustomerReferenceFields
                  ownerControl={ownerControl}
                  draft={editor.draft}
                  errors={fields}
                  disabled={
                    blocked ||
                    uncertain ||
                    review ||
                    !can(editor.base ? "update" : "create")
                  }
                  onChange={changeField}
                  organizationId={organizationId}
                  userId={account.data.user.user_id}
                />
              ) : (
                <>
                  {" "}
                  <div className="customer-fields">
                    <RecordFields
                      fields={
                        quickCompany && kind === "companies"
                          ? fieldSpecs[kind].filter((field) =>
                              [
                                "name",
                                "registration_number",
                                "phones",
                                "emails",
                                "addresses",
                              ].includes(field.name),
                            )
                          : fieldSpecs[kind]
                      }
                      draft={editor.draft}
                      errors={fields}
                      disabled={
                        blocked ||
                        uncertain ||
                        review ||
                        !can(editor.base ? "update" : "create")
                      }
                      onChange={changeField}
                    />
                  </div>
                </>
              )}
              {fields.owner_id && <p role="alert">{fields.owner_id}</p>}
              <div className="session-actions customer-form-actions">
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked || review || uncertain}
                  onClick={() => askLeave(() => startEditor(editor.base))}
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  پاک کردن فرم
                </ActionButton>
                <ActionButton
                  type="button"
                  className="secondary"
                  disabled={blocked}
                  onClick={backToList}
                >
                  بازگشت به فهرست
                </ActionButton>
                <ActionButton
                  type="submit"
                  busy={busy}
                  disabled={
                    !!confirmation ||
                    !!duplicateReview ||
                    uncertain ||
                    review ||
                    !!editor.base?.archived_at ||
                    unsupportedAssignment ||
                    !can(editor.base ? "update" : "create")
                  }
                >
                  <Save size={17} aria-hidden="true" />
                  {editor.base ? "ذخیره تغییرات" : `ثبت ${labels[kind].single}`}
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
            onClick={backToList}
          >
            بازگشت به فهرست
          </ActionButton>
          {detailLoading ||
          detailStamp !== account ||
          detailReadKey !== `${kind}:${selectedId}:${relationPage}` ? (
            <LoadingAccount />
          ) : detailError ? (
            <LoadFailure
              title="پرونده دریافت نشد"
              message={detailError}
              retry={() => void loadDetail()}
            />
          ) : (
            record && (
              <>
                {record.is_merged && (
                  <section
                    className="account-panel customer-review"
                    aria-label="سابقه پرونده ادغام‌شده"
                  >
                    <h2>این پرونده ادغام شده است</h2>
                    <p>
                      اطلاعات زیر سابقه فقط‌خواندنی پیش از ادغام است. این پرونده
                      قابل ویرایش یا بازگردانی از بایگانی نیست.
                    </p>
                    {record.merged_into_id ? (
                      <ActionButton
                        onClick={() =>
                          askLeave(() =>
                            openRecord({ id: record.merged_into_id! }),
                          )
                        }
                      >
                        مشاهده پرونده اصلی
                      </ActionButton>
                    ) : (
                      <p>پرونده اصلی در دسترس فعلی شما نیست.</p>
                    )}
                  </section>
                )}
                {kind === "people" && (
                  <CustomerReferenceProfile
                    record={record}
                    actions={referenceActions}
                  >
                    <CustomerAttachments
                      kind={kind}
                      customerId={record.id}
                      organizationId={organizationId}
                      userId={account.data.user.user_id}
                      editable={
                        can("update") &&
                        !record.archived_at &&
                        !record.is_merged
                      }
                      draft={
                        attachmentDraft?.recordId === record.id
                          ? attachmentDraft
                          : null
                      }
                      onChange={setAttachmentDraft}
                      onPendingChange={updateFlowPending}
                    />
                    <CustomerRelatedRecords
                      key={`${identity}:${record.id}:${record.version}`}
                      organizationId={organizationId}
                      userId={account.data.user.user_id}
                      customerId={record.id}
                      kind={kind}
                      operations={account.data.operations}
                    />
                  </CustomerReferenceProfile>
                )}
                {kind === "companies" && account.phase === "ready" && (
                  <CustomerRelatedRecords
                    key={`${identity}:${record.id}:${record.version}`}
                    organizationId={organizationId}
                    userId={account.data.user.user_id}
                    customerId={record.id}
                    kind={kind}
                    operations={account.data.operations}
                  />
                )}
                {kind === "companies" && (
                  <section className="account-panel customer-profile">
                    <p>
                      <a
                        className="customer-link"
                        href={`/activities?target_type=company&target_id=${record.id}`}
                      >
                        فعالیت‌ها و پیگیری این پرونده
                      </a>
                    </p>
                    <div className="account-page-heading">
                      <h2>
                        {record.is_merged
                          ? "اطلاعات پیش از ادغام"
                          : "اطلاعات پرونده"}
                      </h2>
                      {referenceActions}
                    </div>
                    <dl className="customer-definition">
                      <div>
                        <dt>مسئول پرونده</dt>
                        <dd>
                          <bdi>{record.owner_label}</bdi>
                        </dd>
                      </div>
                      <div>
                        <dt>وضعیت بایگانی</dt>
                        <dd>{record.archived_at ? "بایگانی‌شده" : "فعال"}</dd>
                      </div>
                      <RecordValues
                        fields={fieldSpecs[kind].filter(
                          (field) =>
                            field.name !== "name" && field.name !== "last_name",
                        )}
                        record={record}
                      />
                    </dl>
                  </section>
                )}
                <section className="account-panel customer-relations">
                  <h2>
                    {kind === "people" ? "شرکت‌های مرتبط" : "اشخاص مرتبط"}
                  </h2>
                  <p className="account-description">
                    فقط ارتباط‌هایی نمایش داده می‌شوند که هر دو پرونده در محدوده
                    دسترسی شما باشند.
                  </p>
                  {relations?.results.length ? (
                    <ul className="customer-relation-list">
                      {relations.results.map((link) => (
                        <li key={link.id}>
                          <div>
                            <button
                              type="button"
                              className="customer-record-link"
                              disabled={blocked}
                              onClick={() => openLinked(link)}
                              aria-label={`مشاهده پرونده ${kind === "people" ? link.company_name : `${link.first_name} ${link.last_name}`.trim()}`}
                            >
                              {kind === "people"
                                ? link.company_name
                                : `${link.first_name} ${link.last_name}`.trim()}
                            </button>
                            <p>
                              {link.title || "سمت ثبت نشده"}
                              {(kind === "people"
                                ? link.company_archived
                                : link.person_archived) && " · بایگانی‌شده"}
                            </p>
                          </div>
                          {can("update") && !record.is_merged && (
                            <div className="session-actions">
                              {!record.archived_at &&
                                !link.company_archived &&
                                !link.person_archived && (
                                  <ActionButton
                                    className="secondary"
                                    disabled={blocked || review || uncertain}
                                    onClick={() => {
                                      void editRelationship(link);
                                    }}
                                    aria-label={`ویرایش سمت ${`${link.first_name} ${link.last_name}`.trim()} در ${link.company_name}`}
                                  >
                                    ویرایش سمت
                                  </ActionButton>
                                )}
                              <ActionButton
                                className="secondary danger"
                                disabled={blocked || review || uncertain}
                                onClick={() => unlink(link)}
                              >
                                حذف ارتباط با{" "}
                                {kind === "people"
                                  ? link.company_name
                                  : `${link.first_name} ${link.last_name}`.trim()}
                              </ActionButton>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p role="status">
                      ارتباطی در محدوده دسترسی شما ثبت نشده است.
                    </p>
                  )}
                  {relations && (
                    <Pager
                      page={relationPage}
                      count={relations.count}
                      previous={!!relations.previous}
                      next={!!relations.next}
                      busy={busy}
                      onPage={setRelationPage}
                    />
                  )}
                  {can("update") && !record.archived_at && !relationship && (
                    <ActionButton
                      className="secondary"
                      disabled={blocked || review || uncertain}
                      onClick={() =>
                        setRelationship({
                          target: null,
                          title: "",
                          baseVersion: record.version,
                        })
                      }
                    >
                      {kind === "people"
                        ? "افزودن شرکت مرتبط"
                        : "افزودن شخص مرتبط"}
                    </ActionButton>
                  )}
                </section>
                {relationship && (
                  <section className="account-panel customer-link-editor">
                    <h2>
                      {kind === "people" ? "ثبت ارتباط شرکت" : "ثبت ارتباط شخص"}
                    </h2>
                    <CustomerPicker
                      organizationId={organizationId}
                      userId={account.data.user.user_id}
                      kind={kind === "people" ? "companies" : "people"}
                      value={relationship.target?.id || ""}
                      currentLabel={
                        relationship.target
                          ? displayName(relationship.target)
                          : ""
                      }
                      label={kind === "people" ? "شرکت مرتبط" : "شخص مرتبط"}
                      disabled={
                        blocked || review || uncertain || !can("update")
                      }
                      onChange={(_value, _label, target) =>
                        setRelationship((previous) =>
                          previous
                            ? { ...previous, target: target || null }
                            : null,
                        )
                      }
                    />
                    <form noValidate aria-busy={busy} onSubmit={linkCompany}>
                      <FormField
                        id="relationship-title"
                        label="سمت در این شرکت"
                        error={fields.title}
                      >
                        <input
                          id="relationship-title"
                          maxLength={160}
                          value={relationship.title}
                          disabled={
                            blocked || review || uncertain || !can("update")
                          }
                          aria-invalid={!!fields.title}
                          aria-describedby="relationship-title-error"
                          onChange={(event) =>
                            setRelationship((previous) =>
                              previous
                                ? { ...previous, title: event.target.value }
                                : null,
                            )
                          }
                        />
                      </FormField>
                      <div className="session-actions">
                        <ActionButton
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => askLeave(() => setRelationship(null))}
                        >
                          انصراف از ارتباط
                        </ActionButton>
                        <ActionButton
                          type="submit"
                          busy={busy}
                          disabled={
                            !relationship.target ||
                            !can("update") ||
                            !!confirmation ||
                            review ||
                            uncertain
                          }
                        >
                          {kind === "people"
                            ? "ذخیره ارتباط شرکت"
                            : "ذخیره ارتباط شخص"}
                        </ActionButton>
                      </div>
                    </form>
                  </section>
                )}
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
