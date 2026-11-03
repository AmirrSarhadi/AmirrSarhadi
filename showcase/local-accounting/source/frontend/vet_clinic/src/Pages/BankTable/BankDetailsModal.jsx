// src/pages/BankTable/BankDetailsModal.jsx
import styles from "./BankTable.module.css";
import moment from "jalali-moment";
import { FaTimes } from "react-icons/fa";

function BankDetailsModal({ bank, onClose }) {
  if (!bank) return null;

  const money = (value) => Number(value || 0).toLocaleString("fa-IR");

  const date = (value) =>
    value ? moment(value).locale("fa").format("YYYY/MM/DD [ساعت] HH:mm") : "—";

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.detailsHeader}>
          <div>
            <h3>{bank.name || "جزئیات بانک"}</h3>
            <p>{bank.branch_name || "—"}</p>
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
            <span>نام بانک</span>
            <strong>{bank.name || "—"}</strong>
          </div>

          <div>
            <span>کد حسابداری</span>
            <strong>{bank.account || "—"}</strong>
          </div>

          <div>
            <span>نام شعبه</span>
            <strong>{bank.branch_name || "—"}</strong>
          </div>

          <div>
            <span>صاحب حساب</span>
            <strong>{bank.account_owner_name || "—"}</strong>
          </div>

          <div>
            <span>شماره حساب</span>
            <strong>{bank.account_number || "—"}</strong>
          </div>

          <div>
            <span>شماره کارت</span>
            <strong>{bank.card_number || "—"}</strong>
          </div>

          <div>
            <span>شماره شبا</span>
            <strong>{bank.shaba || "—"}</strong>
          </div>

          <div>
            <span>موجودی</span>
            <strong>{money(bank.account_balance)}</strong>
          </div>

          <div>
            <span>واحد پول</span>
            <strong>{bank.currency || "—"}</strong>
          </div>

          <div>
            <span>تلفن</span>
            <strong>{bank.phone_number || "—"}</strong>
          </div>

          <div>
            <span>شماره سوئیچ</span>
            <strong>{bank.switch_number || "—"}</strong>
          </div>

          <div>
            <span>شماره ترمینال</span>
            <strong>{bank.terminal_number || "—"}</strong>
          </div>

          <div>
            <span>شماره پذیرنده</span>
            <strong>{bank.receiver_number || "—"}</strong>
          </div>

          <div>
            <span>POS</span>
            <strong>{bank.pos_number || "—"}</strong>
          </div>

          <div>
            <span>وضعیت</span>
            <strong>{bank.is_active ? "فعال" : "غیرفعال"}</strong>
          </div>

          <div>
            <span>تاریخ ثبت</span>
            <strong>{date(bank.created_at)}</strong>
          </div>

          <div>
            <span>ثبت شده توسط</span>
            <strong>{bank.created_by || "—"}</strong>
          </div>

          <div>
            <span>تاریخ ویرایش</span>
            <strong>{date(bank.updated_at)}</strong>
          </div>

          <div>
            <span>ویرایش شده توسط</span>
            <strong>{bank.updated_by || "—"}</strong>
          </div>
        </div>

        <div className={styles.descriptionBox}>
          <span>توضیحات</span>
          <p>{bank.description || "توضیحی ثبت نشده است."}</p>
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

export default BankDetailsModal;