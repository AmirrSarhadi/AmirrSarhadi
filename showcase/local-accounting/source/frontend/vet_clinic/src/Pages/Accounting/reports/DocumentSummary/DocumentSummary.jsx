import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./DocumentSummary.module.css";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const REPORT_API = `${ACCOUNTING_BASE}/reports/document-summary/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

export default function DocumentSummary() {
    const [loading, setLoading] = useState(true);

    const [groups, setGroups] = useState([]);
    const [unbalancedDocuments, setUnbalancedDocuments] = useState([]);

    const [summary, setSummary] = useState({
        total_documents: 0,
        approved_documents: 0,
        draft_documents: 0,
        locked_documents: 0,
        total_debit: 0,
        total_credit: 0,
        difference: 0,
        is_balanced: true,
        unbalanced_count: 0,
    });

    const [fiscalYears, setFiscalYears] = useState([]);

    const [filters, setFilters] = useState({
        fiscal_year: "",
        status: "",
        document_type: "",
        group_by: "month",
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

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

        if (filters.fiscal_year)
            params.append("fiscal_year", filters.fiscal_year);

        if (filters.status)
            params.append("status", filters.status);

        if (filters.document_type)
            params.append("document_type", filters.document_type);

        if (filters.group_by)
            params.append("group_by", filters.group_by);

        return `?${params.toString()}`;
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [fyRes, reportRes] = await Promise.all([
                authFetch(FISCAL_YEARS_API),
                authFetch(`${REPORT_API}${buildQuery()}`),
            ]);

            const [fyData, reportData] = await Promise.all([
                safeJson(fyRes),
                safeJson(reportRes),
            ]);

            setFiscalYears(normalizeResponse(fyData));

            setGroups(reportData.groups || []);
            setSummary(reportData.summary || {});
            setUnbalancedDocuments(reportData.unbalanced_documents || []);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت گزارش تجمیع اسناد");
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${REPORT_API}${buildQuery()}`);
            const data = await safeJson(res);

            setGroups(data.groups || []);
            setSummary(data.summary || {});
            setUnbalancedDocuments(data.unbalanced_documents || []);
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی گزارش");
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString("fa-IR");
    };

    const selectedFiscalYear = useMemo(() => {
        return fiscalYears.find(
            (item) => String(item.id) === String(filters.fiscal_year)
        );
    }, [fiscalYears, filters.fiscal_year]);

    const printReport = () => {
        window.print();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>گزارش تجمیع اسناد</h3>
                    <p>
                        خلاصه عملیات مالی، تعداد اسناد، گردش بدهکار و بستانکار و
                        وضعیت تراز اسناد را مشاهده کن.
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.printBtn}
                        onClick={printReport}
                    >
                        چاپ گزارش
                    </button>

                    <button
                        type="button"
                        className={styles.refreshBtn}
                        onClick={fetchReport}
                    >
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <select
                    value={filters.fiscal_year}
                    onChange={(e) => updateFilter("fiscal_year", e.target.value)}
                >
                    <option value="">همه سال‌های مالی</option>

                    {fiscalYears.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                >
                    <option value="">همه وضعیت‌ها</option>
                    <option value="DRAFT">پیش نویس</option>
                    <option value="APPROVED">تایید شده</option>
                </select>

                <select
                    value={filters.document_type}
                    onChange={(e) => updateFilter("document_type", e.target.value)}
                >
                    <option value="">همه انواع سند</option>
                    <option value="MANUAL">دستی</option>
                    <option value="AUTO">اتوماتیک</option>
                </select>

                <select
                    value={filters.group_by}
                    onChange={(e) => updateFilter("group_by", e.target.value)}
                >
                    <option value="month">تجمیع ماهانه</option>
                    <option value="day">تجمیع روزانه</option>
                </select>

                <span className={styles.periodBadge}>
                    {selectedFiscalYear
                        ? `سال مالی ${selectedFiscalYear.name}`
                        : "همه دوره‌ها"}
                </span>
            </div>

            <div className={styles.printArea}>
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                        <span>تعداد اسناد</span>
                        <strong>{summary.total_documents}</strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>اسناد تایید شده</span>
                        <strong className={styles.greenText}>
                            {summary.approved_documents}
                        </strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>اسناد پیش نویس</span>
                        <strong className={styles.orangeText}>
                            {summary.draft_documents}
                        </strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>اسناد قفل شده</span>
                        <strong>{summary.locked_documents}</strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>جمع بدهکار</span>
                        <strong className={styles.greenText}>
                            {formatMoney(summary.total_debit)}
                        </strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>جمع بستانکار</span>
                        <strong className={styles.redText}>
                            {formatMoney(summary.total_credit)}
                        </strong>
                    </div>
                </div>

                <div
                    className={`${styles.balanceBox} ${summary.is_balanced
                            ? styles.balanceSuccess
                            : styles.balanceDanger
                        }`}
                >
                    <div>
                        <span>اختلاف تراز</span>
                        <strong>
                            {formatMoney(Math.abs(summary.difference || 0))}
                        </strong>
                    </div>

                    <div>
                        {summary.is_balanced
                            ? "اسناد تراز هستند"
                            : "اسناد نامتوازن وجود دارد"}
                    </div>
                </div>

                <div className={styles.reportSection}>
                    <div className={styles.sectionHeader}>
                        <h4>
                            {filters.group_by === "day"
                                ? "تجمیع روزانه"
                                : "تجمیع ماهانه"}
                        </h4>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>دوره</th>
                                    <th>تعداد اسناد</th>
                                    <th>جمع بدهکار</th>
                                    <th>جمع بستانکار</th>
                                    <th>اختلاف</th>
                                    <th>وضعیت</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!loading && groups.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className={styles.emptyState}>
                                            اطلاعاتی یافت نشد
                                        </td>
                                    </tr>
                                )}

                                {groups.map((item, index) => (
                                    <tr key={index}>
                                        <td>{item.period}</td>

                                        <td>{item.count}</td>

                                        <td className={styles.greenText}>
                                            {formatMoney(item.total_debit)}
                                        </td>

                                        <td className={styles.redText}>
                                            {formatMoney(item.total_credit)}
                                        </td>

                                        <td>
                                            {formatMoney(
                                                Math.abs(item.difference || 0)
                                            )}
                                        </td>

                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${item.is_balanced
                                                        ? styles.statusSuccess
                                                        : styles.statusDanger
                                                    }`}
                                            >
                                                {item.is_balanced
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

                {unbalancedDocuments.length > 0 && (
                    <div className={styles.reportSection}>
                        <div className={styles.sectionHeader}>
                            <h4>اسناد نامتوازن</h4>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>شماره سند</th>
                                        <th>تاریخ</th>
                                        <th>شرح</th>
                                        <th>بدهکار</th>
                                        <th>بستانکار</th>
                                        <th>اختلاف</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {unbalancedDocuments.map((doc) => (
                                        <tr key={doc.id}>
                                            <td>{doc.number}</td>

                                            <td>{doc.date}</td>

                                            <td className={styles.descriptionCell}>
                                                {doc.description || "-"}
                                            </td>

                                            <td className={styles.greenText}>
                                                {formatMoney(doc.total_debit)}
                                            </td>

                                            <td className={styles.redText}>
                                                {formatMoney(doc.total_credit)}
                                            </td>

                                            <td className={styles.redText}>
                                                {formatMoney(doc.difference)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}