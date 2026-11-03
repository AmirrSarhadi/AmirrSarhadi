import { API_BASE_URL } from "../../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./PersonDetailAudit.module.css";

const API_BASE = API_BASE_URL;
const PERSON_DETAIL_AUDIT_API = `${API_BASE}/persons/api/v2/person-detail-audit/`;

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

function getSeverityClass(severity) {
    if (severity === "error") return `${styles.statusBadge} ${styles.error}`;
    return `${styles.statusBadge} ${styles.ok}`;
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

function SummaryCard({ title, value, tone }) {
    return (
        <div className={`${styles.summaryCard} ${styles[tone] || ""}`}>
            <span>{title}</span>
            <strong>{Number(value || 0).toLocaleString("fa-IR")}</strong>
        </div>
    );
}

function PersonDetailAudit() {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [filters, setFilters] = useState({
        person_type: "all",
        issue_type: "all",
        search: "",
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [fixMenuOpen, setFixMenuOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [fixLoading, setFixLoading] = useState(false);

    useEffect(() => {
        const handler = () => setFixMenuOpen(false);

        if (fixMenuOpen) {
            window.addEventListener("click", handler);
        }

        return () => {
            window.removeEventListener("click", handler);
        };
    }, [fixMenuOpen]);

    const getParams = () => {
        const params = {};

        Object.entries(filters).forEach(([key, value]) => {
            if (String(value || "").trim()) {
                params[key] = value;
            }
        });

        return params;
    };

    const fetchAudit = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await axios.get(PERSON_DETAIL_AUDIT_API, {
                params: getParams(),
            });

            setSummary(res.data?.summary || {});
            setRows(normalizeList(res.data));
        } catch (err) {
            console.error("Person detail audit error:", err);
            setError(
                err?.response?.data?.detail ||
                "خطا در دریافت گزارش کنترل تفصیل اشخاص"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAudit();
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
            issue_type: "all",
            search: "",
        });
    };

    const renderedRows = useMemo(() => rows, [rows]);


    const handleExportCsv = () => {
        const csvRows = [
            [
                "ردیف",
                "نوع شخص",
                "نام شخص",
                "شناسه شخص",
                "شناسه تفصیل",
                "کد تفصیل",
                "عنوان تفصیل",
                "وضعیت",
                "مشکلات",
            ],
            ...renderedRows.map((row, index) => [
                index + 1,
                row.person_type_label,
                row.person_title,
                row.object_id,
                row.detail_account_id || "",
                row.detail_account_code || "",
                row.detail_account_title || "",
                row.severity === "ok" ? "سالم" : "دارای مشکل",
                Array.isArray(row.issues) ? row.issues.join(" | ") : "",
            ]),
        ];

        downloadCsv(`person-detail-audit-${getExportDate()}.csv`, csvRows);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>کنترل تفصیل‌های اشخاص</h2>
                    <p>
                        بررسی اشخاص بدون تفصیل حسابداری و تفصیل‌های مشترک بین چند شخص
                    </p>
                </div>

                <div className={styles.headerActions}>

                    <div className={styles.fixDropdownWrapper}>
                        <button
                            type="button"
                            className={styles.fixDropdownBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFixMenuOpen((prev) => !prev);
                            }}
                        >
                            اصلاح ▾
                        </button>

                        {fixMenuOpen && (
                            <div
                                className={styles.fixDropdownMenu}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        setFixMenuOpen(false);
                                        setConfirmAction({ type: "missing" });
                                    }}
                                >
                                    ساخت تفصیل‌های گمشده
                                </button>

                                <button
                                    onClick={() => {
                                        setFixMenuOpen(false);
                                        setConfirmAction({ type: "duplicate" });
                                    }}
                                >
                                    اصلاح تفصیل‌های تکراری
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleExportCsv}
                    >
                        خروجی Excel
                    </button>

                    <button onClick={fetchAudit} disabled={loading}>
                        بروزرسانی
                    </button>

                </div>
            </div>

            <div className={styles.summaryGrid}>
                <SummaryCard
                    title="کل اشخاص"
                    value={summary.total_count}
                    tone="gray"
                />

                <SummaryCard
                    title="سالم"
                    value={summary.ok_count}
                    tone="green"
                />

                <SummaryCard
                    title="دارای مشکل"
                    value={summary.problem_count}
                    tone="red"
                />

                <SummaryCard
                    title="بدون تفصیل"
                    value={summary.missing_detail_count}
                    tone="yellow"
                />

                <SummaryCard
                    title="تفصیل تکراری"
                    value={summary.duplicate_detail_count}
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
                    <label>نوع مشکل</label>
                    <select
                        value={filters.issue_type}
                        onChange={(e) => handleFilterChange("issue_type", e.target.value)}
                    >
                        <option value="all">همه</option>
                        <option value="missing">بدون تفصیل</option>
                        <option value="duplicate">تفصیل تکراری</option>
                        <option value="ok">سالم</option>
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
                    در حال بررسی تفصیل‌های اشخاص...
                </div>
            ) : renderedRows.length === 0 ? (
                <div className={styles.emptyBox}>
                    <strong>موردی برای نمایش وجود ندارد.</strong>
                    <p>فیلترها را تغییر بده یا همه موارد را نمایش بده.</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>نوع شخص</th>
                                <th>نام شخص</th>
                                <th>شناسه شخص</th>
                                <th>کد تفصیل</th>
                                <th>عنوان تفصیل</th>
                                <th>وضعیت</th>
                                <th>مشکلات</th>
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

                                    <td>
                                        <span className={styles.code}>
                                            #{row.object_id}
                                        </span>
                                    </td>

                                    <td>{row.detail_account_code || "—"}</td>

                                    <td>{row.detail_account_title || "تفصیل ندارد"}</td>

                                    <td>
                                        <span className={getSeverityClass(row.severity)}>
                                            {row.severity === "ok" ? "سالم" : "دارای مشکل"}
                                        </span>
                                    </td>

                                    <td className={styles.issueCell}>
                                        {Array.isArray(row.issues) && row.issues.length > 0
                                            ? row.issues.join(" / ")
                                            : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {confirmAction && (
                <div className={styles.modalOverlay}>
                    <div className={styles.confirmModal}>
                        <h3>تایید عملیات</h3>

                        <p>
                            {confirmAction?.type === "missing"
                                ? "آیا مطمئن هستی می‌خواهی برای اشخاص بدون تفصیل، تفصیل حسابداری ساخته شود؟"
                                : "آیا مطمئن هستی می‌خواهی تفصیل‌های تکراری اصلاح شوند؟"}
                        </p>

                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setConfirmAction(null)}
                            >
                                انصراف
                            </button>

                            <button
                                className={styles.confirmDeleteBtn}
                                disabled={fixLoading}
                                onClick={async () => {
                                    try {
                                        setFixLoading(true);

                                        if (confirmAction?.type === "missing") {
                                            await axios.post(
                                                `${API_BASE}/persons/api/v2/person-detail-fix-missing/`
                                            );
                                        }

                                        if (confirmAction?.type === "duplicate") {
                                            await axios.post(
                                                `${API_BASE}/persons/api/v2/person-detail-fix-duplicates/`
                                            );
                                        }

                                        setConfirmAction(null);
                                        setFixMenuOpen(false); // ✅ مهم (fix dropdown state bug)
                                        await fetchAudit();
                                    } catch (err) {
                                        console.error(err);
                                        alert("خطا در انجام عملیات");
                                    } finally {
                                        setFixLoading(false);
                                    }
                                }}
                            >
                                {fixLoading ? "در حال انجام..." : "تایید"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>


    );
}

export default PersonDetailAudit;