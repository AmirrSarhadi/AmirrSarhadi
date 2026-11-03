import { API_BASE_URL } from "../../../../api/http";
// src/Pages/Products/Items/MaterialEdit.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../AddProduct/AddProductForm.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

/** API ثابت */
const API = API_BASE_URL;
const MATERIAL_DETAIL = (pk) =>
  `${API}/services/api/${pk}/v2/materials/details/`;

/** DataURL → Blob برای ارسال qrcode به صورت فایل */
function dataURLtoBlob(dataURL) {
  const [meta, base64] = dataURL.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binStr = atob(base64);
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export default function MaterialEdit() {
  const { canWrite, disabledReason } = useModulePermission("catalog");
  const { pk } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    // عمومی
    description: "",
    serial_code: "",
    created_by: "admin",
    sku_code: "",
    accounting_code: "",
    persian_name: "",
    english_name: "",
    barcode: "",
    qrcode: null, // File | DataURL | URL

    // ارز
    main_currency: "ریال",
    secondary_currency: "تومان",
    Conversion_factor_currency: "1",
    currency_description: "",

    // دسته‌بندی
    material_group_name: "",
    material_category_name: "",
    material_brand_name: "",
    material_vendor: "",

    // موجودی و ابعاد
    weight: "",
    length: "",
    width: "",
    height: "",
    shortage_threshold: "",
    step_sell: "",
    min_order: "",
    max_order: "",
    initial_inventories: [],

    // قیمت‌گذاری
    unit_selling_price: "",
    selling_description: "",
    unit_buying_price: "",
    buying_description: "",
    tax_percent: "",
    charges: "",

    // تخفیف‌ها
    discounts: [],
  });

  /** دریافت داده */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(MATERIAL_DETAIL(pk));
        setFormData({
          description: data?.description ?? "",
          serial_code: data?.serial_code ?? "",
          created_by: data?.created_by ?? "admin",

          sku_code: data?.sku_code ?? "",
          accounting_code: data?.accounting_code ?? "",
          persian_name: data?.persian_name ?? "",
          english_name: data?.english_name ?? "",
          barcode: data?.barcode ?? "",
          qrcode: data?.qrcode ?? null, // اگر URL/BASE64 بود، نگه می‌داریم

          main_currency: data?.main_currency ?? "ریال",
          secondary_currency: data?.secondary_currency ?? "تومان",
          Conversion_factor_currency: data?.Conversion_factor_currency ?? "1",
          currency_description: data?.currency_description ?? "",

          material_group_name: data?.material_group_name ?? "",
          material_category_name: data?.material_category_name ?? "",
          material_brand_name: data?.material_brand_name ?? "",
          material_vendor: data?.material_vendor ?? "",

          weight: data?.weight ?? "",
          length: data?.length ?? "",
          width: data?.width ?? "",
          height: data?.height ?? "",
          shortage_threshold: data?.shortage_threshold ?? "",
          step_sell: data?.step_sell ?? "",
          min_order: data?.min_order ?? "",
          max_order: data?.max_order ?? "",

          initial_inventories:
            data?.warehouses ?? data?.initial_inventories ?? [],

          unit_selling_price: data?.unit_selling_price ?? "",
          selling_description: data?.selling_description ?? "",
          unit_buying_price: data?.unit_buying_price ?? "",
          buying_description: data?.buying_description ?? "",
          tax_percent: data?.tax_percent ?? "",
          charges: data?.charges ?? "",

          discounts: data?.discounts ?? [],
        });
      } catch (e) {
        setError(e?.response?.data || e.message || "خطا در دریافت اطلاعات");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pk]);

  /** هندر تغییر ورودی‌ها */
  const onChange = (field) => (e) => {
    const value =
      e?.target?.type === "file" ? e.target.files[0] : e?.target?.value ?? e;
    setFormData((p) => ({ ...p, [field]: value }));
  };

  /** انبارها: افزودن/حذف/تغییر */
  const addWarehouse = () =>
    setFormData((p) => ({
      ...p,
      initial_inventories: [
        ...p.initial_inventories,
        { warehouse_id: "", material_initial_inventory: "" },
      ],
    }));
  const removeWarehouse = (idx) =>
    setFormData((p) => ({
      ...p,
      initial_inventories: p.initial_inventories.filter((_, i) => i !== idx),
    }));
  const editWarehouse = (idx, key, val) =>
    setFormData((p) => ({
      ...p,
      initial_inventories: p.initial_inventories.map((w, i) =>
        i === idx ? { ...w, [key]: val } : w
      ),
    }));

  /** تخفیف‌ها: افزودن/حذف/تغییر */
  const addDiscount = () =>
    setFormData((p) => ({
      ...p,
      discounts: [
        ...p.discounts,
        {
          title: "",
          target_type: "",
          target_id: "",
          discount_percent: "",
          discount_amount: "",
          valid_from: "",
          valid_to: "",
        },
      ],
    }));
  const removeDiscount = (idx) =>
    setFormData((p) => ({
      ...p,
      discounts: p.discounts.filter((_, i) => i !== idx),
    }));
  const editDiscount = (idx, key, val) =>
    setFormData((p) => ({
      ...p,
      discounts: p.discounts.map((d, i) =>
        i === idx ? { ...d, [key]: val } : d
      ),
    }));

  /** ذخیره تغییرات */
  const handleUpdate = async () => {
    if (!canWrite) {
      alert(disabledReason);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const {
        discounts = [],
        initial_inventories = [],
        qrcode,
        ...rest
      } = formData;

      const data = new FormData();

      // qrcode فقط اگر جدید آپلود شد (File یا DataURL)
      if (qrcode instanceof File) {
        data.append("qrcode", qrcode);
      } else if (typeof qrcode === "string" && qrcode.startsWith("data:")) {
        const blob = dataURLtoBlob(qrcode);
        data.append("qrcode", blob, "qrcode.png");
      }

      // payload
      const payload = {
        ...rest,
        sku_code: String(rest.sku_code ?? "").trim(),
        accounting_code: Number(rest.accounting_code),
        barcode: Number(rest.barcode),
        serial_code: String(rest.serial_code ?? "").trim(),
        step_sell: Number(rest.step_sell),
        shortage_threshold: Number(rest.shortage_threshold),
        weight: Number(rest.weight),
        length: Number(rest.length),
        width: Number(rest.width),
        height: Number(rest.height),
        min_order: Number(rest.min_order),
        max_order: Number(rest.max_order),
        tax_percent: Number(rest.tax_percent ?? rest.tax_percent_input),
        charges: Number(rest.charges),
        unit_selling_price: Number(rest.unit_selling_price),
        unit_buying_price: Number(rest.unit_buying_price),
        material_group_name: Number(rest.material_group_name),
        material_category_name: Number(rest.material_category_name),
        material_brand_name: Number(rest.material_brand_name),
        material_vendor: Number(rest.material_vendor),
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") data.append(k, v);
      });

      // آرایه‌ها
      const discountsForNested = (discounts || []).map((d) => {
        const clone = { ...d };
        delete clone.material; // nested
        return clone;
      });
      data.append("discounts", JSON.stringify(discountsForNested));

      data.append(
        "warehouses",
        JSON.stringify(
          (initial_inventories || []).map((w) => ({
            warehouse_id: Number(w.warehouse_id),
            material_initial_inventory: Number(w.material_initial_inventory),
          }))
        )
      );

      const res = await axios.put(MATERIAL_DETAIL(pk), data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("تغییرات ذخیره شد ✅");
      console.log("Updated:", res.data);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data || e.message || "خطا در ذخیره تغییرات");
      alert("خطا در ذخیره تغییرات ❌");
    } finally {
      setSaving(false);
    }
  };

  /** حذف */
  const handleDelete = async () => {
    if (!canWrite) {
      alert(disabledReason);
      return;
    }

    if (!confirm("این آیتم حذف شود؟ این عملیات بازگشت‌پذیر نیست.")) return;
    try {
      setDeleting(true);
      setError("");
      await axios.delete(MATERIAL_DETAIL(pk));
      alert("آیتم حذف شد 🗑️");
      navigate("/products/items");
    } catch (e) {
      console.error(e);
      setError(e?.response?.data || e.message || "خطا در حذف آیتم");
      alert("خطا در حذف آیتم ❌");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className={styles.container}>در حال بارگذاری…</div>;

  return (
    <div className={styles.container}>
      <h2>ویرایش کالا #{pk}</h2>

      {error && <div className={styles.error}>{String(error)}</div>}

      {/* عمومی */}
      <div className={styles.sectionBox}>
        <h4>عمومی</h4>
        <div className={styles.reviewGrid}>
          <label>
            نام فارسی
            <input
              value={formData.persian_name}
              onChange={onChange("persian_name")}
            />
          </label>
          <label>
            نام انگلیسی
            <input
              value={formData.english_name}
              onChange={onChange("english_name")}
            />
          </label>
          <label>
            SKU
            <input value={formData.sku_code} onChange={onChange("sku_code")} />
          </label>
          <label>
            کد حسابداری
            <input
              value={formData.accounting_code}
              onChange={onChange("accounting_code")}
            />
          </label>
          <label>
            بارکد
            <input value={formData.barcode} onChange={onChange("barcode")} />
          </label>
          <label>
            سریال
            <input
              value={formData.serial_code}
              onChange={onChange("serial_code")}
            />
          </label>
          <label className={styles.fullRow}>
            توضیحات
            <textarea
              value={formData.description}
              onChange={onChange("description")}
            />
          </label>
          <label>
            QR Code (آپلود جدید اختیاری)
            <input type="file" accept="image/*" onChange={onChange("qrcode")} />
          </label>
        </div>
      </div>

      {/* ارز */}
      <div className={styles.sectionBox}>
        <h4>ارز</h4>
        <div className={styles.reviewGrid}>
          <label>
            ارز اصلی
            <input
              value={formData.main_currency}
              onChange={onChange("main_currency")}
            />
          </label>
          <label>
            ارز ثانویه
            <input
              value={formData.secondary_currency}
              onChange={onChange("secondary_currency")}
            />
          </label>
          <label>
            ضریب تبدیل
            <input
              value={formData.Conversion_factor_currency}
              onChange={onChange("Conversion_factor_currency")}
            />
          </label>
          <label className={styles.fullRow}>
            توضیحات ارز
            <input
              value={formData.currency_description}
              onChange={onChange("currency_description")}
            />
          </label>
        </div>
      </div>

      {/* دسته‌بندی */}
      <div className={styles.sectionBox}>
        <h4>دسته‌بندی/برند/تأمین‌کننده (ID)</h4>
        <div className={styles.reviewGrid}>
          <label>
            گروه (ID)
            <input
              type="number"
              value={formData.material_group_name}
              onChange={onChange("material_group_name")}
            />
          </label>
          <label>
            دسته‌بندی (ID)
            <input
              type="number"
              value={formData.material_category_name}
              onChange={onChange("material_category_name")}
            />
          </label>
          <label>
            برند (ID)
            <input
              type="number"
              value={formData.material_brand_name}
              onChange={onChange("material_brand_name")}
            />
          </label>
          <label>
            تأمین‌کننده (ID)
            <input
              type="number"
              value={formData.material_vendor}
              onChange={onChange("material_vendor")}
            />
          </label>
        </div>
      </div>

      {/* ابعاد/سفارش */}
      <div className={styles.sectionBox}>
        <h4>ابعاد و سفارش</h4>
        <div className={styles.reviewGrid}>
          <label>
            وزن
            <input
              type="number"
              value={formData.weight}
              onChange={onChange("weight")}
            />
          </label>
          <label>
            طول
            <input
              type="number"
              value={formData.length}
              onChange={onChange("length")}
            />
          </label>
          <label>
            عرض
            <input
              type="number"
              value={formData.width}
              onChange={onChange("width")}
            />
          </label>
          <label>
            ارتفاع
            <input
              type="number"
              value={formData.height}
              onChange={onChange("height")}
            />
          </label>
          <label>
            گام فروش
            <input
              type="number"
              value={formData.step_sell}
              onChange={onChange("step_sell")}
            />
          </label>
          <label>
            حداقل سفارش
            <input
              type="number"
              value={formData.min_order}
              onChange={onChange("min_order")}
            />
          </label>
          <label>
            حداکثر سفارش
            <input
              type="number"
              value={formData.max_order}
              onChange={onChange("max_order")}
            />
          </label>
          <label>
            آستانه کمبود
            <input
              type="number"
              value={formData.shortage_threshold}
              onChange={onChange("shortage_threshold")}
            />
          </label>
        </div>
      </div>

      {/* انبارها */}
      <div className={styles.sectionBox}>
        <h4>موجودی اولیه انبارها</h4>
        <table className={styles.reviewTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>ID انبار</th>
              <th>موجودی اولیه</th>
              <th>حذف</th>
            </tr>
          </thead>
          <tbody>
            {(formData.initial_inventories || []).map((w, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <input
                    type="number"
                    value={w.warehouse_id}
                    onChange={(e) =>
                      editWarehouse(i, "warehouse_id", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={w.material_initial_inventory}
                    onChange={(e) =>
                      editWarehouse(
                        i,
                        "material_initial_inventory",
                        e.target.value
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => removeWarehouse(i)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8 }}>
          <button className={styles.secondaryBtn} onClick={addWarehouse}>
            + انبار جدید
          </button>
        </div>
      </div>

      {/* قیمت‌گذاری */}
      <div className={styles.sectionBox}>
        <h4>قیمت‌گذاری</h4>
        <div className={styles.reviewGrid}>
          <label>
            قیمت فروش
            <input
              type="number"
              value={formData.unit_selling_price}
              onChange={onChange("unit_selling_price")}
            />
          </label>
          <label>
            قیمت خرید
            <input
              type="number"
              value={formData.unit_buying_price}
              onChange={onChange("unit_buying_price")}
            />
          </label>
          <label>
            مالیات (%)
            <input
              type="number"
              value={formData.tax_percent}
              onChange={onChange("tax_percent")}
            />
          </label>
          <label>
            عوارض
            <input
              type="number"
              value={formData.charges}
              onChange={onChange("charges")}
            />
          </label>
          <label className={styles.fullRow}>
            توضیح فروش
            <input
              value={formData.selling_description}
              onChange={onChange("selling_description")}
            />
          </label>
          <label className={styles.fullRow}>
            توضیح خرید
            <input
              value={formData.buying_description}
              onChange={onChange("buying_description")}
            />
          </label>
        </div>
      </div>

      {/* تخفیف‌ها */}
      <div className={styles.sectionBox}>
        <h4>تخفیف‌ها</h4>
        <table className={styles.reviewTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>عنوان</th>
              <th>هدف</th>
              <th>ID هدف</th>
              <th>%</th>
              <th>مبلغ</th>
              <th>از</th>
              <th>تا</th>
              <th>حذف</th>
            </tr>
          </thead>
          <tbody>
            {(formData.discounts || []).map((d, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <input
                    value={d.title}
                    onChange={(e) => editDiscount(i, "title", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={d.target_type}
                    onChange={(e) =>
                      editDiscount(i, "target_type", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    value={d.target_id}
                    onChange={(e) =>
                      editDiscount(i, "target_id", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={d.discount_percent}
                    onChange={(e) =>
                      editDiscount(i, "discount_percent", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={d.discount_amount}
                    onChange={(e) =>
                      editDiscount(i, "discount_amount", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={d.valid_from || ""}
                    onChange={(e) =>
                      editDiscount(i, "valid_from", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={d.valid_to || ""}
                    onChange={(e) =>
                      editDiscount(i, "valid_to", e.target.value)
                    }
                  />
                </td>
                <td>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => removeDiscount(i)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8 }}>
          <button className={styles.secondaryBtn} onClick={addDiscount}>
            + تخفیف جدید
          </button>
        </div>
      </div>

      {/* اکشن‌ها */}
      <div className={styles.actions}>
        <button
          className={styles.secondaryBtn}
          onClick={() => navigate(-1)}
          disabled={saving || deleting}
        >
          بازگشت
        </button>
        <button
          className={styles.submitBtn}
          onClick={handleUpdate}
          disabled={saving || deleting || !canWrite}
          title={!canWrite ? disabledReason : undefined}
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
        <button
          className={styles.secondaryBtn}
          style={{ background: "#ef4444", color: "#fff" }}
          onClick={handleDelete}
          disabled={saving || deleting || !canWrite}
          title={!canWrite ? disabledReason : undefined}
        >
          {deleting ? "در حال حذف..." : "حذف"}
        </button>
      </div>
    </div>
  );
}
