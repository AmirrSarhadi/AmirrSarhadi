import { getAllPages } from "../../api/lists";
import { API_BASE_URL, extractList } from "../../api/http";
// src/Pages/Sales/DiscountsCreate.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./DiscountsCreate.module.css";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowRight, FaSave } from "react-icons/fa";

const API_BASE = API_BASE_URL;

const DISCOUNT_TYPES = [
    { value: "all_materials", label: "همه کالاها" },
    { value: "all_persons", label: "همه اشخاص" },
    { value: "material", label: "کالای خاص" },
    { value: "person", label: "شخص خاص" },
    { value: "material_category", label: "دسته‌بندی کالا" },
    { value: "person_category", label: "دسته‌بندی شخص" },
];

const initialForm = {
    title: "",
    discount_type: "all_materials",
    description: "",
    percent: 0,
    amount: 0,
    valid_from: "",
    valid_to: "",
    last_used: "",
    single_use: false,
    usage_count: 0,
    notes: "",
    target_material: "",
    target_customer: "",
    target_seller: "",
    target_vendor: "",
};

const toNull = (value) => {
    if (value === "" || value === undefined || value === null) return null;
    return value;
};

const money = (value) => Number(value || 0).toLocaleString("fa-IR");

export default function DiscountsCreate() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const discountId = searchParams.get("id");
    const isEditMode = Boolean(discountId);

    const [form, setForm] = useState(initialForm);

    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [vendors, setVendors] = useState([]);

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);

    const previewText = useMemo(() => {
        const percent = Number(form.percent || 0);
        const amount = Number(form.amount || 0);

        if (percent > 0 && amount > 0) {
            return `${percent.toLocaleString("fa-IR")}٪ + ${money(amount)} ریال`;
        }

        if (percent > 0) return `${percent.toLocaleString("fa-IR")}٪`;
        if (amount > 0) return `${money(amount)} ریال`;

        return "تخفیفی وارد نشده";
    }, [form.percent, form.amount]);

    useEffect(() => {
        fetchDropdowns();

        if (discountId) {
            fetchDiscount(discountId);
        }
    }, [discountId]);

    const fetchDropdowns = async () => {
        try {
            const [materialsRes, customersRes, sellersRes, vendorsRes] =
                await Promise.all([
                    getAllPages(`${API_BASE}/services/api/v2/materials/`),
                    getAllPages(`${API_BASE}/persons/api/v2/customer_list/`),
                    getAllPages(`${API_BASE}/persons/api/v2/seller_list/`),
                    getAllPages(`${API_BASE}/persons/api/v2/vendor_list/`),
                ]);

            setMaterials(extractList(materialsRes.data));
            setCustomers(extractList(customersRes.data));
            setSellers(extractList(sellersRes.data));
            setVendors(extractList(vendorsRes.data));
        } catch (err) {
            console.error("Fetch discount dropdowns error:", err);
            toast.error("خطا در دریافت اطلاعات اولیه تخفیف");
        }
    };

    const fetchDiscount = async (id) => {
        try {
            setLoading(true);

            const { data } = await getAllPages(
                `${API_BASE}/incomes/api/${id}/v2/income_discounts/`
            );

            setForm({
                ...initialForm,
                ...data,
                target_material: data.target_material || "",
                target_customer: data.target_customer || "",
                target_seller: data.target_seller || "",
                target_vendor: data.target_vendor || "",
                valid_from: data.valid_from || "",
                valid_to: data.valid_to || "",
                last_used: data.last_used || "",
            });
        } catch (err) {
            console.error("Fetch discount error:", err.response?.data || err);
            toast.error("خطا در دریافت اطلاعات تخفیف");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (name, value) => {
        setForm((prev) => {
            const next = { ...prev, [name]: value };

            if (name === "discount_type") {
                next.target_material = "";
                next.target_customer = "";
                next.target_seller = "";
                next.target_vendor = "";
            }

            return next;
        });
    };

    const validate = () => {
        if (!form.title.trim()) {
            toast.warning("عنوان تخفیف الزامی است");
            return false;
        }

        if (Number(form.percent || 0) <= 0 && Number(form.amount || 0) <= 0) {
            toast.warning("درصد یا مبلغ تخفیف را وارد کن");
            return false;
        }

        if (Number(form.percent || 0) > 100) {
            toast.warning("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد");
            return false;
        }

        if (form.discount_type === "material" && !form.target_material) {
            toast.warning("کالا را انتخاب کن");
            return false;
        }

        if (
            form.discount_type === "person" &&
            !form.target_customer &&
            !form.target_seller &&
            !form.target_vendor
        ) {
            toast.warning("حداقل یک شخص را انتخاب کن");
            return false;
        }

        return true;
    };

    const buildPayload = () => {
        return {
            title: form.title,
            discount_type: form.discount_type,
            description: form.description || "",
            percent: Number(form.percent || 0),
            amount: Number(form.amount || 0),
            valid_from: form.valid_from || null,
            valid_to: form.valid_to || null,
            last_used: form.last_used || null,
            single_use: Boolean(form.single_use),
            usage_count: Number(form.usage_count || 0),
            notes: form.notes || "",
            target_material:
                form.discount_type === "material" ? toNull(form.target_material) : null,
            target_customer:
                form.discount_type === "person" ? toNull(form.target_customer) : null,
            target_seller:
                form.discount_type === "person" ? toNull(form.target_seller) : null,
            target_vendor:
                form.discount_type === "person" ? toNull(form.target_vendor) : null,
        };
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            setSaving(true);

            const payload = buildPayload();

            if (isEditMode) {
                await axios.put(
                    `${API_BASE}/incomes/api/${discountId}/v2/income_discounts/`,
                    payload
                );
                toast.success("تخفیف با موفقیت ویرایش شد");
            } else {
                await axios.post(`${API_BASE}/incomes/api/v2/income_discounts/`, payload);
                toast.success("تخفیف با موفقیت ثبت شد");
            }

            navigate("/sales/discounts");
        } catch (err) {
            console.error("Save discount error:", err.response?.data || err);

            const data = err.response?.data;

            if (data && typeof data === "object") {
                const firstError = Object.entries(data)
                    .map(([field, msgs]) => {
                        if (Array.isArray(msgs)) return `${field}: ${msgs[0]}`;
                        return `${field}: ${msgs}`;
                    })
                    .join(" | ");

                toast.error(firstError || "ثبت تخفیف ناموفق بود");
            } else {
                toast.error("ثبت تخفیف ناموفق بود");
            }
        } finally {
            setSaving(false);
        }
    };

    const personName = (person) =>
        person.company ||
        `${person.first_name || ""} ${person.last_name || ""}`.trim() ||
        `#${person.id}`;

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.formCard}>در حال دریافت اطلاعات تخفیف...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>{isEditMode ? "ویرایش آیتم تخفیف‌دار" : "اقلام تخفیف‌دار جدید"}</h2>
                    <p>
                        تخفیف را برای همه کالاها، یک کالای خاص، یا اشخاص تعریف کن.
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => navigate("/sales/discounts")}
                >
                    <FaArrowRight />
                    بازگشت به لیست
                </button>
            </div>

            <form onSubmit={handleSave} className={styles.formCard}>
                <div className={styles.summaryBar}>
                    <div>
                        <span>نوع تخفیف</span>
                        <strong>
                            {DISCOUNT_TYPES.find((item) => item.value === form.discount_type)
                                ?.label || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>مقدار تخفیف</span>
                        <strong>{previewText}</strong>
                    </div>

                    <div>
                        <span>وضعیت مصرف</span>
                        <strong>{form.single_use ? "یکبار مصرف" : "چندبار مصرف"}</strong>
                    </div>
                </div>

                <section className={styles.section}>
                    <div className={styles.sectionTitle}>
                        <h3>اطلاعات اصلی</h3>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>عنوان *</label>
                            <input
                                value={form.title}
                                onChange={(e) => handleChange("title", e.target.value)}
                                placeholder="مثلاً تخفیف نوروزی"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>نوع تخفیف</label>
                            <select
                                value={form.discount_type}
                                onChange={(e) => handleChange("discount_type", e.target.value)}
                            >
                                {DISCOUNT_TYPES.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={`${styles.field} ${styles.full}`}>
                            <label>شرح کوتاه</label>
                            <input
                                value={form.description || ""}
                                onChange={(e) => handleChange("description", e.target.value)}
                                placeholder="شرح کوتاه برای نمایش در لیست"
                            />
                        </div>
                    </div>
                </section>

                {(form.discount_type === "material" || form.discount_type === "person") && (
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <h3>هدف تخفیف</h3>
                        </div>

                        {form.discount_type === "material" && (
                            <div className={styles.grid}>
                                <div className={`${styles.field} ${styles.full}`}>
                                    <label>انتخاب کالا *</label>
                                    <select
                                        value={form.target_material || ""}
                                        onChange={(e) =>
                                            handleChange("target_material", e.target.value)
                                        }
                                    >
                                        <option value="">انتخاب کنید...</option>
                                        {materials.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.persian_name || m.english_name || `#${m.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {form.discount_type === "person" && (
                            <div className={styles.grid}>
                                <div className={styles.field}>
                                    <label>مشتری</label>
                                    <select
                                        value={form.target_customer || ""}
                                        onChange={(e) =>
                                            handleChange("target_customer", e.target.value)
                                        }
                                    >
                                        <option value="">انتخاب نشده</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {personName(c)} {c.code ? `(#${c.code})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label>فروشنده</label>
                                    <select
                                        value={form.target_seller || ""}
                                        onChange={(e) =>
                                            handleChange("target_seller", e.target.value)
                                        }
                                    >
                                        <option value="">انتخاب نشده</option>
                                        {sellers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {personName(s)} {s.code ? `(#${s.code})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.field}>
                                    <label>تأمین‌کننده</label>
                                    <select
                                        value={form.target_vendor || ""}
                                        onChange={(e) =>
                                            handleChange("target_vendor", e.target.value)
                                        }
                                    >
                                        <option value="">انتخاب نشده</option>
                                        {vendors.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {personName(v)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                <section className={styles.section}>
                    <div className={styles.sectionTitle}>
                        <h3>مقدار و زمان‌بندی</h3>
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label>درصد تخفیف</label>
                            <input
                                type="number"
                                value={form.percent}
                                onChange={(e) => handleChange("percent", e.target.value)}
                                min="0"
                                max="100"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>مبلغ تخفیف</label>
                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) => handleChange("amount", e.target.value)}
                                min="0"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>از تاریخ</label>
                            <DatePicker
                                calendar={persian}
                                locale={persian_fa}
                                value={form.valid_from || ""}
                                onChange={(v) =>
                                    handleChange("valid_from", v ? v.format("YYYY/MM/DD") : "")
                                }
                                format="YYYY/MM/DD"
                                inputClass={styles.dateInput}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>تا تاریخ</label>
                            <DatePicker
                                calendar={persian}
                                locale={persian_fa}
                                value={form.valid_to || ""}
                                onChange={(v) =>
                                    handleChange("valid_to", v ? v.format("YYYY/MM/DD") : "")
                                }
                                format="YYYY/MM/DD"
                                inputClass={styles.dateInput}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>آخرین استفاده</label>
                            <DatePicker
                                calendar={persian}
                                locale={persian_fa}
                                value={form.last_used || ""}
                                onChange={(v) =>
                                    handleChange("last_used", v ? v.format("YYYY/MM/DD") : "")
                                }
                                format="YYYY/MM/DD"
                                inputClass={styles.dateInput}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>تعداد استفاده</label>
                            <input
                                type="number"
                                value={form.usage_count}
                                onChange={(e) => handleChange("usage_count", e.target.value)}
                                min="0"
                            />
                        </div>

                        <label className={styles.switchRow}>
                            <input
                                type="checkbox"
                                checked={Boolean(form.single_use)}
                                onChange={(e) => handleChange("single_use", e.target.checked)}
                            />
                            <span>این تخفیف یکبار مصرف باشد</span>
                        </label>

                        <div className={`${styles.field} ${styles.full}`}>
                            <label>یادداشت</label>
                            <textarea
                                value={form.notes || ""}
                                onChange={(e) => handleChange("notes", e.target.value)}
                                placeholder="توضیحات داخلی یا شرایط استفاده از تخفیف"
                            />
                        </div>
                    </div>
                </section>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => navigate("/sales/discounts")}
                        disabled={saving}
                    >
                        انصراف
                    </button>

                    <button type="submit" className={styles.submitBtn} disabled={saving}>
                        <FaSave />
                        {saving
                            ? "در حال ذخیره..."
                            : isEditMode
                                ? "ذخیره تغییرات"
                                : "ثبت تخفیف"}
                    </button>
                </div>
            </form>
        </div>
    );
}