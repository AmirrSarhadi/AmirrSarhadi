import { api, type ApiOptions } from "./api";
import {
  parseTehranDateTime,
  tehranInput,
  TehranInputError,
} from "./persian-time";
export const activityKinds = { call: "تماس", meeting: "جلسه", task: "کار" };
export const activityStatuses = {
  planned: "برنامه‌ریزی‌شده",
  in_progress: "در حال انجام",
  done: "انجام‌شده",
  cancelled: "لغوشده",
};
export const targetKinds = {
  none: "بدون ارتباط",
  person: "شخص",
  company: "شرکت",
  lead: "سرنخ",
  opportunity: "فرصت فروش",
};
export type TargetKind = keyof typeof targetKinds;
export type Activity = {
  id: string;
  organization_id: string;
  owner_id: number;
  owner_label: string;
  version: number;
  title: string;
  kind: keyof typeof activityKinds;
  notes: string;
  status: keyof typeof activityStatuses;
  due_at: string;
  remind_at: string | null;
  completed_at: string | null;
  outcome: string;
  cancellation_reason: string;
  target_type: TargetKind;
  target_id: string | null;
  target_label: string;
  overdue: boolean;
  reminder_state: "pending" | "sent" | "cancelled" | "failed" | null;
  priority: "low" | "normal" | "high";
  progress: number | null;
  started_at: string | null;
  updated_at: string;
  created_at: string;
};
export type ActivityEvent = {
  id: number;
  action: string;
  version: number;
  status: string;
  due_at: string;
  remind_at: string | null;
  reason: string;
  created_at: string;
};
export type ActivityNotice = {
  id: string;
  activity_id: string;
  title: string;
  kind: keyof typeof activityKinds;
  due_at: string;
  created_at: string;
  read_at: string | null;
};
export type ActivityDraft = {
  title: string;
  priority: string;
  status: string;
  progress: string;
  kind: string;
  notes: string;
  due_date: string;
  due_time: string;
  reminder: string;
  remind_date: string;
  remind_time: string;
};
export const blankActivity = (): ActivityDraft => ({
  title: "",
  priority: "normal",
  status: "planned",
  progress: "",
  kind: "call",
  notes: "",
  due_date: "",
  due_time: "",
  reminder: "none",
  remind_date: "",
  remind_time: "",
});
export function activityDraft(record: Activity): ActivityDraft {
  const due = tehranInput(record.due_at),
    remind = record.remind_at
      ? tehranInput(record.remind_at)
      : { date: "", time: "" };
  return {
    title: record.title,
    priority: record.priority,
    status: record.status,
    progress: record.progress === null ? "" : String(record.progress),
    kind: record.kind,
    notes: record.notes,
    due_date: due.date,
    due_time: due.time,
    reminder: record.remind_at ? "yes" : "none",
    remind_date: remind.date,
    remind_time: remind.time,
  };
}
export function activityInput(value: ActivityDraft, base?: Activity | null) {
  const errors: Record<string, string> = {};
  const body: Record<string, unknown> = {
    title: value.title.trim(),
    priority: value.priority,
    progress:
      value.progress.trim() === ""
        ? null
        : Number(
            value.progress
              .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
              .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)),
          ),
    kind: value.kind,
    notes: value.notes,
  };
  if (!base) body.status = value.status;
  if (
    body.progress !== null &&
    (!Number.isInteger(body.progress) ||
      Number(body.progress) < 0 ||
      Number(body.progress) > 100)
  )
    errors.progress = "پیشرفت باید عدد صحیح بین ۰ تا ۱۰۰ باشد.";
  if (!body.title) errors.title = "عنوان فعالیت را وارد کنید.";
  const baseline = base ? activityDraft(base) : null;
  try {
    body.due_at =
      base &&
      baseline &&
      baseline.due_date === value.due_date &&
      baseline.due_time === value.due_time
        ? base.due_at
        : parseTehranDateTime(value.due_date, value.due_time);
  } catch (e) {
    errors[
      e instanceof TehranInputError && e.part === "time"
        ? "due_time"
        : "due_date"
    ] = (e as Error).message;
  }
  try {
    body.remind_at =
      value.reminder === "none"
        ? null
        : base &&
            baseline &&
            baseline.reminder === value.reminder &&
            baseline.remind_date === value.remind_date &&
            baseline.remind_time === value.remind_time
          ? base.remind_at
          : parseTehranDateTime(value.remind_date, value.remind_time);
  } catch (e) {
    errors[
      e instanceof TehranInputError && e.part === "time"
        ? "remind_time"
        : "remind_date"
    ] = (e as Error).message;
  }
  if (
    typeof body.due_at === "string" &&
    typeof body.remind_at === "string" &&
    Date.parse(body.remind_at) > Date.parse(body.due_at)
  )
    errors.remind_date = "زمان یادآوری باید برابر یا پیش از موعد باشد.";
  return { body, errors };
}
export function activityApi<T>(
  org: string,
  user: number,
  path: string,
  options: ApiOptions = {},
) {
  return api<T>(path, {
    ...options,
    namespace: "activities",
    organizationId: org,
    expectedUserId: user,
  });
}

export const activityPriorities = { low: "کم", normal: "متوسط", high: "بالا" };
export const activityFileFields = [
  { name: "title", label: "عنوان فعالیت" },
  { name: "kind", label: "نوع فعالیت" },
  { name: "notes", label: "یادداشت فعالیت" },
  { name: "priority", label: "اولویت" },
  { name: "progress", label: "پیشرفت (درصد)" },
  { name: "status", label: "وضعیت" },
  { name: "due_at", label: "سررسید" },
  { name: "remind_at", label: "یادآوری" },
  { name: "target_type", label: "نوع ارتباط" },
  { name: "target_id", label: "شناسه پرونده مرتبط" },
];
