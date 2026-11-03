import { API_BASE_URL } from "../../api/http";
// src/Pages/Persons/DriverForm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaArrowRight, FaCheck, FaSave } from "react-icons/fa";
import styles from "./PersonForm.module.css";
import useModulePermission from "../../hooks/useModulePermission";

const API_LIST = `${API_BASE_URL}/persons/api/v2/driver_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/driver_list/`;

const steps = [
    { id: 1, title: "اطلاعات پایه", desc: "مشخصات اصلی راننده" },
    { id: 2, title: "اطلاعات تماس", desc: "آدرس و راه‌های ارتباطی" },
    { id: 3, title: "اطلاعات راننده", desc: "گواهینامه و کد ملی" },
];

const initialForm = {
    code: "",
    type: "حقیقی",
    first_name: "",
    last_name: "",
    company: "",
    image: null,
    is_active: true,
    address: "",
    country: "",
    state: "",
    city: "",
    postal_code: "",
    phone: "",
    mobile: "",
    email: "",
    licence_code: "",
    national_code: "",
};

export default function DriverForm() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [step, setStep] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(isEditMode);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isEditMode) return;

        const fetchDriver = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(API_DETAIL(id));

                setForm({
                    ...initialForm,
                    ...data,
                    image: null,
                    is_active: Boolean(data.is_active),
                    code: data.code || "",
                    email: data.email || "",
                });
            } catch (err) {
                console.error("Fetch driver error:", err.response?.data || err);
                toast.error("خطا در دریافت اطلاعات راننده");
            } finally {
                setLoading(false);
            }
        };

        fetchDriver();
    }, [id, isEditMode]);

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
            if (!form.code) {
                toast.warning("کد راننده الزامی است");
                return false;
            }

            if (!form.first_name && !form.company) {
                toast.warning("نام راننده یا نام شرکت را وارد کن");
                return false;
            }
        }

        if (step === 2 && !form.mobile) {
            toast.warning("شماره موبایل راننده را وارد کن");
            return false;
        }

        if (step === 3 && !form.licence_code) {
            toast.warning("شماره گواهینامه را وارد کن");
            return false;
        }

        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        setStep((prev) => Math.min(prev + 1, 3));
    };

    const handlePrev = () => {
        setStep((prev) => Math.max(prev - 1, 1));
    };

    const buildPayload = () => {
        const payload = new FormData();

        Object.entries(form).forEach(([key, value]) => {
            if (key === "image" && !value) return;
            if (value === null || value === undefined) return;
            payload.append(key, value);
        });

        return payload;
    };

    const handleSubmit = async () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!validateStep()) return;

        try {
            setSubmitting(true);
            const payload = buildPayload();

            if (isEditMode) {
                await axios.patch(API_DETAIL(id), payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                toast.success("راننده با موفقیت ویرایش شد");
            } else {
                await axios.post(API_LIST, payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                toast.success("راننده با موفقیت ایجاد شد");
            }

            navigate("/persons/drivers");
        } catch (err) {
            console.error("Driver submit error:", err.response?.data || err);

            const data = err.response?.data;

            if (data?.code) toast.error(`کد راننده: ${data.code[0]}`);
            else if (data?.mobile) toast.error(`موبایل: ${data.mobile[0]}`);
            else if (data?.email) toast.error(`ایمیل: ${data.email[0]}`);
            else if (data?.licence_code) toast.error(`شماره گواهینامه: ${data.licence_code[0]}`);
            else if (data?.national_code) toast.error(`کد ملی: ${data.national_code[0]}`);
            else toast.error("خطا در ثبت اطلاعات راننده");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.formCard}>در حال دریافت اطلاعات راننده...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>{isEditMode ? "ویرایش راننده" : "ثبت راننده جدید"}</h2>
                    <p>
                        {isEditMode
                            ? "اطلاعات راننده را ویرایش کن."
                            : "اطلاعات راننده را مرحله‌به‌مرحله وارد کن."}
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => navigate("/persons/drivers")}
                >
                    بازگشت به لیست
                </button>
            </div>

            <div className={styles.formCard}>
                <div className={styles.steps}>
                    {steps.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`${styles.stepIndicator} ${step === item.id ? styles.active : ""
                                } ${step > item.id ? styles.done : ""}`}
                            onClick={() => setStep(item.id)}
                        >
                            <span className={styles.stepNumber}>
                                {step > item.id ? <FaCheck /> : item.id}
                            </span>

                            <span>
                                <strong>{item.title}</strong>
                                <small>{item.desc}</small>
                            </span>
                        </button>
                    ))}
                </div>

                {step === 1 && (
                    <section className={styles.formStep}>
                        <div className={styles.field}>
                            <label>کد راننده *</label>
                            <input
                                name="code"
                                type="number"
                                value={form.code || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>نوع</label>
                            <select
                                name="type"
                                value={form.type || "حقیقی"}
                                onChange={handleChange}
                            >
                                <option value="حقیقی">حقیقی</option>
                                <option value="حقوقی">حقوقی</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>نام</label>
                            <input
                                name="first_name"
                                value={form.first_name || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>نام خانوادگی</label>
                            <input
                                name="last_name"
                                value={form.last_name || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>شرکت</label>
                            <input
                                name="company"
                                value={form.company || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>تصویر</label>
                            <input type="file" name="image" onChange={handleChange} />
                        </div>

                        <label className={styles.switchRow}>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={Boolean(form.is_active)}
                                onChange={handleChange}
                            />
                            <span>راننده فعال باشد</span>
                        </label>
                    </section>
                )}

                {step === 2 && (
                    <section className={styles.formStep}>
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>آدرس</label>
                            <input
                                name="address"
                                value={form.address || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>کشور</label>
                            <input
                                name="country"
                                value={form.country || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>استان</label>
                            <input
                                name="state"
                                value={form.state || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>شهر</label>
                            <input
                                name="city"
                                value={form.city || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>کد پستی</label>
                            <input
                                name="postal_code"
                                value={form.postal_code || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>تلفن</label>
                            <input
                                name="phone"
                                value={form.phone || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>موبایل *</label>
                            <input
                                name="mobile"
                                value={form.mobile || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>ایمیل</label>
                            <input
                                name="email"
                                value={form.email || ""}
                                onChange={handleChange}
                            />
                        </div>
                    </section>
                )}

                {step === 3 && (
                    <section className={styles.formStep}>
                        <div className={styles.field}>
                            <label>شماره گواهینامه *</label>
                            <input
                                name="licence_code"
                                value={form.licence_code || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>کد ملی</label>
                            <input
                                name="national_code"
                                value={form.national_code || ""}
                                onChange={handleChange}
                            />
                        </div>
                    </section>
                )}

                <div className={styles.navButtons}>
                    <button
                        type="button"
                        className={styles.prevBtn}
                        onClick={handlePrev}
                        disabled={step === 1 || submitting}
                    >
                        <FaArrowRight />
                        قبلی
                    </button>

                    {step < 3 ? (
                        <button
                            type="button"
                            className={styles.nextBtn}
                            onClick={handleNext}
                        >
                            بعدی
                            <FaArrowLeft />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={handleSubmit}
                            disabled={submitting || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                        >
                            <FaSave />
                            {submitting
                                ? "در حال ثبت..."
                                : isEditMode
                                    ? "ذخیره تغییرات"
                                    : "ثبت راننده"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
