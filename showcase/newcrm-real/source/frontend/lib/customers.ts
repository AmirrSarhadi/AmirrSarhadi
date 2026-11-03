import { api, type ApiOptions } from "./api";

export type Kind = "people" | "companies";
export type Customer = {
  customer_code?: string | null;
  customer_type?: "individual" | "legal";
  primary_company_id?: string | null;
  primary_company_label?: string | null;
  has_primary_company?: boolean;
  company_label?: string | null;
  created_at?: string;
  created_by_label?: string;
  activity_count?: number;
  industry?: string;
  street?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  id: string;
  organization_id: string;
  owner_id: number;
  owner_label: string;
  version: number;
  archived_at: string | null;
  is_merged?: boolean;
  merged_into_id?: string | null;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  source?: string;
  status?: string;
  phones?: string[];
  emails?: string[];
  tags: string[];
  registration_number?: string;
  legal_name?: string;
  size?: string;
  addresses?: string[];
};
export type Page<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
export type Owner = { id: number; label: string; is_self: boolean };
export type Relation = {
  id: string;
  person_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  title: string;
  person_version: number;
  company_version: number;
  person_archived: boolean;
  company_archived: boolean;
};
export type Draft = Record<string, string>;
export type DuplicatePreview = {
  results: {
    id: string;
    label: string;
    archived: boolean;
    reasons: ("full_name" | "phone" | "email" | "company_name")[];
  }[];
  has_more: boolean;
};
export const duplicateReasons = {
  product_sku: "کد محصول یکسان",
  order_number: "شماره فروش یکسان",
  activity_title: "عنوان فعالیت یکسان",
  lead_title: "عنوان لید مشترک",
  full_name: "نام کامل یکسان",
  phone: "شماره تماس مشترک",
  email: "ایمیل مشترک",
  company_name: "نام تجاری یا حقوقی یکسان",
};
import type { FieldSpec } from "./fields";
export type { FieldSpec } from "./fields";
export const fieldSpecs: Record<Kind, FieldSpec[]> = {
  people: [
    {
      name: "customer_type",
      label: "نوع مشتری",
      options: [
        { value: "individual", label: "حقیقی" },
        { value: "legal", label: "حقوقی" },
      ],
    },
    { name: "industry", label: "صنعت", length: 120 },
    { name: "street", label: "آدرس", lines: true, length: 1000 },
    { name: "city", label: "شهر", length: 100 },
    { name: "province", label: "استان", length: 100 },
    { name: "postal_code", label: "کد پستی", length: 10, direction: "ltr" },
    {
      name: "website",
      label: "وب‌سایت",
      length: 500,
      type: "url",
      direction: "ltr",
    },
    { name: "notes", label: "یادداشت‌ها", lines: true, length: 4000 },
    { name: "first_name", label: "نام", length: 100 },
    { name: "last_name", label: "نام خانوادگی", length: 100 },
    { name: "title", label: "سمت", length: 160 },
    { name: "source", label: "منبع آشنایی", length: 160 },
    {
      name: "phones",
      label: "شماره‌های تماس",
      lines: true,
      direction: "ltr",
      hint: "هر شماره در یک سطر؛ حداکثر ۱۰ شماره با کد کشور یا قالب ۱۱رقمی ایران.",
    },
    {
      name: "emails",
      label: "ایمیل‌ها",
      lines: true,
      direction: "ltr",
      hint: "هر ایمیل در یک سطر؛ حداکثر ۱۰ ایمیل.",
    },
    {
      name: "tags",
      label: "برچسب‌ها",
      lines: true,
      hint: "هر برچسب در یک سطر؛ حداکثر ۲۰ برچسب، هرکدام تا ۴۰ نویسه.",
    },
  ],
  companies: [
    { name: "name", label: "نام تجاری", length: 160 },
    {
      name: "registration_number",
      label: "شماره ثبت",
      length: 80,
      direction: "ltr",
    },
    { name: "phones", label: "شماره‌های تماس", lines: true, direction: "ltr" },
    { name: "emails", label: "ایمیل‌ها", lines: true, direction: "ltr" },
    { name: "legal_name", label: "نام حقوقی", length: 200 },
    { name: "industry", label: "صنعت", length: 120 },
    { name: "size", label: "اندازه شرکت", length: 80 },
    {
      name: "website",
      label: "وب‌سایت",
      length: 500,
      direction: "ltr",
      type: "url",
    },
    {
      name: "addresses",
      label: "نشانی‌ها",
      lines: true,
      hint: "هر نشانی در یک سطر؛ حداکثر ۱۰ نشانی، هرکدام تا ۵۰۰ نویسه.",
    },
    {
      name: "tags",
      label: "برچسب‌ها",
      lines: true,
      hint: "هر برچسب در یک سطر؛ حداکثر ۲۰ برچسب، هرکدام تا ۴۰ نویسه.",
    },
  ],
};
export const labels = {
  people: { plural: "مشتریان", single: "مشتری" },
  companies: { plural: "شرکت‌ها", single: "شرکت" },
};
export const displayName = (record: Customer) =>
  record.name || `${record.first_name || ""} ${record.last_name || ""}`.trim();
export const number = (value: number) =>
  new Intl.NumberFormat("fa-IR").format(value);
export function toDraft(kind: Kind, record?: Customer): Draft {
  const result: Draft = {};
  for (const field of fieldSpecs[kind]) {
    const value = record?.[field.name as keyof Customer];
    result[field.name] = Array.isArray(value)
      ? value.join("\n")
      : String(value ?? "");
  }
  if (kind === "people") {
    result.customer_type = record?.customer_type || "individual";
    result.primary_company_id = record?.primary_company_id || "";
    result.primary_company_label = record?.primary_company_label || "";
    result.primary_company_locked =
      record?.has_primary_company && !record.primary_company_id ? "1" : "";
    const values = record?.phones || [];
    result.contact_mobile =
      values.find((value) => /^(?:\+989|09|00989)/.test(value)) || "";
    result.contact_landline =
      values.find((value) => !/^(?:\+989|09|00989)/.test(value)) || "";
    result.contact_email = record?.emails?.[0] || "";
  }
  result.status = record?.status || "active";
  result.owner_id = record ? String(record.owner_id) : "";
  result.owner_label = record?.owner_label || "";
  return result;
}
export function payload(kind: Kind, draft: Draft): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fieldSpecs[kind])
    result[field.name] = ["phones", "emails", "tags", "addresses"].includes(
      field.name,
    )
      ? draft[field.name]
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)
      : draft[field.name].trim();
  if (kind === "people") {
    result.status = draft.status;
    if (!draft.primary_company_locked || draft.primary_company_id)
      result.primary_company_id = draft.primary_company_id || null;
  }
  if (draft.owner_id) result.owner_id = Number(draft.owner_id);
  return result;
}
export function customerApi<T>(
  organizationId: string,
  path: string,
  options: ApiOptions = {},
) {
  return api<T>(path, { ...options, namespace: "customers", organizationId });
}
