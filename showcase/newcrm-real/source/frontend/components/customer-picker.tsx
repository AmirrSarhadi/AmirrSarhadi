"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import {
  displayName,
  type Customer,
  type Owner,
  type Page,
} from "../lib/customers";
import { Feedback } from "./account-ui";
import { FormField, Pager, SearchBox } from "./customer-controls";

type Option<T> = { value: string; label: string; record?: T };
export function CustomerPicker<
  T extends { id: string; version: number } = Customer,
>({
  organizationId,
  namespace = "customers",
  compact = false,
  idSuffix = "",
  userId,
  kind,
  value,
  label,
  onChange,
  disabled = false,
  currentLabel = "",
  defaultLabel,
  error: fieldError,
  isOptionDisabled,
}: {
  compact?: boolean;
  idSuffix?: string;
  organizationId: string;
  namespace?: "customers" | "leads" | "sales" | "activities" | "products";
  userId: number;
  kind:
    | "owners"
    | "companies"
    | "people"
    | "leads"
    | "opportunities"
    | "products";
  value: string;
  label: string;
  onChange: (value: string, label: string, record?: T) => void;
  disabled?: boolean;
  currentLabel?: string;
  defaultLabel?: string;
  error?: string;
  isOptionDisabled?: (record: T) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<Option<T>[]>([]);
  const [data, setData] = useState<{
    count: number;
    next: boolean;
    previous: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    api<Page<Owner> | Page<T>>(
      `${kind === "leads" || kind === "products" ? "" : kind + "/"}?q=${encodeURIComponent(search)}&page=${page}`,
      {
        signal: ctrl.signal,
        expectedUserId: userId,
        namespace,
        organizationId,
      },
    )
      .then((result) => {
        if (ctrl.signal.aborted) return;
        const mapped: Option<T>[] = result.results.map((item) => {
          if (kind === "owners") {
            const owner = item as Owner;
            return {
              value: String(owner.id),
              label: owner.label + (owner.is_self ? " (خودم)" : ""),
            };
          }
          const record = item as T;
          const label =
            kind === "products"
              ? String((record as T & { name: string }).name) +
                " — " +
                String((record as T & { sku: string }).sku)
              : kind === "leads" || kind === "opportunities"
                ? String((record as T & { title: string }).title)
                : displayName(record as unknown as Customer);
          return { value: record.id, label, record };
        });
        setOptions(mapped);
        setData({
          count: result.count,
          next: !!result.next,
          previous: !!result.previous,
        });
      })
      .catch((failure) => {
        if (!ctrl.signal.aborted) {
          if (
            failure instanceof ApiError &&
            failure.status === 404 &&
            page > 1
          ) {
            setPage(1);
            return;
          }
          setError(
            failure instanceof Error
              ? failure.message
              : "دریافت فهرست انجام نشد.",
          );
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [organizationId, namespace, userId, kind, search, page, revision]);
  const id = `pick-${kind}${idSuffix ? "-" + idSuffix : ""}`;
  const searchControl = (
    <SearchBox
      embedded
      id={`${id}-search`}
      label={
        kind === "products"
          ? "جست‌وجوی محصول"
          : kind === "owners"
            ? "جست‌وجوی مسئول"
            : kind === "companies"
              ? "جست‌وجوی شرکت مرتبط"
              : kind === "leads"
                ? "جست‌وجوی سرنخ مرتبط"
                : kind === "opportunities"
                  ? "جست‌وجوی فرصت مرتبط"
                  : "جست‌وجوی شخص مرتبط"
      }
      value={query}
      onChange={setQuery}
      onCommit={(text) => {
        setSearch(text);
        setPage(1);
      }}
      disabled={disabled}
    />
  );
  return (
    <div
      className={`customer-picker ${compact ? "customer-picker-compact" : ""}`}
    >
      {compact ? (
        <details className="customer-picker-search">
          <summary>جست‌وجوی فهرست</summary>
          {searchControl}
        </details>
      ) : (
        searchControl
      )}
      <FormField
        id={id}
        label={label}
        error={fieldError}
        hint={
          kind === "owners"
            ? "فقط اعضای مجاز و فعال نمایش داده می‌شوند."
            : "فقط پرونده‌های بایگانی‌نشده در محدوده دسترسی شما نمایش داده می‌شوند."
        }
      >
        <select
          id={id}
          value={value}
          disabled={disabled || loading || !!error}
          aria-invalid={!!fieldError}
          aria-describedby={`${id}-hint ${id}-error`}
          onChange={(event) => {
            const option = options.find(
              (item) => item.value === event.target.value,
            );
            onChange(event.target.value, option?.label || "", option?.record);
          }}
        >
          <option value="">
            {defaultLabel ||
              (kind === "products"
                ? "انتخاب محصول (اختیاری)"
                : kind === "owners"
                  ? "خودم (پیش‌فرض)"
                  : kind === "companies"
                    ? "انتخاب شرکت"
                    : kind === "leads"
                      ? "انتخاب سرنخ"
                      : kind === "opportunities"
                        ? "انتخاب فرصت"
                        : "انتخاب شخص")}
          </option>
          {value && !options.some((item) => item.value === value) && (
            <option value={value}>{currentLabel || "انتخاب فعلی"}</option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={!!option.record && !!isOptionDisabled?.(option.record)}
            >
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      {loading && <p role="status">در حال دریافت فهرست…</p>}
      {error && (
        <>
          <Feedback message={error} />
          <button
            type="button"
            className="customer-link"
            disabled={disabled}
            onClick={() => setRevision((value) => value + 1)}
          >
            دریافت دوباره فهرست
          </button>
        </>
      )}
      {!loading && !error && data && (
        <>
          {!data.count && (
            <p role="status">موردی پیدا نشد؛ جست‌وجو را تغییر دهید.</p>
          )}
          {(!compact || data.next || data.previous) && (
            <Pager
              page={page}
              count={data.count}
              previous={data.previous}
              next={data.next}
              busy={disabled}
              onPage={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
