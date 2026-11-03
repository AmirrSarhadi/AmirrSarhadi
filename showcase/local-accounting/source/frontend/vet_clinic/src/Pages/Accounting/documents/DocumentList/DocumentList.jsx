import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./DocumentList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const DOCUMENTS_API = `${ACCOUNTING_BASE}/documents/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

export default function DocumentList() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [documents, setDocuments] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [documentType, setDocumentType] = useState("");
    const [fiscalYear, setFiscalYear] = useState("");
    const [isLocked, setIsLocked] = useState("");

    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

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

        if (search.trim()) params.append("search", search.trim());
        if (status) params.append("status", status);
        if (documentType) params.append("document_type", documentType);
        if (fiscalYear) params.append("fiscal_year", fiscalYear);
        if (isLocked) params.append("is_locked", isLocked);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [fyRes, docRes] = await Promise.all([
                authFetch(FISCAL_YEARS_API),
                authFetch(`${DOCUMENTS_API}${buildQuery()}`),
            ]);

            const [fyData, docData] = await Promise.all([
                safeJson(fyRes),
                safeJson(docRes),
            ]);

            setFiscalYears(normalizeResponse(fyData));
            setDocuments(normalizeResponse(docData));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت لیست اسناد");
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${DOCUMENTS_API}${buildQuery()}`);
            const data = await safeJson(res);

            setDocuments(normalizeResponse(data));
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی لیست اسناد");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDocuments();
        }, 350);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, documentType, fiscalYear, isLocked]);

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };


    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setDocumentType("");
        setFiscalYear("");
        setIsLocked("");
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const postAction = async (docId, action) => {
        if (guardWrite()) return;

        try {
            setActionLoadingId(docId);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${docId}/v2/documents/${action}/`, {
                method: "POST",
            });

            if (!res.ok) {
                const errData = await safeJson(res).catch(() => null);
                console.error(errData);
                alert("عملیات انجام نشد");
                return;
            }

            await fetchDocuments();
        } catch (err) {
            console.error(err);
            alert("خطا در انجام عملیات");
        } finally {
            setActionLoadingId(null);
        }
    };

    const deleteDocument = async (docId) => {
        if (guardWrite()) return;

        const ok = window.confirm("آیا از حذف این سند مطمئنی؟");
        if (!ok) return;

        try {
            setActionLoadingId(docId);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${docId}/v2/documents/`, {
                method: "DELETE",
            });

            if (!res.ok && res.status !== 204) {
                const errData = await safeJson(res).catch(() => null);
                console.error(errData);
                alert("حذف سند انجام نشد");
                return;
            }

            await fetchDocuments();
        } catch (err) {
            console.error(err);
            alert("خطا در حذف سند");
        } finally {
            setActionLoadingId(null);
        }
    };

    const stats = useMemo(() => {
        const totalDebit = documents.reduce(
            (sum, item) => sum + Number(item.total_debit || 0),
            0
        );

        const totalCredit = documents.reduce(
            (sum, item) => sum + Number(item.total_credit || 0),
            0
        );

        return {
            count: documents.length,
            totalDebit,
            totalCredit,
            approved: documents.filter((item) => item.status === "APPROVED").length,
            draft: documents.filter((item) => item.status === "DRAFT").length,
            locked: documents.filter((item) => item.is_locked).length,
        };
    }, [documents]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>لیست اسناد حسابداری</h3>
                    <p>اسناد ثبت‌شده را مشاهده، فیلتر، تایید، قفل یا حذف کن.</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => {
                        if (guardWrite()) return;
                        window.location.href = "/accounting/documents/create";
                    }}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    ایجاد سند جدید
                </button>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span>تعداد اسناد</span>
                    <strong>{stats.count.toLocaleString("fa-IR")}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>جمع بدهکار</span>
                    <strong>{formatMoney(stats.totalDebit)}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>جمع بستانکار</span>
                    <strong>{formatMoney(stats.totalCredit)}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>تایید شده / پیش‌نویس</span>
                    <strong>
                        {stats.approved.toLocaleString("fa-IR")} /{" "}
                        {stats.draft.toLocaleString("fa-IR")}
                    </strong>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس شماره، ارجاع یا شرح..."
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

                <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                >
                    <option value="">همه نوع‌ها</option>
                    <option value="MANUAL">دستی</option>
                    <option value="AUTO">اتوماتیک</option>
                </select>

                <select value={isLocked} onChange={(e) => setIsLocked(e.target.value)}>
                    <option value="">همه قفل‌ها</option>
                    <option value="true">قفل شده</option>
                    <option value="false">باز</option>
                </select>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن فیلتر
                </button>
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
                                <th>شماره</th>
                                <th>سال مالی</th>
                                <th>تاریخ</th>
                                <th>ارجاع</th>
                                <th>شرح</th>
                                <th>وضعیت</th>
                                <th>نوع</th>
                                <th>قفل</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>تراز</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {documents.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className={styles.emptyState}>
                                        <strong>سندی پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا یک سند جدید ایجاد کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                documents.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td
                                            className={styles.numberCell}
                                            onClick={() => {
                                                window.location.href = `/accounting/documents/${item.id}`;
                                            }}
                                        >
                                            {item.number}
                                        </td>
                                        <td>{item.fiscal_year_name || item.fiscal_year || "-"}</td>
                                        <td>{item.date_jalali || item.date || "-"}</td>
                                        <td>{item.reference || "-"}</td>
                                        <td className={styles.descriptionCell}>
                                            {item.description || "-"}
                                        </td>

                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${item.status === "APPROVED"
                                                    ? styles.approvedBadge
                                                    : styles.draftBadge
                                                    }`}
                                            >
                                                {item.status_display || item.status}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={styles.typeBadge}>
                                                {item.document_type_display || item.document_type}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`${styles.lockBadge} ${item.is_locked ? styles.lockedBadge : styles.unlockedBadge
                                                    }`}
                                            >
                                                {item.is_locked ? "قفل شده" : "باز"}
                                            </span>
                                        </td>

                                        <td>{formatMoney(item.total_debit)}</td>
                                        <td>{formatMoney(item.total_credit)}</td>

                                        <td>
                                            <span
                                                className={`${styles.balanceBadge} ${item.is_balanced ? styles.balanced : styles.notBalanced
                                                    }`}
                                            >
                                                {item.is_balanced ? "تراز" : "نامتوازن"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    type="button"
                                                    className={styles.btnApprove}
                                                    disabled={
                                                        actionLoadingId === item.id ||
                                                        !canWrite ||
                                                        item.status === "APPROVED" ||
                                                        item.is_locked
                                                    }
                                                    title={!canWrite ? disabledReason : undefined}
                                                    onClick={() => postAction(item.id, "approve")}
                                                >
                                                    تایید
                                                </button>

                                                {!item.is_locked ? (
                                                    <button
                                                        type="button"
                                                        className={styles.btnLock}
                                                        disabled={actionLoadingId === item.id || !canWrite}
                                                        title={!canWrite ? disabledReason : undefined}
                                                        onClick={() => postAction(item.id, "lock")}
                                                    >
                                                        قفل
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.btnUnlock}
                                                        disabled={actionLoadingId === item.id || !canWrite}
                                                        title={!canWrite ? disabledReason : undefined}
                                                        onClick={() => postAction(item.id, "unlock")}
                                                    >
                                                        باز کردن
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className={styles.btnDelete}
                                                    disabled={actionLoadingId === item.id || !canWrite || item.is_locked}
                                                    title={!canWrite ? disabledReason : item.is_locked ? "سند قفل است" : undefined}
                                                    onClick={() => deleteDocument(item.id)}
                                                >
                                                    حذف
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.editBtn}
                                                    disabled={!canWrite || item.is_locked}
                                                    title={!canWrite ? disabledReason : item.is_locked ? "سند قفل است" : undefined}
                                                    onClick={() => {
                                                        if (guardWrite() || item.is_locked) return;
                                                        window.location.href = `/accounting/documents/${item.id}/edit`;
                                                    }}
                                                >
                                                    ویرایش
                                                </button>
                                            </div>
                                        </td>
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