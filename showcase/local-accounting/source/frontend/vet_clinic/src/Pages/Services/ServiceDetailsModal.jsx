import { FaTimes } from "react-icons/fa";
import styles from "./ServiceItemsTable.module.css";

const money = (value) => Number(value || 0).toLocaleString("fa-IR");

export default function ServiceDetailsModal({ service, onClose }) {
    if (!service) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.detailsHeader}>
                    <div>
                        <h3>{service.persian_name || "جزئیات خدمت"}</h3>
                        <p>{service.english_name || "—"}</p>
                    </div>

                    <button className={styles.closeIconBtn} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.detailsGrid}>
                    <div><span>کد خدمت</span><strong>{service.code || "—"}</strong></div>
                    <div><span>کد حسابداری</span><strong>{service.accounting_code || "—"}</strong></div>
                    <div><span>بارکد</span><strong>{service.barcode || "—"}</strong></div>
                    <div><span>دسته‌بندی</span><strong>{service.category_name || service.services_category_name || "—"}</strong></div>
                    <div><span>قیمت فروش</span><strong>{money(service.service_selling_price)}</strong></div>
                    <div><span>قیمت خرید</span><strong>{money(service.service_buying_price)}</strong></div>
                    <div><span>واحد شمارش</span><strong>{service["countingـunit"] || "—"}</strong></div>
                    <div><span>مالیات فروش</span><strong>{service.selling_tax ? "دارد" : "ندارد"}</strong></div>
                    <div><span>مالیات خرید</span><strong>{service.buying_tax ? "دارد" : "ندارد"}</strong></div>
                    <div><span>کد مالیاتی</span><strong>{service.tax_code || "—"}</strong></div>
                </div>

                <div className={styles.descriptionBox}>
                    <span>توضیحات</span>
                    <p>{service.description || "توضیحی ثبت نشده است."}</p>
                </div>

                <div className={styles.detailsFooter}>
                    <button onClick={onClose}>بستن</button>
                </div>
            </div>
        </div>
    );
}