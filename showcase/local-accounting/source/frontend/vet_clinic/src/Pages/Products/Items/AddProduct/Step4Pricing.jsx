// src/pages/Products/AddProduct/Step4Pricing.jsx
import styles from "./AddProductForm.module.css";

const labels = {
  unit_selling_price: "قیمت فروش واحد",
  selling_description: "توضیحات فروش",
  unit_buying_price: "قیمت خرید واحد",
  buying_description: "توضیحات خرید",
  tax_percent: "درصد مالیات",
  tax_amount: "مقدار مالیات (تومان)",
  charges: "عوارض",
};

function Step4Pricing({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    // فقط یکی از این دو مقدار وارد شود و در tax_percent ذخیره گردد
    if (name === "tax_percent_input") {
      setFormData((prev) => ({
        ...prev,
        tax_percent: value, // مقدار درصدی
      }));
    } else if (name === "tax_amount_input") {
      setFormData((prev) => ({
        ...prev,
        tax_percent: value, // مقدار تومانی
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const isPercent = formData.tax_percent && !isNaN(formData.tax_percent);
  const isAmount = formData.tax_percent && isNaN(formData.tax_percent);

  return (
    <div className={styles.stepContainer}>
      <h3>قیمت‌گذاری</h3>

      {/* قیمت و توضیحات فروش */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            {labels.unit_selling_price}{" "}
            <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            name="unit_selling_price"
            value={formData.unit_selling_price}
            onChange={handleChange}
          />
        </div>

        <div className={styles.col}>
          <label>{labels.selling_description}</label>
          <input
            type="text"
            name="selling_description"
            value={formData.selling_description}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* قیمت و توضیحات خرید */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            {labels.unit_buying_price}{" "}
            <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            name="unit_buying_price"
            value={formData.unit_buying_price}
            onChange={handleChange}
          />
        </div>

        <div className={styles.col}>
          <label>{labels.buying_description}</label>
          <input
            type="text"
            name="buying_description"
            value={formData.buying_description}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* درصد یا مبلغ مالیات */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>درصد مالیات</label>
          <input
            type="number"
            name="tax_percent_input"
            value={isPercent ? formData.tax_percent : ""}
            onChange={handleChange}
            disabled={isAmount}
            placeholder="مثلاً 9 (درصد)"
          />
        </div>

        <div className={styles.col}>
          <label>مقدار مالیات (تومان)</label>
          <input
            type="number"
            name="tax_amount_input"
            value={isAmount ? formData.tax_percent : ""}
            onChange={handleChange}
            disabled={isPercent}
            placeholder="مثلاً 12000"
          />
        </div>
      </div>

      {/* عوارض */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            {labels.charges} <span className={styles.required}>*</span>
          </label>
          <input
            type="number"
            name="charges"
            value={formData.charges}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}

export default Step4Pricing;
