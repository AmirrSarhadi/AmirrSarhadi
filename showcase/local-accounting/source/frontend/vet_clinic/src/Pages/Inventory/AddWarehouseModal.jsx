import { API_BASE_URL } from "../../api/http";
import styles from "./InventoryTable.module.css";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_LIST = `${API_BASE_URL}/warehousing/api/v2/warehouses/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/warehousing/api/${id}/v2/warehouses/details/`;

const emptyForm = {
    code: "",
    name: "",
    manager: "",
    manager_mobile: "",
    phone: "",
    address: "",
};

function AddWarehouseModal({ onClose, onSuccess, existing, canWrite = true, disabledReason = "نقش کاربری شما اجازه انجام این عملیات را ندارد." }) {
    const [formData, setFormData] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const isEditMode = Boolean(existing?.id);

    useEffect(() => {
        if (existing) {
            setFormData({
                code: existing.code || "",
                name: existing.name || "",
                manager: existing.manager || "",
                manager_mobile: existing.manager_mobile || "",
                phone: existing.phone || "",
                address: existing.address || "",
            });
        } else {
            setFormData(emptyForm);
        }
    }, [existing]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: "",
            general: "",
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.code) newErrors.code = "کد انبار الزامی است";
        if (!formData.name.trim()) newErrors.name = "نام انبار الزامی است";
        if (!formData.manager.trim()) newErrors.manager = "نام مدیر الزامی است";
        if (!formData.address.trim()) newErrors.address = "آدرس الزامی است";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const getErrorMessage = (err) => {
        const data = err?.response?.data;

        if (!data) return "خطا در ثبت اطلاعات";

        if (typeof data === "string") return data;

        return Object.entries(data)
            .map(([field, value]) => {
                if (Array.isArray(value)) return `${field}: ${value.join("، ")}`;
                return `${field}: ${value}`;
            })
            .join(" | ");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!validate()) return;

        const payload = {
            code: Number(formData.code),
            name: formData.name.trim(),
            manager: formData.manager.trim(),
            manager_mobile: String(formData.manager_mobile || "").trim(),
            phone: Number(formData.phone || 0),
            address: formData.address.trim(),
        };

        try {
            setSubmitting(true);

            if (isEditMode) {
                await axios.put(API_DETAIL(existing.id), payload);
                toast.success("انبار با موفقیت ویرایش شد");
            } else {
                await axios.post(API_LIST, payload);
                toast.success("انبار با موفقیت ایجاد شد");
            }

            onSuccess();
        } catch (err) {
            console.error(err);
            setErrors({ general: getErrorMessage(err) });
            toast.error("عملیات انجام نشد");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <form className={styles.formModal} onSubmit={handleSubmit}>
                <div className={styles.detailsHeader}>
                    <div>
                        <h3>{isEditMode ? "ویرایش انبار" : "افزودن انبار"}</h3>

                    </div>

                    <button
                        type="button"
                        className={styles.closeIconBtn}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        ×
                    </button>
                </div>

                {errors.general && (
                    <div className={styles.formError}>{errors.general}</div>
                )}

                <div className={styles.formGrid}>
                    <div className={styles.formField}>
                        <label>کد انبار</label>
                        <input
                            name="code"
                            type="number"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="مثلاً 1001"
                        />
                        {errors.code && <span>{errors.code}</span>}
                    </div>

                    <div className={styles.formField}>
                        <label>نام انبار</label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="مثلاً انبار مرکزی"
                        />
                        {errors.name && <span>{errors.name}</span>}
                    </div>

                    <div className={styles.formField}>
                        <label>مدیر انبار</label>
                        <input
                            name="manager"
                            value={formData.manager}
                            onChange={handleChange}
                            placeholder="نام مدیر"
                        />
                        {errors.manager && <span>{errors.manager}</span>}
                    </div>

                    <div className={styles.formField}>
                        <label>موبایل مدیر</label>
                        <input
                            name="manager_mobile"
                            value={formData.manager_mobile}
                            onChange={handleChange}
                            placeholder="0912..."
                        />
                    </div>

                    <div className={styles.formField}>
                        <label>تلفن ثابت</label>
                        <input
                            name="phone"
                            type="number"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="021..."
                        />
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>آدرس</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="آدرس کامل انبار"
                        />
                        {errors.address && <span>{errors.address}</span>}
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={submitting || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {submitting
                            ? "در حال ذخیره..."
                            : isEditMode
                                ? "ذخیره تغییرات"
                                : "ثبت انبار"}
                    </button>

                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={submitting}
                    >
                        انصراف
                    </button>
                </div>
            </form>
        </div>
    );
}

export default AddWarehouseModal;