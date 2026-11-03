"use client";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Upload, File, Download } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { customerFileRequest, downloadBlob } from "../lib/customer-files";
import type { Kind, Page } from "../lib/customers";
import { formatAccountDate } from "../lib/format";
import { ActionButton, Feedback, LoadFailure } from "./account-ui";
import { Pager } from "./customer-controls";
export type AttachmentDraft = {
  recordId: string;
  file: globalThis.File;
  key: string;
  attempt?: boolean;
};
type Item = { id: string; name: string; size: number; created_at: string };
export function CustomerAttachments({
  kind,
  customerId,
  organizationId,
  userId,
  editable,
  draft,
  onChange,
  onPendingChange,
}: {
  kind: Kind | "sales/orders" | "leads";
  customerId: string;
  organizationId: string;
  userId: number;
  editable: boolean;
  draft: AttachmentDraft | null;
  onChange: (value: AttachmentDraft | null) => void;
  onPendingChange: (value: boolean) => void;
}) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [result, setResult] = useState<{ key: string; data: Page<Item> } | null>(
      null,
    ),
    [readError, setReadError] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null),
    pending = useRef(false);
  const stamp = `${organizationId}:${userId}:${kind}:${customerId}:${page}:${revision}`;
  useEffect(() => {
    const ctrl = new AbortController();
    setResult(null);
    setReadError("");
    api<Page<Item>>(
      `${kind === "sales/orders" ? "orders/" : kind === "leads" ? "" : kind + "/"}${customerId}/attachments/?page=${page}`,
      {
        namespace:
          kind === "sales/orders"
            ? "sales"
            : kind === "leads"
              ? "leads"
              : "customers",
        organizationId,
        expectedUserId: userId,
        signal: ctrl.signal,
      },
    )
      .then((data) => {
        if (!ctrl.signal.aborted) setResult({ key: stamp, data });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setReadError(
            e instanceof Error ? e.message : "پیوست‌ها دریافت نشدند.",
          );
      });
    return () => ctrl.abort();
  }, [kind, customerId, organizationId, userId, page, revision, stamp]);
  useEffect(
    () => () => {
      controller.current?.abort();
      onPendingChange(false);
    },
    [onPendingChange],
  );
  async function upload() {
    if (!draft || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    onPendingChange(true);
    onChange({ ...draft, attempt: true });
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      await customerFileRequest(
        `${kind}/${customerId}/attachments/`,
        organizationId,
        userId,
        { file: draft.file, key: draft.key, signal: ctrl.signal },
      );
      if (!ctrl.signal.aborted) {
        onChange(null);
        setPage(1);
        setRevision((v) => v + 1);
        if (fileInput.current) fileInput.current.value = "";
      }
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setError(e instanceof Error ? e.message : "بارگذاری انجام نشد.");
        if (
          e instanceof ApiError &&
          [400, 403, 404, 409, 422].includes(e.status)
        )
          onChange({ ...draft, attempt: false });
      }
    } finally {
      pending.current = false;
      setBusy(false);
      onPendingChange(false);
    }
  }
  async function download(item: Item) {
    if (pending.current) return;
    setBusy(true);
    pending.current = true;
    setError("");
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const response = await customerFileRequest(
        `${kind}/${customerId}/attachments/${item.id}/download/`,
        organizationId,
        userId,
        { signal: ctrl.signal },
      );
      const blob = await response.blob();
      if (!ctrl.signal.aborted) downloadBlob(blob, item.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت فایل انجام نشد.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="account-panel customer-ref-panel"
      aria-labelledby="customer-files-title"
    >
      <div className="customer-ref-panel-heading">
        <h2 id="customer-files-title">
          <Paperclip size={19} aria-hidden="true" />
          پیوست‌ها{" "}
          {result?.key === stamp && (
            <span className="record-status">
              {new Intl.NumberFormat("fa-IR").format(result.data.count)}
            </span>
          )}
        </h2>
        {editable && (
          <ActionButton
            className="secondary"
            disabled={busy || !!draft?.attempt}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            آپلود فایل
          </ActionButton>
        )}
      </div>
      <div className="customer-ref-panel-body">
        {editable && (
          <>
            <input
              ref={fileInput}
              type="file"
              hidden
              aria-label={
                kind === "sales/orders"
                  ? "انتخاب پیوست فروش"
                  : kind === "leads"
                    ? "انتخاب پیوست لید"
                    : "انتخاب پیوست مشتری"
              }
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
              disabled={busy || !!draft?.attempt}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  setError("حداکثر حجم فایل ۱۰ مگابایت است.");
                  return;
                }
                setError("");
                onChange({
                  recordId: customerId,
                  file,
                  key: crypto.randomUUID(),
                });
              }}
            />
            <p className="crm-context-note">
              PDF، تصویر، متن یا Excel؛ حداکثر ۱۰ مگابایت. فایل فقط برای افراد
              مجاز این پرونده قابل دریافت است.
            </p>
          </>
        )}
        {draft && !editable && (
          <p role="status">
            مجوز بارگذاری در دسترسی فعلی وجود ندارد؛ فایل انتخابی تا انصراف از
            پیش‌نویس حفظ می‌شود.
          </p>
        )}
        {draft && editable && (
          <div className="customer-file-draft">
            <p>{draft.file.name}</p>
            {draft.attempt && (
              <p>
                نتیجه بارگذاری را با همان فایل و شناسه بررسی کنید؛ ارسال دوباره
                پیوست دوم نمی‌سازد.
              </p>
            )}
            <ActionButton busy={busy} onClick={() => void upload()}>
              {draft.attempt ? "بررسی و تکمیل بارگذاری" : "بارگذاری پیوست"}
            </ActionButton>
            {!draft.attempt && (
              <ActionButton
                className="secondary"
                disabled={busy}
                onClick={() => {
                  onChange(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                انصراف از فایل
              </ActionButton>
            )}
          </div>
        )}
        <Feedback message={error} />
        {readError ? (
          <LoadFailure
            title="پیوست‌ها دریافت نشدند"
            message={readError}
            retry={() => setRevision((v) => v + 1)}
          />
        ) : !result || result.key !== stamp ? (
          <p role="status">در حال دریافت پیوست‌ها…</p>
        ) : !result.data.count ? (
          <div className="customer-ref-empty">
            <File size={36} aria-hidden="true" />
            <p>هیچ فایلی پیوست نشده است.</p>
          </div>
        ) : (
          <>
            <ul className="customer-attachment-list">
              {result.data.results.map((item) => (
                <li key={item.id}>
                  <div className="customer-attachment-entry">
                    <span className="customer-file-symbol">
                      <File size={22} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>
                        <bdi>{item.name}</bdi>
                      </strong>
                      <p>
                        {new Intl.NumberFormat("fa-IR").format(item.size)} بایت
                        · {formatAccountDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <ActionButton
                    className="secondary"
                    disabled={busy}
                    onClick={() => void download(item)}
                    aria-label={`دانلود ${item.name}`}
                  >
                    <Download size={16} aria-hidden="true" />
                    دانلود
                  </ActionButton>
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              count={result.data.count}
              next={!!result.data.next}
              previous={!!result.data.previous}
              onPage={setPage}
            />
          </>
        )}
      </div>
    </section>
  );
}
