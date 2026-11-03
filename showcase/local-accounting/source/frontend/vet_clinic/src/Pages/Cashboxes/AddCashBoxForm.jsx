import { API_BASE_URL } from "../../api/http";
// src/pages/Cashboxes/AddCashBoxForm.jsx
import styles from "./CashboxTable.module.css";
import { FaTimes } from "react-icons/fa";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_LIST = `${API_BASE_URL}/banking/api/v2/cashbox_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/cashbox_list/`;

function AddCashBoxForm({ onClose, onAdd, existing, canWrite = true, disabledReason = "نقش کاربری شما اجازه انجام این عملیات را ندارد." }) {
    const isEditMode = Boolean(existing);

    const [accounts, setAccounts] = useState([]);
    const [formData, setFormData] = useState({
        account: "",
        name: "",
        currency: "IRR",
        account_balance: 0,
        description: "",
        switch_number: "",
        terminal_number: "",
        receiver_number: "",
        is_active: true,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/accounting/api/v2/accounts/?is_cashbox_account=true&is_postable=true`
                );
                setAccounts(Array.isArray(response.data) ? response.data : response.data.results || []);
            } catch (error) {
                console.error("Fetch treasury accounts error:", error);
                toast.error("خطا در دریافت حساب‌های حسابداری");
            }
        };
        loadAccounts();
    }, []);

    useEffect(() => {
        if (isEditMode && existing) {
            setFormData({
                account: existing.account || "",
                name: existing.name || "",
                currency: existing.currency || "IRR",
                account_balance: existing.account_balance || "",
                description: existing.description || "",
                switch_number: existing.switch_number || "",
                terminal_number: existing.terminal_number || "",
                receiver_number: existing.receiver_number || "",
                is_active: Boolean(existing.is_active),
            });
        }
    }, [existing, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) newErrors.name = "نام صندوق الزامی است";
        if (!formData.account)
            newErrors.account = "حساب حسابداری صندوق الزامی است";


        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const buildPayload = () => ({
        ...Object.fromEntries(Object.entries(formData).filter(([key]) => key !== "account_balance")),
        account: Number(formData.account),

        switch_number: formData.switch_number ? Number(formData.switch_number) : null,
        terminal_number: formData.terminal_number ? Number(formData.terminal_number) : null,
        receiver_number: formData.receiver_number ? Number(formData.receiver_number) : null,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!validate()) return;

        try {
            setLoading(true);

            const response = isEditMode
                ? await axios.put(API_DETAIL(existing.id), buildPayload())
                : await axios.post(API_LIST, buildPayload());

            onAdd(response.data);
            toast.success(
                isEditMode
                    ? "صندوق با موفقیت ویرایش شد"
                    : "صندوق با موفقیت ایجاد شد"
            );
            onClose();
        } catch (err) {
            console.error("Save cashbox error:", err.response?.data || err);
            setErrors({ submit: "خطا در ذخیره صندوق. Console را بررسی کن." });
            toast.error("ذخیره صندوق انجام نشد");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.detailsHeader}>
                    <div>
                        <h3>{isEditMode ? "ویرایش صندوق" : "افزودن صندوق جدید"}</h3>
                        <p>اطلاعات صندوق نقدی را وارد کن.</p>
                    </div>

                    <button
                        type="button"
                        className={styles.closeIconBtn}
                        onClick={onClose}
                    >
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.formGrid}>
                        <div className={styles.formField}>
                            <label>نام صندوق *</label>
                            <input name="name" value={formData.name} onChange={handleChange} />
                            {errors.name && <span>{errors.name}</span>}
                        </div>

                        <div className={styles.formField}>
                            <label>حساب حسابداری صندوق *</label>
                            <select name="account" value={formData.account} onChange={handleChange}>
                                <option value="">انتخاب کنید</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.code} - {account.name}
                                    </option>
                                ))}
                            </select>
                            {errors.account && <span>{errors.account}</span>}
                        </div>

                        <div className={styles.formField}>
                            <label>مانده محاسبه‌شده</label>
                            <input
                                type="number"
                                name="account_balance"
                                readOnly
                                value={formData.account_balance}
                                onChange={handleChange}
                            />
                            {errors.account_balance && <span>{errors.account_balance}</span>}
                        </div>

                        <div className={styles.formField}>
                            <label>واحد پول</label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                            >
                                <option value="IRR">ریال ایران</option>
                                <option value="USD">دلار آمریکا</option>
                                <option value="EUR">یورو</option>
                                <option value="AED">درهم امارات</option>
                                <option value="CAD">دلار کانادا</option>
                                <option value="OMR">ریال عمان</option>
                            </select>
                        </div>

                        <div className={styles.formField}>
                            <label>شماره سوئیچ</label>
                            <input
                                name="switch_number"
                                value={formData.switch_number}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.formField}>
                            <label>شماره ترمینال</label>
                            <input
                                name="terminal_number"
                                value={formData.terminal_number}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={styles.formField}>
                            <label>شماره پذیرنده</label>
                            <input
                                name="receiver_number"
                                value={formData.receiver_number}
                                onChange={handleChange}
                            />
                        </div>

                        <label className={styles.switchRow}>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={Boolean(formData.is_active)}
                                onChange={handleChange}
                            />
                            <span>صندوق فعال باشد</span>
                        </label>

                        <div className={`${styles.formField} ${styles.fullWidth}`}>
                            <label>توضیحات</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {errors.submit && <div className={styles.formError}>{errors.submit}</div>}

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            className={styles.cancelBtn}
                            onClick={onClose}
                            disabled={loading}
                        >
                            انصراف
                        </button>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading || !canWrite}
                            title={!canWrite ? disabledReason : undefined}
                        >
                            {loading
                                ? "در حال ذخیره..."
                                : isEditMode
                                    ? "ذخیره تغییرات"
                                    : "ذخیره صندوق"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddCashBoxForm;
