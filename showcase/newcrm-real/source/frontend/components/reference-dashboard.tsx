"use client";
import { SalesChart } from "./sales-chart";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  Target,
  TrendingUp,
  ListChecks,
  Gauge,
  UserCheck,
  Clock3,
  Banknote,
  Percent,
  Flame,
  CalendarCheck2,
  History,
} from "lucide-react";
import { api } from "../lib/api";
import type { Page } from "../lib/customers";
import { formatToman } from "../lib/sales-entry";
import { formatAccountDate } from "../lib/format";
import { statusLabel } from "../lib/leads";
import { timelineAction, timelineSources, timelineLink } from "../lib/timeline";
import { ActionButton, LoadFailure } from "./account-ui";
import { Pager } from "./customer-controls";
import { RecordStatus } from "./record-fields";

type Event = {
  id: string;
  source_type: keyof typeof timelineSources;
  record_id: string;
  actor_label: string;
  action: string;
  created_at: string;
  ip_address: null;
};
type Data = {
  generated_at: string;
  customers: { total: number; active: number; new: number };
  leads: { total: number; converted: number; urgent: number };
  conversion_rate: string | null;
  sales: { month: string; total: string; pending: number };
  tasks: { pending: number; overdue: number; today: number };
  trend: { month: string; start: string; amount: string }[];
  urgent_leads: {
    id: string;
    title: string;
    company_name: string;
    status: string;
    amount: string | null;
    owner_label: string;
  }[];
  today_tasks: { id: string; title: string; due_at: string; kind: string }[];
  recent_events: Event[];
};
const n = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
const rate = (value: string | null) =>
  value === null
    ? "بدون لید"
    : `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(Number(value))}٪`;
const eventLink = (event: Event) =>
  timelineLink({ ...event, record_label: "", version: 0, details: {} });
function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: typeof UsersRound;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`account-panel ref-panel ${className}`}
      aria-label={title}
    >
      <div className="ref-panel-header">
        <h2>
          <Icon size={19} aria-hidden="true" />
          {title}
        </h2>
        {action}
      </div>
      <div className="ref-panel-content">{children}</div>
    </section>
  );
}
export function ReferenceDashboard({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: number;
}) {
  const [months, setMonths] = useState("6"),
    [revision, setRevision] = useState(0),
    [snapshot, setSnapshot] = useState<{ key: string; data: Data } | null>(
      null,
    ),
    [error, setError] = useState<{ key: string; message: string } | null>(null);
  const key = `${organizationId}:${userId}:${months}:${revision}`;
  useEffect(() => {
    const ctrl = new AbortController();
    setError(null);
    setSnapshot(null);
    api<Data>(`dashboard/workspace/?months=${months}`, {
      namespace: "sales",
      organizationId,
      expectedUserId: userId,
      signal: ctrl.signal,
    })
      .then((data) => {
        if (!ctrl.signal.aborted) setSnapshot({ key, data });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setError({
            key,
            message: e instanceof Error ? e.message : "داشبورد دریافت نشد.",
          });
      });
    return () => ctrl.abort();
  }, [organizationId, userId, months, revision, key]);
  const data = snapshot?.key === key ? snapshot.data : null;
  if (error?.key === key)
    return (
      <LoadFailure
        title="داشبورد دریافت نشد"
        message={error.message}
        retry={() => setRevision((v) => v + 1)}
      />
    );
  if (!data) return <p role="status">در حال دریافت داشبورد…</p>;
  return (
    <div className="reference-dashboard">
      <h1 className="sr-only">داشبورد</h1>
      <div className="ref-metrics">
        {[
          {
            title: "کل مشتریان",
            value: n(data.customers.total),
            note: `${n(data.customers.new)} مشتری جدید این ماه`,
            icon: UsersRound,
            tone: "blue",
          },
          {
            title: "کل لیدها",
            value: n(data.leads.total),
            note: `${n(data.leads.urgent)} لید فوری`,
            icon: Target,
            tone: "green",
          },
          {
            title: "فروش این ماه",
            value: formatToman(data.sales.month),
            note: `نرخ تبدیل: ${rate(data.conversion_rate)}`,
            icon: TrendingUp,
            tone: "cyan",
          },
          {
            title: "وظایف در انتظار",
            value: n(data.tasks.pending),
            note: `${n(data.tasks.overdue)} وظیفه عقب‌افتاده`,
            icon: ListChecks,
            tone: "red",
          },
        ].map(({ title, value, note, icon: Icon, tone }) => (
          <section
            className={`account-panel ref-metric ref-tone-${tone}`}
            key={title}
            aria-label={title}
          >
            <span className="ref-metric-icon">
              <Icon size={24} aria-hidden="true" />
            </span>
            <strong
              className={value.length > 22 ? "ref-large-money" : undefined}
            >
              {value}
            </strong>
            <h2>{title}</h2>
            <p>{note}</p>
          </section>
        ))}
      </div>
      <div className="ref-top-grid">
        <Panel
          title="روند فروش ماهانه"
          icon={TrendingUp}
          action={
            <label className="ref-month-select">
              <span className="sr-only">بازه روند فروش</span>
              <select
                aria-label="بازه روند فروش"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              >
                <option value="3">۳ ماه گذشته</option>
                <option value="6">۶ ماه گذشته</option>
                <option value="12">۱۲ ماه گذشته</option>
              </select>
            </label>
          }
        >
          <SalesChart rows={data.trend} />
        </Panel>
        <Panel title="آمار سریع" icon={Gauge}>
          <dl className="ref-quick">
            {[
              {
                label: "مشتریان فعال",
                value: n(data.customers.active),
                icon: UserCheck,
              },
              {
                label: "فروش در انتظار",
                value: n(data.sales.pending),
                icon: Clock3,
              },
              {
                label: "کل فروش",
                value: formatToman(data.sales.total),
                icon: Banknote,
              },
              {
                label: "نرخ تبدیل",
                value: rate(data.conversion_rate),
                icon: Percent,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <span>{value}</span>
                  <Icon size={28} aria-hidden="true" />
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <div className="ref-bottom-grid">
        <Panel
          title="لیدهای فوری"
          icon={Flame}
          action={
            <Link className="ref-all" href="/leads?priority=high&status=open">
              مشاهده همه ←
            </Link>
          }
        >
          {data.urgent_leads.length ? (
            <ul className="ref-record-list">
              {data.urgent_leads.map((lead) => (
                <li key={lead.id}>
                  <div>
                    <Link
                      className="customer-link"
                      href={`/leads?record=${lead.id}`}
                    >
                      {lead.title}
                    </Link>
                    <p>{lead.company_name || "شرکت ثبت نشده"}</p>
                    <RecordStatus>بالا</RecordStatus>{" "}
                    <RecordStatus>{statusLabel(lead.status)}</RecordStatus>
                  </div>
                  <div>
                    <strong>{formatToman(lead.amount)}</strong>
                    <p>{lead.owner_label}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ref-empty">
              <Flame size={34} aria-hidden="true" />
              <p>لید فوری در دسترسی فعلی شما وجود ندارد.</p>
            </div>
          )}
        </Panel>
        <Panel
          title="وظایف امروز"
          icon={CalendarCheck2}
          action={
            <Link className="ref-all" href="/activities">
              مشاهده همه ←
            </Link>
          }
        >
          {data.today_tasks.length ? (
            <ul className="ref-record-list">
              {data.today_tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    className="customer-link"
                    href={`/activities?record=${task.id}`}
                  >
                    {task.title}
                  </Link>
                  <time dateTime={task.due_at}>
                    {formatAccountDate(task.due_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ref-empty">
              <CalendarCheck2 size={40} aria-hidden="true" />
              <p>وظیفه‌ای برای امروز ندارید.</p>
            </div>
          )}
          {data.tasks.today > 5 && (
            <p className="crm-context-note">
              نمایش ۵ مورد از {n(data.tasks.today)} وظیفه امروز
            </p>
          )}
        </Panel>
      </div>
      <RecentEvents
        initial={data.recent_events}
        organizationId={organizationId}
        userId={userId}
      />
      <div className="ref-dashboard-footer">
        <p>به‌روزرسانی: {formatAccountDate(data.generated_at)} · ساعت تهران</p>
        <ActionButton
          className="secondary"
          onClick={() => setRevision((v) => v + 1)}
        >
          تازه‌سازی داشبورد
        </ActionButton>
      </div>
      <details className="ref-definitions">
        <summary>تعریف شاخص‌ها</summary>
        <p>
          مشتریان: اشخاص بایگانی‌نشده و ادغام‌نشده؛ مشتری فعال وضعیت فعال دارد.
          لید فوری اولویت بالا و وضعیت باز دارد. وظایف فقط کارهای خودتان هستند.
          فروش، جمع فرصت‌های بردِ بایگانی‌نشده بر اساس تاریخ بسته‌شدن است؛ درآمد
          وصول‌شده نیست. ماه‌ها شمسی و به وقت تهران‌اند. نرخ تبدیل، نسبت لیدهای
          تبدیل‌شده به کل لیدهای بایگانی‌نشده در دسترسی فعلی شماست و مستقل از
          بازه نمودار محاسبه می‌شود. آی‌پی در رخدادهای تجاری موجود ثبت نشده است.
        </p>
      </details>
    </div>
  );
}
function RecentEvents({
  initial,
  organizationId,
  userId,
}: {
  initial: Event[];
  organizationId: string;
  userId: number;
}) {
  const [expanded, setExpanded] = useState(false),
    [page, setPage] = useState(1),
    [result, setResult] = useState<{ key: string; data: Page<Event> } | null>(
      null,
    ),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const key = `${page}:${revision}:${organizationId}:${userId}`;
  useEffect(() => {
    if (!expanded) return;
    const ctrl = new AbortController();
    setResult(null);
    setError("");
    api<Page<Event>>(`dashboard/events/?page=${page}`, {
      namespace: "sales",
      organizationId,
      expectedUserId: userId,
      signal: ctrl.signal,
    })
      .then((data) => {
        if (!ctrl.signal.aborted) setResult({ key, data });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setError(e instanceof Error ? e.message : "رخدادها دریافت نشدند.");
      });
    return () => ctrl.abort();
  }, [expanded, page, revision, key, organizationId, userId]);
  const rows = expanded
    ? result?.key === key
      ? result.data.results
      : null
    : initial;
  return (
    <Panel
      title="آخرین فعالیت‌ها"
      icon={History}
      action={
        <ActionButton
          className="secondary ref-all"
          onClick={() => {
            setExpanded(!expanded);
            setPage(1);
          }}
        >
          {expanded ? "نمایش خلاصه" : "مشاهده همه ←"}
        </ActionButton>
      }
    >
      {expanded && error ? (
        <LoadFailure
          title="فعالیت‌ها دریافت نشدند"
          message={error}
          retry={() => setRevision((v) => v + 1)}
        />
      ) : !rows ? (
        <p role="status">در حال دریافت فعالیت‌ها…</p>
      ) : !rows.length ? (
        <div className="ref-empty">
          <History size={32} aria-hidden="true" />
          <p>رخداد ثبت‌شده‌ای در دسترسی فعلی شما وجود ندارد.</p>
        </div>
      ) : (
        <div
          className="customer-table-scroll ref-events-scroll"
          role="region"
          aria-label="جدول آخرین فعالیت‌ها"
          tabIndex={0}
        >
          <table className="customer-table">
            <caption className="sr-only">رخدادهای تجاری مجاز</caption>
            <thead>
              <tr>
                <th>کاربر</th>
                <th>عملیات</th>
                <th>بخش</th>
                <th>تاریخ و زمان</th>
                <th>آی‌پی</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id}>
                  <td>{event.actor_label}</td>
                  <td>
                    <RecordStatus>{timelineAction(event.action)}</RecordStatus>
                  </td>
                  <td>
                    <Link className="customer-link" href={eventLink(event)}>
                      {
                        {
                          person: "مشتریان",
                          company: "شرکت‌ها",
                          lead: "لیدها",
                          opportunity: "فروش",
                          activity: "وظایف",
                        }[event.source_type]
                      }
                    </Link>
                  </td>
                  <td>
                    <time dateTime={event.created_at}>
                      {formatAccountDate(event.created_at)}
                    </time>
                  </td>
                  <td>ثبت نشده</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {expanded && result?.key === key && (
        <Pager
          page={page}
          count={result.data.count}
          next={!!result.data.next}
          previous={!!result.data.previous}
          onPage={setPage}
        />
      )}
    </Panel>
  );
}
