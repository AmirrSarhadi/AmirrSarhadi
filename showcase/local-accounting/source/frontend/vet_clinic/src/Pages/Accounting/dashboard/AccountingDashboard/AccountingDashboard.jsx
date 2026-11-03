import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./AccountingDashboard.module.css";
import { FiPieChart, FiRefreshCw, FiFileText, FiCheckCircle, FiEdit3, FiLock } from "react-icons/fi";
import { PageHero, StatGrid, StatCard, SecondaryButton } from "../../../../components/ERP";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const DASHBOARD_API = `${ACCOUNTING_BASE}/dashboard/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

export default function AccountingDashboard() {
    const [loading, setLoading] = useState(true);

    const [summary, setSummary] = useState({});
    const [recentDocuments, setRecentDocuments] = useState([]);

    const [fiscalYears, setFiscalYears] = useState([]);
    const [fiscalYear, setFiscalYear] = useState("");

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fiscalYear]);

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            console.error("Response is not JSON:", text);
            throw new Error(`Invalid JSON response: ${res.url}`);
        }
    };

    const normalizeResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    };

    const buildQuery = () => {
        const params = new URLSearchParams();

        if (fiscalYear) {
            params.append("fiscal_year", fiscalYear);
        }

        const query = params.toString();

        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [fyRes, dashboardRes] = await Promise.all([
                authFetch(FISCAL_YEARS_API),
                authFetch(`${DASHBOARD_API}${buildQuery()}`),
            ]);

            const [fyData, dashboardData] = await Promise.all([
                safeJson(fyRes),
                safeJson(dashboardRes),
            ]);

            setFiscalYears(normalizeResponse(fyData));

            setSummary(dashboardData.summary || {});
            setRecentDocuments(dashboardData.recent_documents || []);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت داشبورد حسابداری");
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboard = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${DASHBOARD_API}${buildQuery()}`);
            const data = await safeJson(res);

            setSummary(data.summary || {});
            setRecentDocuments(data.recent_documents || []);
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی داشبورد");
        } finally {
            setLoading(false);
        }
    };

    const selectedFiscalYear = useMemo(() => {
        return fiscalYears.find(
            (item) => String(item.id) === String(fiscalYear)
        );
    }, [fiscalYears, fiscalYear]);

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString("fa-IR");
    };

    return (
        <div className={styles.container}>
            <PageHero eyebrow="حسابداری / نمای مدیریتی" title="داشبورد حسابداری" description="خلاصه وضعیت مالی، تراز سیستم و آخرین اسناد ثبت‌شده در دوره انتخابی." icon={<FiPieChart />} actions={<><select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}><option value="">همه سال‌های مالی</option>{fiscalYears.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><SecondaryButton type="button" onClick={fetchDashboard}><FiRefreshCw /> بروزرسانی</SecondaryButton></>} />

            <div className={styles.activePeriod}>
                <span>
                    دوره فعال:
                </span>

                <strong>
                    {selectedFiscalYear
                        ? selectedFiscalYear.name
                        : "همه دوره‌ها"}
                </strong>
            </div>

            <StatGrid>
                <StatCard label="تعداد اسناد" value={Number(summary.total_documents || 0).toLocaleString("fa-IR")} hint="کل اسناد دوره" icon={<FiFileText />} />
                <StatCard label="تایید شده" value={Number(summary.approved_documents || 0).toLocaleString("fa-IR")} hint="اسناد نهایی‌شده" icon={<FiCheckCircle />} tone="success" />
                <StatCard label="پیش‌نویس" value={Number(summary.draft_documents || 0).toLocaleString("fa-IR")} hint="نیازمند بررسی یا تایید" icon={<FiEdit3 />} tone="warning" />
                <StatCard label="قفل شده" value={Number(summary.locked_documents || 0).toLocaleString("fa-IR")} hint="غیرقابل ویرایش" icon={<FiLock />} tone="info" />
            </StatGrid>

            <div className={styles.financeGrid}>
                <div className={styles.financeCard}>
                    <span>دارایی‌ها</span>

                    <strong className={styles.greenText}>
                        {formatMoney(summary.total_assets)}
                    </strong>
                </div>

                <div className={styles.financeCard}>
                    <span>بدهی‌ها</span>

                    <strong className={styles.redText}>
                        {formatMoney(summary.total_liabilities)}
                    </strong>
                </div>

                <div className={styles.financeCard}>
                    <span>حقوق صاحبان سهام</span>

                    <strong className={styles.blueText}>
                        {formatMoney(summary.total_equity)}
                    </strong>
                </div>

                <div
                    className={`${styles.financeCard} ${summary.is_profit
                            ? styles.profitCard
                            : styles.lossCard
                        }`}
                >
                    <span>
                        {summary.is_profit
                            ? "سود خالص"
                            : "زیان خالص"}
                    </span>

                    <strong>
                        {formatMoney(
                            Math.abs(summary.net_profit || 0)
                        )}
                    </strong>
                </div>
            </div>

            <div
                className={`${styles.balanceStatus} ${summary.is_balanced
                        ? styles.balanceSuccess
                        : styles.balanceDanger
                    }`}
            >
                <div>
                    <span>وضعیت تراز سیستم</span>

                    <strong>
                        {summary.is_balanced
                            ? "سیستم تراز است"
                            : "اختلاف حسابداری وجود دارد"}
                    </strong>
                </div>

                <div className={styles.balanceNumbers}>
                    <div>
                        <small>جمع بدهکار</small>

                        <b>
                            {formatMoney(summary.total_debit)}
                        </b>
                    </div>

                    <div>
                        <small>جمع بستانکار</small>

                        <b>
                            {formatMoney(summary.total_credit)}
                        </b>
                    </div>
                </div>
            </div>

            <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                    <h3>آخرین اسناد ثبت شده</h3>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>شماره</th>
                                <th>تاریخ</th>
                                <th>شرح</th>
                                <th>نوع</th>
                                <th>وضعیت</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>تراز</th>
                            </tr>
                        </thead>

                        <tbody>
                            {!loading && recentDocuments.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className={styles.emptyState}
                                    >
                                        سندی ثبت نشده است
                                    </td>
                                </tr>
                            )}

                            {recentDocuments.map((doc) => (
                                <tr key={doc.id}>
                                    <td>{doc.number}</td>

                                    <td>{doc.date}</td>

                                    <td className={styles.descriptionCell}>
                                        {doc.description || "-"}
                                    </td>

                                    <td>
                                        <span className={styles.typeBadge}>
                                            {doc.document_type_display}
                                        </span>
                                    </td>

                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${doc.status === "APPROVED"
                                                    ? styles.statusApproved
                                                    : styles.statusDraft
                                                }`}
                                        >
                                            {doc.status_display}
                                        </span>
                                    </td>

                                    <td className={styles.greenText}>
                                        {formatMoney(doc.total_debit)}
                                    </td>

                                    <td className={styles.redText}>
                                        {formatMoney(doc.total_credit)}
                                    </td>

                                    <td>
                                        <span
                                            className={`${styles.balanceBadge} ${doc.is_balanced
                                                    ? styles.balanceOk
                                                    : styles.balanceError
                                                }`}
                                        >
                                            {doc.is_balanced
                                                ? "تراز"
                                                : "نامتوازن"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}