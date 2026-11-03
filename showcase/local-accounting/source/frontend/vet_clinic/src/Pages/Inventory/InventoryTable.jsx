import { API_BASE_URL } from "../../api/http";
import styles from "./InventoryTable.module.css";
import moment from "jalali-moment";
import {
  FaEdit,
  FaTrashAlt,
  FaWarehouse,
  FaPhone,
  FaMapMarkerAlt,
  FaSearch,
  FaPlus,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AddWarehouseModal from "./AddWarehouseModal";
import { toast } from "react-toastify";
import useModulePermission from "../../hooks/useModulePermission";
import { PageHero, StatGrid, StatCard, FilterBar, PrimaryButton } from "../../components/ERP";
import { FiBox, FiMapPin, FiUsers, FiHome } from "react-icons/fi";

const API_LIST = `${API_BASE_URL}/warehousing/api/v2/warehouses/`;
const API_DETAIL = (id) =>
  `${API_BASE_URL}/warehousing/api/${id}/v2/warehouses/details/`;

function InventoryTable() {
  const { canWrite, disabledReason } = useModulePermission("warehousing");
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(API_LIST);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setWarehouses(data);
    } catch (err) {
      console.error(err);
      setError("خطا در دریافت لیست انبارها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const filteredWarehouses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return warehouses;

    return warehouses.filter((wh) =>
      [
        wh.name,
        wh.code,
        wh.manager,
        wh.manager_mobile,
        wh.phone,
        wh.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [warehouses, searchTerm]);

  const guardWrite = () => {
    if (!canWrite) {
      toast.error(disabledReason);
      return true;
    }

    return false;
  };

  const handleSuccess = () => {
    fetchWarehouses();
    setShowModal(false);
    setEditWarehouse(null);
  };

  const handleDelete = async () => {
    if (guardWrite()) return;
    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await axios.delete(API_DETAIL(deleteTarget.id));
      toast.success("انبار با موفقیت حذف شد");
      setDeleteTarget(null);
      fetchWarehouses();
    } catch (err) {
      console.error(err);
      toast.error("حذف انبار انجام نشد");
    } finally {
      setDeleting(false);
    }
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
        <button type="button" onClick={fetchWarehouses}>
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableContainer}>
        <PageHero
          eyebrow="انبار / مدیریت"
          title="مدیریت انبارها"
          description="انبارها، مسئولان و اطلاعات تماس را از یک نمای یکپارچه مدیریت کنید."
          icon={<FiHome />}
          actions={<PrimaryButton type="button" onClick={() => { if (guardWrite()) return; setShowModal(true); }} disabled={!canWrite}><FaPlus /> افزودن انبار</PrimaryButton>}
        />

        <StatGrid>
          <StatCard label="تعداد انبارها" value={warehouses.length.toLocaleString("fa-IR")} icon={<FiHome />} />
          <StatCard label="دارای مدیر" value={warehouses.filter((w) => w.manager).length.toLocaleString("fa-IR")} icon={<FiUsers />} tone="info" />
          <StatCard label="دارای آدرس" value={warehouses.filter((w) => w.address).length.toLocaleString("fa-IR")} icon={<FiMapPin />} tone="success" />
          <StatCard label="نتیجه فیلتر" value={filteredWarehouses.length.toLocaleString("fa-IR")} icon={<FiBox />} tone="warning" />
        </StatGrid>

        <FilterBar search={searchTerm} onSearch={setSearchTerm} searchPlaceholder="جستجو بر اساس نام، کد، مدیر، تلفن یا آدرس..." resultText={`${filteredWarehouses.length.toLocaleString("fa-IR")} انبار`} />

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
                  <th>نام انبار</th>
                  <th>کد انبار</th>
                  <th>مدیر</th>
                  <th>موبایل مدیر</th>
                  <th>تلفن</th>
                  <th>آدرس</th>
                  <th>تاریخ ثبت</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <div className={styles.emptyState}>
                        <FaWarehouse />
                        <strong>انباری پیدا نشد</strong>
                        <p>عبارت جستجو را تغییر بده یا انبار جدید اضافه کن.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map((wh, index) => (
                    <tr key={wh.id}>
                      <td>{index + 1}</td>

                      <td className={styles.nameCell}>{wh.name || "—"}</td>

                      <td>
                        <code className={styles.code}>{wh.code || "—"}</code>
                      </td>

                      <td>{wh.manager || "—"}</td>

                      <td>
                        <span className={styles.phoneBadge}>
                          <FaPhone />
                          {wh.manager_mobile || "—"}
                        </span>
                      </td>

                      <td>
                        <span className={styles.phoneBadge}>
                          <FaPhone />
                          {wh.phone || "—"}
                        </span>
                      </td>

                      <td>
                        <span className={styles.addressBadge}>
                          <FaMapMarkerAlt />
                          {wh.address || "—"}
                        </span>
                      </td>

                      <td>{formatDate(wh.created_at)}</td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            title={!canWrite ? disabledReason : "ویرایش"}
                            onClick={() => {
                              if (guardWrite()) return;
                              setEditWarehouse(wh);
                            }}
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
                              setDeleteTarget(wh);
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

      {(showModal || editWarehouse) && (
        <AddWarehouseModal
          existing={editWarehouse}
          onClose={() => {
            setShowModal(false);
            setEditWarehouse(null);
          }}
          onSuccess={handleSuccess}
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

            <h3>حذف انبار</h3>

            <p>
              آیا از حذف انبار <strong>{deleteTarget.name}</strong> مطمئن هستی؟
              این عملیات فقط حذف نرم انجام می‌دهد.
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

export default InventoryTable;