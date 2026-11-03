import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, CashShiftHistoryReport } from "../shared/api";

const money = (value: number | null) => `${new Intl.NumberFormat("fa-IR").format(value ?? 0)} تومان`;
const dateTime = (value: string | null) => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(new Date(value)) : "—";
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const defaultDates = () => {
  const end = new Date(); const start = new Date(end); start.setDate(start.getDate() - 29);
  return { start: isoDate(start), end: isoDate(end) };
};
const varianceLabel = (value: number | null) => (value ?? 0) === 0 ? "بدون مغایرت" : (value ?? 0) < 0 ? "کسری" : "اضافه";

export function CashShiftHistory({ branchId }: { branchId: string }) {
  const initial = defaultDates();
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);
  const [report, setReport] = useState<CashShiftHistoryReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [validation, setValidation] = useState("");

  const load = useCallback(async (start: string, end: string) => {
    setState("loading"); setValidation("");
    try { setReport(await api.cashShiftHistory(branchId, start, end)); setState("ready"); }
    catch { setState("error"); }
  }, [branchId]);

  useEffect(() => {
    // Loading is the external synchronization owned by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(initial.start, initial.end);
  }, [branchId, load, initial.start, initial.end]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const start = new Date(`${startDate}T00:00:00Z`); const end = new Date(`${endDate}T00:00:00Z`);
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days < 1) { setValidation("تاریخ شروع نباید بعد از تاریخ پایان باشد."); return; }
    if (days > 366) { setValidation("بازه گزارش نمی‌تواند بیشتر از ۳۶۶ روز باشد."); return; }
    void load(startDate, endDate);
  }

  return <section className="shift-history" aria-labelledby="shift-history-title">
    <form className="panel history-filter" onSubmit={submit}>
      <div><h3 id="shift-history-title">تاریخچه شیفت‌های بسته‌شده</h3></div>
      <label htmlFor="shiftStartDate">از تاریخ<input id="shiftStartDate" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label htmlFor="shiftEndDate">تا تاریخ<input id="shiftEndDate" type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      <button className="button button--primary" disabled={state === "loading"}>{state === "loading" ? "در حال دریافت…" : "نمایش گزارش"}</button>
    </form>
    {validation && <p className="alert alert--error" role="alert">{validation}</p>}
    {state === "loading" && <div className="panel report-state" aria-busy="true">در حال دریافت تاریخچه شیفت‌ها…</div>}
    {state === "error" && <div className="alert alert--error" role="alert">دریافت تاریخچه شیفت‌ها ممکن نشد.<button className="button button--text" onClick={() => void load(startDate, endDate)}>تلاش دوباره</button></div>}
    {state === "ready" && report && <>
      <dl className="history-summary">
        <div className="panel"><dt>شیفت بسته‌شده</dt><dd>{new Intl.NumberFormat("fa-IR").format(report.summary.shift_count)}</dd></div>
        <div className="panel"><dt>فروش نقدی</dt><dd>{money(report.summary.cash_sales)}</dd></div>
        <div className="panel"><dt>خالص مغایرت</dt><dd>{money(report.summary.net_variance)}</dd></div>
        <div className="panel"><dt>مجموع قدرمطلق مغایرت</dt><dd>{money(report.summary.absolute_variance)}</dd></div>
      </dl>
      {!report.shifts.length ? <div className="panel empty-state"><h3>شیفت بسته‌شده‌ای یافت نشد</h3><p>بازه تاریخ را تغییر دهید یا پس از بستن اولین شیفت دوباره بررسی کنید.</p></div> :
        <div className="panel history-table-panel"><div className="history-table-heading"><h3>جزئیات شیفت‌ها</h3><span>{new Intl.NumberFormat("fa-IR").format(report.shifts.length)} ردیف</span></div><div className="table-scroll" tabIndex={0} role="region" aria-label="جدول تاریخچه صندوق"><table className="history-table"><thead><tr><th>زمان بستن</th><th>کاربران</th><th>موجودی اولیه</th><th>فروش نقدی</th><th>موردانتظار</th><th>شمارش‌شده</th><th>مغایرت</th></tr></thead><tbody>{report.shifts.map((shift) => <tr key={shift.id}><td>{dateTime(shift.closed_at)}</td><td><span>{shift.opened_by_name}</span><small>بسته‌شده توسط {shift.closed_by_name ?? "—"}</small></td><td>{money(shift.opening_cash)}</td><td>{money(shift.cash_sales)}</td><td>{money(shift.expected_cash)}</td><td>{money(shift.closing_cash)}</td><td><span className={(shift.variance ?? 0) === 0 ? "variance-badge variance-badge--zero" : "variance-badge variance-badge--warning"}>{varianceLabel(shift.variance)} · {money(shift.variance)}</span></td></tr>)}</tbody></table></div></div>}
    </>}
  </section>;
}
