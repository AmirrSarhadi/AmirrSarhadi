import { API_BASE_URL } from "../../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PersonLedgerPanel from "../../../components/PersonLedgerPanel/PersonLedgerPanel";
import styles from "./PersonBalancesReport.module.css";

const API_BASE = API_BASE_URL;
const PERSON_BALANCES_API = `${API_BASE}/persons/api/v2/person-balances/`;

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

function formatMoney(value) {
    const number = Number(value || 0);
    return `${Math.abs(number).toLocaleString("fa-IR")} ریال`;
}

function formatSignedMoney(value) {
    const number = Number(value || 0);

    if (number === 0) return "۰ ریال";

    const sign = number < 0 ? "-" : "";
    return `${sign}${Math.abs(number).toLocaleString("fa-IR")} ریال`;
}

function getBalanceClass(label) {
    if (label === "بدهکار") return `${styles.balanceBadge} ${styles.debit}`;
    if (label === "بستانکار") return `${styles.balanceBadge} ${styles.credit}`;
    if (label === "بدون تفصیل") return `${styles.balanceBadge} ${styles.missing}`;
    return `${styles.balanceBadge} ${styles.neutral}`;
}

function escapeCsvCell(value) {
    const text = String(value ?? "")
        .replace(/"/g, '""')
        .replace(/\r?\n|\r/g, " ");

    return `"${text}"`;
}

function downloadCsv(filename, rows) {
    const csvContent = rows
        .map((row) => row.map(escapeCsvCell).join(","))
        .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getExportDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function SummaryCard({ title, value, subtitle, tone }) {
    return (
        <div className={`${styles.summaryCard} ${styles[tone] || ""}`}>
            <span>{title}</span>
            <strong>{value}</strong>
            {subtitle && <p>{subtitle}</p>}
        </div>
    );
}

function PersonBalancesReport() {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [filters, setFilters] = useState({
        person_type: "all",
        balance_type: "all",
        date_to: "",
        search: "",
        min_abs_balance: "",
        only_with_balance: "1",
    });
    const [ledgerTarget, setLedgerTarget] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const getParams = () => {
        const params = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (String(value || "").trim()) {
                params[key] = value;
            }
        });

        return params;
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await axios.get(PERSON_BALANCES_API, {
                params: getParams(),
            });

            setSummary(res.data?.summary || {});
            setRows(normalizeList(res.data));
        } catch (err) {
            console.error("Person balances report error:", err);
            setError(
                err?.response?.data?.detail ||
                "خطا در دریافت گزارش مانده اشخاص"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReport();
        }, 350);

        return () => clearTimeout(timer);
    }, [filters]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const resetFilters = () => {
        setFilters({
            person_type: "all",
            balance_type: "all",
            date_to: "",
            search: "",
            min_abs_balance: "",
            only_with_balance: "1",
        });
    };

    const renderedRows = useMemo(() => rows, [rows]);

    const handleExportCsv = () => {
        const csvRows = [
            [
                "ردیف",
                "نوع شخص",
                "نام شخص",
                "تفصیل حسابداری",
                "جمع بدهکار",
                "جمع بستانکار",
                "مانده",
                "نوع مانده",
                "تعداد ردیف سند",
            ],
            ...renderedRows.map((row, index) => [
                index + 1,
                row.person_type_label,
                row.person_title,
                row.detail_account_title || "",
                Number(row.debit || 0),
                Number(row.credit || 0),
                Number(row.balance || 0),
                row.balance_label,
                Number(row.items_count || 0),
            ]),
        ];

        downloadCsv(`person-balances-${getExportDate()}.csv`, csvRows);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>گزارش مانده اشخاص</h2>
                    <p>
                        مانده مشتری‌ها، تأمین‌کننده‌ها، فروشنده‌ها و پرسنل بر اساس اسناد حسابداری
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleExportCsv}
                        disabled={loading || renderedRows.length === 0}
                    >
                        خروجی Excel
                    </button>

                    <button type="button" onClick={fetchReport} disabled={loading}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <SummaryCard
                    title="کل ردیف‌ها"
                    value={Number(summary.total_count || 0).toLocaleString("fa-IR")}
                    tone="gray"
                />

                <SummaryCard
                    title="بدهکارها"
                    value={Number(summary.debit_count || 0).toLocaleString("fa-IR")}
                    subtitle={formatMoney(summary.debit_amount)}
                    tone="blue"
                />

                <SummaryCard
                    title="بستانکارها"
                    value={Number(summary.credit_count || 0).toLocaleString("fa-IR")}
                    subtitle={formatMoney(summary.credit_amount)}
                    tone="red"
                />

                <SummaryCard
                    title="تسویه‌شده"
                    value={Number(summary.settled_count || 0).toLocaleString("fa-IR")}
                    tone="green"
                />

                <SummaryCard
                    title="بدون تفصیل"
                    value={Number(summary.missing_detail_count || 0).toLocaleString("fa-IR")}
                    tone="yellow"
                />

                <SummaryCard
                    title="مانده خالص"
                    value={formatSignedMoney(summary.net_balance)}
                    tone="purple"
                />
            </div>

            <div className={styles.filters}>
                <div className={styles.filterField}>
                    <label>نوع شخص</label>
                    <select
                        value={filters.person_type}
                        onChange={(e) => handleFilterChange("person_type", e.target.value)}
                    >
                        <option value="all">همه</option>
                        <option value="customer">مشتری</option>
                        <option value="vendor">تأمین‌کننده</option>
                        <option value="seller">فروشنده</option>
                        <option value="staff">پرسنل</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>نوع مانده</label>
                    <select
                        value={filters.balance_type}
                        onChange={(e) => handleFilterChange("balance_type", e.target.value)}
                    >
                        <option value="all">همه</option>
                        <option value="debit">بدهکار</option>
                        <option value="credit">بستانکار</option>
                        <option value="settled">تسویه</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>تا تاریخ</label>
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => handleFilterChange("date_to", e.target.value)}
                    />
                </div>

                <div className={styles.filterField}>
                    <label>حداقل مانده</label>
                    <input
                        type="number"
                        value={filters.min_abs_balance}
                        onChange={(e) => handleFilterChange("min_abs_balance", e.target.value)}
                        placeholder="مثلاً 1000000"
                    />
                </div>

                <div className={styles.filterField}>
                    <label>نمایش</label>
                    <select
                        value={filters.only_with_balance}
                        onChange={(e) => handleFilterChange("only_with_balance", e.target.value)}
                    >
                        <option value="1">فقط دارای مانده / مشکل</option>
                        <option value="0">همه اشخاص</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>جستجو</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        placeholder="نام، موبایل، کد..."
                    />
                </div>

                <button
                    type="button"
                    className={styles.resetBtn}
                    onClick={resetFilters}
                >
                    حذف فیلتر
                </button>
            </div>

            {error && (
                <div className={styles.errorBox}>
                    {error}
                </div>
            )}

            {loading ? (
                <div className={styles.loadingBox}>
                    در حال دریافت گزارش مانده اشخاص...
                </div>
            ) : renderedRows.length === 0 ? (
                <div className={styles.emptyBox}>
                    <strong>موردی برای نمایش وجود ندارد.</strong>
                    <p>فیلترها را تغییر بده یا نمایش همه اشخاص را فعال کن.</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>نوع شخص</th>
                                <th>نام شخص</th>
                                <th>تفصیل حسابداری</th>
                                <th>جمع بدهکار</th>
                                <th>جمع بستانکار</th>
                                <th>مانده</th>
                                <th>نوع مانده</th>
                                <th>تعداد سند</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {renderedRows.map((row, index) => (
                                <tr key={`${row.person_type}-${row.object_id}`}>
                                    <td>{index + 1}</td>

                                    <td>{row.person_type_label}</td>

                                    <td className={styles.nameCell}>
                                        {row.person_title || "—"}
                                    </td>

                                    <td>{row.detail_account_title || "تفصیل ندارد"}</td>

                                    <td>
                                        <span className={styles.debitAmount}>
                                            {formatMoney(row.debit)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={styles.creditAmount}>
                                            {formatMoney(row.credit)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={styles.amountBadge}>
                                            {formatSignedMoney(row.balance)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={getBalanceClass(row.balance_label)}>
                                            {row.balance_label}
                                        </span>
                                    </td>

                                    <td>{Number(row.items_count || 0).toLocaleString("fa-IR")}</td>

                                    <td>
                                        {row.has_detail ? (
                                            <button
                                                type="button"
                                                className={styles.viewBtn}
                                                onClick={() => setLedgerTarget(row)}
                                            >
                                                گردش حساب
                                            </button>
                                        ) : (
                                            <span className={styles.mutedText}>ندارد</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {ledgerTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.ledgerModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>گردش حساب</h3>
                                <p>
                                    {ledgerTarget.person_type_label} — {ledgerTarget.person_title}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setLedgerTarget(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonLedgerPanel
                            personType={ledgerTarget.person_type}
                            personId={ledgerTarget.object_id}
                            contentTypeId={ledgerTarget.content_type_id}
                            title={`گردش حساب ${ledgerTarget.person_title}`}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default PersonBalancesReport;