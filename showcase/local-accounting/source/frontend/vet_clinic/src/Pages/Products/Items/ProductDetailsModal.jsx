import { FaTimes } from "react-icons/fa";
import styles from "./ProductItemsTable.module.css";

const money = (value) => Number(value || 0).toLocaleString("fa-IR");

export default function ProductDetailsModal({ product, onClose }) {
  if (!product) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.detailsHeader}>
          <div>
            <h3>{product.persian_name || "جزئیات کالا"}</h3>
            <p>{product.english_name || "—"}</p>
          </div>

          <button className={styles.closeIconBtn} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.detailsGrid}>
          <div><span>SKU</span><strong>{product.sku_code || "—"}</strong></div>
          <div><span>کد حسابداری</span><strong>{product.accounting_code || "—"}</strong></div>
          <div><span>بارکد</span><strong>{product.barcode || "—"}</strong></div>
          <div><span>قیمت فروش</span><strong>{money(product.unit_selling_price)}</strong></div>
          <div><span>قیمت خرید</span><strong>{money(product.unit_buying_price)}</strong></div>
          <div><span>تأمین‌کننده</span><strong>{product.material_vendor || "—"}</strong></div>
          <div><span>وزن</span><strong>{product.weight || "—"}</strong></div>
          <div><span>ابعاد</span><strong>{product.length || "—"} × {product.width || "—"} × {product.height || "—"}</strong></div>
          <div><span>مالیات</span><strong>{product.tax_percent || 0}%</strong></div>
          <div><span>آستانه کمبود</span><strong>{product.shortage_threshold || "—"}</strong></div>
        </div>

        {product.qrcode && (
          <div className={styles.qrBox}>
            <span>QR Code</span>
            <img src={product.qrcode} alt="QR Code" />
          </div>
        )}

        <div className={styles.descriptionBox}>
          <span>توضیحات</span>
          <p>{product.description || "توضیحی ثبت نشده است."}</p>
        </div>

        <div className={styles.detailsFooter}>
          <button onClick={onClose}>بستن</button>
        </div>
      </div>
    </div>
  );
}
