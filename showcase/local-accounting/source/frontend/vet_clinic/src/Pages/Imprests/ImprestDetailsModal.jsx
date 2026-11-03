// src/pages/Imprests/ImprestDetailsModal.jsx
import styles from "./ImprestTable.module.css";
import moment from "jalali-moment";
import { FaTimes } from "react-icons/fa";

function ImprestDetailsModal({ item, onClose }) {
    if (!item) return null;

    const money = (value) => Number(value || 0).toLocaleString("fa-IR");

    const date = (value) =>
        value ? moment(value).locale("fa").format("YYYY/MM/DD [ساعت] HH:mm") : "—";

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.detailsHeader}>
                    <div>
                        <h3>{item.name || "جزئیات تنخواه"}</h3>
                        <p>{item.currency || "—"}</p>
                    </div>

                    <button
                        type="button"
                        className={styles.closeIconBtn}
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.detailsGrid}>
                    <div>
                        <span>نام تنخواه</span>
                        <strong>{item.name || "—"}</strong>
                    </div>

                    <div>
                        <span>کد حسابداری</span>
                        <strong>{item.account_code || "—"}</strong>
                    </div>

                    <div>
                        <span>مسئول تنخواه</span>
                        <strong>{item.responsible_person || "—"}</strong>
                    </div>

                    <div>
                        <span>مالک / توضیح مسئول</span>
                        <strong>{item.owner || "—"}</strong>
                    </div>

                    <div>
                        <span>موجودی</span>
                        <strong>{money(item.account_balance)}</strong>
                    </div>

                    <div>
                        <span>واحد پول</span>
                        <strong>{item.currency || "—"}</strong>
                    </div>

                    <div>
                        <span>وضعیت</span>
                        <strong>{item.is_active ? "فعال" : "غیرفعال"}</strong>
                    </div>

                    <div>
                        <span>تاریخ ثبت</span>
                        <strong>{date(item.created_at)}</strong>
                    </div>

                    <div>
                        <span>تاریخ ویرایش</span>
                        <strong>{date(item.updated_at)}</strong>
                    </div>

                    <div>
                        <span>ثبت شده توسط</span>
                        <strong>{item.created_by || "—"}</strong>
                    </div>

                    <div>
                        <span>ویرایش شده توسط</span>
                        <strong>{item.updated_by || "—"}</strong>
                    </div>
                </div>

                <div className={styles.descriptionBox}>
                    <span>توضیحات</span>
                    <p>{item.description || "توضیحی ثبت نشده است."}</p>
                </div>

                <div className={styles.detailsFooter}>
                    <button type="button" onClick={onClose}>
                        بستن
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ImprestDetailsModal;