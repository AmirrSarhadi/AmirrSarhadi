import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
// src/pages/Products/Items/ProductItemsTable.jsx
import styles from "./ProductItemsTable.module.css";
import { PageHero, StatGrid, StatCard, PrimaryButton } from "../../../components/ERP/ERP";
import { FiPackage, FiSearch, FiDollarSign } from "react-icons/fi";
import useModulePermission from "../../../hooks/useModulePermission";
import {
  FaEdit,
  FaTrashAlt,
  FaEye,
  FaSearch,
  FaPrint,
  FaPlus,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ProductDetailsModal from "./ProductDetailsModal";
import { Link } from "react-router-dom";

const API_URL = `${API_BASE_URL}/services/api/v2/materials/`;

function ProductItemsTable() {
  const { canWrite, disabledReason } = useModulePermission("catalog");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllPages(API_URL);
      setProducts(extractList(response.data));
    } catch (err) {
      console.error("خطا در بارگذاری کالاها:", err);
      setError("خطا در دریافت لیست کالاها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    if (!q) return products;

    return products.filter((p) =>
      [
        p.persian_name,
        p.english_name,
        p.sku_code,
        p.accounting_code,
        p.barcode,
        p.material_vendor,
        p.material_group_name,
        p.material_category_name,
        p.material_brand_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, searchTerm]);

  const formatDate = (isoDate) => {
    if (!isoDate) return "-";

    return new Date(isoDate).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return amount.toLocaleString("fa-IR");
  };

  const handleDelete = async () => {
    if (!canWrite) {
      alert(disabledReason);
      return;
    }

    if (!deleteTarget?.id) return;

    try {
      setDeleting(true);
      await axios.delete(`${API_URL}${deleteTarget.id}/`);

      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      console.error("خطا در حذف کالا:", err);
      alert("حذف کالا انجام نشد.");
    } finally {
      setDeleting(false);
    }
  };

  const handlePrintBarcode = (product) => {
    window.print();
    console.log("Print barcode:", product);
  };

  if (error) {
    return (
      <div className={styles.errorBox}>
        <strong>خطا</strong>
        <p>{error}</p>
        <button onClick={fetchProducts}>تلاش دوباره</button>
      </div>
    );
  }

  return (
    <>
      <PageHero eyebrow="کاتالوگ و موجودی" title="کالاها" description="مدیریت کالاها، کدها، قیمت فروش و اطلاعات انبار" icon={<FiPackage />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { alert(disabledReason); return; } window.location.assign('/products/add'); }}><FaPlus /> افزودن کالا</PrimaryButton>} />
      <StatGrid>
        <StatCard label="کل کالاها" value={products.length.toLocaleString("fa-IR")} icon={<FiPackage />} />
        <StatCard label="نتیجه جستجو" value={filteredProducts.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
        <StatCard label="میانگین قیمت فروش" value={`${Math.round(products.reduce((sum, item) => sum + Number(item.unit_selling_price || 0), 0) / (products.length || 1)).toLocaleString("fa-IR")} ریال`} icon={<FiDollarSign />} tone="success" />
      </StatGrid>
      <div className={styles.tableContainer}>
        <div className={styles.header}>
          <div>
            <h3>لیست کالاها</h3>
            <p>مدیریت کالاها، کدها، قیمت‌ها و اطلاعات انبار</p>
          </div>

          <Link
            to="/products/add"
            className={styles.addBtn}
            aria-disabled={!canWrite}
            title={!canWrite ? disabledReason : undefined}
            onClick={(e) => {
              if (!canWrite) {
                e.preventDefault();
                alert(disabledReason);
              }
            }}
          >
            <FaPlus />
            افزودن کالا
          </Link>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="جستجو بر اساس نام، SKU، کد حسابداری، بارکد یا تأمین‌کننده..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.resultCount}>
            {filteredProducts.length.toLocaleString("fa-IR")} کالا
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
                  <th>SKU</th>
                  <th>کد حسابداری</th>
                  <th>نام فارسی</th>
                  <th>نام انگلیسی</th>
                  <th>بارکد</th>
                  <th>قیمت فروش</th>
                  <th>تأمین‌کننده</th>
                  <th>تاریخ ثبت</th>
                  <th>چاپ</th>
                  <th>عملیات</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="11">
                      <div className={styles.emptyState}>
                        <strong>کالایی پیدا نشد</strong>
                        <p>عبارت جستجو را تغییر بده یا کالای جدید اضافه کن.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => (
                    <tr key={product.id}>
                      <td>{index + 1}</td>

                      <td>
                        <code className={styles.code}>{product.sku_code || "-"}</code>
                      </td>

                      <td>
                        <code className={styles.code}>
                          {product.accounting_code || "-"}
                        </code>
                      </td>

                      <td className={styles.nameCell}>
                        {product.persian_name || "-"}
                      </td>

                      <td>{product.english_name || "-"}</td>

                      <td>
                        <code className={styles.code}>{product.barcode || "-"}</code>
                      </td>

                      <td>
                        <span className={styles.priceBadge}>
                          {formatMoney(product.unit_selling_price)}
                        </span>
                      </td>

                      <td>{product.material_vendor || "-"}</td>

                      <td>{formatDate(product.created_at)}</td>

                      <td>
                        <button
                          type="button"
                          className={styles.printBtn}
                          onClick={() => handlePrintBarcode(product)}
                          disabled={!canWrite}
                          title={!canWrite ? disabledReason : "چاپ بارکد"}
                        >
                          <FaPrint />
                          چاپ
                        </button>
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={() => setSelectedProduct(product)}
                            title="جزئیات"
                          >
                            <FaEye />
                          </button>

                          <Link
                            to={`/products/edit/${product.id}`}
                            className={styles.editBtn}
                            aria-disabled={!canWrite}
                            title={!canWrite ? disabledReason : "ویرایش"}
                            onClick={(e) => {
                              if (!canWrite) {
                                e.preventDefault();
                                alert(disabledReason);
                              }
                            }}
                          >
                            <FaEdit />
                          </Link>

                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => { if (!canWrite) { alert(disabledReason); return; } setDeleteTarget(product); }}
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

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>
              <FaTrashAlt />
            </div>

            <h3>حذف کالا</h3>

            <p>
              آیا از حذف کالای{" "}
              <strong>{deleteTarget.persian_name || deleteTarget.english_name}</strong>{" "}
              مطمئن هستی؟
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

export default ProductItemsTable;
