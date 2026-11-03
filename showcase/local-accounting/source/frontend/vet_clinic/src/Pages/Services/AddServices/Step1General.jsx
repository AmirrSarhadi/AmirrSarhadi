// src/pages/Products/AddProduct/Step1General.jsx
import styles from "./AddProductForm.module.css";

// برچسب‌های فارسی فیلدها
const labels = {
  sku_code: "کد کالا (SKU)",
  accounting_code: "کد حسابداری",
  persian_name: "نام فارسی",
  english_name: "نام انگلیسی",
  qrcode: "کد QR",
  barcode: "بارکد",
  main_currency: "واحد پول اصلی",
  secondary_currency: "واحد پول ثانویه",
  Conversion_factor_currency: "ضریب تبدیل ارز",
  currency_description: "توضیحات ارز",
};

function Step1General({ formData, setFormData }) {
  // تغییر فیلدهای متنی و انتخابی
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // تغییر فایل QR Code
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setFormData((prev) => ({ ...prev, qrcode: file }));
    } else {
      alert("فقط فایل تصویری (jpg, png, gif) قابل قبول است.");
      e.target.value = null;
    }
  };

  // حذف فایل آپلود شده
  const handleRemoveFile = (e) => {
    e.preventDefault();
    setFormData((prev) => ({ ...prev, qrcode: null }));
  };

  return (
    <div className={styles.stepContainer}>
      <h3>عمومی</h3>

      {/* ردیف 1: کد حسابداری و کد کالا */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            {labels.accounting_code} <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            name="accounting_code"
            value={formData.accounting_code}
            onChange={handleChange}
            placeholder="مثال: 1001"
            className={formData.accounting_code ? "" : styles.inputEmpty}
          />
        </div>
        <div className={styles.col}>
          <label>
            {labels.sku_code} <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="sku_code"
            value={formData.sku_code}
            onChange={handleChange}
            placeholder="مثال: ITM-1001"
            className={formData.sku_code ? "" : styles.inputEmpty}
          />
        </div>
      </div>

      {/* ردیف 2: نام فارسی و انگلیسی */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            {labels.persian_name} <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="persian_name"
            value={formData.persian_name}
            onChange={handleChange}
            placeholder="مثال: دوربین مداربسته"
            className={formData.persian_name ? "" : styles.inputEmpty}
          />
        </div>
        <div className={styles.col}>
          <label>{labels.english_name}</label>
          <input
            type="text"
            name="english_name"
            value={formData.english_name}
            onChange={handleChange}
            placeholder="مثال: CCTV Camera"
          />
        </div>
      </div>

      {/* ردیف 3: بارکد و QR Code */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.barcode}</label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            placeholder="مثال: 123456789"
          />
        </div>
        <div className={styles.col}>
          <label>
            {labels.qrcode} <span className={styles.required}>*</span>
          </label>
          <div className={styles.fileUpload}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              id="qrcode-upload"
              className={formData.qrcode ? styles.fileSelected : ""}
            />
            <label htmlFor="qrcode-upload" className={styles.fileLabel}>
              {formData.qrcode ? formData.qrcode.name : "انتخاب فایل"}
            </label>
            {formData.qrcode && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className={styles.removeFile}
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ردیف 4: واحد پول اصلی و ثانویه */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.main_currency}</label>
          <select
            name="main_currency"
            value={formData.main_currency}
            onChange={handleChange}
          >
            <option value="ریال">ریال</option>
            <option value="تومان">تومان</option>
            <option value="دلار">دلار</option>
            <option value="یورو">یورو</option>
          </select>
        </div>
        <div className={styles.col}>
          <label>{labels.secondary_currency}</label>
          <select
            name="secondary_currency"
            value={formData.secondary_currency}
            onChange={handleChange}
          >
            <option value="تومان">تومان</option>
            <option value="ریال">ریال</option>
            <option value="دلار">دلار</option>
            <option value="یورو">یورو</option>
          </select>
        </div>
      </div>

      {/* ردیف 5: ضریب تبدیل و توضیحات ارز */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.Conversion_factor_currency}</label>
          <input
            type="text"
            name="Conversion_factor_currency"
            value={formData.Conversion_factor_currency}
            onChange={handleChange}
            placeholder="مثال: 1"
          />
        </div>
        <div className={styles.col}>
          <label>{labels.currency_description}</label>
          <input
            type="text"
            name="currency_description"
            value={formData.currency_description}
            onChange={handleChange}
            placeholder="مثال: نرخ تبدیل ارز"
          />
        </div>
      </div>
      {/* ردیف 6: توضیحات کالا و کد سریال */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            توضیحات <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="مثال: توضیحات کلی در مورد محصول"
            className={formData.description ? "" : styles.inputEmpty}
          />
        </div>
        <div className={styles.col}>
          <label>
            کد سریال <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="serial_code"
            value={formData.serial_code}
            onChange={handleChange}
            placeholder="مثال: SC-2024-0001"
            className={formData.serial_code ? "" : styles.inputEmpty}
          />
        </div>
      </div>
    </div>
  );
}

export default Step1General;
