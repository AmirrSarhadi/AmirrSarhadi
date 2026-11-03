import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import styles from "../AddServices/AddProductForm.module.css";
import useModulePermission from "../../../hooks/useModulePermission";

const API = API_BASE_URL;
const SERVICE_DETAIL = (pk) => `${API}/services/api/v2/services/${pk}/`;
const CATEGORIES_URL = `${API}/services/api/v2/services-categories/`;

export default function ServiceEdit() {
  const { canWrite, disabledReason } = useModulePermission("catalog");

  const { pk } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    accounting_code: "",
    code: "",
    persian_name: "",
    english_name: "",
    image: null,
    description: "",
    barcode: "",
    services_category_name: "",
    service_selling_price: "",
    service_selling_description: "",
    service_buying_price: "",
    service_buying_description: "",
    "countingـunit": "",
    "countingـunit_description": "",
    selling_tax: false,
    selling_tax_value: 0,
    selling_tax_type: "سایر کالاها",
    selling_tax_unit: "برگ",
    buying_tax: false,
    buying_tax_value: 0,
    tax_code: 0,
  });

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [serviceRes, categoryRes] = await Promise.all([
          getAllPages(SERVICE_DETAIL(pk)),
          getAllPages(CATEGORIES_URL),
        ]);

        setForm((prev) => ({
          ...prev,
          ...serviceRes.data,
          image: null,
        }));

        setCategories(extractList(categoryRes.data));
      } catch (err) {
        console.error("Fetch service edit error:", err.response?.data || err);
        alert("خطا در دریافت اطلاعات خدمت");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pk]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (type === "file") {
      setForm((prev) => ({ ...prev, [name]: files?.[0] || null }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    const data = new FormData();

    const payload = {
      ...form,
      accounting_code: Number(form.accounting_code || 0),
      code: Number(form.code || 0),
      barcode: Number(form.barcode || 0),
      services_category_name: Number(form.services_category_name || 0),
      service_selling_price: Number(form.service_selling_price || 0),
      service_buying_price: Number(form.service_buying_price || 0),
      selling_tax_value: Number(form.selling_tax_value || 0),
      buying_tax_value: Number(form.buying_tax_value || 0),
      tax_code: Number(form.tax_code || 0),
    };

    Object.entries(payload).forEach(([key, value]) => {
      if (key === "image" && !value) return;
      if (value === null || value === undefined || value === "") return;
      data.append(key, value);
    });

    return data;
  };

  const handleSubmit = async () => {
    if (!canWrite) {
      alert(disabledReason);
      return;
    }

    try {
      setSaving(true);

      await axios.put(SERVICE_DETAIL(pk), buildPayload(), {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("خدمت با موفقیت ویرایش شد");
      navigate("/services/items");
    } catch (err) {
      console.error("Update service error:", err.response?.data || err);
      alert("خطا در ویرایش خدمت");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>در حال بارگذاری...</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2>ویرایش خدمت</h2>
          <p>اطلاعات خدمت را ویرایش کن.</p>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/services/items")}
        >
          بازگشت به لیست خدمات
        </button>
      </div>

      <div className={styles.container}>
        <section className={styles.stepContainer}>
          <h3>اطلاعات پایه</h3>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>کد حسابداری</label>
              <input name="accounting_code" value={form.accounting_code || ""} onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>کد خدمت</label>
              <input name="code" value={form.code || ""} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>نام فارسی</label>
              <input name="persian_name" value={form.persian_name || ""} onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>نام انگلیسی</label>
              <input name="english_name" value={form.english_name || ""} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>بارکد</label>
              <input name="barcode" value={form.barcode || ""} onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>دسته‌بندی</label>
              <select
                name="services_category_name"
                value={form.services_category_name || ""}
                onChange={handleChange}
              >
                <option value="">انتخاب کنید</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>تصویر جدید</label>
              <input type="file" name="image" onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>شرح</label>
              <input name="description" value={form.description || ""} onChange={handleChange} />
            </div>
          </div>
        </section>

        <section className={styles.stepContainer}>
          <h3>قیمت و واحد</h3>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>قیمت فروش</label>
              <input name="service_selling_price" value={form.service_selling_price || ""} onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>قیمت خرید</label>
              <input name="service_buying_price" value={form.service_buying_price || ""} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>واحد شمارش</label>
              <input name="countingـunit" value={form["countingـunit"] || ""} onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>توضیح واحد شمارش</label>
              <input name="countingـunit_description" value={form["countingـunit_description"] || ""} onChange={handleChange} />
            </div>
          </div>
        </section>

        <section className={styles.stepContainer}>
          <h3>مالیات</h3>

          <div className={styles.row}>
            <label className={styles.switchRow}>
              <input type="checkbox" name="selling_tax" checked={Boolean(form.selling_tax)} onChange={handleChange} />
              <span>مالیات فروش دارد</span>
            </label>

            <label className={styles.switchRow}>
              <input type="checkbox" name="buying_tax" checked={Boolean(form.buying_tax)} onChange={handleChange} />
              <span>مالیات خرید دارد</span>
            </label>
          </div>

          <div className={styles.row}>
            <div className={styles.col}>
              <label>مقدار مالیات فروش</label>
              <input name="selling_tax_value" value={form.selling_tax_value || 0} onChange={handleChange} />
            </div>

            <div className={styles.col}>
              <label>مقدار مالیات خرید</label>
              <input name="buying_tax_value" value={form.buying_tax_value || 0} onChange={handleChange} />
            </div>
          </div>
        </section>

        <div className={styles.buttons}>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.prevBtn}`}
            onClick={() => navigate("/services/items")}
          >
            انصراف
          </button>

          <button
            type="button"
            className={`${styles.navBtn} ${styles.submitBtn}`}
            onClick={handleSubmit}
            disabled={saving || !canWrite}
            title={!canWrite ? disabledReason : undefined}
          >
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </div>
      </div>
    </div>
  );
}
