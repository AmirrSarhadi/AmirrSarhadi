import { escapeHtml } from "../../utils/escapeHtml";
import { API_BASE_URL } from "../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./PersonLedgerPanel.module.css";

const API_BASE = API_BASE_URL;

const PERSON_CONTENT_TYPES_API = `${API_BASE}/persons/api/v2/person-content-types/`;
const PERSON_LEDGER_API = `${API_BASE}/persons/api/v2/person-ledger/`;

function formatMoney(value) {
    const number = Number(value || 0);
    return `${Math.abs(number).toLocaleString("fa-IR")} ریال`;
}

function formatSignedMoney(value) {
    const number = Number(value || 0);

    if (number === 0) return "۰ ریال";

    const sign = number > 0 ? "" : "-";
    return `${sign}${Math.abs(number).toLocaleString("fa-IR")} ریال`;
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

function normalizeItems(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

function getBalanceClass(label) {
    if (label === "بدهکار") return `${styles.balanceBadge} ${styles.debit}`;
    if (label === "بستانکار") return `${styles.balanceBadge} ${styles.credit}`;
    return `${styles.balanceBadge} ${styles.neutral}`;
}

function SummaryCard({ title, value, label }) {
    return (
        <div className={styles.summaryCard}>
            <span>{title}</span>
            <strong>{formatSignedMoney(value)}</strong>
            <p className={getBalanceClass(label)}>{label || "—"}</p>
        </div>
    );
}

function PersonLedgerPanel({
    personType,
    personId,
    contentTypeId: initialContentTypeId,
    title = "گردش حساب شخص",
}) {
    const navigate = useNavigate();

    const [contentTypeId, setContentTypeId] = useState(initialContentTypeId || "");
    const [person, setPerson] = useState(null);
    const [summary, setSummary] = useState({});
    const [items, setItems] = useState([]);
    const [filters, setFilters] = useState({
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
            setError("");

            const res = await axios.get(PERSON_CONTENT_TYPES_API);
            const ctId = res.data?.[personType];

            if (ctId) {
                setContentTypeId(ctId);
            } else {
                setError("نوع شخص برای گزارش گردش پیدا نشد.");
            }
        } catch (err) {
            console.error("Fetch content type error:", err);
            setError("خطا در دریافت نوع شخص");
        } finally {
            setLoadingContentType(false);
        }
    };

    const fetchLedger = async () => {
        if (!canFetch) return;

        try {
            setLoading(true);
            setError("");

            const res = await axios.get(PERSON_LEDGER_API, {
                params: getFilterParams(),
            });

            setPerson(res.data?.person || null);
            setSummary(res.data?.summary || {});
            setItems(normalizeItems(res.data));
        } catch (err) {
            console.error("Fetch person ledger error:", err);
            setError(
                err?.response?.data?.detail ||
                "خطا در دریافت گردش حساب شخص"
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
            fetchLedger();
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
            date_from: "",
            date_to: "",
            search: "",
        });
    };

    const openDocument = (documentId) => {
        if (!documentId) return;
        navigate(`/accounting/documents/${documentId}`);
    };

    const renderedItems = useMemo(() => items, [items]);

    if (!personId) {
        return null;
    }

    const handleExportCsv = () => {
        const rows = [
            [
                "ردیف",
                "تاریخ سند",
                "شماره سند",
                "حساب",
                "شرح",
                "بدهکار",
                "بستانکار",
                "مانده",
                "نوع مانده",
            ],
            ...renderedItems.map((item, index) => [
                index + 1,
                formatDate(item.document_date),
                item.document_number || item.document_reference || item.document_id || "",
                `${item.account_code ? `${item.account_code} - ` : ""}${item.account_title || ""}`,
                item.note || item.document_description || "",
                Number(item.debit || 0),
                Number(item.credit || 0),
                Number(item.running_balance || 0),
                item.running_balance_label || "",
            ]),
        ];

        downloadCsv(`person-ledger-${personId}-${getExportDate()}.csv`, rows);
    };

    const handlePrint = () => {
        openPrintWindow({
            title,
            subtitle: person?.title
                ? `ریز گردش حساب ${person.title}`
                : "ریز گردش حساب شخص",
            summaryRows: [
                {
                    label: "مانده ابتدای دوره",
                    value: `${formatSignedMoney(summary.opening_balance)} - ${summary.opening_balance_label || ""}`,
                },
                {
                    label: "جمع بدهکار دوره",
                    value: formatMoney(summary.period_debit),
                },
                {
                    label: "جمع بستانکار دوره",
                    value: formatMoney(summary.period_credit),
                },
                {
                    label: "مانده نهایی",
                    value: `${formatSignedMoney(summary.closing_balance)} - ${summary.closing_balance_label || ""}`,
                },
                {
                    label: "تعداد ردیف‌ها",
                    value: Number(summary.items_count || 0).toLocaleString("fa-IR"),
                },
            ],
            tableColumns: [
                "ردیف",
                "تاریخ سند",
                "شماره سند",
                "حساب",
                "شرح",
                "بدهکار",
                "بستانکار",
                "مانده",
                "نوع مانده",
            ],
            tableRows: renderedItems.map((item, index) => [
                index + 1,
                formatDate(item.document_date),
                item.document_number || item.document_reference || item.document_id || "—",
                `${item.account_code ? `${item.account_code} - ` : ""}${item.account_title || "—"}`,
                item.note || item.document_description || "—",
                formatMoney(item.debit),
                formatMoney(item.credit),
                formatSignedMoney(item.running_balance),
                item.running_balance_label || "—",
            ]),
        });
    };

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <div>
                    <h3>{title}</h3>
                    <p>
                        {person?.title
                            ? `ریز گردش حساب ${person.title}`
                            : "ریز گردش حساب شخص بر اساس اسناد حسابداری"}
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handleExportCsv}
                        disabled={loading || renderedItems.length === 0}
                    >
                        خروجی Excel
                    </button>

                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={handlePrint}
                        disabled={loading || renderedItems.length === 0}
                    >
                        چاپ
                    </button>

                    <button type="button" onClick={fetchLedger} disabled={loading}>
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
                    title="مانده ابتدای دوره"
                    value={summary.opening_balance}
                    label={summary.opening_balance_label}
                />

                <SummaryCard
                    title="گردش دوره"
                    value={summary.period_balance}
                    label={summary.period_balance_label}
                />

                <SummaryCard
                    title="مانده نهایی"
                    value={summary.closing_balance}
                    label={summary.closing_balance_label}
                />

                <div className={styles.summaryCard}>
                    <span>جمع بدهکار دوره</span>
                    <strong>{formatMoney(summary.period_debit)}</strong>
                    <p className={`${styles.balanceBadge} ${styles.debit}`}>بدهکار</p>
                </div>

                <div className={styles.summaryCard}>
                    <span>جمع بستانکار دوره</span>
                    <strong>{formatMoney(summary.period_credit)}</strong>
                    <p className={`${styles.balanceBadge} ${styles.credit}`}>بستانکار</p>
                </div>

                <div className={styles.summaryCard}>
                    <span>تعداد ردیف‌ها</span>
                    <strong>{Number(summary.items_count || 0).toLocaleString("fa-IR")}</strong>
                    <p className={`${styles.balanceBadge} ${styles.neutral}`}>سند</p>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterField}>
                    <label>از تاریخ سند</label>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleFilterChange("date_from", e.target.value)}
                    />
                </div>

                <div className={styles.filterField}>
                    <label>تا تاریخ سند</label>
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
                        placeholder="شرح، شماره سند، حساب..."
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
                    در حال دریافت گردش حساب...
                </div>
            ) : renderedItems.length === 0 ? (
                <div className={styles.emptyBox}>
                    <strong>گردشی برای این شخص پیدا نشد.</strong>
                    <p>بعد از ثبت سندهای دریافت، پرداخت یا چک، گردش اینجا نمایش داده می‌شود.</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>تاریخ سند</th>
                                <th>شماره سند</th>
                                <th>حساب</th>
                                <th>شرح ردیف</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>مانده</th>
                                <th>نوع مانده</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {renderedItems.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>

                                    <td>{formatDate(item.document_date)}</td>

                                    <td>
                                        <span className={styles.code}>
                                            {item.document_number || item.document_reference || item.document_id || "—"}
                                        </span>
                                    </td>

                                    <td>
                                        {item.account_code ? `${item.account_code} - ` : ""}
                                        {item.account_title || "—"}
                                    </td>

                                    <td className={styles.noteCell}>
                                        {item.note || item.document_description || "—"}
                                    </td>

                                    <td>
                                        <span className={styles.debitAmount}>
                                            {formatMoney(item.debit)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={styles.creditAmount}>
                                            {formatMoney(item.credit)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={styles.amountBadge}>
                                            {formatMoney(item.running_balance)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={getBalanceClass(item.running_balance_label)}>
                                            {item.running_balance_label}
                                        </span>
                                    </td>

                                    <td>
                                        {item.document_id ? (
                                            <button
                                                type="button"
                                                className={styles.viewBtn}
                                                onClick={() => openDocument(item.document_id)}
                                            >
                                                مشاهده سند
                                            </button>
                                        ) : (
                                            "—"
                                        )}
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

export default PersonLedgerPanel;
