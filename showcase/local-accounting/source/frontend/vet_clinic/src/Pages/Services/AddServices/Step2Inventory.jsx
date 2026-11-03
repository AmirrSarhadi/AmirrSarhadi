import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
// src/Pages/Products/Items/AddProduct/Step2Inventory.jsx
import { useEffect, useState } from "react";
import styles from "./AddProductForm.module.css";

const labels = {
  weight: "وزن",
  length: "طول",
  width: "عرض",
  height: "ارتفاع",
  shortage_threshold: "آستانه کمبود",
  step_sell: "حداقل سفارش",
  min_order: "تعداد حداقلی",
  max_order: "حداکثر سفارش",
  warehouse_id: "انبار",
  quantity: "مقدار موجودی اولیه",
};

function Step2Inventory({ formData, setFormData }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [fetchErr, setFetchErr] = useState("");

  // مقداردهی اولیه حداقل یک ردیف انبار
  useEffect(() => {
    if (
      !Array.isArray(formData.initial_inventories) ||
      formData.initial_inventories.length === 0
    ) {
      setFormData((prev) => ({
        ...prev,
        initial_inventories: [
          { warehouse_id: "", material_initial_inventory: "" },
        ],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // گرفتن لیست انبارها
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      setFetchErr("");
      try {
        const response = await getAllPages(
          `${API_BASE_URL}/services/api/v2/warehouses/`
        );
        setWarehouses(extractList(response.data));
      } catch (err) {
        console.error("خطا در دریافت لیست انبارها:", err);
        setFetchErr("خطا در دریافت لیست انبارها");
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, []);

  // تغییر فیلدهای ابعاد/سفارش
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // جلوگیری از انتخاب تکراری انبار
  const isTakenWarehouse = (id, rowIndex) => {
    if (!id) return false;
    return (formData.initial_inventories || []).some(
      (row, i) => i !== rowIndex && String(row.warehouse_id) === String(id)
    );
  };

  // تغییر موجودی/انبار
  const handleInventoryChange = (index, field, value) => {
    const rows = Array.isArray(formData.initial_inventories)
      ? [...formData.initial_inventories]
      : [];
    if (!rows[index]) {
      rows[index] = { warehouse_id: "", material_initial_inventory: "" };
    }

    let newVal = value;
    if (field === "material_initial_inventory") {
      // فقط رقم (صحبت از اعشاری نبود؛ اگر لازم شد، این regex رو تغییر بده)
      newVal = String(value).replace(/[^\d]/g, "");
    }

    // اگر انبار تکراری انتخاب شد، نادیده بگیر
    if (field === "warehouse_id" && isTakenWarehouse(newVal, index)) return;

    rows[index] = { ...rows[index], [field]: newVal };
    setFormData((prev) => ({ ...prev, initial_inventories: rows }));
  };

  const addWarehouse = () => {
    setFormData((prev) => ({
      ...prev,
      initial_inventories: [
        ...(prev.initial_inventories || []),
        { warehouse_id: "", material_initial_inventory: "" },
      ],
    }));
  };

  const removeWarehouse = (index) => {
    const rows = [...(formData.initial_inventories || [])];
    rows.splice(index, 1);
    setFormData((prev) => ({ ...prev, initial_inventories: rows }));
  };

  return (
    <div className={styles.stepContainer}>
      <h3>موجودی و ابعاد</h3>

      {/* ابعاد */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.length}</label>
          <input
            type="number"
            name="length"
            value={formData.length}
            onChange={handleChange}
            placeholder="طول (cm)"
            min="0"
            step="1"
            inputMode="numeric"
          />
        </div>
        <div className={styles.col}>
          <label>{labels.width}</label>
          <input
            type="number"
            name="width"
            value={formData.width}
            onChange={handleChange}
            placeholder="عرض (cm)"
            min="0"
            step="1"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.height}</label>
          <input
            type="number"
            name="height"
            value={formData.height}
            onChange={handleChange}
            placeholder="ارتفاع (cm)"
            min="0"
            step="1"
            inputMode="numeric"
          />
        </div>
        <div className={styles.col}>
          <label>{labels.weight}</label>
          <input
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder="وزن (g)"
            min="0"
            step="1"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* سفارش و هشدار */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.shortage_threshold}</label>
          <input
            type="number"
            name="shortage_threshold"
            value={formData.shortage_threshold}
            onChange={handleChange}
            min="0"
            step="1"
            inputMode="numeric"
          />
        </div>
        <div className={styles.col}>
          <label>{labels.step_sell}</label>
          <input
            type="number"
            name="step_sell"
            value={formData.step_sell}
            onChange={handleChange}
            min="1"
            step="1"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.min_order}</label>
          <input
            type="number"
            name="min_order"
            value={formData.min_order}
            onChange={handleChange}
            min="1"
            step="1"
            inputMode="numeric"
          />
        </div>
        <div className={styles.col}>
          <label>{labels.max_order}</label>
          <input
            type="number"
            name="max_order"
            value={formData.max_order}
            onChange={handleChange}
            min="1"
            step="1"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* انبارها */}
      <h4 style={{ marginTop: "20px" }}>موجودی اولیه در انبارها</h4>

      {loadingWarehouses && <p>در حال بارگذاری انبارها...</p>}
      {!loadingWarehouses && fetchErr && (
        <p className={styles.error}>{fetchErr}</p>
      )}
      {!loadingWarehouses && !warehouses.length && (
        <p>هیچ انباری یافت نشد. ابتدا انبارها را در سیستم ثبت کنید.</p>
      )}

      {(formData.initial_inventories || []).map((item, index) => (
        <div key={index} className={styles.row} style={{ direction: "rtl" }}>
          <div className={styles.col}>
            <label>{labels.warehouse_id}</label>
            <select
              value={item.warehouse_id}
              onChange={(e) =>
                handleInventoryChange(index, "warehouse_id", e.target.value)
              }
            >
              <option value="">-- انتخاب انبار --</option>
              {warehouses.map((w) => {
                const disabled = isTakenWarehouse(w.id, index);
                return (
                  <option key={w.id} value={w.id} disabled={disabled}>
                    {w.name}
                    {disabled ? " (انتخاب شده)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className={styles.col}>
            <label>{labels.quantity}</label>
            <input
              type="number"
              value={item.material_initial_inventory}
              onChange={(e) =>
                handleInventoryChange(
                  index,
                  "material_initial_inventory",
                  e.target.value
                )
              }
              min="0"
              step="1"
              inputMode="numeric"
            />
          </div>

          <div
            className={styles.col}
            style={{ display: "flex", alignItems: "flex-end" }}
          >
            <button
              type="button"
              onClick={() => removeWarehouse(index)}
              className={styles.removeFile}
              style={{ backgroundColor: "#dc3545", color: "#fff" }}
            >
              حذف
            </button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: "10px" }}>
        <button
          type="button"
          onClick={addWarehouse}
          className={styles.addButton}
          disabled={!warehouses.length}
        >
          ➕ افزودن انبار
        </button>
      </div>
    </div>
  );
}

export default Step2Inventory;
