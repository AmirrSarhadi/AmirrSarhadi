import { firstErrorMessage } from "../../../utils/formErrors";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiCalendar, FiCheckCircle, FiCreditCard } from "react-icons/fi";
import { PageHero, StatGrid, StatCard, DataPanel, StatusBadge, LoadingState, EmptyState, SecondaryButton } from "../../../components/ERP";
import { API_BASE_URL } from "../../../api/http";
import styles from "./Installments.module.css";

const money = (v) => Number(v || 0).toLocaleString("fa-IR");
const fmt = (v) => v ? new Date(`${v}T00:00:00`).toLocaleDateString("fa-IR") : "—";

function ScheduleTable({ rows, overdue = false }) {
  if (!rows?.length) return <EmptyState title={overdue ? "قسط معوقی وجود ندارد" : "سررسیدی در ۳۰ روز آینده وجود ندارد"} />;
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>قرارداد</th><th>مشتری</th><th>فاکتور</th><th>قسط</th><th>سررسید</th><th>مبلغ</th><th>مانده</th><th>وضعیت</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><Link className={styles.linkButton} to={`/sales/installment/contracts/${r.contract_id}`}>#{r.contract_number}</Link></td><td>{r.customer_name}</td><td>{r.invoice_code}</td><td>{Number(r.sequence).toLocaleString("fa-IR")}</td><td>{fmt(r.due_date)}</td><td className={styles.money}>{money(r.amount)}</td><td className={styles.money}>{money(r.remaining_amount)}</td><td><StatusBadge tone={overdue ? "danger" : r.display_status === "PARTIAL" ? "warning" : "info"}>{r.status_label}</StatusBadge></td></tr>)}</tbody></table></div>;
}

export default function InstallmentReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setLoading(true); setError("");
    axios.get(`${API_BASE_URL}/incomes/api/v2/installment/report/`).then((r) => setData(r.data))
      .catch((err) => setError(firstErrorMessage(err.response?.data, "دریافت گزارش انجام نشد.")))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingState title="در حال آماده‌سازی گزارش اقساط..." />;
  if (error || !data) return <DataPanel title="دریافت گزارش ناموفق بود"><p role="alert" className={styles.error}>{error}</p><SecondaryButton type="button" onClick={load}>تلاش مجدد</SecondaryButton></DataPanel>;
  const s = data.summary || {};
  return <div className={styles.page}>
    <PageHero eyebrow="گزارش‌ها / فروش اقساطی" title="گزارش وضعیت اقساط" description="پایش قراردادهای فعال، مانده، اقساط سررسیدشده و تعهدات ۳۰ روز آینده." icon={<FiCalendar />} />
    <StatGrid><StatCard label="قراردادهای فعال" value={Number(s.active_contracts || 0).toLocaleString("fa-IR")} icon={<FiCalendar />} tone="info" /><StatCard label="اقساط معوق" value={Number(s.overdue_installments || 0).toLocaleString("fa-IR")} icon={<FiAlertTriangle />} tone="danger" /><StatCard label="مانده کل" value={`${money(s.remaining_total)} ریال`} icon={<FiCreditCard />} tone="warning" /><StatCard label="وصول کل" value={`${money(s.paid_total)} ریال`} icon={<FiCheckCircle />} tone="success" /></StatGrid>
    <div className={styles.reportColumns}><DataPanel title="اقساط معوق" description={`مانده معوق: ${money(s.overdue_amount)} ریال`}><ScheduleTable rows={data.overdue} overdue /></DataPanel><DataPanel title="سررسید ۳۰ روز آینده" description="اقساطی که باید در یک ماه آینده وصول شوند."><ScheduleTable rows={data.due_soon} /></DataPanel></div>
  </div>;
}
