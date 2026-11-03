import { API_BASE_URL } from "../../../api/http";
// src/Pages/BankTable/PaidChecks/PaidChecksTable.jsx

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "../ReceivedChecks/ReceivedChecksTable.module.css";
import useModulePermission from "../../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;

const PAID_CHECKS_API = `${API_BASE}/banking/api/v2/outcheque_list/`;
const BANKS_API = `${API_BASE}/banking/api/v2/bank_list/`;

const passOutChequeApi = (id) =>
    `${API_BASE}/banking/api/${id}/v2/cheques/pass-out/`;

const returnOutChequeApi = (id) =>
    `${API_BASE}/banking/api/${id}/v2/cheques/return-out/`;

const cancelChequeApi = (id) =>
    `${API_BASE}/banking/api/${id}/v2/cheques/cancel/`;

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

function formatDate(dateStr) {
    if (!dateStr) return "—";

    try {
        return new Date(dateStr).toLocaleDateString("fa-IR");
    } catch {
        return dateStr;
    }
}

function formatMoney(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString("fa-IR")} ریال`;
}

function getDocId(value) {
    if (!value) return null;
    if (typeof value === "object") return value.id || value.pk || null;
    return value;
}

function getBankTitle(bank) {
    return (
        bank?.name ||
        bank?.title ||
        bank?.account_number ||
        bank?.card_number ||
        `بانک #${bank?.id}`
    );
}

function getCheckNumber(check) {
    return (
        check.cheque_number ||
        check.number ||
        check.sayad_number ||
        `چک #${check.id}`
    );
}

function getDueDate(check) {
    return check.due_date || check.date;
}

function getStatusText(status) {
    switch (status) {
        case "PENDING":
            return "در جریان";
        case "DEPOSITED":
            return "واگذار شده به بانک";
        case "CLEARED":
            return "پاس شده";
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
            return `${styles.badge} ${styles.badgePending}`;
        case "DEPOSITED":
            return `${styles.badge} ${styles.badgeDeposited}`;
        case "CLEARED":
            return `${styles.badge} ${styles.badgeCleared}`;
        case "SPENT":
            return `${styles.badge} ${styles.badgeSpent}`;
        case "RETURNED":
            return `${styles.badge} ${styles.badgeReturned}`;
        case "CANCELED":
            return `${styles.badge} ${styles.badgeCanceled}`;
        default:
            return `${styles.badge} ${styles.badgeDefault}`;
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
function getChequeTypeText(check) {
    const value = check?.cheque_type;

    if (value === "دریافتی" || value === "IN") return "دریافتی";
    if (value === "پرداختی" || value === "OUT") return "پرداختی";

    return check?.cheque_type_label || value || "—";
}

function BankSelectModal({
    title,
    description,
    banks,
    loadingBanks,
    onClose,
    onConfirm,
    submitting,
}) {
    const [bankId, setBankId] = useState("");

    useEffect(() => {
        if (!bankId && banks.length > 0) {
            setBankId(String(banks[0].id));
        }
    }, [banks, bankId]);

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{title}</h3>
                    <button type="button" onClick={onClose} className={styles.closeBtn}>
                        ×
                    </button>
                </div>

                <p className={styles.modalDesc}>{description}</p>

                <div className={styles.field}>
                    <label>انتخاب بانک پرداخت‌کننده</label>

                    <select
                        value={bankId}
                        onChange={(e) => setBankId(e.target.value)}
                        disabled={loadingBanks || submitting}
                    >
                        {loadingBanks ? (
                            <option value="">در حال دریافت بانک‌ها...</option>
                        ) : banks.length === 0 ? (
                            <option value="">بانکی یافت نشد</option>
                        ) : (
                            banks.map((bank) => (
                                <option key={bank.id} value={bank.id}>
                                    {getBankTitle(bank)}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div className={styles.modalActions}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        انصراف
                    </button>

                    <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => onConfirm(bankId)}
                        disabled={!bankId || submitting}
                    >
                        {submitting ? "در حال انجام..." : "تأیید"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ChequeDetailsModal({ check, onClose, onOpenDocument }) {
    if (!check) return null;

    const accountingDocId = getDocId(check.accounting_document);
    const settlementDocId = getDocId(check.settlement_document);
    const reverseDocId = getDocId(check.reverse_document);

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.detailsModal}>
                <div className={styles.detailsHeader}>
                    <div>
                        <h3>جزئیات چک {getCheckNumber(check)}</h3>
                        <p>
                            نوع چک: {getChequeTypeText(check)} — وضعیت:{" "}
                            {check.status_label || getStatusText(check.status)}
                        </p>
                    </div>

                    <button type="button" className={styles.closeIconBtn} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.detailsGrid}>
                    <div>
                        <span>شماره چک</span>
                        <strong>{check.cheque_number || check.number || "—"}</strong>
                    </div>

                    <div>
                        <span>شماره صیاد</span>
                        <strong>{check.sayad_number || "—"}</strong>
                    </div>

                    <div>
                        <span>مبلغ</span>
                        <strong>{formatMoney(check.amount)}</strong>
                    </div>

                    <div>
                        <span>تاریخ سررسید</span>
                        <strong>{formatDate(getDueDate(check))}</strong>
                    </div>

                    <div>
                        <span>طرف حساب</span>
                        <strong>{check.payer_name || "—"}</strong>
                    </div>

                    <div>
                        <span>بانک چک</span>
                        <strong>{check.bank_name || "—"}</strong>
                    </div>

                    <div>
                        <span>شعبه بانک</span>
                        <strong>{check.bank_branch || "—"}</strong>
                    </div>

                    <div>
                        <span>بانک پرداخت</span>
                        <strong>{check.settlement_bank_name || "—"}</strong>
                    </div>

                    <div>
                        <span>تاریخ ثبت / دریافت</span>
                        <strong>{formatDate(check.received_date)}</strong>
                    </div>

                    <div>
                        <span>تاریخ پاس شدن / تسویه</span>
                        <strong>{formatDate(check.settled_date)}</strong>
                    </div>

                    <div>
                        <span>وضعیت</span>
                        <strong>
                            <span className={getStatusClass(check.status)}>
                                {check.status_label || getStatusText(check.status)}
                            </span>
                        </strong>
                    </div>

                    <div>
                        <span>شناسه چک</span>
                        <strong>#{check.id}</strong>
                    </div>
                </div>

                <div className={styles.descriptionBox}>
                    <span>توضیحات</span>
                    <p>{check.description || "توضیحی ثبت نشده است."}</p>
                </div>

                <div className={styles.documentBox}>
                    <span>اسناد مرتبط</span>

                    <div className={styles.documentActions}>
                        {accountingDocId ? (
                            <button
                                type="button"
                                className={styles.docBtn}
                                onClick={() => onOpenDocument(accountingDocId)}
                            >
                                سند ثبت اولیه
                            </button>
                        ) : (
                            <em>سند ثبت اولیه ندارد</em>
                        )}

                        {settlementDocId ? (
                            <button
                                type="button"
                                className={styles.docBtn}
                                onClick={() => onOpenDocument(settlementDocId)}
                            >
                                سند پاس شدن
                            </button>
                        ) : (
                            <em>سند پاس شدن ندارد</em>
                        )}

                        {reverseDocId ? (
                            <button
                                type="button"
                                className={styles.docBtn}
                                onClick={() => onOpenDocument(reverseDocId)}
                            >
                                سند برگشت / ابطال
                            </button>
                        ) : (
                            <em>سند برگشت یا ابطال ندارد</em>
                        )}
                    </div>
                </div>

                <div className={styles.detailsFooter}>
                    <button type="button" onClick={onClose}>
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
}

function PaidChecksTable() {
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("banking");

    const guardWrite = () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return true;
        }
        return false;
    };

    const [checks, setChecks] = useState([]);
    const [banks, setBanks] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        date_from: "",
        date_to: "",
        min_amount: "",
        max_amount: "",
    });

    const [passTarget, setPassTarget] = useState(null);
    const [detailsTarget, setDetailsTarget] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchChecks = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await axios.get(PAID_CHECKS_API, {
                params: getFilterParams(),
            });

            setChecks(normalizeList(res.data));
        } catch (err) {
            console.error("Fetch paid cheques error:", err);
            setError("خطا در دریافت لیست چک‌های پرداختی");
        } finally {
            setLoading(false);
        }
    };

    const fetchBanks = async () => {
        try {
            setLoadingBanks(true);

            const res = await axios.get(BANKS_API);
            setBanks(normalizeList(res.data));
        } catch (err) {
            console.error("Fetch banks error:", err);
            toast.error("خطا در دریافت لیست بانک‌ها");
        } finally {
            setLoadingBanks(false);
        }
    };

    const getFilterParams = () => {
        const params = {};

        if (searchTerm.trim()) {
            params.search = searchTerm.trim();
        }

        Object.entries(filters).forEach(([key, value]) => {
            if (String(value || "").trim()) {
                params[key] = value;
            }
        });

        return params;
    };

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const resetFilters = () => {
        setSearchTerm("");
        setFilters({
            status: "",
            date_from: "",
            date_to: "",
            min_amount: "",
            max_amount: "",
        });
    };

    useEffect(() => {
        fetchBanks();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchChecks();
        }, 400);

        return () => clearTimeout(timer);
    }, [searchTerm, filters]);

    const filteredChecks = useMemo(() => checks, [checks]);

    const handlePass = async (bankId) => {
        if (guardWrite()) return;
        if (!passTarget?.id || !bankId) return;

        try {
            setSubmitting(true);

            await axios.post(passOutChequeApi(passTarget.id), {
                bank_id: Number(bankId),
            });

            toast.success("چک پرداختی با موفقیت پاس شد");
            setPassTarget(null);
            fetchChecks();
        } catch (err) {
            console.error("Pass out cheque error:", err);
            toast.error(err.response?.data?.detail || "پاس شدن چک انجام نشد");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturn = async (check) => {
        if (guardWrite()) return;

        const ok = window.confirm(
            `چک پرداختی ${getCheckNumber(check)} برگشت داده شود؟`
        );

        if (!ok) return;

        try {
            setSubmitting(true);

            await axios.post(returnOutChequeApi(check.id));

            toast.success("چک پرداختی با موفقیت برگشت خورد");
            fetchChecks();
        } catch (err) {
            console.error("Return out cheque error:", err);
            toast.error(err.response?.data?.detail || "برگشت چک پرداختی انجام نشد");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (check) => {
        if (guardWrite()) return;

        const ok = window.confirm(
            `چک پرداختی ${getCheckNumber(check)} ابطال شود؟ این عملیات قابل برگشت نیست.`
        );

        if (!ok) return;

        try {
            setSubmitting(true);

            await axios.post(cancelChequeApi(check.id));

            toast.success("چک با موفقیت ابطال شد");
            fetchChecks();
        } catch (err) {
            console.error("Cancel cheque error:", err);
            toast.error(err.response?.data?.detail || "ابطال چک انجام نشد");
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportCsv = () => {
        const rows = [
            [
                "ردیف",
                "شماره چک",
                "شماره صیاد",
                "تاریخ سررسید",
                "مبلغ",
                "دریافت‌کننده / طرف حساب",
                "بانک چک",
                "بانک پرداخت",
                "وضعیت",
                "توضیحات",
            ],
            ...filteredChecks.map((check, index) => [
                index + 1,
                check.cheque_number || check.number || "",
                check.sayad_number || "",
                formatDate(getDueDate(check)),
                Number(check.amount || 0),
                check.payer_name || "",
                check.bank_name || "",
                check.settlement_bank_name || "",
                check.status_label || getStatusText(check.status),
                check.description || "",
            ]),
        ];

        downloadCsv(`paid-cheques-${getExportDate()}.csv`, rows);
    };

    const handleOpenDocument = (documentId) => {
        if (!documentId) return;
        navigate(`/accounting/documents/${documentId}`);
    };

    const canPass = (check) => check.status === "PENDING";

    const canReturn = (check) => check.status === "PENDING";

    const canCancel = (check) => check.status === "PENDING";

    const renderDocumentButtons = (check) => {
        const accountingDocId = getDocId(check.accounting_document);
        const settlementDocId = getDocId(check.settlement_document);
        const reverseDocId = getDocId(check.reverse_document);

        if (!accountingDocId && !settlementDocId && !reverseDocId) {
            return <span className={styles.muted}>—</span>;
        }

        return (
            <div className={styles.docButtons}>
                {accountingDocId && (
                    <button
                        type="button"
                        className={styles.docBtn}
                        onClick={() => navigate(`/accounting/documents/${accountingDocId}`)}
                    >
                        ثبت
                    </button>
                )}

                {settlementDocId && (
                    <button
                        type="button"
                        className={styles.docBtn}
                        onClick={() => navigate(`/accounting/documents/${settlementDocId}`)}
                    >
                        پاس
                    </button>
                )}

                {reverseDocId && (
                    <button
                        type="button"
                        className={styles.docBtn}
                        onClick={() => navigate(`/accounting/documents/${reverseDocId}`)}
                    >
                        برگشت/ابطال
                    </button>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className={styles.loading}>در حال بارگذاری چک‌های پرداختی...</div>;
    }

    if (error) {
        return (
            <div className={styles.errorBox}>
                <strong>خطا</strong>
                <p>{error}</p>
                <button type="button" onClick={fetchChecks}>
                    تلاش دوباره
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>لیست چک‌های پرداختی</h2>
                    <p>مدیریت پاس شدن، برگشت، ابطال و اسناد حسابداری چک‌های پرداختی</p>
                </div>

                <div className={styles.headerButtons}>
                    <button
                        type="button"
                        className={styles.exportBtn}
                        onClick={handleExportCsv}
                        disabled={filteredChecks.length === 0}
                    >
                        خروجی Excel
                    </button>

                    <button type="button" className={styles.refreshBtn} onClick={fetchChecks}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <input
                    type="text"
                    value={searchTerm}
                    placeholder="جستجو بر اساس شماره چک، صیاد، شخص، بانک یا وضعیت..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <span>{filteredChecks.length.toLocaleString("fa-IR")} چک</span>
            </div>

            <div className={styles.filterPanel}>
                <div className={styles.filterField}>
                    <label>وضعیت</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                    >
                        <option value="">همه وضعیت‌ها</option>
                        <option value="PENDING">در جریان</option>
                        <option value="CLEARED">پاس شده</option>
                        <option value="RETURNED">برگشتی</option>
                        <option value="CANCELED">ابطال شده</option>
                    </select>
                </div>

                <div className={styles.filterField}>
                    <label>از تاریخ سررسید</label>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleFilterChange("date_from", e.target.value)}
                    />
                </div>

                <div className={styles.filterField}>
                    <label>تا تاریخ سررسید</label>
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => handleFilterChange("date_to", e.target.value)}
                    />
                </div>

                <div className={styles.filterField}>
                    <label>حداقل مبلغ</label>
                    <input
                        type="number"
                        value={filters.min_amount}
                        onChange={(e) => handleFilterChange("min_amount", e.target.value)}
                        placeholder="مثلا 1000000"
                    />
                </div>

                <div className={styles.filterField}>
                    <label>حداکثر مبلغ</label>
                    <input
                        type="number"
                        value={filters.max_amount}
                        onChange={(e) => handleFilterChange("max_amount", e.target.value)}
                        placeholder="مثلا 50000000"
                    />
                </div>

                <button
                    type="button"
                    className={styles.resetFilterBtn}
                    onClick={resetFilters}
                >
                    حذف فیلترها
                </button>
            </div>

            {filteredChecks.length === 0 ? (
                <div className={styles.empty}>چک پرداختی یافت نشد.</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره چک</th>
                                <th>شماره صیاد</th>
                                <th>تاریخ سررسید</th>
                                <th>مبلغ</th>
                                <th>دریافت‌کننده / طرف حساب</th>
                                <th>بانک چک</th>
                                <th>بانک پرداخت</th>
                                <th>وضعیت</th>
                                <th>اسناد</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredChecks.map((check, index) => (
                                <tr key={check.id}>
                                    <td>{index + 1}</td>

                                    <td>
                                        <strong>{check.cheque_number || check.number || "—"}</strong>
                                    </td>

                                    <td>{check.sayad_number || "—"}</td>

                                    <td>{formatDate(getDueDate(check))}</td>

                                    <td>
                                        <span className={styles.amount}>
                                            {formatMoney(check.amount)}
                                        </span>
                                    </td>

                                    <td>{check.payer_name || "—"}</td>

                                    <td>{check.bank_name || "—"}</td>

                                    <td>{check.settlement_bank_name || "—"}</td>

                                    <td>
                                        <span className={getStatusClass(check.status)}>
                                            {check.status_label || getStatusText(check.status)}
                                        </span>
                                    </td>

                                    <td>{renderDocumentButtons(check)}</td>

                                    <td>
                                        <div className={styles.actionButtons}>
                                            <button
                                                type="button"
                                                className={styles.viewBtn}
                                                onClick={() => setDetailsTarget(check)}
                                            >
                                                جزئیات
                                            </button>
                                            {canPass(check) && (
                                                <button
                                                    type="button"
                                                    className={styles.successBtn}
                                                    onClick={() => {
                                                        if (guardWrite()) return;
                                                        setPassTarget(check);
                                                    }}
                                                    disabled={submitting || !canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    پاس شدن
                                                </button>
                                            )}

                                            {canReturn(check) && (
                                                <button
                                                    type="button"
                                                    className={styles.warningBtn}
                                                    onClick={() => handleReturn(check)}
                                                    disabled={submitting || !canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    برگشت
                                                </button>
                                            )}

                                            {canCancel(check) && (
                                                <button
                                                    type="button"
                                                    className={styles.dangerBtn}
                                                    onClick={() => handleCancel(check)}
                                                    disabled={submitting || !canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    ابطال
                                                </button>
                                            )}

                                            {!canPass(check) && !canReturn(check) && !canCancel(check) && (
                                                <span className={styles.muted}>بدون عملیات</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {passTarget && (
                <BankSelectModal
                    title="پاس شدن چک پرداختی"
                    description={`برای پاس شدن چک ${getCheckNumber(passTarget)} بانک پرداخت‌کننده را انتخاب کن.`}
                    banks={banks}
                    loadingBanks={loadingBanks}
                    submitting={submitting}
                    onClose={() => setPassTarget(null)}
                    onConfirm={handlePass}
                />
            )}
            {detailsTarget && (
                <ChequeDetailsModal
                    check={detailsTarget}
                    onClose={() => setDetailsTarget(null)}
                    onOpenDocument={handleOpenDocument}
                />
            )}
        </div>
    );
}

export default PaidChecksTable;