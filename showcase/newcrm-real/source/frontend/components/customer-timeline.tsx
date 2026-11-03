"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity as ActivityIcon,
  Building2,
  ChartNoAxesCombined,
  Target,
  UserRound,
} from "lucide-react";
import { api } from "../lib/api";
import type { Kind, Page } from "../lib/customers";
import { formatAccountDate } from "../lib/format";
import { formatToman } from "../lib/sales-entry";
import { activityStatuses } from "../lib/activities";
import {
  type TimelineEvent,
  timelineAction,
  timelineFields,
  timelineLink,
  timelineSources,
  leadStatuses,
} from "../lib/timeline";
import { ActionButton, LoadFailure } from "./account-ui";
import { FormField, Pager } from "./customer-controls";
import { RecordStatus } from "./record-fields";

const icons = {
  person: UserRound,
  company: Building2,
  lead: Target,
  opportunity: ChartNoAxesCombined,
  activity: ActivityIcon,
};

export function CustomerTimeline({
  organizationId,
  userId,
  customerId,
  kind,
}: {
  organizationId: string;
  userId: number;
  customerId: string;
  kind: Kind;
}) {
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    value: Page<TimelineEvent>;
  } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(
    null,
  );
  const requestKey = `${organizationId}:${userId}:${kind}:${customerId}:${source}:${page}:${revision}`;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(null);
    api<Page<TimelineEvent>>(
      `${kind}/${customerId}/timeline/?source=${source}&page=${page}`,
      {
        namespace: "customers",
        organizationId,
        expectedUserId: userId,
        signal: controller.signal,
      },
    )
      .then((value) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, value });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError({
            key: requestKey,
            message:
              error instanceof Error ? error.message : "تاریخچه دریافت نشد.",
          });
      });
    return () => controller.abort();
  }, [
    organizationId,
    userId,
    customerId,
    kind,
    source,
    page,
    revision,
    requestKey,
  ]);
  const list = result?.key === requestKey ? result.value : null;
  return (
    <section
      className="customer-timeline"
      aria-labelledby="customer-timeline-heading"
    >
      <h3 id="customer-timeline-heading">خط زمانی پرونده</h3>
      <p className="account-description">
        رخدادهای ثبت‌شده از تازه به قدیم؛ نام پرونده‌ها نام فعلی آن‌هاست.
        اطلاعات هر رخداد مربوط به زمان ثبت آن است.
      </p>
      <div className="customer-toolbar timeline-toolbar">
        <FormField id="timeline-source" label="نوع رخداد">
          <select
            id="timeline-source"
            value={source}
            onChange={(event) => {
              setSource(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">همه رخدادهای مجاز</option>
            <option value="customer">تغییرات مشتری و ارتباط‌ها</option>
            <option value="lead">سرنخ‌های تبدیل‌شده</option>
            <option value="opportunity">فرصت‌های فروش</option>
            <option value="activity">فعالیت‌ها و پیگیری‌ها</option>
          </select>
        </FormField>
        <ActionButton
          className="secondary"
          onClick={() => setRevision((value) => value + 1)}
        >
          تازه‌سازی خط زمانی
        </ActionButton>
      </div>
      {error?.key === requestKey ? (
        <LoadFailure
          title="خط زمانی دریافت نشد"
          message={error.message}
          retry={() => setRevision((value) => value + 1)}
        />
      ) : !list ? (
        <p role="status">در حال دریافت خط زمانی…</p>
      ) : (
        <>
          {!list.count ? (
            <p role="status">
              رخداد ثبت‌شده‌ای در این بخش و دسترسی فعلی شما وجود ندارد.
            </p>
          ) : (
            <ol className="customer-timeline-list" aria-label="رخدادهای پرونده">
              {list.results.map((event) => {
                const Icon = icons[event.source_type];
                const changed = timelineFields(event.details.changed_fields);
                return (
                  <li key={event.id} className="customer-timeline-event">
                    <span className="crm-card-icon timeline-icon">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <div className="timeline-event-content">
                      <div className="timeline-event-heading">
                        <h4>{timelineAction(event.action)}</h4>
                        <time dateTime={event.created_at}>
                          {formatAccountDate(event.created_at)}
                        </time>
                      </div>
                      <p>
                        <RecordStatus>
                          {timelineSources[event.source_type]}
                        </RecordStatus>{" "}
                        <Link
                          className="customer-link"
                          href={timelineLink(event)}
                        >
                          {event.record_label}
                        </Link>
                      </p>
                      {changed && (
                        <p className="timeline-event-detail">
                          فیلدهای تغییرکرده: {changed}
                        </p>
                      )}
                      {event.source_type === "opportunity" && (
                        <p className="timeline-event-detail">
                          {event.details.pipeline_name
                            ? `${event.details.pipeline_name} · `
                            : ""}
                          {event.details.previous_stage_name
                            ? `${event.details.previous_stage_name} ← `
                            : ""}
                          {event.details.stage_name} —{" "}
                          {formatToman(event.details.amount ?? null)}
                        </p>
                      )}
                      {event.source_type === "activity" && (
                        <p className="timeline-event-detail">
                          {activityStatuses[
                            event.details
                              .status as keyof typeof activityStatuses
                          ] || "وضعیت ثبت‌شده"}
                          {event.details.due_at
                            ? ` · موعد: ${formatAccountDate(event.details.due_at)}`
                            : ""}
                          {event.details.remind_at
                            ? ` · یادآوری: ${formatAccountDate(event.details.remind_at)}`
                            : ""}
                        </p>
                      )}
                      {event.source_type === "lead" && (
                        <p className="timeline-event-detail">
                          {event.details.from_status
                            ? `${leadStatuses[event.details.from_status] || "وضعیت پیشین"} ← `
                            : ""}
                          {leadStatuses[event.details.status || ""] ||
                            "وضعیت ثبت‌شده"}
                        </p>
                      )}
                      {event.details.reason && (
                        <p className="timeline-event-reason">
                          توضیح ثبت‌شده: {event.details.reason}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <Pager
            page={page}
            count={list.count}
            previous={!!list.previous}
            next={!!list.next}
            onPage={setPage}
          />
        </>
      )}
      <p className="crm-context-note">
        فعالیت‌های مستقیم و فعالیت‌های فرصت‌ها و سرنخ‌های تبدیل‌شدهٔ مجاز نمایش
        داده می‌شوند. سوابق پروندهٔ ادغام‌شده روی همان پروندهٔ تاریخی باقی
        می‌مانند.
      </p>
    </section>
  );
}
