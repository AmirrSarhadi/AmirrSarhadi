"use client";
import type { ReactNode } from "react";
import {
  CheckSquare,
  FileText,
  Clock3,
  UserRound,
  Link2,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  activityKinds,
  activityStatuses,
  activityPriorities,
  type Activity,
} from "../lib/activities";
import { formatAccountDate } from "../lib/format";
import { number } from "../lib/customers";
import { RecordStatus } from "./record-fields";
export function ActivityReferenceProfile({
  record,
  targetHref,
  children,
}: {
  record: Activity;
  targetHref: string;
  children: ReactNode;
}) {
  const active = ["planned", "in_progress"].includes(record.status),
    days = Math.ceil((Date.parse(record.due_at) - Date.now()) / 86400000),
    age = Math.max(
      0,
      Math.floor(
        ((record.completed_at ? Date.parse(record.completed_at) : Date.now()) -
          Date.parse(record.created_at)) /
          86400000,
      ),
    );
  const reminder = !active
    ? "متوقف شده است."
    : record.reminder_state === "failed"
      ? "ثبت اعلان ناموفق بود؛ با مدیر سامانه پیگیری کنید."
      : record.reminder_state === "sent"
        ? "در اعلان‌های مسئول ثبت شده است."
        : record.reminder_state === "cancelled"
          ? "یادآور قبلی باطل شده است."
          : "در نوبت ثبت اعلان";
  return (
    <div className="activity-profile-grid">
      <aside className="activity-profile-aside">
        <section className="account-panel activity-detail-card">
          <h2>
            <CheckSquare size={19} aria-hidden="true" /> اطلاعات وظیفه
          </h2>
          <div className="activity-identity">
            <span className="activity-identity-icon">
              <CheckSquare aria-hidden="true" />
            </span>
            <h3>{record.title}</h3>
            <div className="session-actions">
              <RecordStatus
                tone={
                  record.status === "done"
                    ? "success"
                    : record.overdue
                      ? "warning"
                      : "neutral"
                }
              >
                {activityStatuses[record.status]}
              </RecordStatus>
              <RecordStatus
                tone={record.priority === "high" ? "warning" : "neutral"}
              >
                {activityPriorities[record.priority]}
              </RecordStatus>
              {record.overdue && (
                <RecordStatus tone="warning">عقب‌افتاده</RecordStatus>
              )}
            </div>
            <p>سررسید</p>
            <strong>{formatAccountDate(record.due_at)}</strong>
          </div>
          {children}
        </section>
        <section className="account-panel activity-detail-card">
          <h2>
            <UserRound size={19} aria-hidden="true" /> مسئول انجام
          </h2>
          <p>{record.owner_label}</p>
        </section>
        <section className="account-panel activity-detail-card">
          <h2>
            <Link2 size={19} aria-hidden="true" /> مرتبط با
          </h2>
          <p>{record.target_label}</p>
          {record.target_type !== "none" && (
            <a className="customer-link" href={targetHref}>
              مشاهده پرونده مرتبط
            </a>
          )}
        </section>
      </aside>
      <div className="activity-profile-main">
        <section className="account-panel activity-detail-card">
          <h2>
            <FileText size={19} aria-hidden="true" /> توضیحات وظیفه
          </h2>
          <p className="activity-notes">
            {record.notes || "توضیحی ثبت نشده است."}
          </p>
          {record.outcome && <p>آخرین نتیجه: {record.outcome}</p>}
          {record.cancellation_reason && (
            <p>دلیل لغو: {record.cancellation_reason}</p>
          )}
        </section>
        <section className="account-panel activity-detail-card">
          <h2>
            <Clock3 size={19} aria-hidden="true" /> اطلاعات مدیریتی
          </h2>
          <dl className="customer-definition">
            <div>
              <dt>نوع فعالیت</dt>
              <dd>{activityKinds[record.kind]}</dd>
            </div>
            <div>
              <dt>وضعیت فعلی</dt>
              <dd>{activityStatuses[record.status]}</dd>
            </div>
            <div>
              <dt>تاریخ ایجاد</dt>
              <dd>{formatAccountDate(record.created_at)}</dd>
            </div>
            <div>
              <dt>آخرین بروزرسانی</dt>
              <dd>{formatAccountDate(record.updated_at)}</dd>
            </div>
            {record.started_at && (
              <div>
                <dt>زمان شروع</dt>
                <dd>{formatAccountDate(record.started_at)}</dd>
              </div>
            )}
            {record.completed_at && (
              <div>
                <dt>زمان انجام</dt>
                <dd>{formatAccountDate(record.completed_at)}</dd>
              </div>
            )}
            <div>
              <dt>یادآور</dt>
              <dd>
                {record.remind_at ? (
                  <>
                    {formatAccountDate(record.remind_at)} — {reminder}
                  </>
                ) : (
                  "بدون یادآور"
                )}
              </dd>
            </div>
          </dl>
        </section>
        <section className="account-panel activity-detail-card">
          <h2>
            <ChartNoAxesCombined size={19} aria-hidden="true" /> پیشرفت و آمار
          </h2>
          <div className="activity-progress-stats">
            <div>
              <strong>
                {record.progress === null
                  ? "ثبت نشده"
                  : number(record.progress) + "٪"}
              </strong>
              <span>پیشرفت ثبت‌شده</span>
            </div>
            <div>
              <strong>
                {active ? number(Math.abs(days)) + " روز" : "بسته شده"}
              </strong>
              <span>
                {active
                  ? days < 0
                    ? "گذشته از موعد"
                    : "تا سررسید"
                  : "وضعیت پیگیری"}
              </span>
            </div>
            <div>
              <strong>{number(age)} روز</strong>
              <span>سن وظیفه</span>
            </div>
          </div>
          {record.progress !== null && (
            <progress
              aria-label="پیشرفت وظیفه"
              max={100}
              value={record.progress}
            />
          )}
        </section>
      </div>
    </div>
  );
}
