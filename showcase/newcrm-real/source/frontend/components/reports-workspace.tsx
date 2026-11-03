"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BarChart3,
  Download,
  Printer,
  UsersRound,
  Target,
  Banknote,
  CheckCheck,
} from "lucide-react";
import { api } from "../lib/api";
import { useAccount } from "../lib/use-account";
import {
  parsePersianDate,
  persianDate,
  displayPersianDate,
  formatToman,
} from "../lib/sales-entry";
import { formatAccountDate } from "../lib/format";
import { customerFileRequest, downloadBlob } from "../lib/customer-files";
import {
  ActionButton,
  Feedback,
  LoadFailure,
  LoadingAccount,
} from "./account-ui";
import { FormField } from "./customer-controls";
import { SalesChart } from "./sales-chart";
import { RecordStatus } from "./record-fields";
type Metric = {
  value: number | string;
  previous: number | string;
  total: number | string | null;
  change_percent: string | null;
};
type Bucket = { status: string; label: string; count: number };
type Report = {
  generated_at: string;
  timezone: string;
  range: {
    date_from: string;
    date_to: string;
    days: number;
    previous_from: string;
    previous_to: string;
  };
  metrics: Record<string, Metric>;
  trend: { month: string; start: string; amount: string }[];
  lead_statuses: Bucket[];
  lead_sources: { source: string; count: number }[];
  funnel: Bucket[];
  users: {
    membership_id: number;
    label: string;
    leads: number;
    customers: number;
    sales: string;
  }[];
  user_count: number;
};
const n = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
function presetDates(days: number) {
  const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Tehran",
    }),
    date = new Date(today + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - days + 1);
  return {
    from: persianDate(date.toISOString().slice(0, 10)),
    to: persianDate(today),
  };
}
function Distribution({ rows }: { rows: Bucket[] }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  let offset = 0;
  return (
    <div className="report-distribution">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="report-donut-track" cx="100" cy="100" r="70" />
        {rows.map((row, i) => {
          const length = total ? (row.count / total) * 439.82297 : 0;
          const before = offset;
          offset += length;
          return (
            <circle
              key={row.status}
              className={"report-donut report-color-" + i}
              cx="100"
              cy="100"
              r="70"
              strokeDasharray={`${length} ${439.82297 - length}`}
              strokeDashoffset={-before}
            />
          );
        })}
        <text x="100" y="105" textAnchor="middle">
          {n(total)}
        </text>
      </svg>
      <dl className="report-legend">
        {rows.map((row, i) => (
          <div key={row.status}>
            <dt>
              <span
                aria-hidden="true"
                className={"report-key report-color-" + i}
              />
              {row.label}
            </dt>
            <dd>{n(row.count)}</dd>
          </div>
        ))}
      </dl>
      {!total && (
        <p className="crm-context-note">در این بازه لید جدیدی ثبت نشده است.</p>
      )}
    </div>
  );
}
export function ReportsWorkspace() {
  const { account, refresh } = useAccount(),
    ready = account.phase === "ready" && account.data.current;
  const context = useRef({ org: "", user: 0 });
  if (ready)
    context.current = {
      org: account.data.current!.organization_id,
      user: account.data.user.user_id,
    };
  const { org, user } = context.current,
    identity = org + ":" + user,
    scope = useRef(""),
    first = useRef(true),
    exportController = useRef<AbortController | null>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState("30"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [filter, setFilter] = useState("days=30"),
    [data, setData] = useState<Report | null>(null),
    [stamp, setStamp] = useState<object | null>(null),
    [readKey, setReadKey] = useState(""),
    [error, setError] = useState(""),
    [formErrors, setFormErrors] = useState<Record<string, string>>({}),
    [exportError, setExportError] = useState(""),
    [exporting, setExporting] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready || scope.current === identity) return;
    exportController.current?.abort();
    scope.current = identity;
    setData(null);
    setStamp(null);
    setError("");
    setExportError("");
    setFormErrors({});
    const params = new URLSearchParams(window.location.search);
    if (first.current && params.get("date_from") && params.get("date_to")) {
      setFilter(
        new URLSearchParams({
          date_from: params.get("date_from")!,
          date_to: params.get("date_to")!,
        }).toString(),
      );
      setMode("custom");
      try {
        setFrom(persianDate(params.get("date_from")!));
        setTo(persianDate(params.get("date_to")!));
      } catch {
        setFrom("");
        setTo("");
      }
    } else {
      const days =
        first.current && ["7", "30", "90"].includes(params.get("days") || "")
          ? params.get("days")!
          : "30";
      setFilter("days=" + days);
      setMode(days);
      const dates = presetDates(Number(days));
      setFrom(dates.from);
      setTo(dates.to);
    }
    first.current = false;
  }, [ready, identity]);
  useEffect(() => {
    if (!ready || scope.current !== identity) return;
    const ctrl = new AbortController();
    setStamp(null);
    setError("");
    api<Report>("reports/?" + filter, {
      namespace: "sales",
      organizationId: org,
      expectedUserId: user,
      signal: ctrl.signal,
    })
      .then((v) => {
        if (!ctrl.signal.aborted) {
          setData(v);
          setStamp(account);
          setReadKey(filter);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setData(null);
          setStamp(account);
          setReadKey(filter);
          setError(e.message);
        }
      });
    return () => ctrl.abort();
  }, [account, identity, filter, retry, org, user]);
  useEffect(
    () => () => exportController.current?.abort(),
    [org, user, filter, account],
  );
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = [
        ...document.querySelectorAll<HTMLDetailsElement>(
          ".reports-workspace details",
        ),
      ].filter((node) => !node.open);
      opened.forEach((node) => {
        node.open = true;
      });
    };
    const after = () => {
      opened.forEach((node) => {
        node.open = false;
      });
      opened = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
      after();
    };
  }, []);
  const commit = (query: string) => {
    setFilter(query);
    setFormErrors({});
    setExportError("");
    setRetry((v) => v + 1);
    window.history.replaceState(null, "", "/reports?" + query);
  };
  function apply(event: FormEvent) {
    event.preventDefault();
    if (mode !== "custom") {
      commit("days=" + mode);
      return;
    }
    const errors: Record<string, string> = {};
    let left: string | null = null,
      right: string | null = null;
    try {
      left = parsePersianDate(from);
      if (!left) errors.date_from = "تاریخ شروع لازم است.";
    } catch (e) {
      errors.date_from = (e as Error).message;
    }
    try {
      right = parsePersianDate(to);
      if (!right) errors.date_to = "تاریخ پایان لازم است.";
    } catch (e) {
      errors.date_to = (e as Error).message;
    }
    if (left && right) {
      const days =
        (Date.parse(right + "T12:00Z") - Date.parse(left + "T12:00Z")) /
          86400000 +
        1;
      if (days < 1 || days > 366)
        errors.date_from = "بازه باید بین ۱ تا ۳۶۶ روز باشد.";
      if (
        left < "1900-01-01" ||
        right >
          new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" })
      )
        errors.date_to = "بازه باید از سال ۱۹۰۰ تا امروز تهران باشد.";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      document
        .getElementById(errors.date_from ? "report-from" : "report-to")
        ?.focus();
      return;
    }
    commit(
      new URLSearchParams({ date_from: left!, date_to: right! }).toString(),
    );
  }
  async function exportFile() {
    if (exporting) return;
    setExporting(true);
    setExportError("");
    const ctrl = new AbortController();
    exportController.current = ctrl;
    const current = scope.current;
    try {
      const response = await customerFileRequest(
        "sales/reports/export/?" + filter,
        org,
        user,
        { signal: ctrl.signal },
      );
      const blob = await response.blob();
      if (!ctrl.signal.aborted && current === scope.current)
        downloadBlob(blob, "newcrm-reports.xlsx");
    } catch (e) {
      if (!ctrl.signal.aborted && current === scope.current)
        setExportError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }
  if (!ready)
    return account.phase === "error" ? (
      <LoadFailure message={account.message} retry={() => void refresh()} />
    ) : account.phase === "anonymous" ? (
      <section className="account-panel">
        <h1>برای مشاهده گزارش وارد شوید</h1>
        <a href="/login">ورود به حساب</a>
      </section>
    ) : (
      <LoadingAccount />
    );
  if (scope.current !== identity) return <LoadingAccount />;
  const visible = stamp === account && readKey === filter ? data : null;
  return (
    <section className="customer-workspace customer-reference-workspace reports-workspace">
      <div className="account-page-heading">
        <div>
          <span className="account-kicker">{account.data.current!.name}</span>
          <h1 ref={heading} tabIndex={-1}>
            گزارش‌ها و آنالیتیکس
          </h1>
          <p className="account-description">
            عملکرد عملیاتی در محدودهٔ دسترسی شما
          </p>
        </div>
        <div className="session-actions no-print">
          {account.data.operations.includes("report.export") && (
            <ActionButton
              className="secondary"
              disabled={!visible || exporting}
              onClick={() => void exportFile()}
            >
              <Download size={16} aria-hidden="true" /> خروجی Excel
            </ActionButton>
          )}
          <ActionButton
            className="secondary"
            disabled={!visible}
            onClick={() => window.print()}
          >
            <Printer size={16} aria-hidden="true" /> چاپ گزارش
          </ActionButton>
        </div>
      </div>
      <Feedback message={exportError} />
      <form
        className="account-panel report-filter no-print"
        noValidate
        onSubmit={apply}
      >
        <h2>فیلتر بازهٔ زمانی</h2>
        <div className="report-filter-fields">
          <FormField id="report-preset" label="بازهٔ زمانی">
            <select
              id="report-preset"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setFormErrors({});
                if (e.target.value !== "custom") {
                  const dates = presetDates(Number(e.target.value));
                  setFrom(dates.from);
                  setTo(dates.to);
                }
              }}
            >
              <option value="7">۷ روز گذشته</option>
              <option value="30">۳۰ روز گذشته</option>
              <option value="90">۹۰ روز گذشته</option>
              <option value="custom">سفارشی</option>
            </select>
          </FormField>
          <FormField
            id="report-from"
            label="از تاریخ (شمسی)"
            error={formErrors.date_from}
          >
            <input
              id="report-from"
              value={from}
              dir="ltr"
              aria-invalid={!!formErrors.date_from}
              aria-describedby="report-from-error"
              onChange={(e) => {
                setFrom(e.target.value);
                setMode("custom");
              }}
            />
          </FormField>
          <FormField
            id="report-to"
            label="تا تاریخ (شمسی)"
            error={formErrors.date_to}
          >
            <input
              id="report-to"
              value={to}
              dir="ltr"
              aria-invalid={!!formErrors.date_to}
              aria-describedby="report-to-error"
              onChange={(e) => {
                setTo(e.target.value);
                setMode("custom");
              }}
            />
          </FormField>
          <div className="session-actions">
            <ActionButton type="submit">اعمال فیلتر</ActionButton>
            <ActionButton
              type="button"
              className="secondary"
              onClick={() => {
                const dates = presetDates(30);
                setMode("30");
                setFrom(dates.from);
                setTo(dates.to);
                commit("days=30");
              }}
            >
              بازنشانی فیلتر
            </ActionButton>
          </div>
        </div>
      </form>
      {error && stamp === account && readKey === filter ? (
        <LoadFailure
          title="گزارش دریافت نشد"
          message={error}
          retry={() => setRetry((v) => v + 1)}
        />
      ) : !visible ? (
        <p role="status">در حال دریافت گزارش…</p>
      ) : (
        <>
          <p className="report-applied">
            گزارش نمایش‌داده‌شده: {displayPersianDate(visible.range.date_from)}{" "}
            تا {displayPersianDate(visible.range.date_to)} — به‌روزرسانی:{" "}
            {formatAccountDate(visible.generated_at)}
          </p>
          <div className="lead-summary-grid report-metrics">
            {[
              {
                key: "customers",
                label: "پرونده‌های جدید مشتری",
                icon: UsersRound,
              },
              { key: "leads", label: "لیدهای جدید", icon: Target },
              { key: "sales", label: "فروش ثبت‌شده دوره", icon: Banknote },
              {
                key: "completed_tasks",
                label: "وظایف تکمیل‌شده",
                icon: CheckCheck,
              },
            ].map(({ key, label, icon: Icon }) => {
              const metric = visible.metrics[key];
              return (
                <section className="lead-metric" key={key}>
                  <Icon size={19} aria-hidden="true" />
                  <h2>{label}</h2>
                  <strong
                    className={
                      key === "sales" ? "report-money-value" : undefined
                    }
                  >
                    {key === "sales" ? (
                      <>
                        <bdi
                          dir="ltr"
                          className={
                            String(metric.value).length > 14
                              ? "report-large-money"
                              : undefined
                          }
                        >
                          {new Intl.NumberFormat("fa-IR").format(
                            BigInt(metric.value),
                          )}
                        </bdi>
                        <small>تومان</small>
                      </>
                    ) : (
                      n(Number(metric.value))
                    )}
                  </strong>
                  <span>
                    دوره قبل:{" "}
                    {key === "sales"
                      ? formatToman(String(metric.previous))
                      : n(Number(metric.previous))}
                  </span>
                  {metric.total !== null && (
                    <span>
                      کل فعلی:{" "}
                      {key === "sales"
                        ? formatToman(String(metric.total))
                        : n(Number(metric.total))}
                    </span>
                  )}
                  <RecordStatus
                    tone={
                      Number(metric.change_percent) > 0 ? "success" : "neutral"
                    }
                  >
                    {metric.change_percent === null
                      ? "دوره قبل صفر؛ درصد قابل محاسبه نیست"
                      : Number(metric.change_percent) === 0
                        ? "بدون تغییر"
                        : `${new Intl.NumberFormat("fa-IR", { signDisplay: "always", maximumFractionDigits: 1 }).format(Number(metric.change_percent))}٪ نسبت به دوره قبل`}
                  </RecordStatus>
                </section>
              );
            })}
          </div>
          <p className="crm-context-note">
            مشتری، پروندهٔ شخص یا شرکت است. فروش، جمع سفارش‌های لغونشده است و
            وصول وجه را نشان نمی‌دهد. مقایسه با بازهٔ هم‌اندازهٔ قبل انجام
            می‌شود: {displayPersianDate(visible.range.previous_from)} تا{" "}
            {displayPersianDate(visible.range.previous_to)}.
          </p>
          <div className="report-chart-grid">
            <section className="account-panel report-panel">
              <h2>
                <BarChart3 size={19} aria-hidden="true" /> روند فروش ماهانه
              </h2>
              <p className="crm-context-note">
                ۱۲ ماه شمسی تا پایان بازه؛ مستقل از تاریخ شروع انتخاب‌شده.
              </p>
              <SalesChart rows={visible.trend} />
            </section>
            <section className="account-panel report-panel">
              <h2>توزیع وضعیت لیدها</h2>
              <p className="crm-context-note">
                لیدهای ایجادشده در بازه با وضعیت فعلی آن‌ها.
              </p>
              <Distribution rows={visible.lead_statuses} />
            </section>
          </div>
          <div className="report-pair">
            <section className="account-panel report-panel">
              <h2>قیف لیدها</h2>
              <p className="crm-context-note">
                وضعیت فعلی یا سابقهٔ ثبت مرحله؛ عبور از مرحله حدس زده نمی‌شود.
              </p>
              <ol className="report-bars">
                {visible.funnel.map((row, i) => (
                  <li key={row.status}>
                    <div>
                      <span>{row.label}</span>
                      <strong>{n(row.count)} لید</strong>
                    </div>
                    <div className="report-bar-track">
                      <span
                        style={{
                          width: visible.funnel[0].count
                            ? (100 * row.count) / visible.funnel[0].count + "%"
                            : "0%",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="account-panel report-panel">
              <h2>منابع لیدها</h2>
              {!visible.lead_sources.length ? (
                <p>در این بازه منبعی برای گزارش وجود ندارد.</p>
              ) : (
                <ul className="report-bars">
                  {visible.lead_sources.map((row, i) => (
                    <li key={i + ":" + row.source}>
                      <div>
                        <bdi>{row.source}</bdi>
                        <strong>
                          {n(row.count)} —{" "}
                          {new Intl.NumberFormat("fa-IR", {
                            maximumFractionDigits: 1,
                          }).format(
                            (row.count / Number(visible.metrics.leads.value)) *
                              100,
                          )}
                          ٪
                        </strong>
                      </div>
                      <div className="report-bar-track">
                        <span
                          style={{
                            width:
                              (100 * row.count) /
                                Math.max(
                                  ...visible.lead_sources.map((r) => r.count),
                                  1,
                                ) +
                              "%",
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <section className="account-panel report-panel">
            <h2>عملکرد کاربران</h2>
            <p className="crm-context-note">
              تا ۱۰ عضو فعال در محدودهٔ شما؛ بر اساس مسئول فعلی پرونده‌ها،
              مرتب‌شده بر اساس فروش دوره.
            </p>
            <div
              className="customer-table-scroll"
              role="region"
              aria-label="عملکرد کاربران"
              tabIndex={0}
            >
              <table className="customer-table">
                <thead>
                  <tr>
                    {[
                      "رتبه",
                      "نام کاربر",
                      "لیدهای جدید",
                      "پرونده‌های مشتری جدید",
                      "فروش دوره",
                    ].map((text) => (
                      <th key={text} scope="col">
                        {text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.users.map((r, i) => (
                    <tr key={r.membership_id}>
                      <td>{n(i + 1)}</td>
                      <th scope="row">{r.label}</th>
                      <td>{n(r.leads)}</td>
                      <td>{n(r.customers)}</td>
                      <td>{formatToman(r.sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.users.length && (
              <p>عضو فعالی در محدودهٔ دسترسی شما نیست.</p>
            )}
          </section>
          <details className="account-panel report-definitions">
            <summary>تعریف شاخص‌ها و محدودهٔ گزارش</summary>
            <p>
              وضعیت لیدها، مسئول پرونده‌ها و وضعیت سفارش‌ها از دادهٔ فعلی خوانده
              می‌شوند؛ انتخاب تاریخ گذشته وضعیت تاریخی آن زمان را بازسازی
              نمی‌کند. وظایف، اکنون انجام‌شده‌اند و تاریخ تکمیل آن‌ها در بازه
              است. پرونده‌های بایگانی و مشتریان ادغام‌شده کنار گذاشته می‌شوند.
              نمودار ماهانه زمینهٔ ۱۲ ماهه دارد؛ سایر بخش‌ها بازهٔ اعمال‌شده را
              رعایت می‌کنند. منابع بیش از ۲۰ گروه در «سایر منابع» جمع می‌شوند.
              خروجی Excel دادهٔ تازه با همین فیلترها و تعریف شاخص‌ها را دارد.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
