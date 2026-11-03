import { getAllPages } from "../../api/lists";
import { API_BASE_URL, extractList } from "../../api/http";
// src/pages/BankTable/BankTable.jsx
import AddBankForm from "./AddBankForm";
import BankDetailsModal from "./BankDetailsModal";
import styles from "./BankTable.module.css";
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

const API_LIST = `${API_BASE_URL}/banking/api/v2/bank_list/`;
const API_DETAIL = (id) =>
  `${API_BASE_URL}/banking/api/${id}/v2/bank_list/`;

function BankTable() {
  const { canWrite, disabledReason } = useModulePermission("banking");

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }
    return false;
  };

  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedBank, setSelectedBank] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editBank, setEditBank] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBanks = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllPages(API_LIST);
      setBanks(extractList(response.data));
    } catch (err) {
      console.error("Fetch banks error:", err);
      setError("خطا در دریافت لیست بانک‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const filteredBanks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return banks;

    return banks.filter((bank) =>
      [
        bank.name,
        bank.account.code,
        bank.branch_name,
        bank.account_name,
        bank.card_number,
        bank.shaba,
        bank.account_owner_name,
        bank.currency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [banks, searchTerm]);

  const handleAddBank = (newBank) => {
    setBanks((prev) => [newBank, ...prev]);
  };

  const handleUpdateBank = (updatedBank) => {
    setBanks((prev) =>
      prev.map((bank) => (bank.id === updatedBank.id ? updatedBank : bank))
    );
  };

  const handleDelete = async () => {
    if (guardWrite()) return;
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await axios.delete(API_DETAIL(deleteTarget.id));
      toast.success("بانک با موفقیت حذف شد");
      setDeleteTarget(null);
      fetchBanks();
    } catch (err) {
      console.error("Delete bank error:", err);
      toast.error("حذف بانک انجام نشد");
    } finally {
      setDeleting(false);
    }
  };

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("fa-IR");
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return moment(date).locale("fa").format("YYYY/MM/DD HH:mm");
  };

  if (error) {
    return (
      <div className={styles.errorBox}>
        <strong>خطا</strong>
        <p>{error}</p>
        <button type="button" onClick={fetchBanks}>
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
            <h3>لیست بانک‌ها</h3>
            <p>مدیریت حساب‌های بانکی، موجودی، شعبه و وضعیت حساب</p>
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
            افزودن بانک
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="جستجو بر اساس نام بانک، کد حسابداری، شعبه، شماره حساب یا شبا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.resultCount}>
            {filteredBanks.length.toLocaleString("fa-IR")} بانک
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
                  <th>نام بانک</th>
                  <th>کد حسابداری</th>
                  <th>شعبه</th>
                  <th>شماره حساب</th>
                  <th>موجودی</th>
                  <th>واحد پول</th>
                  <th>تاریخ ثبت</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredBanks.length === 0 ? (
                  <tr>
                    <td colSpan="10">
                      <div className={styles.emptyState}>
                        <strong>بانکی پیدا نشد</strong>
                        <p>عبارت جستجو را تغییر بده یا بانک جدید اضافه کن.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBanks.map((bank, index) => (
                    <tr key={bank.id}>
                      <td>{index + 1}</td>

                      <td className={styles.nameCell}>{bank.name || "—"}</td>

                      <td>
                        <code className={styles.code}>
                          {bank.account || "—"}
                        </code>
                      </td>

                      <td>{bank.branch_name || "—"}</td>

                      <td>
                        <code className={styles.code}>
                          {bank.account_number || "—"}
                        </code>
                      </td>

                      <td>
                        <span className={styles.amountBadge}>
                          {formatMoney(bank.account_balance)}
                        </span>
                      </td>

                      <td>{bank.currency || "—"}</td>

                      <td>{formatDate(bank.created_at)}</td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${bank.is_active
                              ? styles.activeBadge
                              : styles.inactiveBadge
                            }`}
                        >
                          {bank.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={() => setSelectedBank(bank)}
                            title="جزئیات"
                          >
                            <FaEye />
                          </button>

                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => {
                              if (guardWrite()) return;
                              setEditBank(bank);
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
                              setDeleteTarget(bank);
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

      {selectedBank && (
        <BankDetailsModal
          bank={selectedBank}
          onClose={() => setSelectedBank(null)}
        />
      )}

      {showAddForm && (
        <AddBankForm
          onClose={() => setShowAddForm(false)}
          onAdd={handleAddBank}
          canWrite={canWrite}
          disabledReason={disabledReason}
        />
      )}

      {editBank && (
        <AddBankForm
          onClose={() => setEditBank(null)}
          onAdd={handleUpdateBank}
          existingBank={editBank}
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

            <h3>حذف بانک</h3>
            <p>
              آیا از حذف بانک <strong>{deleteTarget.name}</strong> مطمئن هستی؟
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

export default BankTable;