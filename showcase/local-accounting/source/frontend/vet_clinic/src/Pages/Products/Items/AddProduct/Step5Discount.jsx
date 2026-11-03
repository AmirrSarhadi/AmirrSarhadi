// src/Pages/Products/Items/AddProduct/Step5Discount.jsx
import styles from "./AddProductForm.module.css";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

function Step5Discount({ formData, setFormData }) {
  const discount = formData.discounts?.[0] || {
    title: "",
    target_type: "",
    target_id: "",
    discount_percent: "",
    discount_amount: "",
    valid_from: "",
    valid_to: "",
  };

  const updateDiscount = (patch) => {
    setFormData((prev) => ({
      ...prev,
      discounts: [{ ...discount, ...patch }],
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // فقط رقم برای target_id
    if (name === "target_id") {
      const v = value.replace(/[^\d-]/g, ""); // اجازه اعداد و منفی (طبق OPTIONS int)
      return updateDiscount({ target_id: v });
    }

    // درصد: 0..100 و فقط یکی از درصد/مبلغ
    if (name === "discount_percent") {
      const v = value.replace(/[^\d.]/g, "");
      return updateDiscount({
        discount_percent: v,
        discount_amount: "", // طرف مقابل پاک شود
      });
    }

    // مبلغ: فقط رقم
    if (name === "discount_amount") {
      const v = value.replace(/[^\d.]/g, "");
      return updateDiscount({
        discount_amount: v,
        discount_percent: "", // طرف مقابل پاک شود
      });
    }

    updateDiscount({ [name]: value });
  };

  // تاریخ جلالی -> میلادی ISO (بدون Z تا timezone دردسر نشه)
  const handleDateChange = (name, date) => {
    if (!date) return updateDiscount({ [name]: "" });
    try {
      const isoDate =
        date.convert(gregorian, gregorian_en).format("YYYY-MM-DD") +
        "T00:00:00";
      updateDiscount({ [name]: isoDate });
    } catch {
      updateDiscount({ [name]: "" });
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h3>تخفیف</h3>

      {/* عنوان و نوع هدف */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>عنوان تخفیف</label>
          <input
            type="text"
            name="title"
            value={discount.title}
            onChange={handleChange}
            placeholder="مثلاً: جشنواره تابستانی"
          />
        </div>

        <div className={styles.col}>
          <label>نوع هدف</label>
          <select
            name="target_type"
            value={discount.target_type}
            onChange={handleChange}
          >
            <option value="">-- انتخاب کنید --</option>
            <option value="seller">فروشنده</option>
            <option value="event">رویداد</option>
            <option value="customer">مشتری خاص</option>
          </select>
        </div>
      </div>

      {/* شناسه و درصد / مبلغ تخفیف */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>شناسه هدف</label>
          <input
            type="text"
            name="target_id"
            value={discount.target_id}
            onChange={handleChange}
            placeholder="مثلاً 42"
            inputMode="numeric"
          />
        </div>

        <div className={styles.col}>
          <label>درصد تخفیف</label>
          <input
            type="number"
            name="discount_percent"
            value={discount.discount_percent}
            onChange={handleChange}
            disabled={!!discount.discount_amount}
            placeholder="مثلاً 15"
            min="0"
            max="100"
            step="0.01"
          />
        </div>

        <div className={styles.col}>
          <label>مبلغ تخفیف (تومان)</label>
          <input
            type="number"
            name="discount_amount"
            value={discount.discount_amount}
            onChange={handleChange}
            disabled={!!discount.discount_percent}
            placeholder="مثلاً 20000"
            min="0"
            step="1"
          />
        </div>
      </div>

      {/* تاریخ‌ها */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>تاریخ شروع</label>
          <DatePicker
            value={discount.valid_from || ""}
            onChange={(date) => handleDateChange("valid_from", date)}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            placeholder="انتخاب تاریخ شروع"
          />
        </div>

        <div className={styles.col}>
          <label>تاریخ پایان</label>
          <DatePicker
            value={discount.valid_to || ""}
            onChange={(date) => handleDateChange("valid_to", date)}
            calendar={persian}
            locale={persian_fa}
            calendarPosition="bottom-right"
            placeholder="انتخاب تاریخ پایان"
          />
        </div>
      </div>
    </div>
  );
}

export default Step5Discount;
