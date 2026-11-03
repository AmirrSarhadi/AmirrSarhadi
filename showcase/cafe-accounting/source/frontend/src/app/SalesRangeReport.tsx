import { FormEvent, useCallback, useEffect, useState } from "react";

import { api, Branch, SalesRangeReport as Report } from "../shared/api";

const price = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
const daysBefore = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() - days); return value.toISOString().slice(0, 10); };

export function SalesRangeReport({ branch: activeBranch, cafeId }: { branch?: Branch; cafeId: string }) {
  const initialEnd = today();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [startDate, setStartDate] = useState(() => daysBefore(initialEnd, 29));
  const [endDate, setEndDate] = useState(initialEnd);
  const [report, setReport] = useState<Report | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [downloading, setDownloading] = useState(false);
  const [validationError, setValidationError] = useState("");

  const load = useCallback(async (branch: string, start: string, end: string) => {
    setState("loading"); setValidationError("");
    try { setReport(await api.salesRangeReport(branch, start, end)); setState("ready"); }
    catch { setState("error"); }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = activeBranch ? [activeBranch] : await api.branches(cafeId); if (!active) return;
        setBranches(next); const branch = next[0]?.id ?? ""; setBranchId(branch);
        if (branch) await load(branch, startDate, endDate); else setState("ready");
      } catch { if (active) setState("error"); }
    })();
    return () => { active = false; };
    // Initial range belongs to this cafe load; later edits are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranch, cafeId, load]);

  function errorForRange() {
    if (startDate > endDate) return "تاریخ شروع باید قبل از تاریخ پایان باشد.";
    if ((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 >= 366) return "بازه گزارش حداکثر می‌تواند ۳۶۶ روز باشد.";
    return "";
  }
  function submit(event: FormEvent) { event.preventDefault(); const error = errorForRange(); setValidationError(error); if (!error && branchId) void load(branchId, startDate, endDate); }
  async function download() {
    const error = errorForRange(); setValidationError(error); if (error || !branchId) return;
    setDownloading(true);
    try {
      const blob = await api.salesRangeCsv(branchId, startDate, endDate); const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `sales-${startDate}-${endDate}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch { setState("error"); } finally { setDownloading(false); }
  }

  if (!branches.length && state === "ready") return <section className="empty-state"><h2>شعبه‌ای برای گزارش وجود ندارد</h2><p>پس از ایجاد شعبه، گزارش بازه‌ای اینجا نمایش داده می‌شود.</p></section>;
  return <section className="report-dashboard">
    <header className="panel report-toolbar range-report-toolbar section-heading"><div><h2>گزارش فروش بازه‌ای</h2></div>
      <form className="report-filters range-report-filters" onSubmit={submit}><label htmlFor="rangeStart">از تاریخ<input id="rangeStart" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label htmlFor="rangeEnd">تا تاریخ<input id="rangeEnd" type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><button className="button button--primary" disabled={state === "loading"}>نمایش گزارش</button><button className="button button--secondary" type="button" disabled={downloading || state === "loading"} onClick={() => void download()}>{downloading ? "در حال آماده‌سازی…" : "دانلود CSV"}</button></form>
    </header>
    {validationError && <p className="alert alert--error" role="alert">{validationError}</p>}
    {state === "loading" && <div className="panel report-state" aria-busy="true">در حال محاسبه گزارش…</div>}
    {state === "error" && <div className="alert alert--error report-state" role="alert">دریافت گزارش ممکن نشد. بازه و دسترسی شعبه را بررسی کنید.</div>}
    {state === "ready" && report && <><div className="kpi-grid kpi-grid--range" aria-label="خلاصه فروش بازه"><article className="kpi-card kpi-card--primary"><span>مجموع فروش</span><strong>{price(report.summary.sales_total)}</strong></article><article className="kpi-card"><span>تعداد صورتحساب</span><strong>{new Intl.NumberFormat("fa-IR").format(report.summary.invoice_count)}</strong></article><article className="kpi-card"><span>میانگین صورتحساب</span><strong>{price(report.summary.invoice_count ? Math.round(report.summary.sales_total / report.summary.invoice_count) : 0)}</strong></article></div><section className="panel receipt-table-panel"><div className="panel__heading"><div><h3>۲۰ کالای پرفروش</h3><span>{report.start_date} تا {report.end_date} · {report.timezone}</span></div></div>{report.top_items.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="جدول کالاهای پرفروش"><table className="receipt-table range-items-table"><thead><tr><th scope="col">رتبه</th><th scope="col">نام کالا</th><th scope="col">تعداد فروش</th><th scope="col">مبلغ فروش</th></tr></thead><tbody>{report.top_items.map((item, index) => <tr key={`${item.item_name}-${index}`}><td>{new Intl.NumberFormat("fa-IR").format(index + 1)}</td><td>{item.item_name}</td><td>{new Intl.NumberFormat("fa-IR").format(item.quantity_sold)}</td><td>{price(item.sales_total)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>فروشی در این بازه ثبت نشده است</h3><p>بازه دیگری انتخاب کنید یا پس از تسویه سفارش‌ها دوباره گزارش بگیرید.</p></div>}</section></>}
  </section>;
}
