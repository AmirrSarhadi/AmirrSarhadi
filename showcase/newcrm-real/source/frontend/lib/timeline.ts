export type TimelineEvent = {
  id: string;
  source_type: "person" | "company" | "lead" | "opportunity" | "activity";
  record_id: string;
  record_label: string;
  action: string;
  version: number;
  created_at: string;
  details: {
    changed_fields?: string[];
    stage_name?: string;
    previous_stage_name?: string;
    pipeline_name?: string;
    state?: string;
    amount?: string | null;
    reason?: string;
    status?: string;
    from_status?: string;
    due_at?: string;
    remind_at?: string | null;
  };
};

export const timelineSources = {
  person: "شخص",
  company: "شرکت",
  lead: "سرنخ",
  opportunity: "فرصت فروش",
  activity: "فعالیت",
};
const actions: Record<string, string> = {
  attachment_added: "افزودن پیوست",
  created: "ثبت",
  updated: "ویرایش",
  archived: "بایگانی",
  restored: "بازگردانی",
  linked: "ایجاد ارتباط",
  unlinked: "حذف ارتباط",
  link_updated: "تغییر سمت ارتباط",
  merged: "ادغام پرونده‌ها",
  merged_into: "ادغام در پرونده اصلی",
  merge_links_updated: "به‌روزرسانی ارتباط پس از ادغام",
  created_from_lead: "ساخت از سرنخ",
  linked_from_lead: "ارتباط از تبدیل سرنخ",
  converted: "تبدیل سرنخ",
  moved: "تغییر مرحله",
  reopened: "بازگشایی فرصت",
  complete: "تکمیل فعالیت",
  cancel: "لغو فعالیت",
  reopen: "بازگشایی فعالیت",
};
export function timelineAction(action: string) {
  return actions[action] || "تغییر ثبت‌شده";
}
export function timelineLink(event: TimelineEvent) {
  const path =
    event.source_type === "person"
      ? "/customers?kind=people&record="
      : event.source_type === "company"
        ? "/customers?kind=companies&record="
        : event.source_type === "lead"
          ? "/leads?record="
          : event.source_type === "activity"
            ? "/activities?record="
            : "/opportunities?record=";
  return path + event.record_id;
}
const fields: Record<string, string> = {
  attachments: "پیوست‌ها",
  probability: "احتمال موفقیت",
  expected_close_date: "تاریخ بسته‌شدن مورد انتظار",
  description: "توضیحات",
  customer_type: "نوع مشتری",
  primary_company_id: "شرکت اصلی",
  street: "آدرس",
  city: "شهر",
  province: "استان",
  postal_code: "کد پستی",
  priority: "اولویت",
  estimated_amount: "ارزش تقریبی لید",
  first_name: "نام",
  last_name: "نام خانوادگی",
  name: "نام شرکت",
  title: "عنوان یا سمت",
  contact_title: "سمت شخص",
  source: "منبع",
  status: "وضعیت",
  phones: "شماره‌های تماس",
  emails: "ایمیل‌ها",
  tags: "برچسب‌ها",
  legal_name: "نام حقوقی",
  industry: "حوزه فعالیت",
  size: "اندازه شرکت",
  website: "وب‌سایت",
  addresses: "نشانی‌ها",
  owner_id: "مسئول",
  owner: "مسئول",
  archived_at: "بایگانی",
  merged_into: "پرونده اصلی",
  merged_sources: "پرونده‌های ادغام‌شده",
  people: "ارتباط اشخاص",
  companies: "ارتباط شرکت‌ها",
  company_name: "نام شرکت",
  notes: "یادداشت",
  rejection_reason: "دلیل رد",
  converted_person: "شخص حاصل از تبدیل",
  converted_company: "شرکت حاصل از تبدیل",
};
export function timelineFields(changed: string[] = []) {
  return [
    ...new Set(changed.map((field) => fields[field]).filter(Boolean)),
  ].join("، ");
}
export const leadStatuses: Record<string, string> = {
  proposal: "پیشنهاد ارسال‌شده",
  new: "جدید",
  working: "در حال پیگیری",
  qualified: "واجد شرایط",
  rejected: "ردشده",
  converted: "تبدیل‌شده",
};
