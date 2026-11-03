"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { X } from "lucide-react";
import { ActionButton } from "./account-ui";
import { number } from "../lib/customers";

export function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="account-field customer-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <p className="field-error" id={`${id}-error`}>
        {error || "\u00a0"}
      </p>
    </div>
  );
}
export function AutoTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.min(420, Math.max(130, ref.current.scrollHeight))}px`;
    }
  }, [props.value]);
  return (
    <textarea
      {...props}
      ref={ref}
      className="resize-none"
      style={{ resize: "none" }}
    />
  );
}
export function SearchBox({
  id,
  label,
  value,
  onChange,
  onCommit,
  disabled = false,
  embedded = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  disabled?: boolean;
  embedded?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = useRef(onCommit);
  commit.current = onCommit;
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!composing.current)
      timer.current = setTimeout(() => commit.current?.(latest.current), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);
  const SearchContainer = embedded ? "div" : "form";
  return (
    <SearchContainer
      {...(!embedded ? { noValidate: true } : {})}
      role="search"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        if (!composing.current) {
          if (timer.current) clearTimeout(timer.current);
          commit.current?.(value);
        }
      }}
      onKeyDown={(event) => {
        if (
          embedded &&
          event.key === "Enter" &&
          event.target instanceof HTMLInputElement
        ) {
          event.preventDefault();
          if (!composing.current) {
            if (timer.current) clearTimeout(timer.current);
            commit.current?.(value);
          }
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="customer-search">
        <input
          id={id}
          ref={ref}
          value={value}
          maxLength={100}
          disabled={disabled}
          autoComplete="off"
          onCompositionStart={() => {
            composing.current = true;
            if (timer.current) clearTimeout(timer.current);
          }}
          onCompositionEnd={() => {
            composing.current = false;
            timer.current = setTimeout(
              () => commit.current?.(latest.current),
              300,
            );
          }}
          onChange={(event) => onChange(event.target.value)}
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            aria-label={`پاک کردن ${label}`}
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              latest.current = "";
              onChange("");
              commit.current?.("");
              ref.current?.focus();
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </SearchContainer>
  );
}
export function Pager({
  page,
  count,
  previous,
  next,
  busy,
  onPage,
}: {
  page: number;
  count: number;
  previous: boolean;
  next: boolean;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="session-pagination" aria-label="صفحه‌بندی فهرست">
      <ActionButton
        className="secondary"
        disabled={!previous || busy}
        onClick={() => onPage(page - 1)}
      >
        صفحه قبل
      </ActionButton>
      <span>
        صفحه {number(page)} · {number(count)} مورد
      </span>
      <ActionButton
        className="secondary"
        disabled={!next || busy}
        onClick={() => onPage(page + 1)}
      >
        صفحه بعد
      </ActionButton>
    </nav>
  );
}
export function ConfirmPanel({
  title,
  description,
  busy,
  onCancel,
  onConfirm,
  label,
  danger = false,
  children,
}: {
  title: string;
  description: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  label: string;
  danger?: boolean;
  children?: ReactNode;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
  }, []);
  return (
    <section
      className={`account-panel customer-confirm${danger ? " customer-confirm-danger" : ""}`}
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
      <div className="session-actions">
        <ActionButton
          ref={cancel}
          className="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          انصراف
        </ActionButton>
        <ActionButton
          className={danger ? "danger" : ""}
          busy={busy}
          onClick={onConfirm}
        >
          {label}
        </ActionButton>
      </div>
    </section>
  );
}
