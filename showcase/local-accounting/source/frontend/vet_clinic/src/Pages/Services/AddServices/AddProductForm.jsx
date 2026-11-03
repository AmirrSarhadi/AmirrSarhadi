import { getAllPages } from "../../../api/lists";
import { extractList, API_BASE_URL } from "../../../api/http";
// src/Pages/Services/AddServices/AddProductForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./AddProductForm.module.css";
import useModulePermission from "../../../hooks/useModulePermission";

const API = API_BASE_URL;
const SERVICES_URL = `${API}/services/api/v2/services/`;
const CATEGORIES_URL = `${API}/services/api/v2/services-categories/`;

const TAX_TYPES = [
  "دارو",
  "دخانیات",
  "موبایل",
  "لوازم خانگی برقی",
  "قطعات مصرفی و یدکی وسایل نقلیه",
  "فراورده‌ها و مشتقات نفتی، گازی و پتروشیمی",
  "طلا اعم از شمش، مسکوکات و مصنوعات زینتی",
  "منسوجات و پوشاک",
  "اسباب بازی",
  "دام زنده، گوشت سفید و قرمز",
  "محصولات اساسی کشاورزی",
  "سایر کالاها",
];

const TAX_UNITS = ["بانکه", "برگ", "بسته", "بطری"];

const steps = [
  { id: 1, title: "اطلاعات پایه", desc: "کدها، نام و دسته‌بندی" },
  { id: 2, title: "قیمت و واحد", desc: "قیمت خرید، فروش و شمارش" },
  { id: 3, title: "مالیات", desc: "تنظیمات مالیاتی خدمت" },
  { id: 4, title: "بازبینی", desc: "ثبت نهایی خدمت" },
];

const initialForm = {
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
};

export default function AddProductForm() {
  const { canWrite, disabledReason } = useModulePermission("catalog");

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPreview = useMemo(() => {
    const selling = Number(form.service_selling_price || 0);
    const tax = form.selling_tax ? Number(form.selling_tax_value || 0) : 0;
    return selling + tax;
  }, [form.service_selling_price, form.selling_tax, form.selling_tax_value]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const { data } = await getAllPages(CATEGORIES_URL);
        setCategories(extractList(data));
      } catch (err) {
        console.error("Fetch service categories error:", err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

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

  const validateStep = () => {
    if (step === 1) {
      if (!form.accounting_code || !form.code || !form.persian_name) {
        setError("کد حسابداری، کد خدمت و نام فارسی الزامی هستند.");
        return false;
      }

      if (!form.description || !form.barcode || !form.services_category_name) {
        setError("شرح، بارکد و دسته‌بندی خدمت را کامل کن.");
        return false;
      }
    }

    if (step === 2) {
      if (!form.service_selling_price || !form.service_buying_price) {
        setError("قیمت فروش و قیمت خرید الزامی هستند.");
        return false;
      }

      if (!form["countingـunit"]) {
        setError("واحد شمارش خدمت را وارد کن.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const buildPayload = () => {
    const data = new FormData();

    const payload = {
      ...form,
      accounting_code: Number(form.accounting_code),
      code: Number(form.code),
      barcode: Number(form.barcode),
      services_category_name: Number(form.services_category_name),
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

    if (!validateStep()) return;

    try {
      setSubmitting(true);
      setError("");

      await axios.post(SERVICES_URL, buildPayload(), {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("خدمت با موفقیت ثبت شد.");
      navigate("/services/items");
    } catch (err) {
      console.error("Create service error:", err.response?.data || err);
      setError("ثبت خدمت انجام نشد. Console را بررسی کن.");
      alert("خطا در ثبت خدمت.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2>افزودن خدمت جدید</h2>
          <p>اطلاعات خدمت را با فرم هماهنگ با تم جدید وارد کن.</p>
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
        <div className={styles.progress}>
          {steps.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.stepItem} ${step === item.id ? styles.stepCurrent : ""
                } ${step > item.id ? styles.stepDone : ""}`}
              onClick={() => setStep(item.id)}
            >
              <span className={styles.stepCircle}>
                {step > item.id ? "✓" : item.id}
              </span>

              <span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </span>
            </button>
          ))}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {step === 1 && (
          <section className={styles.stepContainer}>
            <h3>اطلاعات پایه</h3>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>کد حسابداری *</label>
                <input
                  name="accounting_code"
                  type="number"
                  value={form.accounting_code}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.col}>
                <label>کد خدمت *</label>
                <input
                  name="code"
                  type="number"
                  value={form.code}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>نام فارسی *</label>
                <input
                  name="persian_name"
                  value={form.persian_name}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.col}>
                <label>نام انگلیسی</label>
                <input
                  name="english_name"
                  value={form.english_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>بارکد *</label>
                <input
                  name="barcode"
                  type="number"
                  value={form.barcode}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.col}>
                <label>دسته‌بندی خدمت *</label>
                <select
                  name="services_category_name"
                  value={form.services_category_name}
                  onChange={handleChange}
                  disabled={loadingCategories}
                >
                  <option value="">انتخاب کنید</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>تصویر</label>
                <input type="file" name="image" onChange={handleChange} />
              </div>

              <div className={styles.col}>
                <label>شرح *</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className={styles.stepContainer}>
            <h3>قیمت و واحد شمارش</h3>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>قیمت فروش *</label>
                <input
                  name="service_selling_price"
                  type="number"
                  value={form.service_selling_price}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.col}>
                <label>قیمت خرید *</label>
                <input
                  name="service_buying_price"
                  type="number"
                  value={form.service_buying_price}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>توضیحات فروش</label>
                <input
                  name="service_selling_description"
                  value={form.service_selling_description}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.col}>
                <label>توضیحات خرید</label>
                <input
                  name="service_buying_description"
                  value={form.service_buying_description}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>واحد شمارش *</label>
                <input
                  name="countingـunit"
                  value={form["countingـunit"]}
                  onChange={handleChange}
                  placeholder="مثلاً عدد، جلسه، نوبت"
                />
              </div>

              <div className={styles.col}>
                <label>توضیح واحد شمارش</label>
                <input
                  name="countingـunit_description"
                  value={form["countingـunit_description"]}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className={styles.stepContainer}>
            <h3>مالیات</h3>

            <div className={styles.row}>
              <label className={styles.switchRow}>
                <input
                  type="checkbox"
                  name="selling_tax"
                  checked={Boolean(form.selling_tax)}
                  onChange={handleChange}
                />
                <span>مالیات فروش دارد</span>
              </label>

              <label className={styles.switchRow}>
                <input
                  type="checkbox"
                  name="buying_tax"
                  checked={Boolean(form.buying_tax)}
                  onChange={handleChange}
                />
                <span>مالیات خرید دارد</span>
              </label>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>مقدار مالیات فروش</label>
                <input
                  name="selling_tax_value"
                  type="number"
                  value={form.selling_tax_value}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.col}>
                <label>مقدار مالیات خرید</label>
                <input
                  name="buying_tax_value"
                  type="number"
                  value={form.buying_tax_value}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>نوع مالیات فروش</label>
                <select
                  name="selling_tax_type"
                  value={form.selling_tax_type}
                  onChange={handleChange}
                >
                  {TAX_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.col}>
                <label>واحد مالیات فروش</label>
                <select
                  name="selling_tax_unit"
                  value={form.selling_tax_unit}
                  onChange={handleChange}
                >
                  {TAX_UNITS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.col}>
                <label>کد مالیاتی</label>
                <input
                  name="tax_code"
                  type="number"
                  value={form.tax_code}
                  onChange={handleChange}
                />
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className={styles.stepContainer}>
            <h3>بازبینی نهایی</h3>

            <div className={styles.reviewGrid}>
              <section>
                <h4>اطلاعات پایه</h4>
                <ul>
                  <li>کد خدمت: {form.code || "—"}</li>
                  <li>کد حسابداری: {form.accounting_code || "—"}</li>
                  <li>نام فارسی: {form.persian_name || "—"}</li>
                  <li>نام انگلیسی: {form.english_name || "—"}</li>
                  <li>بارکد: {form.barcode || "—"}</li>
                </ul>
              </section>

              <section>
                <h4>قیمت</h4>
                <ul>
                  <li>
                    قیمت فروش:{" "}
                    {Number(form.service_selling_price || 0).toLocaleString("fa-IR")}
                  </li>
                  <li>
                    قیمت خرید:{" "}
                    {Number(form.service_buying_price || 0).toLocaleString("fa-IR")}
                  </li>
                  <li>
                    قیمت با مالیات فروش: {totalPreview.toLocaleString("fa-IR")}
                  </li>
                </ul>
              </section>

              <section>
                <h4>واحد و مالیات</h4>
                <ul>
                  <li>واحد شمارش: {form["countingـunit"] || "—"}</li>
                  <li>مالیات فروش: {form.selling_tax ? "دارد" : "ندارد"}</li>
                  <li>مالیات خرید: {form.buying_tax ? "دارد" : "ندارد"}</li>
                  <li>کد مالیاتی: {form.tax_code || "—"}</li>
                </ul>
              </section>

              <section>
                <h4>توضیحات</h4>
                <p>{form.description || "—"}</p>
              </section>
            </div>
          </section>
        )}

        <div className={styles.buttons}>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.prevBtn}`}
            onClick={prevStep}
            disabled={step === 1 || submitting}
          >
            مرحله قبل
          </button>

          {step < 4 ? (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={nextStep}
            >
              مرحله بعد
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={submitting || !canWrite}
              title={!canWrite ? disabledReason : undefined}
            >
              {submitting ? "در حال ثبت..." : "ثبت خدمت"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
