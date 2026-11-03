import { escapeHtml } from "../../utils/escapeHtml";
import { API_BASE_URL } from "../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./PersonChequesPanel.module.css";

const API_BASE = API_BASE_URL;

const PERSON_CONTENT_TYPES_API = `${API_BASE}/persons/api/v2/person-content-types/`;
const PERSON_CHEQUES_API = `${API_BASE}/persons/api/v2/person-cheques/`;

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.items)) return data.items;
    return [];
}

function formatMoney(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString("fa-IR")} ریال`;
}

function formatDate(value) {
    if (!value) return "—";

    try {
        return new Date(value).toLocaleDateString("fa-IR");
    } catch {
        return value;
    }
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

function openPrintWindow({ title, subtitle, summaryRows, tableColumns, tableRows }) {
    const summaryHtml = summaryRows
        .map(
            (row) => `
        <div class="summary-card">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>
      `
        )
        .join("");

    const headerHtml = tableColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");

    const bodyHtml = tableRows
        .map(
            (row) => `
        <tr>
          ${row.map((cell) => `<td>${escapeHtml(cell ?? "—")}</td>`).join("")}
        </tr>
      `
        )
        .join("");

    const html = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            font-family: Tahoma, Arial, sans-serif;
            direction: rtl;
            padding: 24px;
            color: #0f172a;
          }

          h1 {
            margin: 0;
            font-size: 22px;
          }

          .subtitle {
            margin: 8px 0 20px;
            color: #64748b;
            font-size: 13px;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }

          .summary-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            background: #f8fafc;
          }

          .summary-card span {
            display: block;
            color: #64748b;
            font-size: 12px;
            margin-bottom: 6px;
          }

          .summary-card strong {
            font-size: 15px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: center;
            vertical-align: top;
          }

          th {
            background: #f1f5f9;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(subtitle || "")}</div>

        <div class="summary">
          ${summaryHtml}
        </div>

        <table>
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${bodyHtml}
          </tbody>
        </table>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("Popup مرورگر بسته است. اجازه باز شدن پنجره چاپ را بده.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

function getDueDate(check) {
    return check?.due_date || check?.date;
}

function getCheckNumber(check) {
    return (
        check?.cheque_number ||
        check?.number ||
        check?.sayad_number ||
        `#${check?.id}`
    );
}

function getChequeTypeText(check) {
    const value = check?.cheque_type;

    if (value === "دریافتی" || value === "IN") return "دریافتی";
    if (value === "پرداختی" || value === "OUT") return "پرداختی";

    return check?.cheque_type_label || value || "—";
}

function getStatusText(status) {
    switch (status) {
        case "PENDING":
            return "در جریان";
        case "DEPOSITED":
            return "واگذار شده به بانک";
        case "CLEARED":
            return "وصول / پاس شده";
        case "SPENT":
            return "خرج شده";
        case "RETURNED":
            return "برگشتی";
        case "CANCELED":
            return "ابطال شده";
        default:
            return status || "—";
    }
}

function getStatusClass(status) {
    switch (status) {
        case "PENDING":
            return `${styles.statusBadge} ${styles.pending}`;
        case "DEPOSITED":
            return `${styles.statusBadge} ${styles.deposited}`;
        case "CLEARED":
            return `${styles.statusBadge} ${styles.cleared}`;
        case "SPENT":
            return `${styles.statusBadge} ${styles.spent}`;
        case "RETURNED":
            return `${styles.statusBadge} ${styles.returned}`;
        case "CANCELED":
            return `${styles.statusBadge} ${styles.canceled}`;
        default:
            return `${styles.statusBadge} ${styles.defaultStatus}`;
    }
}

function SummaryCard({ title, count, amount }) {
    return (
        <div className={styles.summaryCard}>
            <span>{title}</span>
            <strong>{Number(count || 0).toLocaleString("fa-IR")}</strong>
            <p>{formatMoney(amount)}</p>
        </div>
    );
}

function PersonChequesPanel({
    personType,
    personId,
    contentTypeId: initialContentTypeId,
    title = "چک‌های مرتبط با شخص",
}) {
    const navigate = useNavigate();

    const [contentTypeId, setContentTypeId] = useState(initialContentTypeId || "");
    const [summary, setSummary] = useState({});
    const [checks, setChecks] = useState([]);
    const [filters, setFilters] = useState({
        role: "all",
        status: "",
        cheque_type: "",
        date_from: "",
        date_to: "",
        search: "",
    });
    const [loading, setLoading] = useState(false);
    const [loadingContentType, setLoadingContentType] = useState(false);
    const [error, setError] = useState("");

    const canFetch = Boolean(personId && (contentTypeId || initialContentTypeId));

    const getFilterParams = () => {
        const params = {
            content_type_id: contentTypeId || initialContentTypeId,
            object_id: personId,
        };

        Object.entries(filters).forEach(([key, value]) => {
            if (String(value || "").trim()) {
                params[key] = value;
            }
        });

        return params;
    };

    const fetchContentType = async () => {
        if (initialContentTypeId || contentTypeId || !personType) return;

        try {
            setLoadingContentType(true);

            const res = await axios.get(PERSON_CONTENT_TYPES_API);
            const ctId = res.data?.[personType];

            if (ctId) {
                setContentTypeId(ctId);
            } else {
                setError("نوع شخص برای دریافت چک‌ها پیدا نشد.");
            }
        } catch (err) {
            console.error("Fetch person content types error:", err);
            setError("خطا در دریافت نوع شخص");
        } finally {
            setLoadingContentType(false);
        }
    };

    const fetchCheques = async () => {
        if (!canFetch) return;

        try {
            setLoading(true);
            setError("");

            const res = await axios.get(PERSON_CHEQUES_API, {
                params: getFilterParams(),
            });

            setSummary(res.data?.summary || {});
            setChecks(normalizeList(res.data));
        } catch (err) {
            console.error("Fetch person cheques error:", err);
            setError(
                err?.response?.data?.detail ||
                "خطا در دریافت چک‌های مرتبط با شخص"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContentType();
    }, [personType, personId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCheques();
        }, 350);

        return () => clearTimeout(timer);
    }, [personId, contentTypeId, initialContentTypeId, filters]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const resetFilters = () => {
        setFilters({
            role: "all",
            status: "",
            cheque_type: "",
            date_from: "",
            date_to: "",
            search: "",
        });
    };

    const goToChequeList = (check) => {
        const type = check?.cheque_type;

        if (type === "دریافتی" || type === "IN") {
            navigate("/banking/received-checks");
            return;
        }

        if (type === "پرداختی" || type === "OUT") {
            navigate("/banking/paid-checks");
            return;
        }

        navigate("/banking/received-checks");
    };

    const renderedChecks = useMemo(() => checks, [checks]);

    if (!personId) {
        return null;
    }

    const handleExportCsv = () => {
        const rows = [
            [
                "ردیف",
                "شماره چک",
                "شماره صیاد",
                "نوع چک",
                "تاریخ سررسید",
                "مبلغ",
                "طرف حساب اصلی",
                "خرج شده به",
                "بانک",
                "وضعیت",
            ],
            ...renderedChecks.map((check, index) => [
                index + 1,
                getCheckNumber(check),
                check.sayad_number || "",
                getChequeTypeText(check),
                formatDate(getDueDate(check)),
                Number(check.amount || 0),
                check.payer_name || "",
                check.spent_to_name || "",
                check.bank_name || check.settlement_bank_name || "",
                check.status_label || getStatusText(check.status),
            ]),
        ];

        downloadCsv(`person-cheques-${personId}-${getExportDate()}.csv`, rows);
    };

    const handlePrint = () => {
        openPrintWindow({
            title,
            subtitle: "گزارش چک‌های مرتبط با شخص",
            summaryRows: [
                {
                    label: "کل چک‌ها",
                    value: `${Number(summary.total_count || 0).toLocaleString("fa-IR")} - ${formatMoney(summary.total_amount)}`,
                },
                {
                    label: "چک‌های مستقیم شخص",
                    value: `${Number(summary.original_count || 0).toLocaleString("fa-IR")} - ${formatMoney(summary.original_amount)}`,
                },
                {
                    label: "خرج‌شده به این شخص",
                    value: `${Number(summary.spent_to_count || 0).toLocaleString("fa-IR")} - ${formatMoney(summary.spent_to_amount)}`,
                },
                {
                    label: "در جریان",
                    value: `${Number(summary.pending_count || 0).toLocaleString("fa-IR")} - ${formatMoney(summary.pending_amount)}`,
                },
                {
                    label: "برگشتی",
                    value: `${Number(summary.returned_count || 0).toLocaleString("fa-IR")} - ${formatMoney(summary.returned_amount)}`,
                },
            ],
            tableColumns: [
                "ردیف",
                "شماره چک",
                "شماره صیاد",
                "نوع",
                "سررسید",
                "مبلغ",
                "طرف حساب اصلی",
                "خرج شده به",
                "بانک",
                "وضعیت",
            ],
            tableRows: renderedChecks.map((check, index) => [
                index + 1,
                getCheckNumber(check),
                check.sayad_number || "—",
                getChequeTypeText(check),
                formatDate(getDueDate(check)),
                formatMoney(check.amount),
                check.payer_name || "—",
                check.spent_to_name || "—",
                check.bank_name || check.settlement_bank_name || "—",
                check.status_label || getStatusText(check.status),
            ]),
        });
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div>
                    <h3>{title}</h3>
                    <p>چک‌های دریافتی، پرداختی و خرج‌شده مرتبط با این شخص</p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleExportCsv}
                        disabled={loading || renderedChecks.length === 0}
                    >
                        خروجی Excel
                    </button>

                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handlePrint}
                        disabled={loading || renderedChecks.length === 0}
                    >
                        چاپ
                    </button>

                    <button type="button" onClick={fetchCheques} disabled={loading}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            {error && (
                <div className={styles.errorBox}>
                    {error}
                </div>
            )}

            <div className={styles.summaryGrid}>
                <SummaryCard
                    title="کل چک‌ها"
                    count={summary.total_count}
                    amount={summary.total_amount}
                />

                <SummaryCard
                    title="چک‌های مرتبط مستقیم"
                    count={summary.original_count}
                    amount={summary.original_amount}
                />

                <SummaryCard
                    title="خرج‌شده به این شخص"
                    count={summary.spent_to_count}
                    amount={summary.spent_to_amount}
                />

                <SummaryCard
                    title="در جریان"
                    count={summary.pending_count}
                    amount={summary.pending_amount}
                />

                <SummaryCard
                    title="وصول / خرج‌شده"
                    count={summary.cleared_count}
                    amount={summary.cleared_amount}
                />

                <SummaryCard
                    title="برگشتی"
                    count={summary.returned_count}
                    amount={summary.returned_amount}
                />
            </div>

            <div className={styles.filters}>
                <div className={styles.filterField}>
                    <label>نوع ارتباط</label>
                    <select
                        value={filters.role}
                        onChange={(e) => handleFilterChange("role", e.target.value)}
                    >
                        <option value="all">همه</option>
                        <option value="original">چک‌های مستقیم شخص</option>
                        <option value="spent_to">چک‌های خرج‌شده به شخص</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>نوع چک</label>
                    <select
                        value={filters.cheque_type}
                        onChange={(e) => handleFilterChange("cheque_type", e.target.value)}
                    >
                        <option value="">همه</option>
                        <option value="دریافتی">دریافتی</option>
                        <option value="پرداختی">پرداختی</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>وضعیت</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                    >
                        <option value="">همه</option>
                        <option value="PENDING">در جریان</option>
                        <option value="DEPOSITED">واگذار شده به بانک</option>
                        <option value="CLEARED">وصول / پاس شده</option>
                        <option value="SPENT">خرج شده</option>
                        <option value="RETURNED">برگشتی</option>
                        <option value="CANCELED">ابطال شده</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>از تاریخ</label>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleFilterChange("date_from", e.target.value)}
                    />
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
                    <label>جستجو</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        placeholder="شماره، صیاد، بانک..."
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

            {(loading || loadingContentType) ? (
                <div className={styles.loadingBox}>
                    در حال دریافت چک‌ها...
                </div>
            ) : renderedChecks.length === 0 ? (
                <div className={styles.emptyBox}>
                    <strong>چکی برای این شخص ثبت نشده است.</strong>
                    <p>بعد از ثبت دریافت/پرداخت چکی، اطلاعات اینجا نمایش داده می‌شود.</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره چک</th>
                                <th>نوع</th>
                                <th>سررسید</th>
                                <th>مبلغ</th>
                                <th>طرف حساب اصلی</th>
                                <th>خرج شده به</th>
                                <th>بانک</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {renderedChecks.map((check, index) => (
                                <tr key={check.id}>
                                    <td>{index + 1}</td>

                                    <td>
                                        <span className={styles.code}>
                                            {getCheckNumber(check)}
                                        </span>
                                    </td>

                                    <td>{getChequeTypeText(check)}</td>

                                    <td>{formatDate(getDueDate(check))}</td>

                                    <td>
                                        <span className={styles.amountBadge}>
                                            {formatMoney(check.amount)}
                                        </span>
                                    </td>

                                    <td>{check.payer_name || "—"}</td>

                                    <td>{check.spent_to_name || "—"}</td>

                                    <td>{check.bank_name || check.settlement_bank_name || "—"}</td>

                                    <td>
                                        <span className={getStatusClass(check.status)}>
                                            {check.status_label || getStatusText(check.status)}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className={styles.viewBtn}
                                            onClick={() => goToChequeList(check)}
                                        >
                                            مشاهده در لیست
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default PersonChequesPanel;
