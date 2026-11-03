"use client";
import type { ActivityDraft } from "../lib/activities";
import { tehranInput } from "../lib/persian-time";
import { activityKinds, activityPriorities } from "../lib/activities";
import { FormField } from "./customer-controls";
import { RecordFields } from "./record-fields";

export function ActivityFields({
  value,
  onChange,
  errors,
  disabled,
  editing = false,
}: {
  value: ActivityDraft;
  onChange: (value: ActivityDraft) => void;
  errors: Record<string, string>;
  disabled: boolean;
  editing?: boolean;
}) {
  const field = (name: keyof ActivityDraft, text: string) =>
    onChange({ ...value, [name]: text });
  return (
    <>
      <h2>اطلاعات اصلی فعالیت</h2>
      <RecordFields
        prefix="activity"
        fields={[
          { name: "title", label: "عنوان فعالیت", length: 200 },
          {
            name: "kind",
            label: "نوع فعالیت",
            options: Object.entries(activityKinds).map(([value, label]) => ({
              value,
              label,
            })),
          },
          { name: "notes", label: "یادداشت فعالیت", lines: true, length: 4000 },
        ]}
        draft={value}
        errors={errors}
        disabled={disabled}
        onChange={(name, text) => field(name as keyof ActivityDraft, text)}
      />
      <h2>وضعیت و اولویت</h2>
      <RecordFields
        prefix="activity"
        fields={[
          {
            name: "priority",
            label: "اولویت فعالیت",
            options: Object.entries(activityPriorities).map(
              ([value, label]) => ({ value, label }),
            ),
          },
          { name: "progress", label: "پیشرفت (درصد)", length: 3 },
          ...(!editing
            ? [
                {
                  name: "status",
                  label: "وضعیت اولیه",
                  options: [
                    { value: "planned", label: "برنامه‌ریزی‌شده" },
                    { value: "in_progress", label: "در حال انجام" },
                  ],
                },
              ]
            : []),
        ]}
        draft={value}
        errors={errors}
        disabled={disabled}
        onChange={(name, text) => field(name as keyof ActivityDraft, text)}
      />
      <h2>زمان‌بندی</h2>
      <div className="session-actions" aria-label="تنظیم سریع سررسید">
        {[
          [1, "۱ ساعت"],
          [24, "فردا"],
          [168, "۱ هفته"],
        ].map(([hours, label]) => (
          <button
            key={hours}
            type="button"
            className="customer-link"
            disabled={disabled}
            onClick={() => {
              const due = tehranInput(
                new Date(Date.now() + Number(hours) * 3600000).toISOString(),
              );
              onChange({ ...value, due_date: due.date, due_time: due.time });
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="customer-fields">
        <FormField
          id="activity-due_date"
          label="تاریخ پیگیری (شمسی)"
          error={errors.due_date || errors.due_at}
          hint="مانند ۱۴۰۵/۰۸/۰۶؛ زمان بر اساس تهران است."
        >
          <input
            id="activity-due_date"
            value={value.due_date}
            dir="ltr"
            disabled={disabled}
            aria-invalid={!!(errors.due_date || errors.due_at)}
            aria-describedby="activity-due_date-error activity-due_date-hint"
            onChange={(e) => field("due_date", e.target.value)}
          />
        </FormField>
        <FormField
          id="activity-due_time"
          label="ساعت پیگیری (تهران)"
          error={errors.due_time}
          hint="مانند ۱۴:۳۰؛ قالب ۲۴ساعته."
        >
          <input
            id="activity-due_time"
            value={value.due_time}
            dir="ltr"
            disabled={disabled}
            aria-invalid={!!errors.due_time}
            aria-describedby="activity-due_time-error activity-due_time-hint"
            onChange={(e) => field("due_time", e.target.value)}
          />
        </FormField>
      </div>
      <FormField id="activity-reminder" label="اعلان داخل برنامه">
        <select
          id="activity-reminder"
          value={value.reminder}
          disabled={disabled}
          onChange={(e) => field("reminder", e.target.value)}
        >
          <option value="none">بدون یادآور</option>
          <option value="yes">یادآوری در زمان مشخص</option>
        </select>
      </FormField>
      {value.reminder === "yes" && (
        <div className="customer-fields">
          <FormField
            id="activity-remind_date"
            label="تاریخ یادآوری (شمسی)"
            error={errors.remind_date || errors.remind_at}
            hint="برابر یا پیش از موعد؛ زمان گذشته در نوبت بعدی اعلان ایجاد می‌کند."
          >
            <input
              id="activity-remind_date"
              value={value.remind_date}
              dir="ltr"
              disabled={disabled}
              aria-invalid={!!(errors.remind_date || errors.remind_at)}
              aria-describedby="activity-remind_date-error activity-remind_date-hint"
              onChange={(e) => field("remind_date", e.target.value)}
            />
          </FormField>
          <FormField
            id="activity-remind_time"
            label="ساعت یادآوری (تهران)"
            error={errors.remind_time}
          >
            <input
              id="activity-remind_time"
              value={value.remind_time}
              dir="ltr"
              disabled={disabled}
              aria-invalid={!!errors.remind_time}
              aria-describedby="activity-remind_time-error"
              onChange={(e) => field("remind_time", e.target.value)}
            />
          </FormField>
        </div>
      )}
    </>
  );
}
