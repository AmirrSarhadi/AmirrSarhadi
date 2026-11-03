import useModulePermission from "../../../hooks/useModulePermission";
import { firstErrorMessage } from "../../../utils/formErrors";
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiCreditCard, FiFileText, FiPlusCircle, FiSearch } from "react-icons/fi";
import { PageHero, StatGrid, StatCard, DataPanel, FilterBar, StatusBadge, PrimaryButton, SecondaryButton, EmptyState, LoadingState } from "../../../components/ERP";
import { API_BASE_URL, extractList } from "../../../api/http";
import styles from "./Installments.module.css";

const money = (v) => Number(v || 0).toLocaleString("fa-IR");
const fmt = (v) => v ? new Date(`${v}T00:00:00`).toLocaleDateString("fa-IR") : "—";
const tone = (s) => s === "COMPLETED" ? "success" : s === "CANCELLED" ? "danger" : "info";

export default function ContractList() {
  const navigate = useNavigate();
  const { canWrite } = useModulePermission("sales");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [summary, setSummary] = useState({});
  const [pageSize, setPageSize] = useState(50);
  const [error, setError] = useState("");

  const load = useCallback(async (signal) => {
    setLoading(true); setError("");
    try {
      const { data } = await axios.get(`${API_BASE_URL}/incomes/api/v2/installment/contracts/`, { params: { page, search, status }, signal });
      setRows(extractList(data)); setCount(data.count); setSummary(data.summary || {}); setPageSize(data.page_size || 50);
    } catch (err) {
      if (!axios.isCancel(err)) setError(firstErrorMessage(err.response?.data, "دریافت قراردادها انجام نشد."));
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, search, status]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => { load(controller.signal); }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [load]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (status && row.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [row.contract_number, row.invoice_code, row.invoice_reference, row.customer_name, row.customer_code]
      .some((v) => String(v ?? "").toLowerCase().includes(q));
  }), [rows, search, status]);

  const active = Number(summary.active_contracts || 0);
  const completed = Number(summary.completed_contracts || 0);
  const overdue = Number(summary.overdue_installments || 0);
  const remaining = Number(summary.remaining_total || 0);
  const pages = Math.max(1, Math.ceil(count / pageSize));


  return <div className={styles.page}>
    <PageHero eyebrow="فروش / اقساط" title="قراردادهای فروش اقساطی" description="کنترل مانده قرارداد، سررسیدها، وصول‌ها و اقساط معوق در یک نمای واحد." icon={<FiFileText />} actions={<PrimaryButton type="button" disabled={!canWrite} onClick={() => navigate("/sales/installment/contracts/new")}><FiPlusCircle /> قرارداد جدید</PrimaryButton>} />
    <StatGrid>
      <StatCard label="قراردادهای فعال" value={active.toLocaleString("fa-IR")} icon={<FiFileText />} tone="info" />
      <StatCard label="تسویه شده" value={completed.toLocaleString("fa-IR")} icon={<FiCheckCircle />} tone="success" />
      <StatCard label="اقساط معوق" value={overdue.toLocaleString("fa-IR")} icon={<FiAlertTriangle />} tone="danger" />
      <StatCard label="مانده کل" value={`${money(remaining)} ریال`} icon={<FiCreditCard />} tone="warning" />
    </StatGrid>
    <DataPanel title="فهرست قراردادها" description="برای مشاهده برنامه اقساط و ثبت وصول وارد جزئیات قرارداد شوید.">
      <FilterBar search={search} onSearch={(value) => { setPage(1); setSearch(value); }} searchPlaceholder="شماره قرارداد، فاکتور یا مشتری..." resultText={`${Number(count).toLocaleString("fa-IR")} نتیجه`} onClear={() => { setPage(1); setSearch(""); setStatus(""); }}>
        <select value={status} aria-label="وضعیت قرارداد" onChange={(e) => { setPage(1); setStatus(e.target.value); }}><option value="">همه وضعیت‌ها</option><option value="ACTIVE">فعال</option><option value="COMPLETED">تسویه شده</option><option value="CANCELLED">لغو شده</option></select>
      </FilterBar>
      {error ? <div role="alert" className={styles.error}>{error} <SecondaryButton type="button" onClick={() => load()}>تلاش مجدد</SecondaryButton></div> : loading ? <LoadingState title="در حال دریافت قراردادهای اقساطی..." /> : filtered.length === 0 ? <EmptyState title="قراردادی پیدا نشد" /> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>قرارداد</th><th>مشتری</th><th>فاکتور</th><th>تاریخ قرارداد</th><th>مبلغ تقسیط</th><th>مانده</th><th>سررسید بعدی</th><th>معوق</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>#{row.contract_number}</strong></td><td>{row.customer_name}</td><td>{row.invoice_code}</td><td>{fmt(row.contract_date)}</td><td className={styles.money}>{money(row.financed_amount)}</td><td className={styles.money}>{money(row.remaining_amount)}</td><td>{fmt(row.next_due_date)}</td><td className={Number(row.overdue_count) ? styles.overdue : styles.muted}>{Number(row.overdue_count || 0).toLocaleString("fa-IR")}</td><td><StatusBadge status={row.status} tone={tone(row.status)}>{row.status_label}</StatusBadge></td><td><Link className={styles.linkButton} to={`/sales/installment/contracts/${row.id}`}><FiSearch /> جزئیات</Link></td></tr>)}</tbody></table></div>}
      <nav className={styles.pagination} aria-label="صفحه‌بندی قراردادها"><SecondaryButton type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>قبلی</SecondaryButton><span>صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span><SecondaryButton type="button" disabled={loading || page >= pages} onClick={() => setPage((value) => value + 1)}>بعدی</SecondaryButton></nav>
    </DataPanel>
  </div>;
}
