import { API_BASE_URL } from "../../api/http";
import styles from "./ReceiptTable.module.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
    FaPlus,
    FaSearch,
    FaTrashAlt,
    FaEdit,
    FaEye,
    FaFileInvoice,
    FaTimes,
} from "react-icons/fa";
import axios from "axios";
import AddReceiptStep1 from "./AddReceiptStep1";
import { toast } from "react-toastify";
import useModulePermission from "../../hooks/useModulePermission";
import { PageHero, StatGrid, StatCard, FilterBar, PrimaryButton } from "../../components/ERP";
import { FiArrowDownCircle, FiArrowUpCircle, FiFileText, FiRepeat } from "react-icons/fi";

const API_URL = `${API_BASE_URL}/warehousing/api/v2/warehouse_receipts/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/warehousing/api/${id}/v2/warehouse_receipts/`;

export default function ReceiptsTable() {
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("warehousing");

    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showStep1Modal, setShowStep1Modal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [detailsTarget, setDetailsTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const refresh = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(API_URL);
            setReceipts(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error(err);
            toast.error("خطا در دریافت رسید و حواله‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const filteredReceipts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return receipts;

        return receipts.filter((r) =>
            [
                r.number,
                r.document_number,
                r.date,
                r.direction,
                r.type,
                r.doc_type,
                r.status,
                r.from_warehouse_name,
                r.destination_warehouse_name,
                r.related_party,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [receipts, searchTerm]);

    const guardWrite = () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return true;
        }

        return false;
    };

    const handleDelete = async () => {
        if (guardWrite()) return;
        if (!deleteTarget?.id) return;

        try {
            setDeleting(true);
            await axios.delete(API_DETAIL(deleteTarget.id));
            toast.success("سند با موفقیت حذف شد");
            setDeleteTarget(null);
            refresh();
        } catch (err) {
            console.error(err);
            toast.error("حذف سند انجام نشد");
        } finally {
            setDeleting(false);
        }
    };

    const handleEdit = (id) => {
        if (guardWrite()) return;
        navigate(`/inventory/transfers/new/edit/${id}`);
    };

    return (
        <>
            <div className={styles.tableContainer}>
                <PageHero
                    eyebrow="انبار / گردش کالا"
                    title="رسید و حواله‌های انبار"
                    description="ورود، خروج و انتقال کالا را با وضعیت و مرجع هر سند در یک نمای متمرکز کنترل کنید."
                    icon={<FiRepeat />}
                    actions={<PrimaryButton type="button" onClick={() => { if (guardWrite()) return; setShowStep1Modal(true); }} disabled={!canWrite}><FaPlus /> سند جدید</PrimaryButton>}
                />

                <StatGrid>
                    <StatCard label="کل اسناد" value={receipts.length.toLocaleString("fa-IR")} icon={<FiFileText />} />
                    <StatCard label="ورودی" value={receipts.filter((r) => String(r.direction || "").includes("ورود")).length.toLocaleString("fa-IR")} icon={<FiArrowDownCircle />} tone="success" />
                    <StatCard label="خروجی" value={receipts.filter((r) => String(r.direction || "").includes("خروج")).length.toLocaleString("fa-IR")} icon={<FiArrowUpCircle />} tone="warning" />
                    <StatCard label="نتیجه فیلتر" value={filteredReceipts.length.toLocaleString("fa-IR")} icon={<FiRepeat />} tone="info" />
                </StatGrid>

                <FilterBar search={searchTerm} onSearch={setSearchTerm} searchPlaceholder="جستجو بر اساس شماره، تاریخ، نوع، انبار یا وضعیت..." resultText={`${filteredReceipts.length.toLocaleString("fa-IR")} سند`} />

                {loading ? (
                    <div className={styles.skeletonWrapper}>
                        {Array.from({ length: 6 }).map((_, index) => (
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
                                    <th>شماره سند</th>
                                    <th>تاریخ</th>
                                    <th>نوع ورود/خروج</th>
                                    <th>نوع سند</th>
                                    <th>انبار مبدا</th>
                                    <th>مقصد / طرف حساب</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan="9">
                                            <div className={styles.emptyState}>
                                                <FaFileInvoice />
                                                <strong>سندی پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا سند جدید ثبت کن.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReceipts.map((r, index) => (
                                        <tr key={r.id}>
                                            <td>{index + 1}</td>

                                            <td>
                                                <code className={styles.code}>
                                                    {r.number || r.document_number || "—"}
                                                </code>
                                            </td>

                                            <td>{r.date || "—"}</td>
                                            <td>{r.direction || "—"}</td>
                                            <td>{r.type || r.doc_type || "—"}</td>
                                            <td>{r.from_warehouse_name || "—"}</td>
                                            <td>{r.destination_warehouse_name || r.related_party || "—"}</td>

                                            <td>
                                                <span className={styles.statusBadge}>{r.status || "—"}</span>
                                            </td>

                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.detailsBtn}
                                                        title="جزئیات"
                                                        onClick={() => setDetailsTarget(r)}
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.editBtn}
                                                        title={!canWrite ? disabledReason : "ویرایش"}
                                                        onClick={() => handleEdit(r.id)}
                                                        disabled={!canWrite}
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        title={!canWrite ? disabledReason : "حذف"}
                                                        onClick={() => {
                                                            if (guardWrite()) return;
                                                            setDeleteTarget(r);
                                                        }}
                                                        disabled={!canWrite}
                                                    >
                                                        <FaTrashAlt />
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

            {showStep1Modal && (
                <AddReceiptStep1
                    onClose={() => setShowStep1Modal(false)}
                    canWrite={canWrite}
                    disabledReason={disabledReason}
                />
            )}

            {detailsTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.detailsModal}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>جزئیات سند</h3>
                                <p>شماره سند: {detailsTarget.number || "—"}</p>
                            </div>

                            <button
                                type="button"
                                className={styles.closeIconBtn}
                                onClick={() => setDetailsTarget(null)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className={styles.detailsGrid}>
                            <div>
                                <span>تاریخ</span>
                                <strong>{detailsTarget.date || "—"}</strong>
                            </div>
                            <div>
                                <span>نوع ورود/خروج</span>
                                <strong>{detailsTarget.direction || "—"}</strong>
                            </div>
                            <div>
                                <span>نوع سند</span>
                                <strong>{detailsTarget.type || "—"}</strong>
                            </div>
                            <div>
                                <span>انبار مبدا</span>
                                <strong>{detailsTarget.from_warehouse_name || "—"}</strong>
                            </div>
                            <div>
                                <span>انبار مقصد</span>
                                <strong>{detailsTarget.destination_warehouse_name || "—"}</strong>
                            </div>
                            <div>
                                <span>وضعیت</span>
                                <strong>{detailsTarget.status || "—"}</strong>
                            </div>
                        </div>

                        <div className={styles.descriptionBox}>
                            <span>توضیحات</span>
                            <p>{detailsTarget.description || "—"}</p>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.confirmModal}>
                        <div className={styles.modalIcon}>
                            <FaTrashAlt />
                        </div>

                        <h3>حذف سند</h3>

                        <p>
                            آیا از حذف سند شماره <strong>{deleteTarget.number}</strong> مطمئنی؟
                        </p>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.confirmDeleteBtn}
                                onClick={handleDelete}
                                disabled={deleting || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {deleting ? "در حال حذف..." : "حذف"}
                            </button>

                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                انصراف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}