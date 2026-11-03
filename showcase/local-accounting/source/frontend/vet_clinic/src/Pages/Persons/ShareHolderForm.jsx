import { API_BASE_URL } from "../../api/http";
// src/Pages/Persons/ShareHolderForm.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaArrowLeft, FaArrowRight, FaCheck, FaSave } from "react-icons/fa";
import styles from "./PersonForm.module.css";
import useModulePermission from "../../hooks/useModulePermission";

const API_LIST = `${API_BASE_URL}/persons/api/v2/shareholder_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/shareholder_list/`;

const steps = [
    { id: 1, title: "اطلاعات پایه", desc: "مشخصات اصلی سهام‌دار" },
    { id: 2, title: "اطلاعات تماس", desc: "آدرس و راه‌های ارتباطی" },
    { id: 3, title: "اطلاعات سهم", desc: "درصد سهم، مالک و توضیحات" },
];

const initialForm = {
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
    share_precent: 0,
    owner: "",
    description: "",
};

export default function ShareHolderForm() {
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

        const fetchShareHolder = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get(API_DETAIL(id));

                setForm({
                    ...initialForm,
                    ...data,
                    image: null,
                    is_active: Boolean(data.is_active),
                    share_precent: data.share_precent || 0,
                });
            } catch (err) {
                console.error("Fetch shareholder error:", err.response?.data || err);
                toast.error("خطا در دریافت اطلاعات سهام‌دار");
            } finally {
                setLoading(false);
            }
        };

        fetchShareHolder();
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
            if (!form.first_name && !form.company) {
                toast.warning("نام سهام‌دار یا نام شرکت را وارد کن");
                return false;
            }
        }

        if (step === 2 && !form.mobile) {
            toast.warning("شماره موبایل سهام‌دار را وارد کن");
            return false;
        }

        if (step === 3) {
            const percent = Number(form.share_precent || 0);

            if (percent <= 0) {
                toast.warning("درصد سهم باید بیشتر از صفر باشد");
                return false;
            }

            if (percent > 100) {
                toast.warning("درصد سهم نمی‌تواند بیشتر از ۱۰۰ باشد");
                return false;
            }
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

                toast.success("سهام‌دار با موفقیت ویرایش شد");
            } else {
                await axios.post(API_LIST, payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                toast.success("سهام‌دار با موفقیت ایجاد شد");
            }

            navigate("/persons/shareholders");
        } catch (err) {
            console.error("Shareholder submit error:", err.response?.data || err);

            const data = err.response?.data;

            if (data?.mobile) toast.error(`موبایل: ${data.mobile[0]}`);
            else if (data?.share_precent) toast.error(`درصد سهم: ${data.share_precent[0]}`);
            else toast.error("خطا در ثبت اطلاعات سهام‌دار");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.formCard}>در حال دریافت اطلاعات سهام‌دار...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>{isEditMode ? "ویرایش سهام‌دار" : "ثبت سهام‌دار جدید"}</h2>
                    <p>
                        {isEditMode
                            ? "اطلاعات سهام‌دار را ویرایش کن."
                            : "اطلاعات سهام‌دار را مرحله‌به‌مرحله وارد کن."}
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => navigate("/persons/shareholders")}
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
                            <span>سهام‌دار فعال باشد</span>
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
                    </section>
                )}

                {step === 3 && (
                    <section className={styles.formStep}>
                        <div className={styles.field}>
                            <label>درصد سهم *</label>
                            <input
                                type="number"
                                name="share_precent"
                                value={form.share_precent || 0}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.field}>
                            <label>مالک</label>
                            <input
                                name="owner"
                                value={form.owner || ""}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>توضیحات</label>
                            <textarea
                                name="description"
                                value={form.description || ""}
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
                                    : "ثبت سهام‌دار"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
