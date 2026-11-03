import { useCallback, useEffect, useRef, useState } from "react";

import { api, Branch, DailySalesReport as DailySalesReportData } from "../shared/api";

const formatPrice = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });

export function DailySalesReport({ branch: activeBranch, cafeId }: { branch?: Branch; cafeId: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(today);
  const [report, setReport] = useState<DailySalesReportData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const requestSequence = useRef(0);
  const loadReport = useCallback(async (nextBranchId: string, nextDate: string) => {
    const sequence = ++requestSequence.current;
    if (!nextDate || !nextBranchId) { setState("error"); return; }
    setState("loading");
    try {
      const nextReport = await api.dailySalesReport(nextBranchId, nextDate);
      if (sequence === requestSequence.current) { setReport(nextReport); setState("ready"); }
    } catch { if (sequence === requestSequence.current) setState("error"); }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextBranches = activeBranch ? [activeBranch] : await api.branches(cafeId);
        if (!active) return;
        setBranches(nextBranches);
        const nextBranchId = nextBranches[0]?.id ?? "";
        setBranchId(nextBranchId);
        if (nextBranchId) { setDate(today()); await loadReport(nextBranchId, today()); } else setState("ready");
      } catch { if (active) setState("error"); }
    })();
    return () => { active = false; requestSequence.current += 1; };
  }, [activeBranch, cafeId, loadReport]);

  if (!branches.length && state === "ready") return <section className="empty-state"><h2>شعبه‌ای برای گزارش وجود ندارد</h2></section>;

  return <section className="report-dashboard daily-report">
    <header className="panel report-toolbar section-heading"><div><h2>فروش روزانه شعبه</h2></div><div className="report-filters"><label htmlFor="reportDate">تاریخ میلادی<input id="reportDate" type="date" value={date} onChange={(event) => { const value = event.target.value; setDate(value); void loadReport(branchId, value); }}/></label></div></header>
    {state === "loading" && <div className="panel report-state" aria-busy="true">در حال محاسبه گزارش…</div>}
    {state === "error" && <div className="alert alert--error report-state" role="alert">دریافت گزارش ممکن نشد. تاریخ و دسترسی شعبه را بررسی کنید.</div>}
    {state === "ready" && report && <><div className="kpi-grid" aria-label="خلاصه فروش"><article className="kpi-card kpi-card--primary"><span>فروش تسویه‌شده</span><strong>{formatPrice(report.summary.sales_total)}</strong></article><article className="kpi-card"><span>تعداد صورتحساب</span><strong>{new Intl.NumberFormat("fa-IR").format(report.summary.invoice_count)}</strong></article><article className="kpi-card"><span>میانگین صورتحساب</span><strong>{formatPrice(report.summary.average_invoice)}</strong></article><article className="kpi-card"><span>سفارش لغوشده</span><strong>{new Intl.NumberFormat("fa-IR").format(report.summary.cancelled_count)}</strong></article></div>
      <div className="report-grid"><section className="panel payment-breakdown"><div className="panel__heading"><div><h3>تفکیک پرداخت</h3><span>جمع روش‌های پرداخت</span></div></div><dl><div><dt>کارت‌خوان</dt><dd>{formatPrice(report.summary.payments.card)}</dd></div><div><dt>کارت به کارت</dt><dd>{formatPrice(report.summary.payments.card_to_card ?? 0)}</dd></div><div><dt>نقدی</dt><dd>{formatPrice(report.summary.payments.cash)}</dd></div></dl></section><section className="panel receipt-table-panel"><div className="panel__heading"><div><h3>صورتحساب‌های روز</h3><span>{report.receipts.length} ردیف · {report.timezone}</span></div></div>{report.receipts.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="جدول صورتحساب‌های روز"><table className="receipt-table"><caption className="sr-only">صورتحساب‌های روز</caption><thead><tr><th scope="col">شماره صورتحساب</th><th scope="col">میز / بیرون‌بر</th><th scope="col">مشتری</th><th scope="col">روش پرداخت</th><th scope="col">مبلغ</th></tr></thead><tbody>{report.receipts.map((receipt) => <tr key={receipt.id}><td data-label="شماره صورتحساب"><bdi title={receipt.receipt_number}>{receipt.receipt_number.slice(-10)}</bdi></td><td data-label="میز / بیرون‌بر">{receipt.table_label}</td><td data-label="مشتری">{receipt.customer_name || "مهمان"}</td><td data-label="روش پرداخت">{receipt.payments.map((payment) => payment.method_label).join(" + ")}</td><td data-label="مبلغ">{formatPrice(receipt.total)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><h3>فروشی ثبت نشده است</h3><p>در این روز صورتحساب تسویه‌شده‌ای وجود ندارد.</p></div>}</section></div></>}
  </section>;
}
