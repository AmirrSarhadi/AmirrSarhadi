import { API_BASE_URL } from "../../api/http";
// src/pages/BankTable/AddBankForm.jsx

import styles from "./BankTable.module.css";
import { FaTimes } from "react-icons/fa";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_LIST = `${API_BASE_URL}/banking/api/v2/bank_list/`;

const API_DETAIL = (id) =>
  `${API_BASE_URL}/banking/api/${id}/v2/bank_list/`;

const ACCOUNTS_API =
  `${API_BASE_URL}/accounting/api/v2/accounts/?is_bank_account=true&is_postable=true`;

function AddBankForm({ onClose, onAdd, existingBank, canWrite = true, disabledReason = "نقش کاربری شما اجازه انجام این عملیات را ندارد." }) {
  const isEditMode = Boolean(existingBank);

  const [accounts, setAccounts] = useState([]);

  const [formData, setFormData] = useState({
    account: "",
    name: "",
    branch_name: "",
    card_number: "",
    shaba: "",
    account_owner_name: "",
    pos_number: "",
    currency: "IRR",
    account_balance: 0,
    description: "",
    phone_number: "",
    switch_number: "",
    terminal_number: "",
    receiver_number: "",
    is_active: true,
  });

  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (isEditMode && existingBank) {
      setFormData({
        account: existingBank.account || "",

        name: existingBank.name || "",
        branch_name: existingBank.branch_name || "",

        account_number: existingBank.account_number || "",
        card_number: existingBank.card_number || "",
        shaba: existingBank.shaba || "",

        account_owner_name: existingBank.account_owner_name || "",

        pos_number: existingBank.pos_number || "",

        currency: existingBank.currency || "IRR",

        account_balance: existingBank.account_balance || "",

        description: existingBank.description || "",

        phone_number: existingBank.phone_number || "",

        switch_number: existingBank.switch_number || "",
        terminal_number: existingBank.terminal_number || "",
        receiver_number: existingBank.receiver_number || "",

        is_active: Boolean(existingBank.is_active),
      });
    }
  }, [existingBank, isEditMode]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(ACCOUNTS_API);

      setAccounts(
        Array.isArray(res.data)
          ? res.data
          : res.data.results || []
      );
    } catch (err) {
      console.error("Fetch accounts error:", err);
      toast.error("خطا در دریافت حساب‌ها");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.account)
      newErrors.account = "حساب حسابداری الزامی است";

    if (!formData.name.trim())
      newErrors.name = "نام بانک الزامی است";

    if (!formData.branch_name.trim())
      newErrors.branch_name = "نام شعبه الزامی است";


    if (!formData.account_number) newErrors.account_number = "شماره حساب الزامی است";
    if (!formData.card_number) newErrors.card_number = "شماره کارت الزامی است";
    if (!formData.shaba) newErrors.shaba = "شماره شبا الزامی است";
    if (!formData.account_owner_name.trim()) newErrors.account_owner_name = "نام صاحب حساب الزامی است";
    if (!formData.pos_number) newErrors.pos_number = "شماره POS الزامی است";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
  };

  const buildPayload = () => ({
    account: Number(formData.account),
    name: formData.name.trim(),
    branch_name: formData.branch_name.trim(),
    account_number: String(formData.account_number || "").trim(),
    card_number: String(formData.card_number || "").trim(),
    shaba: String(formData.shaba || "").trim().toUpperCase(),
    account_owner_name: formData.account_owner_name.trim(),
    pos_number: Number(formData.pos_number),
    currency: formData.currency,

    description: formData.description || "",
    phone_number: formData.phone_number ? String(formData.phone_number).trim() : null,
    switch_number: toNumberOrNull(formData.switch_number),
    terminal_number: toNumberOrNull(formData.terminal_number),
    receiver_number: toNumberOrNull(formData.receiver_number),
    is_active: formData.is_active,
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

      const payload = buildPayload();

      const response = isEditMode
        ? await axios.put(API_DETAIL(existingBank.id), {
          ...payload,
        })
        : await axios.post(API_LIST, {
          ...payload,
          created_by: "admin",
        });

      onAdd(response.data);

      toast.success(
        isEditMode
          ? "بانک با موفقیت ویرایش شد"
          : "بانک با موفقیت ایجاد شد"
      );

      onClose();
    } catch (err) {
      console.error("Save bank error:", err.response?.data || err);
      alert(JSON.stringify(err.response?.data, null, 2));

      setErrors({
        submit: "خطا در ذخیره بانک",
      });

      toast.error("ذخیره بانک انجام نشد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
    >
      <div
        className={styles.formModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.detailsHeader}>
          <div>
            <h3>
              {isEditMode
                ? "ویرایش بانک"
                : "افزودن بانک جدید"}
            </h3>

            <p>
              اطلاعات حساب بانکی را وارد کن.
            </p>
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
            {/* حساب حسابداری */}
            <div className={styles.formField}>
              <label>حساب حسابداری *</label>

              <select
                name="account"
                value={formData.account}
                onChange={handleChange}
              >
                <option value="">
                  انتخاب حساب
                </option>

                {accounts.map((acc) => (
                  <option
                    key={acc.id}
                    value={acc.id}
                  >
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>

              {errors.account && (
                <span>{errors.account}</span>
              )}
            </div>

            {/* نام بانک */}
            <div className={styles.formField}>
              <label>نام بانک *</label>

              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
              />

              {errors.name && (
                <span>{errors.name}</span>
              )}
            </div>

            {/* نام شعبه */}
            <div className={styles.formField}>
              <label>نام شعبه *</label>

              <input
                name="branch_name"
                value={formData.branch_name}
                onChange={handleChange}
              />

              {errors.branch_name && (
                <span>{errors.branch_name}</span>
              )}
            </div>

            {/* شماره حساب */}
            <div className={styles.formField}>
              <label>شماره حساب</label>

              <input
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
              />
            </div>

            {/* شماره کارت */}
            <div className={styles.formField}>
              <label>شماره کارت</label>

              <input
                name="card_number"
                value={formData.card_number}
                onChange={handleChange}
              />
            </div>

            {/* شبا */}
            <div className={styles.formField}>
              <label>شماره شبا</label>

              <input
                name="shaba"
                value={formData.shaba}
                onChange={handleChange}
              />
            </div>

            {/* صاحب حساب */}
            <div className={styles.formField}>
              <label>نام صاحب حساب</label>

              <input
                name="account_owner_name"
                value={formData.account_owner_name}
                onChange={handleChange}
              />
            </div>

            {/* POS */}
            <div className={styles.formField}>
              <label>شماره POS</label>

              <input
                name="pos_number"
                value={formData.pos_number}
                onChange={handleChange}
              />
            </div>

            {/* موجودی */}
            <div className={styles.formField}>
              <label>مانده محاسبه‌شده</label>

              <input
                type="number"
                name="account_balance"
                readOnly
                value={formData.account_balance}
                onChange={handleChange}
              />

              {errors.account_balance && (
                <span>
                  {errors.account_balance}
                </span>
              )}
            </div>

            {/* ارز */}
            <div className={styles.formField}>
              <label>واحد پول</label>

              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="IRR">
                  ریال ایران
                </option>

                <option value="USD">
                  دلار آمریکا
                </option>

                <option value="EUR">
                  یورو
                </option>

                <option value="AED">
                  درهم امارات
                </option>

                <option value="CAD">
                  دلار کانادا
                </option>

                <option value="OMR">
                  ریال عمان
                </option>
              </select>
            </div>

            {/* تلفن */}
            <div className={styles.formField}>
              <label>
                شماره موبایل اینترنت بانک
              </label>

              <input
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
              />
            </div>

            {/* سوئیچ */}
            <div className={styles.formField}>
              <label>شماره سوئیچ</label>

              <input
                name="switch_number"
                value={formData.switch_number}
                onChange={handleChange}
              />
            </div>

            {/* ترمینال */}
            <div className={styles.formField}>
              <label>شماره ترمینال</label>

              <input
                name="terminal_number"
                value={formData.terminal_number}
                onChange={handleChange}
              />
            </div>

            {/* پذیرنده */}
            <div className={styles.formField}>
              <label>شماره پذیرنده</label>

              <input
                name="receiver_number"
                value={formData.receiver_number}
                onChange={handleChange}
              />
            </div>

            {/* فعال */}
            <label className={styles.switchRow}>
              <input
                type="checkbox"
                name="is_active"
                checked={Boolean(formData.is_active)}
                onChange={handleChange}
              />

              <span>بانک فعال باشد</span>
            </label>

            {/* توضیحات */}
            <div
              className={`${styles.formField} ${styles.fullWidth}`}
            >
              <label>توضیحات</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          {errors.submit && (
            <div className={styles.formError}>
              {errors.submit}
            </div>
          )}

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
                  : "ذخیره بانک"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBankForm;
