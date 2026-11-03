import { API_BASE_URL } from "../../../api/http";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./ChequeAccountingAudit.module.css";

const API_BASE = API_BASE_URL;
const AUDIT_API = `${API_BASE}/banking/api/v2/cheques/accounting-audit/`;

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

function getSeverityClass(severity) {
    if (severity === "warning") {
        return `${styles.issueBadge} ${styles.warning}`;
    }

    return `${styles.issueBadge} ${styles.error}`;
}

function getDocTitle(doc) {
    if (!doc) return "—";

    return doc.number || doc.id || "—";
}

function DocumentStatus({ title, doc, onOpen }) {
    if (!doc) {
        return (
            <div className={`${styles.docCard} ${styles.missingDoc}`}>
                <span>{title}</span>
                <strong>ندارد</strong>
            </div>
        );
    }

    return (
        <div className={`${styles.docCard} ${doc.is_balanced ? styles.okDoc : styles.badDoc}`}>
            <span>{title}</span>

            <strong>
                سند {getDocTitle(doc)}
            </strong>

            <p>
                بدهکار: {formatMoney(doc.debit)} — بستانکار: {formatMoney(doc.credit)}
            </p>

            <small>
                {doc.is_balanced ? "تراز" : `اختلاف: ${formatMoney(doc.difference)}`}
            </small>

            <button type="button" onClick={() => onOpen(doc.id)}>
                مشاهده سند
            </button>
        </div>
    );
}

function SummaryCard({ title, value, tone }) {
    return (
        <div className={`${styles.summaryCard} ${styles[tone] || ""}`}>
            <span>{title}</span>
            <strong>{Number(value || 0).toLocaleString("fa-IR")}</strong>
        </div>
    );
}

function ChequeAccountingAudit() {
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({});
    const [filters, setFilters] = useState({
        cheque_type: "",
        status: "",
        only_issues: "1",
        search: "",
    });
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

    const fetchAudit = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await axios.get(AUDIT_API, {
                params: getParams(),
            });

            setSummary(res.data?.summary || {});
            setItems(Array.isArray(res.data?.items) ? res.data.items : []);
        } catch (err) {
            console.error("Cheque accounting audit error:", err);
            setError(
                err?.response?.data?.detail ||
                "خطا در دریافت گزارش کنترل اسناد چک‌ها"
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
            cheque_type: "",
            status: "",
            only_issues: "1",
            search: "",
        });
    };

    const openDocument = (documentId) => {
        if (!documentId) return;
        navigate(`/accounting/documents/${documentId}`);
    };

    const renderedItems = useMemo(() => items, [items]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>کنترل اسناد حسابداری چک‌ها</h3>
                    <p>
                        بررسی سند اولیه، سند تسویه، سند برگشت/ابطال و تراز بودن اسناد مرتبط با چک‌ها
                    </p>
                </div>

                <button type="button" onClick={fetchAudit} disabled={loading}>
                    بروزرسانی
                </button>
            </div>

            <div className={styles.summaryGrid}>
                <SummaryCard
                    title="کل بررسی‌شده"
                    value={summary.total_checked}
                    tone="blue"
                />

                <SummaryCard
                    title="نمایش داده شده"
                    value={summary.shown_count}
                    tone="gray"
                />

                <SummaryCard
                    title="دارای مشکل"
                    value={summary.problem_count}
                    tone="red"
                />

                <SummaryCard
                    title="خطا"
                    value={summary.error_count}
                    tone="red"
                />

                <SummaryCard
                    title="هشدار"
                    value={summary.warning_count}
                    tone="yellow"
                />
            </div>

            <div className={styles.filters}>
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
                    <label>نمایش</label>
                    <select
                        value={filters.only_issues}
                        onChange={(e) => handleFilterChange("only_issues", e.target.value)}
                    >
                        <option value="1">فقط مشکل‌دارها</option>
                        <option value="0">همه چک‌ها</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>جستجو</label>
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                        placeholder="شماره چک، صیاد، بانک..."
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
                    در حال بررسی اسناد چک‌ها...
                </div>
            ) : renderedItems.length === 0 ? (
                <div className={styles.emptyBox}>
                    <strong>موردی برای نمایش وجود ندارد.</strong>
                    <p>
                        اگر فیلتر روی «فقط مشکل‌دارها» است، یعنی فعلاً خطایی پیدا نشده.
                    </p>
                </div>
            ) : (
                <div className={styles.auditList}>
                    {renderedItems.map((item) => (
                        <div key={item.id} className={styles.auditCard}>
                            <div className={styles.auditCardHeader}>
                                <div>
                                    <h4>
                                        چک {item.cheque_number}
                                    </h4>

                                    <p>
                                        {item.cheque_type_label} — {item.status_label} — مبلغ:{" "}
                                        {formatMoney(item.amount)} — سررسید: {formatDate(item.date)}
                                    </p>
                                </div>

                                <div className={styles.issueCounter}>
                                    {item.issues_count.toLocaleString("fa-IR")} مورد
                                </div>
                            </div>

                            <div className={styles.metaGrid}>
                                <div>
                                    <span>پرداخت‌کننده / طرف حساب</span>
                                    <strong>{item.payer_name || "—"}</strong>
                                </div>

                                <div>
                                    <span>خرج‌شده به</span>
                                    <strong>{item.spent_to_name || "—"}</strong>
                                </div>

                                <div>
                                    <span>بانک</span>
                                    <strong>{item.bank_name || "—"}</strong>
                                </div>

                                <div>
                                    <span>شماره صیاد</span>
                                    <strong>{item.sayad_number || "—"}</strong>
                                </div>
                            </div>

                            <div className={styles.documentsGrid}>
                                <DocumentStatus
                                    title="سند اولیه"
                                    doc={item.documents?.initial}
                                    onOpen={openDocument}
                                />

                                <DocumentStatus
                                    title="سند تسویه / وصول / خرج"
                                    doc={item.documents?.settlement}
                                    onOpen={openDocument}
                                />

                                <DocumentStatus
                                    title="سند برگشت / ابطال"
                                    doc={item.documents?.reverse}
                                    onOpen={openDocument}
                                />
                            </div>

                            {item.issues?.length > 0 ? (
                                <div className={styles.issuesBox}>
                                    {item.issues.map((issue, index) => (
                                        <span
                                            key={`${issue.code}-${index}`}
                                            className={getSeverityClass(issue.severity)}
                                        >
                                            {issue.title}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.okBox}>
                                    مشکل حسابداری برای این چک پیدا نشد.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ChequeAccountingAudit;