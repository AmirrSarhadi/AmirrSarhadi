import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    FaArrowRight,
    FaCheck,
    FaExchangeAlt,
    FaRedo,
    FaFileInvoice,
} from "react-icons/fa";
import styles from "./TreasuryVoucherList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const DETAIL_API = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/`;

const SUBMIT_API = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/submit/`;

const APPROVE_API = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/approve/`;

const REVERSE_API = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/reverse/`;

export default function TreasuryVoucherDetail() {
    const { canWrite, disabledReason } = useModulePermission("banking");
    const { id } = useParams();

    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");

    useEffect(() => {
        fetchVoucher();
    }, [id]);

    const fetchVoucher = async () => {
        try {
            setLoading(true);

            const res = await authFetch(DETAIL_API(id));
            const data = await res.json();

            setVoucher(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString("fa-IR");

    const typeLabel = (type) => {
        if (type === "RECEIPT") return "دریافت";
        if (type === "PAYMENT") return "پرداخت";
        return type || "-";
    };

    const statusLabel = (status) => {
        const map = {
            DRAFT: "پیش‌نویس",
            PENDING: "در انتظار تایید",
            APPROVED: "تایید شده",
            REJECTED: "رد شده",
        };

        return map[status] || status || "-";
    };

    const statusClass = (status) => {
        if (status === "APPROVED") return styles.badgeOk;
        if (status === "PENDING") return styles.badgeInfo;
        if (status === "REJECTED") return styles.badgeDanger;
        return styles.badgeDraft;
    };

    const runAction = async (url, loadingKey, confirmText) => {
        if (!canWrite) {
            alert(disabledReason);
            return;
        }

        if (confirmText && !window.confirm(confirmText)) return;

        try {
            setActionLoading(loadingKey);

            const res = await authFetch(url, {
                method: "POST",
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                alert(data?.error || "عملیات انجام نشد");
                return;
            }

            await fetchVoucher();
        } catch (err) {
            console.error(err);
            alert("خطا در انجام عملیات");
        } finally {
            setActionLoading("");
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>در حال دریافت اطلاعات...</div>
            </div>
        );
    }

    if (!voucher) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>سند خزانه پیدا نشد</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>جزئیات سند خزانه #{voucher.voucher_number}</h2>
                    <p>مشاهده وضعیت، عملیات و سند حسابداری مرتبط.</p>
                </div>

                <Link to="/treasury/vouchers" className={styles.addBtn}>
                    <FaArrowRight />
                    بازگشت
                </Link>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.resultCount}>
                    وضعیت: {statusLabel(voucher.status)}
                </div>

                <div className={styles.resultCount}>
                    نوع: {typeLabel(voucher.voucher_type)}
                </div>

                {voucher.is_reversed && (
                    <div className={styles.resultCount}>
                        برگشت شده
                    </div>
                )}
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <tbody>
                        <tr>
                            <th>شماره</th>
                            <td>{voucher.voucher_number}</td>

                            <th>نوع سند</th>
                            <td>
                                <span
                                    className={`${styles.badge} ${voucher.voucher_type === "RECEIPT"
                                        ? styles.badgeOk
                                        : styles.badgeDanger
                                        }`}
                                >
                                    {typeLabel(voucher.voucher_type)}
                                </span>
                            </td>
                        </tr>

                        <tr>
                            <th>تاریخ</th>
                            <td>{voucher.date || "-"}</td>

                            <th>وضعیت</th>
                            <td>
                                <span
                                    className={`${styles.badge} ${statusClass(
                                        voucher.status
                                    )}`}
                                >
                                    {statusLabel(voucher.status)}
                                </span>
                            </td>
                        </tr>

                        <tr>
                            <th>حساب خزانه</th>
                            <td>{voucher.treasury_account_name || "-"}</td>

                            <th>تفضیل</th>
                            <td>{voucher.detail_account_name || "-"}</td>
                        </tr>

                        <tr>
                            <th>مبلغ</th>
                            <td>
                                <span className={styles.amountBadge}>
                                    {formatMoney(voucher.amount)}
                                </span>
                            </td>

                            <th>سند حسابداری</th>
                            <td>
                                {voucher.accounting_document ? (
                                    <Link
                                        className={styles.linkBtn}
                                        to={`/accounting/documents/${voucher.accounting_document}`}
                                    >
                                        <FaFileInvoice /> مشاهده سند
                                    </Link>
                                ) : (
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <th>شرح</th>
                            <td colSpan="3">{voucher.description || "-"}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.inlineActions}>
                    {voucher.status === "DRAFT" && (
                        <>
                            <Link
                                to={canWrite ? `/treasury/vouchers/${voucher.id}/edit` : "#"}
                                className={styles.linkBtn}
                                aria-disabled={!canWrite}
                                title={!canWrite ? disabledReason : undefined}
                                onClick={(e) => {
                                    if (!canWrite) e.preventDefault();
                                }}
                            >
                                ویرایش
                            </Link>

                            <button
                                className={`${styles.actionBtn} ${styles.submitBtn}`}
                                disabled={actionLoading === "submit" || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                                onClick={() =>
                                    runAction(
                                        SUBMIT_API(voucher.id),
                                        "submit",
                                        "سند برای تایید ارسال شود؟"
                                    )
                                }
                            >
                                <FaExchangeAlt />
                                {actionLoading === "submit" ? "در حال ارسال..." : "ارسال"}
                            </button>
                        </>
                    )}

                    {voucher.status === "PENDING" && (
                        <button
                            className={`${styles.actionBtn} ${styles.approveBtn}`}
                            disabled={actionLoading === "approve" || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                            onClick={() =>
                                runAction(
                                    APPROVE_API(voucher.id),
                                    "approve",
                                    "سند خزانه تایید شود؟"
                                )
                            }
                        >
                            <FaCheck />
                            {actionLoading === "approve" ? "در حال تایید..." : "تایید"}
                        </button>
                    )}

                    {voucher.status === "APPROVED" && !voucher.is_reversed && (
                        <button
                            className={`${styles.actionBtn} ${styles.reverseBtn}`}
                            disabled={actionLoading === "reverse" || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                            onClick={() =>
                                runAction(
                                    REVERSE_API(voucher.id),
                                    "reverse",
                                    "سند خزانه برگشت شود؟"
                                )
                            }
                        >
                            <FaRedo />
                            {actionLoading === "reverse" ? "در حال برگشت..." : "برگشت"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}