import ReportDownloads from "../../../../components/ReportDownloads/ReportDownloads";
import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./BalanceSheet.module.css";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const BALANCE_SHEET_API = `${ACCOUNTING_BASE}/reports/balance-sheet/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

export default function BalanceSheet() {
    const [assets, setAssets] = useState([]);
    const [liabilities, setLiabilities] = useState([]);
    const [equity, setEquity] = useState([]);

    const [summary, setSummary] = useState({
        total_assets: 0,
        total_liabilities: 0,
        total_equity: 0,
        right_side: 0,
        difference: 0,
        is_balanced: true,
    });

    const [fiscalYears, setFiscalYears] = useState([]);
    const [fiscalYear, setFiscalYear] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchBalanceSheet();
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
                authFetch(`${BALANCE_SHEET_API}${buildQuery()}`),
            ]);

            const [fyData, reportData] = await Promise.all([
                safeJson(fyRes),
                safeJson(reportRes),
            ]);

            setFiscalYears(normalizeResponse(fyData));
            setAssets(reportData.assets || []);
            setLiabilities(reportData.liabilities || []);
            setEquity(reportData.equity || []);
            setSummary(reportData.summary || summary);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت ترازنامه");
        } finally {
            setLoading(false);
        }
    };

    const fetchBalanceSheet = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${BALANCE_SHEET_API}${buildQuery()}`);
            const data = await safeJson(res);

            setAssets(data.assets || []);
            setLiabilities(data.liabilities || []);
            setEquity(data.equity || []);
            setSummary(data.summary || summary);
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی ترازنامه");
        } finally {
            setLoading(false);
        }
    };

    const selectedFiscalYear = useMemo(() => {
        return fiscalYears.find((item) => String(item.id) === String(fiscalYear));
    }, [fiscalYears, fiscalYear]);

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const printReport = () => {
        window.print();
    };

    const renderRows = (rows, emptyText, typeClass) => {
        if (rows.length === 0) {
            return (
                <tr>
                    <td colSpan="3" className={styles.emptyState}>
                        {emptyText}
                    </td>
                </tr>
            );
        }

        return rows.map((item) => (
            <tr key={item.account_id}>
                <td>{item.account_code}</td>
                <td className={styles.nameCell}>{item.account_name}</td>
                <td className={typeClass}>{formatMoney(item.amount)}</td>
            </tr>
        ));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>ترازنامه</h3>
                    <p>وضعیت دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام را مشاهده کن.</p>
                </div>

                <div className={styles.headerActions}>
                    <button type="button" className={styles.printBtn} onClick={printReport}>
                        چاپ گزارش
                    </button>

                    <button type="button" className={styles.refreshBtn} onClick={fetchBalanceSheet}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <ReportDownloads url={`${ACCOUNTING_BASE}/reports/export/balance-sheet/?${new URLSearchParams({ fiscal_year: fiscalYear })}`} filename="balance-sheet" />

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
                    <h4>ترازنامه</h4>
                    <p>{selectedFiscalYear ? `سال مالی ${selectedFiscalYear.name}` : "تمام سال‌های مالی"}</p>
                </div>

                <div className={styles.formulaRow}>
                    <div className={`${styles.formulaCard} ${styles.assetCard}`}>
                        <span>دارایی‌ها</span>
                        <strong>{formatMoney(summary.total_assets)} ریال</strong>
                    </div>

                    <div className={styles.operator}>=</div>

                    <div className={`${styles.formulaCard} ${styles.rightCard}`}>
                        <span>بدهی‌ها + حقوق صاحبان سهام</span>
                        <strong>{formatMoney(summary.right_side)} ریال</strong>
                    </div>
                </div>

                <div className={styles.balanceStatus}>
                    <span>اختلاف تراز:</span>
                    <strong className={summary.is_balanced ? styles.balanced : styles.notBalanced}>
                        {formatMoney(Math.abs(Number(summary.difference || 0)))} ریال
                    </strong>

                    <span
                        className={
                            summary.is_balanced
                                ? styles.balancedLabel
                                : styles.notBalancedLabel
                        }
                    >
                        {summary.is_balanced ? "تراز است" : "تراز نیست"}
                    </span>
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
                                <h4>دارایی‌ها</h4>
                                <strong>{formatMoney(summary.total_assets)} ریال</strong>
                            </div>

                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>کد</th>
                                        <th>حساب</th>
                                        <th>مبلغ</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {renderRows(assets, "دارایی‌ای ثبت نشده است", styles.assetText)}
                                </tbody>

                                <tfoot>
                                    <tr>
                                        <td colSpan="2">جمع دارایی‌ها</td>
                                        <td>{formatMoney(summary.total_assets)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className={styles.rightSide}>
                            <div className={styles.reportBox}>
                                <div className={styles.boxHeader}>
                                    <h4>بدهی‌ها</h4>
                                    <strong>{formatMoney(summary.total_liabilities)} ریال</strong>
                                </div>

                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>کد</th>
                                            <th>حساب</th>
                                            <th>مبلغ</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {renderRows(liabilities, "بدهی‌ای ثبت نشده است", styles.liabilityText)}
                                    </tbody>

                                    <tfoot>
                                        <tr>
                                            <td colSpan="2">جمع بدهی‌ها</td>
                                            <td>{formatMoney(summary.total_liabilities)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className={styles.reportBox}>
                                <div className={styles.boxHeader}>
                                    <h4>حقوق صاحبان سهام</h4>
                                    <strong>{formatMoney(summary.total_equity)} ریال</strong>
                                </div>

                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>کد</th>
                                            <th>حساب</th>
                                            <th>مبلغ</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {renderRows(equity, "سرمایه‌ای ثبت نشده است", styles.equityText)}
                                    </tbody>

                                    <tfoot>
                                        <tr>
                                            <td colSpan="2">جمع حقوق صاحبان سهام</td>
                                            <td>{formatMoney(summary.total_equity)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className={styles.rightSideTotal}>
                                <span>جمع بدهی‌ها و حقوق صاحبان سهام</span>
                                <strong>{formatMoney(summary.right_side)} ریال</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
