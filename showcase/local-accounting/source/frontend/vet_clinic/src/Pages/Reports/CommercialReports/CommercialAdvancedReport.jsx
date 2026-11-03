import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./CommercialReport.module.css";

const REPORTS = {
    tax: {
        title: "گزارش مالیات",
        description: "گزارش مالیات خروجی فروش، مالیات ورودی خرید و مانده مالیات قابل پرداخت.",
        api: `${API_BASE_URL}/incomes/api/v2/reports/tax/`,
        searchPlaceholder: "جستجو بر اساس شماره، ارجاع، شخص یا شرح...",
        stats: [
            ["invoice_count", "تعداد فاکتور", "number"],
            ["sales_tax", "مالیات فروش", "money"],
            ["purchase_tax", "مالیات خرید", "money"],
            ["payable_tax", "مالیات قابل پرداخت", "money"],
            ["sales_total", "جمع فروش", "money"],
            ["purchase_total", "جمع خرید", "money"],
        ],
        columns: [
            ["invoice_type", "نوع"],
            ["code", "شماره"],
            ["reference", "ارجاع"],
            ["date", "تاریخ", "date"],
            ["person_name", "شخص"],
            ["status", "وضعیت"],
            ["taxable_base", "مبنای مالیات", "money"],
            ["tax_value", "مبلغ مالیات", "money"],
            ["total_amount", "مبلغ کل", "money"],
            ["tax_nature", "ماهیت"],
        ],
    },

    profit: {
        title: "سود فاکتور",
        description: "تحلیل سود ناخالص فاکتورهای فروش بر اساس قیمت فروش و قیمت خرید ثبت‌شده کالا.",
        api: `${API_BASE_URL}/incomes/api/v2/reports/invoice-profit/`,
        searchPlaceholder: "جستجو بر اساس شماره، مشتری، فروشنده یا ارجاع...",
        stats: [
            ["invoice_count", "تعداد فاکتور", "number"],
            ["revenue", "فروش خالص", "money"],
            ["cost", "بهای خرید", "money"],
            ["gross_profit", "سود ناخالص", "money"],
            ["average_margin_percent", "حاشیه سود", "percent"],
        ],
        columns: [
            ["code", "شماره"],
            ["reference", "ارجاع"],
            ["date", "تاریخ", "date"],
            ["customer_name", "مشتری"],
            ["seller_name", "فروشنده"],
            ["quantity", "مقدار", "number"],
            ["revenue", "فروش خالص", "money"],
            ["cost", "بهای خرید", "money"],
            ["gross_profit", "سود ناخالص", "money"],
            ["margin_percent", "درصد سود", "percent"],
        ],
    },

    sellers: {
        title: "فروش به تفکیک فروشنده",
        description: "مقایسه عملکرد فروشنده‌ها بر اساس تعداد فاکتور، فروش خالص، مانده و کمیسیون تخمینی.",
        api: `${API_BASE_URL}/incomes/api/v2/reports/sales-by-seller/`,
        searchPlaceholder: "جستجو بر اساس نام فروشنده، مشتری، شماره یا ارجاع...",
        stats: [
            ["seller_count", "تعداد فروشنده", "number"],
            ["invoice_count", "تعداد فاکتور", "number"],
            ["quantity", "جمع مقدار", "number"],
            ["total_sales", "فروش خالص", "money"],
            ["paid_amount", "دریافت‌شده", "money"],
            ["remaining_amount", "مانده", "money"],
        ],
        columns: [
            ["seller_code", "کد فروشنده"],
            ["seller_name", "فروشنده"],
            ["invoice_count", "تعداد فاکتور", "number"],
            ["quantity", "مقدار", "number"],
            ["total_sales", "فروش خالص", "money"],
            ["paid_amount", "دریافت‌شده", "money"],
            ["remaining_amount", "مانده", "money"],
            ["commission_percent", "درصد کمیسیون", "percent"],
            ["estimated_commission", "کمیسیون تخمینی", "money"],
            ["target_percent", "درصد تحقق هدف", "percent"],
        ],
    },

    persons: {
        title: "خلاصه فاکتور به تفکیک شخص",
        description: "خلاصه خرید و فروش هر شخص، شامل مشتری‌ها و تأمین‌کننده‌ها.",
        api: `${API_BASE_URL}/incomes/api/v2/reports/invoice-summary-by-person/`,
        searchPlaceholder: "جستجو بر اساس نام شخص، شرکت، شماره فاکتور یا ارجاع...",
        stats: [
            ["person_count", "تعداد اشخاص", "number"],
            ["sales_total", "جمع فروش", "money"],
            ["purchase_total", "جمع خرید", "money"],
            ["net_amount", "خالص", "money"],
            ["sales_remaining", "مانده دریافتنی", "money"],
            ["purchase_remaining", "مانده پرداختنی", "money"],
        ],
        columns: [
            ["person_type", "نوع شخص"],
            ["person_code", "کد"],
            ["person_name", "نام شخص"],
            ["sales_count", "تعداد فروش", "number"],
            ["sales_total", "جمع فروش", "money"],
            ["sales_remaining", "مانده دریافتنی", "money"],
            ["purchase_count", "تعداد خرید", "number"],
            ["purchase_total", "جمع خرید", "money"],
            ["purchase_remaining", "مانده پرداختنی", "money"],
            ["net_amount", "خالص", "money"],
            ["net_remaining", "خالص مانده", "money"],
        ],
    },
};

const STATUS_OPTIONS = [
    { value: "DRAFT", label: "پیش نویس" },
    { value: "APPROVED", label: "تایید شده" },
    { value: "SETTLED", label: "تسویه شده" },
];

export default function CommercialAdvancedReport({ report = "tax" }) {
    const config = REPORTS[report];

    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");

    const formatValue = (value, type = "text") => {
        if (value === null || value === undefined || value === "") return "-";

        if (type === "date") {
            return String(value).split("T")[0];
        }

        if (type === "money") {
            return Number(value).toLocaleString("fa-IR");
        }

        if (type === "number") {
            return Number(value).toLocaleString("fa-IR", {
                maximumFractionDigits: 3,
            });
        }

        if (type === "percent") {
            return `${Number(value).toLocaleString("fa-IR", {
                maximumFractionDigits: 2,
            })}٪`;
        }

        return value;
    };

    const buildQuery = () => {
        const params = new URLSearchParams();

        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
        if (status) params.append("status", status);
        if (search.trim()) params.append("search", search.trim());

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchReport = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${config.api}${buildQuery()}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.detail || "خطا در دریافت گزارش");
            }

            setRows(Array.isArray(data.rows) ? data.rows : []);
            setSummary(data.summary || {});
        } catch (error) {
            console.error(error);
            alert("خطا در دریافت گزارش");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [report]);

    const stats = useMemo(() => {
        return config.stats.map(([key, label, type]) => ({
            key,
            label,
            type,
            value: formatValue(summary[key], type),
        }));
    }, [summary, config]);

    const clearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setStatus("");
        setSearch("");
    };

    const getCellClass = (key, value) => {
        const numberValue = Number(value);

        if (
            key.includes("profit") ||
            key.includes("net") ||
            key.includes("payable_tax")
        ) {
            return numberValue < 0 ? styles.dangerText : styles.positiveText;
        }

        if (key.includes("remaining")) {
            return styles.dangerText;
        }

        return "";
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>{config.title}</h3>
                    <p>{config.description}</p>
                </div>

                <button type="button" className={styles.refreshBtn} onClick={fetchReport}>
                    بروزرسانی گزارش
                </button>
            </div>

            <div className={styles.statsGrid}>
                {stats.map((item) => (
                    <div key={item.key} className={styles.statCard}>
                        <span>{item.label}</span>
                        <strong className={getCellClass(item.key, summary[item.key])}>
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
                        placeholder={config.searchPlaceholder}
                    />
                </div>

                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                />

                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                />

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">همه وضعیت‌ها</option>
                    {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
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
                                {config.columns.map(([, label]) => (
                                    <th key={label}>{label}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={config.columns.length + 1}
                                        className={styles.emptyState}
                                    >
                                        <strong>اطلاعاتی برای نمایش وجود ندارد</strong>
                                        <p>فیلترها را تغییر بده یا فاکتور جدید ثبت کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, index) => (
                                    <tr key={row.id || row.person_key || row.seller_id || index}>
                                        <td>{index + 1}</td>

                                        {config.columns.map(([key, , type]) => (
                                            <td
                                                key={key}
                                                className={getCellClass(key, row[key])}
                                            >
                                                {formatValue(row[key], type)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}