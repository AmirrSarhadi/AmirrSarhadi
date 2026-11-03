import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "../CommercialReports/CommercialReport.module.css";

const REPORT_TITLES = {
    bank: {
        title: "گردش حساب بانک",
        description: "گزارش ورود و خروج وجه از حساب‌های بانکی، شامل انتقال‌های بانکی و اسناد خزانه.",
        accountLabel: "بانک",
    },
    cashbox: {
        title: "گردش حساب صندوق",
        description: "گزارش ورود و خروج وجه از صندوق‌ها، شامل دریافت، پرداخت و انتقال‌های داخلی.",
        accountLabel: "صندوق",
    },
    imprest: {
        title: "گردش حساب تنخواه‌گردان",
        description: "گزارش گردش تنخواه‌گردان‌ها بر اساس دریافت، پرداخت، انتقال و اسناد خزانه.",
        accountLabel: "تنخواه‌گردان",
    },
};

export default function TreasuryLedgerReport({ treasuryType = "bank" }) {
    const meta = REPORT_TITLES[treasuryType];

    const [accounts, setAccounts] = useState([]);
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);

    const [treasuryId, setTreasuryId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [nature, setNature] = useState("");
    const [search, setSearch] = useState("");

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";

        return Number(value).toLocaleString("fa-IR");
    };

    const formatNumber = (value) => {
        if (value === null || value === undefined || value === "") return "0";

        return Number(value).toLocaleString("fa-IR", {
            maximumFractionDigits: 3,
        });
    };

    const formatDate = (value) => {
        if (!value) return "-";
        return String(value).split("T")[0];
    };

    const buildQuery = () => {
        const params = new URLSearchParams();

        params.append("treasury_type", treasuryType);

        if (treasuryId) params.append("treasury_id", treasuryId);
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
        if (nature) params.append("nature", nature);
        if (search.trim()) params.append("search", search.trim());

        return `?${params.toString()}`;
    };

    const fetchReport = async () => {
        try {
            setLoading(true);

            const res = await authFetch(
                `${API_BASE_URL}/banking/api/v2/reports/treasury-ledger/${buildQuery()}`
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.detail || "خطا در دریافت گزارش");
            }

            setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
            setRows(Array.isArray(data.rows) ? data.rows : []);
            setSummary(data.summary || {});
        } catch (error) {
            console.error(error);
            alert("خطا در دریافت گزارش گردش حساب");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setTreasuryId("");
        setDateFrom("");
        setDateTo("");
        setNature("");
        setSearch("");
    }, [treasuryType]);

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [treasuryType]);

    const stats = useMemo(() => {
        return [
            {
                label: "تعداد حساب",
                value: formatNumber(summary.account_count),
            },
            {
                label: "مانده اول دوره",
                value: formatMoney(summary.opening_balance),
            },
            {
                label: "جمع واریز",
                value: formatMoney(summary.total_debit),
                positive: true,
            },
            {
                label: "جمع برداشت",
                value: formatMoney(summary.total_credit),
                danger: true,
            },
            {
                label: "کارمزد بانکی",
                value: formatMoney(summary.total_bank_fee),
                danger: true,
            },
            {
                label: "مانده پایان دوره",
                value: formatMoney(summary.ending_balance),
            },
        ];
    }, [summary]);

    const clearFilters = () => {
        setTreasuryId("");
        setDateFrom("");
        setDateTo("");
        setNature("");
        setSearch("");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>{meta.title}</h3>
                    <p>{meta.description}</p>
                </div>

                <button type="button" className={styles.refreshBtn} onClick={fetchReport}>
                    بروزرسانی گزارش
                </button>
            </div>

            <div className={styles.statsGrid}>
                {stats.map((item) => (
                    <div key={item.label} className={styles.statCard}>
                        <span>{item.label}</span>
                        <strong
                            className={
                                item.danger
                                    ? styles.dangerText
                                    : item.positive
                                        ? styles.positiveText
                                        : ""
                            }
                        >
                            {item.value}
                        </strong>
                    </div>
                ))}
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس شماره، شرح، طرف حساب، سند یا نوع تراکنش..."
                    />
                </div>

                <select
                    value={treasuryId}
                    onChange={(e) => setTreasuryId(e.target.value)}
                >
                    <option value="">همه {meta.accountLabel}ها</option>

                    {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                            {account.name}
                        </option>
                    ))}
                </select>

                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    title="از تاریخ"
                />

                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    title="تا تاریخ"
                />

                <select value={nature} onChange={(e) => setNature(e.target.value)}>
                    <option value="">همه گردش‌ها</option>
                    <option value="debit">فقط واریز</option>
                    <option value="credit">فقط برداشت</option>
                </select>

                <button type="button" className={styles.applyBtn} onClick={fetchReport}>
                    اعمال فیلتر
                </button>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن
                </button>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className={styles.skeletonRow}>
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
                                <th>تاریخ</th>
                                <th>نوع منبع</th>
                                <th>شماره</th>
                                <th>{meta.accountLabel}</th>
                                <th>طرف حساب</th>
                                <th>ماهیت</th>
                                <th>شرح</th>
                                <th>واریز</th>
                                <th>برداشت</th>
                                <th>کارمزد</th>
                                <th>مانده بعد از تراکنش</th>
                                <th>سند حسابداری</th>
                                <th>وضعیت</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className={styles.emptyState}>
                                        <strong>اطلاعاتی برای نمایش وجود ندارد</strong>
                                        <p>فیلترها را تغییر بده یا تراکنش/سند خزانه ثبت کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>{formatDate(item.date)}</td>
                                        <td>{item.source_label}</td>
                                        <td className={styles.codeCell}>{item.number}</td>
                                        <td className={styles.nameCell}>{item.account_name}</td>
                                        <td>{item.counterparty || "-"}</td>
                                        <td>
                                            <span className={styles.statusBadge}>
                                                {item.direction}
                                            </span>
                                        </td>
                                        <td>{item.description || "-"}</td>
                                        <td className={styles.positiveText}>
                                            {formatMoney(item.debit)}
                                        </td>
                                        <td className={styles.dangerText}>
                                            {formatMoney(item.credit)}
                                        </td>
                                        <td className={styles.dangerText}>
                                            {formatMoney(item.bank_fee)}
                                        </td>
                                        <td className={styles.codeCell}>
                                            {formatMoney(item.balance_after)}
                                        </td>
                                        <td>{item.document_number || "-"}</td>
                                        <td>
                                            {item.is_reversed ? (
                                                <span className={styles.dangerText}>برگشتی</span>
                                            ) : (
                                                <span className={styles.positiveText}>فعال</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="8">جمع کل</td>
                                <td>{formatMoney(summary.total_debit)}</td>
                                <td>{formatMoney(summary.total_credit)}</td>
                                <td>{formatMoney(summary.total_bank_fee)}</td>
                                <td>{formatMoney(summary.ending_balance)}</td>
                                <td colSpan="2">{formatNumber(summary.row_count)} ردیف</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}