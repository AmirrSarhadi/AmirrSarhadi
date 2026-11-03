import ReportDownloads from "../../../../components/ReportDownloads/ReportDownloads";
import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./TrialBalance.module.css";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const TRIAL_BALANCE_API = `${ACCOUNTING_BASE}/trial-balance/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

const ACCOUNT_TYPES = [
    { value: "ASSET", label: "دارایی‌ها" },
    { value: "LIABILITY", label: "بدهی‌ها" },
    { value: "EQUITY", label: "حقوق صاحبان سهام" },
    { value: "COGS", label: "بهای تمام شده کالای فروخته شده" },
    { value: "SALE", label: "فروش" },
    { value: "INCOME", label: "درآمد" },
    { value: "EXPENSE", label: "هزینه‌ها" },
    { value: "OTHER", label: "سایر حساب‌ها" },
];

export default function TrialBalance() {
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({
        debit: 0,
        credit: 0,
        debit_balance: 0,
        credit_balance: 0,
        is_balanced: true,
    });

    const [fiscalYears, setFiscalYears] = useState([]);
    const [fiscalYear, setFiscalYear] = useState("");
    const [status, setStatus] = useState("");
    const [accountType, setAccountType] = useState("");
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchTrialBalance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fiscalYear, status, accountType]);

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
        if (status) params.append("status", status);
        if (accountType) params.append("account_type", accountType);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [tbRes, fyRes] = await Promise.all([
                authFetch(`${TRIAL_BALANCE_API}${buildQuery()}`),
                authFetch(FISCAL_YEARS_API),
            ]);

            const [tbData, fyData] = await Promise.all([
                safeJson(tbRes),
                safeJson(fyRes),
            ]);

            setRows(normalizeResponse(tbData));
            setTotals(tbData?.totals || totals);
            setFiscalYears(normalizeResponse(fyData));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت تراز آزمایشی");
        } finally {
            setLoading(false);
        }
    };

    const fetchTrialBalance = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${TRIAL_BALANCE_API}${buildQuery()}`);
            const data = await safeJson(res);

            setRows(normalizeResponse(data));
            setTotals(data?.totals || totals);
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی تراز آزمایشی");
        } finally {
            setLoading(false);
        }
    };

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return rows;

        return rows.filter((item) => {
            return (
                String(item.account_code || "").toLowerCase().includes(q) ||
                String(item.account_name || "").toLowerCase().includes(q) ||
                String(item.account_type_display || "").toLowerCase().includes(q)
            );
        });
    }, [rows, search]);

    const filteredTotals = useMemo(() => {
        return filteredRows.reduce(
            (acc, item) => {
                acc.debit += Number(item.debit || 0);
                acc.credit += Number(item.credit || 0);
                acc.debit_balance += Number(item.debit_balance || 0);
                acc.credit_balance += Number(item.credit_balance || 0);
                return acc;
            },
            {
                debit: 0,
                credit: 0,
                debit_balance: 0,
                credit_balance: 0,
            }
        );
    }, [filteredRows]);

    const isFilteredBalanced =
        Math.round((filteredTotals.debit - filteredTotals.credit) * 100) / 100 === 0;

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const clearFilters = () => {
        setFiscalYear("");
        setStatus("");
        setAccountType("");
        setSearch("");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>تراز آزمایشی</h3>
                    <p>خلاصه گردش بدهکار و بستانکار حساب‌ها و مانده هر حساب.</p>
                </div>

                <button
                    type="button"
                    className={styles.refreshBtn}
                    onClick={fetchTrialBalance}
                >
                    بروزرسانی گزارش
                </button>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span>جمع بدهکار</span>
                    <strong>{formatMoney(totals.debit)}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>جمع بستانکار</span>
                    <strong>{formatMoney(totals.credit)}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>مانده بدهکار</span>
                    <strong className={styles.debitText}>
                        {formatMoney(totals.debit_balance)}
                    </strong>
                </div>

                <div className={styles.statCard}>
                    <span>مانده بستانکار</span>
                    <strong className={styles.creditText}>
                        {formatMoney(totals.credit_balance)}
                    </strong>
                </div>
            </div>

            <div className={styles.toolbar}>
                <ReportDownloads url={`${ACCOUNTING_BASE}/reports/export/trial-balance/?${new URLSearchParams({ fiscal_year: fiscalYear, status, account_type: accountType })}`} filename="trial-balance" />

                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس کد یا نام حساب..."
                    />
                </div>

                <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
                    <option value="">همه سال‌ها</option>
                    {fiscalYears.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">همه وضعیت‌ها</option>
                    <option value="DRAFT">پیش نویس</option>
                    <option value="APPROVED">تایید شده</option>
                </select>

                <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                    <option value="">همه نوع حساب‌ها</option>
                    {ACCOUNT_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن فیلتر
                </button>
            </div>

            <div className={styles.statusBox}>
                <span>وضعیت تراز کل:</span>
                <strong className={totals.is_balanced ? styles.balanced : styles.notBalanced}>
                    {totals.is_balanced ? "تراز" : "نامتوازن"}
                </strong>

                <span>وضعیت تراز فیلتر فعلی:</span>
                <strong className={isFilteredBalanced ? styles.balanced : styles.notBalanced}>
                    {isFilteredBalanced ? "تراز" : "نامتوازن"}
                </strong>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>کد حساب</th>
                                <th>نام حساب</th>
                                <th>نوع حساب</th>
                                <th>قابل ثبت</th>
                                <th>گردش بدهکار</th>
                                <th>گردش بستانکار</th>
                                <th>مانده بدهکار</th>
                                <th>مانده بستانکار</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className={styles.emptyState}>
                                        <strong>اطلاعاتی برای نمایش وجود ندارد</strong>
                                        <p>فیلترها را تغییر بده یا سند جدید ثبت کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((item, index) => (
                                    <tr key={item.account_id}>
                                        <td>{index + 1}</td>

                                        <td className={styles.codeCell}>{item.account_code}</td>

                                        <td className={styles.nameCell}>{item.account_name}</td>

                                        <td>
                                            <span className={styles.typeBadge}>
                                                {item.account_type_display || item.account_type}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`${styles.postableBadge} ${item.is_postable ? styles.yesBadge : styles.noBadge
                                                    }`}
                                            >
                                                {item.is_postable ? "بله" : "خیر"}
                                            </span>
                                        </td>

                                        <td>{formatMoney(item.debit)}</td>
                                        <td>{formatMoney(item.credit)}</td>

                                        <td>
                                            <span className={styles.debitBadge}>
                                                {formatMoney(item.debit_balance)}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={styles.creditBadge}>
                                                {formatMoney(item.credit_balance)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="5">جمع فیلتر فعلی</td>
                                <td>{formatMoney(filteredTotals.debit)}</td>
                                <td>{formatMoney(filteredTotals.credit)}</td>
                                <td>{formatMoney(filteredTotals.debit_balance)}</td>
                                <td>{formatMoney(filteredTotals.credit_balance)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
