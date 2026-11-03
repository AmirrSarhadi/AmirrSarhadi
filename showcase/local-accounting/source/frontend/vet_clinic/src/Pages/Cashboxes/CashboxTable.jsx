import { getAllPages } from "../../api/lists";
import { API_BASE_URL, extractList } from "../../api/http";
// src/pages/Cashboxes/CashboxTable.jsx
import AddCashBoxForm from "./AddCashBoxForm";
import CashBoxDetailsModal from "./CashBoxDetailsModal";
import styles from "./CashboxTable.module.css";
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

const API_LIST = `${API_BASE_URL}/banking/api/v2/cashbox_list/`;
const API_DETAIL = (id) =>
  `${API_BASE_URL}/banking/api/${id}/v2/cashbox_list/`;

function CashboxTable() {
  const { canWrite, disabledReason } = useModulePermission("banking");

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }
    return false;
  };

  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedBox, setSelectedBox] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editBox, setEditBox] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBoxes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllPages(API_LIST);
      setBoxes(extractList(response.data));
    } catch (err) {
      console.error("Fetch cashboxes error:", err);
      setError("خطا در دریافت لیست صندوق‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxes();
  }, []);

  const filteredBoxes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return boxes;

    return boxes.filter((box) =>
      [
        box.name,
        box.account_code,
        box.currency,
        box.description,
        box.switch_number,
        box.terminal_number,
        box.receiver_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [boxes, searchTerm]);

  const handleAddBox = (newBox) => {
    setBoxes((prev) => [newBox, ...prev]);
  };

  const handleUpdateBox = (updatedBox) => {
    setBoxes((prev) =>
      prev.map((box) => (box.id === updatedBox.id ? updatedBox : box))
    );
  };

  const handleDelete = async () => {
    if (guardWrite()) return;
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await axios.delete(API_DETAIL(deleteTarget.id));
      toast.success("صندوق با موفقیت حذف شد");
      setDeleteTarget(null);
      fetchBoxes();
    } catch (err) {
      console.error("Delete cashbox error:", err);
      toast.error("حذف صندوق انجام نشد");
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
        <button type="button" onClick={fetchBoxes}>
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
            <h3>لیست صندوق‌ها</h3>
            <p>مدیریت صندوق‌های نقدی، موجودی، واحد پول و وضعیت فعالیت</p>
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
            افزودن صندوق
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="جستجو بر اساس نام صندوق، کد حسابداری، واحد پول یا توضیحات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.resultCount}>
            {filteredBoxes.length.toLocaleString("fa-IR")} صندوق
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
                  <th>نام صندوق</th>
                  <th>کد حسابداری</th>
                  <th>موجودی</th>
                  <th>واحد پول</th>
                  <th>تاریخ ثبت</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredBoxes.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className={styles.emptyState}>
                        <strong>صندوقی پیدا نشد</strong>
                        <p>عبارت جستجو را تغییر بده یا صندوق جدید اضافه کن.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBoxes.map((box, index) => (
                    <tr key={box.id}>
                      <td>{index + 1}</td>

                      <td className={styles.nameCell}>{box.name || "—"}</td>

                      <td>
                        <code className={styles.code}>
                          {box.account_code || "—"}
                        </code>
                      </td>

                      <td>
                        <span className={styles.amountBadge}>
                          {formatMoney(box.account_balance)}
                        </span>
                      </td>

                      <td>{box.currency || "—"}</td>

                      <td>{formatDate(box.created_at)}</td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${box.is_active
                              ? styles.activeBadge
                              : styles.inactiveBadge
                            }`}
                        >
                          {box.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={() => setSelectedBox(box)}
                            title="جزئیات"
                          >
                            <FaEye />
                          </button>

                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => {
                              if (guardWrite()) return;
                              setEditBox(box);
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
                              setDeleteTarget(box);
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

      {selectedBox && (
        <CashBoxDetailsModal
          item={selectedBox}
          onClose={() => setSelectedBox(null)}
        />
      )}

      {showAddForm && (
        <AddCashBoxForm
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddBox}
          canWrite={canWrite}
          disabledReason={disabledReason}
        />
      )}

      {editBox && (
        <AddCashBoxForm
          onClose={() => setEditBox(null)}
          onAdd={handleUpdateBox}
          existing={editBox}
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

            <h3>حذف صندوق</h3>
            <p>
              آیا از حذف صندوق <strong>{deleteTarget.name}</strong> مطمئن هستی؟
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

export default CashboxTable;