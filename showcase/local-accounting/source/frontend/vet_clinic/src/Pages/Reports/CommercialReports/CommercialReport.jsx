import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./CommercialReport.module.css";

const REPORT_CONFIG = {
    sales: {
        invoice: {
            title: "فروش به تفکیک فاکتور",
            description: "گزارش تحلیلی فاکتورهای فروش بر اساس تاریخ، وضعیت و مشتری.",
            api: `${API_BASE_URL}/incomes/api/v2/reports/sales-by-invoice/`,
            personLabel: "مشتری",
            statusOptions: [{ value: "پیش نویس", label: "پیش نویس" }, { value: "تایید شده", label: "تایید شده" }, { value: "دریافت شده", label: "دریافت شده" }],
            searchPlaceholder: "جستجو بر اساس شماره، ارجاع، عنوان یا مشتری...",
        },
        item: {
            title: "فروش به تفکیک کالا",
            description: "گزارش فروش کالاها با جمع تعداد، مبلغ، تخفیف و تعداد فاکتور.",
            api: `${API_BASE_URL}/incomes/api/v2/reports/sales-by-item/`,
            personLabel: "مشتری",
            statusOptions: [{ value: "پیش نویس", label: "پیش نویس" }, { value: "تایید شده", label: "تایید شده" }, { value: "دریافت شده", label: "دریافت شده" }],
            searchPlaceholder: "جستجو بر اساس نام، کد یا بارکد کالا...",
        },
    },
    purchases: {
        invoice: {
            title: "خرید به تفکیک فاکتور",
            description: "گزارش تحلیلی فاکتورهای خرید بر اساس تاریخ، وضعیت و تأمین‌کننده.",
            api: `${API_BASE_URL}/costs/api/v2/reports/purchases-by-invoice/`,
            personLabel: "تأمین‌کننده",
            statusOptions: [{ value: "DRAFT", label: "پیش نویس" }, { value: "APPROVED", label: "تایید شده" }, { value: "PAID", label: "پرداخت شده" }],
            searchPlaceholder: "جستجو بر اساس شماره، ارجاع، عنوان یا تأمین‌کننده...",
        },
        item: {
            title: "خرید به تفکیک کالا",
            description: "گزارش خرید کالاها با جمع تعداد، مبلغ، تخفیف و تعداد فاکتور.",
            api: `${API_BASE_URL}/costs/api/v2/reports/purchases-by-item/`,
            personLabel: "تأمین‌کننده",
            statusOptions: [{ value: "DRAFT", label: "پیش نویس" }, { value: "APPROVED", label: "تایید شده" }, { value: "PAID", label: "پرداخت شده" }],
            searchPlaceholder: "جستجو بر اساس نام، کد یا بارکد کالا...",
        },
    },
};

export default function CommercialReport({ type = "sales", mode = "invoice" }) {
    const config = REPORT_CONFIG[type][mode];

    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");

    const isInvoiceMode = mode === "invoice";

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const formatQty = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR", {
            maximumFractionDigits: 3,
        });
    };

    const formatDate = (value) => {
        if (!value) return "-";
        return String(value).split("T")[0];
    };

    const statusLabel = (value) => {
        const labels = {
            DRAFT: "پیش نویس",
            PENDING: "در انتظار تایید",
            APPROVED: "تایید شده",
            PAID: "پرداخت شده",
            REVERSED: "مرجوع / ابطال شده",
        };
        return labels[value] || value || "-";
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
            const text = await res.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                console.error("Invalid JSON:", text);
                throw new Error("Invalid JSON response");
            }

            if (!res.ok) {
                throw new Error(data?.detail || "خطا در دریافت گزارش");
            }

            setRows(Array.isArray(data?.rows) ? data.rows : []);
            setSummary(data?.summary || {});
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت گزارش");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, mode]);

    const stats = useMemo(() => {
        if (isInvoiceMode) {
            return [
                { label: "تعداد فاکتور", value: formatQty(summary.invoice_count) },
                { label: "تعداد اقلام", value: formatQty(summary.item_count) },
                { label: "جمع مقدار", value: formatQty(summary.quantity) },
                { label: "جمع مبلغ", value: formatMoney(summary.total_amount) },
                { label: "پرداخت‌شده", value: formatMoney(summary.paid_amount) },
                { label: "مانده", value: formatMoney(summary.remaining_amount), danger: true },
            ];
        }

        return [
            { label: "تعداد کالا", value: formatQty(summary.material_count) },
            { label: "تعداد فاکتور", value: formatQty(summary.invoice_count) },
            { label: "جمع مقدار", value: formatQty(summary.quantity) },
            { label: "جمع تخفیف", value: formatMoney(summary.discount_amount) },
            { label: "جمع مبلغ", value: formatMoney(summary.total_amount) },
        ];
    }, [summary, isInvoiceMode]);

    const clearFilters = () => {
        setDateFrom("");
        setDateTo("");
        setStatus("");
        setSearch("");
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
                    <div key={item.label} className={styles.statCard}>
                        <span>{item.label}</span>
                        <strong className={item.danger ? styles.dangerText : ""}>
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
                    title="از تاریخ"
                />

                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    title="تا تاریخ"
                />

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">همه وضعیت‌ها</option>
                    {config.statusOptions.map((item) => (
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
                        {isInvoiceMode ? (
                            <>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th>شماره</th>
                                        <th>ارجاع</th>
                                        <th>تاریخ</th>
                                        <th>{config.personLabel}</th>
                                        <th>وضعیت</th>
                                        <th>تعداد اقلام</th>
                                        <th>مقدار</th>
                                        <th>مبلغ کل</th>
                                        <th>پرداخت‌شده</th>
                                        <th>مانده</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className={styles.emptyState}>
                                                <strong>اطلاعاتی برای نمایش وجود ندارد</strong>
                                                <p>فیلترها را تغییر بده یا فاکتور جدید ثبت کن.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((item, index) => (
                                            <tr key={item.id}>
                                                <td>{index + 1}</td>
                                                <td className={styles.codeCell}>{item.code}</td>
                                                <td>{item.reference || "-"}</td>
                                                <td>{formatDate(item.date)}</td>
                                                <td className={styles.nameCell}>{item.person_name}</td>
                                                <td>
                                                    <span className={styles.statusBadge}>
                                                        {statusLabel(item.status)}
                                                    </span>
                                                </td>
                                                <td>{formatQty(item.item_count)}</td>
                                                <td>{formatQty(item.quantity)}</td>
                                                <td>{formatMoney(item.total_amount)}</td>
                                                <td className={styles.positiveText}>
                                                    {formatMoney(item.paid_amount)}
                                                </td>
                                                <td className={styles.dangerText}>
                                                    {formatMoney(item.remaining_amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>

                                <tfoot>
                                    <tr>
                                        <td colSpan="6">جمع کل</td>
                                        <td>{formatQty(summary.item_count)}</td>
                                        <td>{formatQty(summary.quantity)}</td>
                                        <td>{formatMoney(summary.total_amount)}</td>
                                        <td>{formatMoney(summary.paid_amount)}</td>
                                        <td>{formatMoney(summary.remaining_amount)}</td>
                                    </tr>
                                </tfoot>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th>کد کالا</th>
                                        <th>نام کالا</th>
                                        <th>تعداد فاکتور</th>
                                        <th>مقدار</th>
                                        <th>میانگین قیمت</th>
                                        <th>تخفیف</th>
                                        <th>مبلغ کل</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className={styles.emptyState}>
                                                <strong>اطلاعاتی برای نمایش وجود ندارد</strong>
                                                <p>فیلترها را تغییر بده یا فاکتور جدید ثبت کن.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((item, index) => (
                                            <tr key={item.material_id}>
                                                <td>{index + 1}</td>
                                                <td className={styles.codeCell}>{item.material_code}</td>
                                                <td className={styles.nameCell}>{item.material_name}</td>
                                                <td>{formatQty(item.invoice_count)}</td>
                                                <td>{formatQty(item.quantity)}</td>
                                                <td>{formatMoney(item.avg_unit_price)}</td>
                                                <td>{formatMoney(item.discount_amount)}</td>
                                                <td className={styles.positiveText}>
                                                    {formatMoney(item.total_amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>

                                <tfoot>
                                    <tr>
                                        <td colSpan="3">جمع کل</td>
                                        <td>{formatQty(summary.invoice_count)}</td>
                                        <td>{formatQty(summary.quantity)}</td>
                                        <td>-</td>
                                        <td>{formatMoney(summary.discount_amount)}</td>
                                        <td>{formatMoney(summary.total_amount)}</td>
                                    </tr>
                                </tfoot>
                            </>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
}