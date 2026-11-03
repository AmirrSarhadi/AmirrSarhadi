import ReportDownloads from "../../../../components/ReportDownloads/ReportDownloads";
import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./ProfitLoss.module.css";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const PROFIT_LOSS_API = `${ACCOUNTING_BASE}/reports/profit-loss/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

export default function ProfitLoss() {
    const [incomeAccounts, setIncomeAccounts] = useState([]);
    const [expenseAccounts, setExpenseAccounts] = useState([]);
    const [summary, setSummary] = useState({
        total_income: 0,
        total_expense: 0,
        net_profit: 0,
        is_profit: true,
    });

    const [fiscalYears, setFiscalYears] = useState([]);
    const [fiscalYear, setFiscalYear] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchProfitLoss();
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

        if (fiscalYear) params.append("fiscal_year", fiscalYear);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [fyRes, reportRes] = await Promise.all([
                authFetch(FISCAL_YEARS_API),
                authFetch(`${PROFIT_LOSS_API}${buildQuery()}`),
            ]);

            const [fyData, reportData] = await Promise.all([
                safeJson(fyRes),
                safeJson(reportRes),
            ]);

            const fyList = normalizeResponse(fyData);

            setFiscalYears(fyList);
            setIncomeAccounts(reportData.income_accounts || []);
            setExpenseAccounts(reportData.expense_accounts || []);
            setSummary(reportData.summary || summary);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت گزارش سود و زیان");
        } finally {
            setLoading(false);
        }
    };

    const fetchProfitLoss = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${PROFIT_LOSS_API}${buildQuery()}`);
            const data = await safeJson(res);

            setIncomeAccounts(data.income_accounts || []);
            setExpenseAccounts(data.expense_accounts || []);
            setSummary(data.summary || summary);
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی گزارش سود و زیان");
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const selectedFiscalYear = useMemo(() => {
        return fiscalYears.find((item) => String(item.id) === String(fiscalYear));
    }, [fiscalYears, fiscalYear]);

    const printReport = () => {
        window.print();
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>گزارش سود و زیان</h3>
                    <p>درآمدها، هزینه‌ها و سود یا زیان خالص دوره مالی را مشاهده کن.</p>
                </div>

                <div className={styles.headerActions}>
                    <button type="button" className={styles.printBtn} onClick={printReport}>
                        چاپ گزارش
                    </button>

                    <button type="button" className={styles.refreshBtn} onClick={fetchProfitLoss}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <ReportDownloads url={`${ACCOUNTING_BASE}/reports/export/profit-loss/?${new URLSearchParams({ fiscal_year: fiscalYear })}`} filename="profit-loss" />

                <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
                    <option value="">همه سال‌های مالی</option>
                    {fiscalYears.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <span className={styles.periodBadge}>
                    دوره: {selectedFiscalYear ? selectedFiscalYear.name : "همه دوره‌ها"}
                </span>
            </div>

            <div className={styles.printArea}>
                <div className={styles.reportTitle}>
                    <h4>صورت سود و زیان</h4>
                    <p>{selectedFiscalYear ? `سال مالی ${selectedFiscalYear.name}` : "تمام سال‌های مالی"}</p>
                </div>

                <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                        <span>کل درآمد</span>
                        <strong className={styles.incomeText}>
                            {formatMoney(summary.total_income)} ریال
                        </strong>
                    </div>

                    <div className={styles.summaryCard}>
                        <span>کل هزینه</span>
                        <strong className={styles.expenseText}>
                            {formatMoney(summary.total_expense)} ریال
                        </strong>
                    </div>

                    <div
                        className={`${styles.summaryCard} ${summary.is_profit ? styles.profitCard : styles.lossCard
                            }`}
                    >
                        <span>{summary.is_profit ? "سود خالص" : "زیان خالص"}</span>
                        <strong>
                            {formatMoney(Math.abs(Number(summary.net_profit || 0)))} ریال
                        </strong>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.skeletonWrapper}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div className={styles.skeletonRow} key={index}>
                                <span />
                                <span />
                                <span />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.tablesGrid}>
                        <div className={styles.reportBox}>
                            <div className={styles.boxHeader}>
                                <h4>درآمدها</h4>
                                <strong>{formatMoney(summary.total_income)} ریال</strong>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>ردیف</th>
                                            <th>کد حساب</th>
                                            <th>نام حساب</th>
                                            <th>مبلغ</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {incomeAccounts.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className={styles.emptyState}>
                                                    درآمدی ثبت نشده است
                                                </td>
                                            </tr>
                                        ) : (
                                            incomeAccounts.map((item, index) => (
                                                <tr key={item.account_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.account_code}</td>
                                                    <td className={styles.nameCell}>{item.account_name}</td>
                                                    <td className={styles.incomeText}>
                                                        {formatMoney(item.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>

                                    <tfoot>
                                        <tr>
                                            <td colSpan="3">جمع درآمدها</td>
                                            <td>{formatMoney(summary.total_income)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className={styles.reportBox}>
                            <div className={styles.boxHeader}>
                                <h4>هزینه‌ها</h4>
                                <strong>{formatMoney(summary.total_expense)} ریال</strong>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>ردیف</th>
                                            <th>کد حساب</th>
                                            <th>نام حساب</th>
                                            <th>مبلغ</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {expenseAccounts.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className={styles.emptyState}>
                                                    هزینه‌ای ثبت نشده است
                                                </td>
                                            </tr>
                                        ) : (
                                            expenseAccounts.map((item, index) => (
                                                <tr key={item.account_id}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.account_code}</td>
                                                    <td className={styles.nameCell}>{item.account_name}</td>
                                                    <td className={styles.expenseText}>
                                                        {formatMoney(item.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>

                                    <tfoot>
                                        <tr>
                                            <td colSpan="3">جمع هزینه‌ها</td>
                                            <td>{formatMoney(summary.total_expense)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`${styles.finalResult} ${summary.is_profit ? styles.finalProfit : styles.finalLoss
                        }`}
                >
                    <span>{summary.is_profit ? "نتیجه دوره: سود" : "نتیجه دوره: زیان"}</span>
                    <strong>
                        {formatMoney(Math.abs(Number(summary.net_profit || 0)))} ریال
                    </strong>
                </div>
            </div>
        </div>
    );
}
