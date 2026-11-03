import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useId } from "react";
import { ApiError } from "../api";
import { formatDecimal } from "./format";

export function ActionButton({ busy = false, intent = "primary", children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; intent?: "primary" | "secondary" | "danger" | "text" }) {
  return <button {...props} type={props.type ?? "button"} className={`button button--${intent} ui-action`} disabled={disabled || busy} aria-busy={busy || undefined}>
    <span className={busy ? "ui-action__label ui-action__label--busy" : "ui-action__label"}>{children}</span>
    {busy && <span className="ui-spinner ui-action__spinner" aria-hidden="true" />}
  </button>;
}

type FieldProps = { label: string; error?: string; hint?: string };
export function TextField({ label, error, hint, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId(); const id = props.id ?? generated;
  return <div className="ui-field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
    <span className="ui-field__help" id={error ? `${id}-error` : `${id}-hint`}>{error || hint || "\u00a0"}</span>
  </div>;
}
export function SelectField({ label, error, hint, children, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return <div className="ui-field"><label htmlFor={id}>{label}</label><select {...props} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}>{children}</select>
    <span className="ui-field__help" id={error ? `${id}-error` : `${id}-hint`}>{error || hint || "\u00a0"}</span>
  </div>;
}
export function Notice({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "error" | "info" }) {
  return <div className={`ui-notice ui-notice--${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}
export function ResourceState({ status, error, empty = false, emptyTitle, children, retry }: { status: "loading" | "error" | "ready"; error?: unknown; empty?: boolean; emptyTitle?: string; children: ReactNode; retry: () => void }) {
  if (status === "loading") return <div className="ui-data-state" role="status" aria-busy="true"><span className="ui-spinner" aria-hidden="true" />در حال دریافت اطلاعات…</div>;
  if (status === "error") return <div className="ui-data-state"><Notice tone="error">{error instanceof ApiError && (error.status === 401 || error.status === 403) ? "نشست یا دسترسی شما معتبر نیست؛ دوباره وارد شوید یا از مالک کافه کمک بگیرید." : "دریافت اطلاعات انجام نشد. اتصال را بررسی و دوباره تلاش کنید."}</Notice><ActionButton intent="secondary" onClick={retry}>تلاش دوباره</ActionButton></div>;
  if (empty) return <div className="ui-data-state"><h3>{emptyTitle}</h3><p>پس از ثبت اطلاعات، نتیجه در این بخش نمایش داده می‌شود.</p></div>;
  return <>{children}</>;
}
export function Pagination({ count, page, size = 25, busy, onPage }: { count: number; page: number; size?: number; busy: boolean; onPage: (page: number) => void }) {
  const last = Math.max(1, Math.ceil(count / size));
  return <nav className="ui-pagination" aria-label="صفحه‌بندی"><span>{formatDecimal(count)} مورد · صفحه {formatDecimal(page)} از {formatDecimal(last)}</span><div>
    <ActionButton intent="secondary" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>قبلی</ActionButton>
    <ActionButton intent="secondary" disabled={busy || page >= last} onClick={() => onPage(page + 1)}>بعدی</ActionButton>
  </div></nav>;
}
