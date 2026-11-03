import { getAllPages } from "../../api/lists";
import { API_BASE_URL, extractList } from "../../api/http";
// src/pages/Imprests/ImprestTable.jsx
import AddImprestForm from "./AddImprestForm";
import ImprestDetailsModal from "./ImprestDetailsModal";
import styles from "./ImprestTable.module.css";
import {
    FaEdit,
    FaTrashAlt,
    FaEye,
    FaSearch,
    FaPlus,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import moment from "jalali-moment";
import { toast } from "react-toastify";
import useModulePermission from "../../hooks/useModulePermission";

const API_LIST = `${API_BASE_URL}/banking/api/v2/imprest_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/imprest_list/`;

function ImprestTable() {
    const { canWrite, disabledReason } = useModulePermission("banking");

    const guardWrite = () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return true;
        }
        return false;
    };

    const [imprests, setImprests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [selectedImprest, setSelectedImprest] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editImprest, setEditImprest] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchImprests = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getAllPages(API_LIST);
            setImprests(extractList(response.data));
        } catch (err) {
            console.error("Fetch imprests error:", err);
            setError("خطا در دریافت لیست تنخواه‌گردان‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImprests();
    }, []);

    const filteredImprests = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return imprests;

        return imprests.filter((item) =>
            [
                item.name,
                item.account_code,
                item.currency,
                item.description,
                item.owner,
                item.responsible_person,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [imprests, searchTerm]);

    const handleAddImprest = (newItem) => {
        setImprests((prev) => [newItem, ...prev]);
    };

    const handleUpdateImprest = (updatedItem) => {
        setImprests((prev) =>
            prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
    };

    const handleDelete = async () => {
        if (guardWrite()) return;
        if (!deleteTarget?.id) return;

        try {
            setDeleting(true);
            await axios.delete(API_DETAIL(deleteTarget.id));
            toast.success("تنخواه‌گردان با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchImprests();
        } catch (err) {
            console.error("Delete imprest error:", err);
            toast.error("حذف تنخواه‌گردان انجام نشد");
        } finally {
            setDeleting(false);
        }
    };

    const formatMoney = (value) => Number(value || 0).toLocaleString("fa-IR");

    const formatDate = (date) => {
        if (!date) return "—";
        return moment(date).locale("fa").format("YYYY/MM/DD HH:mm");
    };

    if (error) {
        return (
            <div className={styles.errorBox}>
                <strong>خطا</strong>
                <p>{error}</p>
                <button type="button" onClick={fetchImprests}>
                    تلاش دوباره
                </button>
            </div>
        );
    }

    return (
        <>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست تنخواه‌گردان‌ها</h3>
                        <p>مدیریت تنخواه‌ها، موجودی، مسئول و وضعیت فعالیت</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => {
                            if (guardWrite()) return;
                            setShowAddForm(true);
                        }}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaPlus />
                        افزودن تنخواه
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، کد حسابداری، مسئول، واحد پول یا توضیحات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredImprests.length.toLocaleString("fa-IR")} تنخواه
                    </div>
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
                                    <th>نام تنخواه</th>
                                    <th>کد حسابداری</th>
                                    <th>مسئول</th>
                                    <th>موجودی</th>
                                    <th>واحد پول</th>
                                    <th>تاریخ ثبت</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredImprests.length === 0 ? (
                                    <tr>
                                        <td colSpan="9">
                                            <div className={styles.emptyState}>
                                                <strong>تنخواهی پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا تنخواه جدید اضافه کن.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredImprests.map((item, index) => (
                                        <tr key={item.id}>
                                            <td>{index + 1}</td>

                                            <td className={styles.nameCell}>{item.name || "—"}</td>

                                            <td>
                                                <code className={styles.code}>
                                                    {item.account_code || "—"}
                                                </code>
                                            </td>

                                            <td>{item.responsible_person || item.owner || "—"}</td>

                                            <td>
                                                <span className={styles.amountBadge}>
                                                    {formatMoney(item.account_balance)}
                                                </span>
                                            </td>

                                            <td>{item.currency || "—"}</td>

                                            <td>{formatDate(item.created_at)}</td>

                                            <td>
                                                <span
                                                    className={`${styles.statusBadge} ${item.is_active
                                                            ? styles.activeBadge
                                                            : styles.inactiveBadge
                                                        }`}
                                                >
                                                    {item.is_active ? "فعال" : "غیرفعال"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.viewBtn}
                                                        onClick={() => setSelectedImprest(item)}
                                                        title="جزئیات"
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.editBtn}
                                                        onClick={() => {
                                                            if (guardWrite()) return;
                                                            setEditImprest(item);
                                                        }}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : "ویرایش"}
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        onClick={() => {
                                                            if (guardWrite()) return;
                                                            setDeleteTarget(item);
                                                        }}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : "حذف"}
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

            {selectedImprest && (
                <ImprestDetailsModal
                    item={selectedImprest}
                    onClose={() => setSelectedImprest(null)}
                />
            )}

            {showAddForm && (
                <AddImprestForm
                    onClose={() => setShowAddForm(false)}
                    onAdd={handleAddImprest}
                    canWrite={canWrite}
                    disabledReason={disabledReason}
                />
            )}

            {editImprest && (
                <AddImprestForm
                    onClose={() => setEditImprest(null)}
                    onAdd={handleUpdateImprest}
                    existing={editImprest}
                    canWrite={canWrite}
                    disabledReason={disabledReason}
                />
            )}

            {deleteTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.confirmModal}>
                        <div className={styles.modalIcon}>
                            <FaTrashAlt />
                        </div>

                        <h3>حذف تنخواه</h3>
                        <p>
                            آیا از حذف تنخواه <strong>{deleteTarget.name}</strong> مطمئن هستی؟
                        </p>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                className={styles.confirmDeleteBtn}
                                onClick={handleDelete}
                                disabled={deleting || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {deleting ? "در حال حذف..." : "حذف شود"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ImprestTable;