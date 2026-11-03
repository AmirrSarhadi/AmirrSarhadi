import {
  parseToman,
  parsePersianDate,
  persianDate,
  latinDigits,
} from "./sales-entry";
import type { FieldSpec } from "./fields";
import type { Customer } from "./customers";
export type Lead = Omit<Customer, "status"> & {
  probability: number | null;
  expected_close_date: string | null;
  description: string;
  priority: string;
  estimated_amount: string | null;
  title: string;
  first_name: string;
  last_name: string;
  company_name: string;
  contact_title: string;
  source: string;
  notes: string;
  status: string;
  rejection_reason: string;
  converted_at: string | null;
  converted_person_id: string | null;
  converted_company_id: string | null;
  converted_opportunity_id?: string | null;
};
export const statuses = [
  { value: "new", label: "جدید" },
  { value: "working", label: "در حال پیگیری" },
  { value: "qualified", label: "واجد شرایط" },
  { value: "proposal", label: "پیشنهاد ارسال‌شده" },
  { value: "rejected", label: "ردشده" },
];
export const statusLabel = (status: string) =>
  status === "converted"
    ? "تبدیل‌شده"
    : statuses.find((item) => item.value === status)?.label || "وضعیت نامشخص";
export const leadFields: FieldSpec[] = [
  {
    name: "probability",
    label: "احتمال موفقیت (%)",
    direction: "ltr",
    length: 3,
  },
  {
    name: "expected_close_date",
    label: "تاریخ بسته‌شدن مورد انتظار",
    direction: "ltr",
    hint: "تاریخ شمسی؛ نمونه: ۱۴۰۵/۰۸/۱۵",
  },
  { name: "description", label: "توضیحات لید", lines: true, length: 4000 },
  {
    name: "priority",
    label: "اولویت لید",
    options: [
      { value: "low", label: "پایین" },
      { value: "normal", label: "عادی" },
      { value: "high", label: "بالا" },
    ],
  },
  {
    name: "estimated_amount",
    label: "ارزش تقریبی لید (تومان)",
    direction: "ltr",
    length: 30,
  },
  { name: "title", label: "عنوان سرنخ", length: 160 },
  { name: "source", label: "منبع سرنخ", length: 160 },
  { name: "first_name", label: "نام شخص", length: 100 },
  { name: "last_name", label: "نام خانوادگی شخص", length: 100 },
  { name: "contact_title", label: "سمت شخص", length: 160 },
  { name: "company_name", label: "نام شرکت", length: 160 },
  {
    name: "phones",
    label: "شماره‌های تماس",
    lines: true,
    list: true,
    direction: "ltr",
    hint: "هر شماره در یک سطر؛ حداکثر ۱۰ شماره با کد کشور یا قالب ۱۱رقمی ایران.",
  },
  {
    name: "emails",
    label: "ایمیل‌ها",
    lines: true,
    list: true,
    direction: "ltr",
    hint: "هر ایمیل در یک سطر؛ حداکثر ۱۰ ایمیل.",
  },
  {
    name: "tags",
    label: "برچسب‌ها",
    lines: true,
    list: true,
    hint: "هر برچسب در یک سطر؛ حداکثر ۲۰ برچسب تا ۴۰ نویسه.",
  },
  {
    name: "status",
    label: "وضعیت سرنخ",
    options: [
      ...statuses,
      { value: "converted", label: "تبدیل‌شده", disabled: true },
    ],
  },
  {
    name: "rejection_reason",
    label: "دلیل رد",
    length: 500,
    hint: "برای وضعیت ردشده الزامی است؛ پس از بازگشایی، آخرین دلیل تا اصلاح صریح شما حفظ می‌شود.",
  },
  { name: "notes", label: "یادداشت سرنخ", lines: true, length: 2000 },
];
export function leadDraft(record?: Lead): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of leadFields) {
    const value = record?.[field.name as keyof Lead];
    result[field.name] = Array.isArray(value)
      ? value.join("\n")
      : String(value ?? "");
  }
  result.expected_close_date = persianDate(record?.expected_close_date || null);
  result.priority = record?.priority || "normal";
  result.status = record?.status || "new";
  result.contact_phone = record?.phones?.[0] || "";
  result.contact_email = record?.emails?.[0] || "";
  result.owner_id = record ? String(record.owner_id) : "";
  result.owner_label = record?.owner_label || "";
  return result;
}
export class LeadInputError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message);
  }
}
export function leadPayload(
  draft: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of leadFields)
    result[field.name] = field.list
      ? draft[field.name]
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)
      : draft[field.name].trim();
  result.probability =
    draft.probability.trim() === ""
      ? null
      : Number(latinDigits(draft.probability.trim()));
  if (
    result.probability !== null &&
    (!/^\d{1,3}$/.test(latinDigits(draft.probability.trim())) ||
      Number(result.probability) > 100)
  )
    throw new LeadInputError(
      "probability",
      "احتمال موفقیت باید عددی بین صفر تا صد باشد.",
    );
  try {
    result.expected_close_date = parsePersianDate(draft.expected_close_date);
  } catch (e) {
    throw new LeadInputError(
      "expected_close_date",
      e instanceof Error ? e.message : "تاریخ معتبر نیست.",
    );
  }
  result.estimated_amount = parseToman(draft.estimated_amount || "");
  if (draft.owner_id) result.owner_id = Number(draft.owner_id);
  return result;
}
