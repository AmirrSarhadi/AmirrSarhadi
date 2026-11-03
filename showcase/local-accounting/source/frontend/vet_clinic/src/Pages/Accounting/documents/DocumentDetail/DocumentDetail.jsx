import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./DocumentDetail.module.css";
import DocumentAttachments from "../DocumentAttachments/DocumentAttachments";
import DocumentAuditTimeline from "../../components/DocumentAuditTimeline/DocumentAuditTimeline";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;
const DOCUMENTS_API = `${ACCOUNTING_BASE}/documents/`;

export default function DocumentDetail() {
    const { id } = useParams();
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchDocument();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            console.error("Response is not JSON:", text);
            throw new Error(`Invalid JSON response: ${res.url}`);
        }
    };

    const fetchDocument = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${id}/v2/documents/`);
            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("سند پیدا نشد");
                return;
            }

            setDocument(data);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات سند");
        } finally {
            setLoading(false);
        }
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const postAction = async (action) => {
        if (guardWrite()) return;

        try {
            setActionLoading(true);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${id}/v2/documents/${action}/`, {
                method: "POST",
            });

            if (!res.ok) {
                const errorData = await safeJson(res).catch(() => null);
                console.error(errorData);
                alert("عملیات انجام نشد");
                return;
            }

            await fetchDocument();
        } catch (err) {
            console.error(err);
            alert("خطا در انجام عملیات");
        } finally {
            setActionLoading(false);
        }
    };

    const deleteDocument = async () => {
        if (guardWrite()) return;

        const ok = window.confirm("آیا از حذف این سند مطمئنی؟");
        if (!ok) return;

        try {
            setActionLoading(true);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${id}/v2/documents/`, {
                method: "DELETE",
            });

            if (!res.ok && res.status !== 204) {
                const errorData = await safeJson(res).catch(() => null);
                console.error(errorData);
                alert("حذف سند انجام نشد");
                return;
            }

            window.location.href = "/accounting/documents";
        } catch (err) {
            console.error(err);
            alert("خطا در حذف سند");
        } finally {
            setActionLoading(false);
        }
    };

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const totalDebit = useMemo(() => {
        if (!document?.items) return 0;
        return document.items.reduce((sum, item) => sum + Number(item.debit || 0), 0);
    }, [document]);

    const totalCredit = useMemo(() => {
        if (!document?.items) return 0;
        return document.items.reduce((sum, item) => sum + Number(item.credit || 0), 0);
    }, [document]);

    const isBalanced = Math.round((totalDebit - totalCredit) * 100) / 100 === 0;

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!document) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <strong>سند پیدا نشد</strong>
                    <p>ممکن است حذف شده باشد یا آدرس اشتباه باشد.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>جزئیات سند شماره {document.number}</h3>
                    <p>مشاهده اطلاعات اصلی سند و ردیف‌های بدهکار و بستانکار.</p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={() => {
                            window.location.href = "/accounting/documents";
                        }}
                    >
                        بازگشت به لیست
                    </button>

                    <button
                        type="button"
                        className={styles.approveBtn}
                        disabled={
                            actionLoading ||
                            !canWrite ||
                            !isBalanced ||
                            document.status === "APPROVED" ||
                            document.is_locked
                        }
                        title={!canWrite ? disabledReason : undefined}
                        onClick={() => postAction("approve")}
                    >
                        تایید سند
                    </button>

                    {!document.is_locked ? (
                        <button
                            type="button"
                            className={styles.lockBtn}
                            disabled={actionLoading || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                            onClick={() => postAction("lock")}
                        >
                            قفل سند
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.unlockBtn}
                            disabled={actionLoading || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                            onClick={() => postAction("unlock")}
                        >
                            باز کردن قفل
                        </button>
                    )}

                    <button
                        type="button"
                        className={styles.deleteBtn}
                        disabled={actionLoading || !canWrite || document.is_locked}
                        title={!canWrite ? disabledReason : document.is_locked ? "سند قفل است" : undefined}
                        onClick={deleteDocument}
                    >
                        حذف سند
                    </button>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <span>شماره سند</span>
                    <strong>{document.number}</strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>سال مالی</span>
                    <strong>{document.fiscal_year_name || document.fiscal_year}</strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>تاریخ</span>
                    <strong>{document.date_jalali || document.date || "-"}</strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>ارجاع</span>
                    <strong>{document.reference || "-"}</strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>وضعیت</span>
                    <strong>
                        <span
                            className={`${styles.badge} ${document.status === "APPROVED"
                                ? styles.approvedBadge
                                : styles.draftBadge
                                }`}
                        >
                            {document.status_display || document.status}
                        </span>
                    </strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>نوع سند</span>
                    <strong>
                        <span className={`${styles.badge} ${styles.typeBadge}`}>
                            {document.document_type_display || document.document_type}
                        </span>
                    </strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>قفل</span>
                    <strong>
                        <span
                            className={`${styles.badge} ${document.is_locked ? styles.lockedBadge : styles.unlockedBadge
                                }`}
                        >
                            {document.is_locked ? "قفل شده" : "باز"}
                        </span>
                    </strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>تراز</span>
                    <strong>
                        <span
                            className={`${styles.badge} ${isBalanced ? styles.balancedBadge : styles.notBalancedBadge
                                }`}
                        >
                            {isBalanced ? "تراز" : "نامتوازن"}
                        </span>
                    </strong>
                </div>
            </div>

            <div className={styles.descriptionCard}>
                <span>شرح سند</span>
                <p>{document.description || "بدون شرح"}</p>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <div>
                        <h4>ردیف‌های سند</h4>
                        <p>تمام آیتم‌های بدهکار و بستانکار ثبت‌شده در این سند.</p>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>کد حساب</th>
                                <th>حساب</th>
                                <th>تفضیل</th>
                                <th>مرکز هزینه</th>
                                <th>شعبه</th>
                                <th>دپارتمان</th>
                                <th>شرح</th>
                                <th>واحد پول</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>مبلغ</th>
                            </tr>
                        </thead>

                        <tbody>
                            {document.items?.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className={styles.emptyState}>
                                        <strong>ردیفی برای این سند ثبت نشده</strong>
                                    </td>
                                </tr>
                            ) : (
                                document.items?.map((item, index) => (
                                    <tr key={item.id || index}>
                                        <td>{item.row_no || index + 1}</td>
                                        <td>{item.account_code || "-"}</td>
                                        <td className={styles.accountCell}>
                                            {item.account_name || item.account || "-"}
                                        </td>
                                        <td>{item.detail_name || item.detail_id_display || "-"}</td>
                                        <td>{item.cost_center_title || item.cost_center_code || "-"}</td>
                                        <td>{item.branch_title || item.branch_code || "-"}</td>
                                        <td>{item.department_title || item.department_code || "-"}</td>
                                        <td className={styles.noteCell}>{item.note || "-"}</td>
                                        <td>{item.currency || document.currency || "IRR"}</td>
                                        <td>{formatMoney(item.debit)}</td>
                                        <td>{formatMoney(item.credit)}</td>
                                        <td>
                                            <span className={styles.amountBadge}>
                                                {formatMoney(Number(item.debit || 0) || Number(item.credit || 0))}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="9">جمع</td>
                                <td>{formatMoney(totalDebit)}</td>
                                <td>{formatMoney(totalCredit)}</td>
                                <td>
                                    <span
                                        className={`${styles.balanceBadge} ${isBalanced ? styles.balancedBadge : styles.notBalancedBadge
                                            }`}
                                    >
                                        {isBalanced
                                            ? "تراز"
                                            : `اختلاف: ${formatMoney(Math.abs(totalDebit - totalCredit))}`}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            <DocumentAttachments documentId={id} />

            <DocumentAuditTimeline documentId={id} />

        </div>
    );
}