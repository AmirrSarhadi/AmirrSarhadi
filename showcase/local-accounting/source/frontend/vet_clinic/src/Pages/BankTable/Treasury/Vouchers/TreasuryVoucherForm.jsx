import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "./TreasuryVoucherForm.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const CREATE_API = `${API_BASE_URL}/banking/api/v2/treasury-vouchers/`;
const DETAIL_API = (id) =>
    `${API_BASE_URL}/banking/api/${id}/v2/treasury-vouchers/`;

const BANKS_API = `${API_BASE_URL}/banking/api/v2/bank_list/`;
const CASHBOX_API = `${API_BASE_URL}/banking/api/v2/cashbox_list/`;
const IMPREST_API = `${API_BASE_URL}/banking/api/v2/imprest_list/`;

const DETAILS_API = `${API_BASE_URL}/accounting/api/v2/details/`;

export default function TreasuryVoucherForm() {
    const { canWrite, disabledReason } = useModulePermission("banking");
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [banks, setBanks] = useState([]);
    const [cashboxes, setCashboxes] = useState([]);
    const [imprests, setImprests] = useState([]);
    const [details, setDetails] = useState([]);

    const [voucherStatus, setVoucherStatus] = useState("DRAFT");

    const [form, setForm] = useState({
        voucher_type: "RECEIPT",
        treasury_type: "BANK",
        treasury_id: "",
        detail_account: "",
        amount: "",
        date: "",
        reference: "",
        description: "",
    });

    useEffect(() => {
        fetchInitials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const normalizeResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    };

    const fetchInitials = async () => {
        try {
            setLoading(true);

            const [banksRes, cashRes, imprestRes, detailRes] = await Promise.all([
                axios.get(BANKS_API),
                axios.get(CASHBOX_API),
                axios.get(IMPREST_API),
                axios.get(DETAILS_API),
            ]);

            setBanks(normalizeResponse(banksRes.data));
            setCashboxes(normalizeResponse(cashRes.data));
            setImprests(normalizeResponse(imprestRes.data));
            setDetails(normalizeResponse(detailRes.data));

            if (isEditMode) {
                await fetchVoucher();
            }
        } catch (err) {
            console.error(err);
            toast.error("خطا در دریافت اطلاعات فرم");
        } finally {
            setLoading(false);
        }
    };

    const inferTreasuryType = (data) => {
        if (data.treasury_type) return data.treasury_type;

        const typeText = String(
            data.treasury_account_type ||
            data.treasury_content_type ||
            data.treasury_account_content_type_name ||
            ""
        ).toLowerCase();

        if (typeText.includes("cashbox")) return "CASHBOX";
        if (typeText.includes("imprest")) return "IMPREST";
        return "BANK";
    };

    const fetchVoucher = async () => {
        const res = await axios.get(DETAIL_API(id));
        const data = res.data;

        if (data.status && data.status !== "DRAFT") {
            toast.error("فقط اسناد پیش‌نویس قابل ویرایش هستند");
            window.location.href = `/treasury/vouchers/${id}`;
            return;
        }

        const treasuryType = inferTreasuryType(data);

        setVoucherStatus(data.status || "DRAFT");

        setForm({
            voucher_type: data.voucher_type || "RECEIPT",
            treasury_type: treasuryType,
            treasury_id:
                data.treasury_id ||
                data.treasury_account_object_id ||
                data.treasury_account_id ||
                "",
            detail_account: data.detail_account || "",
            amount: data.amount || "",
            date: data.date || "",
            reference: data.reference || "",
            description: data.description || "",
        });
    };

    const treasuryOptions = useMemo(() => {
        if (form.treasury_type === "BANK") return banks;
        if (form.treasury_type === "CASHBOX") return cashboxes;
        if (form.treasury_type === "IMPREST") return imprests;
        return [];
    }, [form.treasury_type, banks, cashboxes, imprests]);

    const updateForm = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const validate = () => {
        if (!form.treasury_id) {
            toast.error("حساب خزانه را انتخاب کن");
            return false;
        }

        if (!form.detail_account) {
            toast.error("تفضیل را انتخاب کن");
            return false;
        }

        if (!form.amount || Number(form.amount) <= 0) {
            toast.error("مبلغ نامعتبر است");
            return false;
        }

        if (!form.date) {
            toast.error("تاریخ الزامی است");
            return false;
        }

        return true;
    };

    const treasuryTypeMap = {
        BANK: 36,
        CASHBOX: 37,
        IMPREST: 38,
    };

    const buildPayload = () => ({
        voucher_type: form.voucher_type,

        treasury_account_content_type:
            treasuryTypeMap[form.treasury_type],

        treasury_account_object_id:
            Number(form.treasury_id),

        detail_account:
            Number(form.detail_account),

        amount:
            Number(form.amount),

        date:
            form.date,

        description:
            form.description || "",
    });

    const submit = async () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!validate()) return;

        try {
            setSaving(true);

            const response = isEditMode
                ? await axios.put(DETAIL_API(id), buildPayload())
                : await axios.post(CREATE_API, buildPayload());

            toast.success(
                isEditMode
                    ? "سند خزانه با موفقیت ویرایش شد"
                    : "سند خزانه ثبت شد"
            );

            window.location.href = `/treasury/vouchers/${response.data.id}`;
        } catch (err) {
            console.error(err);
            console.log(err.response.data)
            toast.error(
                err.response?.data?.error ||
                err.response?.data?.detail ||
                "ذخیره سند خزانه انجام نشد"
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingBox}>
                    در حال دریافت اطلاعات...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>
                        {isEditMode
                            ? "ویرایش سند خزانه"
                            : "ایجاد سند خزانه"}
                    </h2>

                    <p>
                        ثبت دریافت و پرداخت خزانه همراه با سند حسابداری اتوماتیک
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() =>
                        window.location.href = isEditMode
                            ? `/treasury/vouchers/${id}`
                            : "/treasury/vouchers"
                    }
                >
                    بازگشت
                </button>
            </div>

            <div className={styles.formCard}>
                <div className={styles.sectionTitle}>
                    <h3>اطلاعات سند خزانه</h3>
                    <span>{voucherStatus === "DRAFT" ? "پیش نویس" : voucherStatus}</span>
                </div>

                <div className={styles.headerForm}>
                    <div className={styles.typeSelector}>
                        <button
                            type="button"
                            className={`${styles.typeBtn} ${form.voucher_type === "RECEIPT"
                                ? styles.activeType
                                : ""
                                }`}
                            onClick={() => updateForm("voucher_type", "RECEIPT")}
                        >
                            دریافت
                        </button>

                        <button
                            type="button"
                            className={`${styles.typeBtn} ${form.voucher_type === "PAYMENT"
                                ? styles.activeType
                                : ""
                                }`}
                            onClick={() => updateForm("voucher_type", "PAYMENT")}
                        >
                            پرداخت
                        </button>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>نوع خزانه</label>

                            <select
                                value={form.treasury_type}
                                onChange={(e) => {
                                    updateForm("treasury_type", e.target.value);
                                    updateForm("treasury_id", "");
                                }}
                            >
                                <option value="BANK">بانک</option>
                                <option value="CASHBOX">صندوق</option>
                                <option value="IMPREST">تنخواه</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>حساب خزانه</label>

                            <select
                                value={form.treasury_id}
                                onChange={(e) =>
                                    updateForm("treasury_id", e.target.value)
                                }
                            >
                                <option value="">انتخاب حساب</option>

                                {treasuryOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label>تفضیل</label>

                            <select
                                value={form.detail_account}
                                onChange={(e) =>
                                    updateForm("detail_account", e.target.value)
                                }
                            >
                                <option value="">انتخاب تفضیل</option>

                                {details.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.code} - {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label>مبلغ</label>

                            <input
                                type="number"
                                value={form.amount}
                                onChange={(e) =>
                                    updateForm("amount", e.target.value)
                                }
                                placeholder="0"
                            />
                        </div>

                        <div className={styles.field}>
                            <label>تاریخ</label>

                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) =>
                                    updateForm("date", e.target.value)
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label>ارجاع</label>

                            <input
                                value={form.reference}
                                onChange={(e) =>
                                    updateForm("reference", e.target.value)
                                }
                                placeholder="REF-1001"
                            />
                        </div>
                    </div>

                    <div className={`${styles.field} ${styles.grow}`}>
                        <label>شرح سند</label>

                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                updateForm("description", e.target.value)
                            }
                            placeholder="توضیحات سند خزانه..."
                        />
                    </div>
                </div>
            </div>

            <div className={styles.summaryCard}>
                <div className={styles.sectionTitle}>
                    <h3>خلاصه عملیات</h3>
                </div>

                <div className={styles.totals}>
                    <div
                        className={
                            form.voucher_type === "RECEIPT"
                                ? styles.greenCard
                                : styles.redCard
                        }
                    >
                        <span>نوع عملیات</span>
                        <b>
                            {form.voucher_type === "RECEIPT"
                                ? "دریافت"
                                : "پرداخت"}
                        </b>
                    </div>

                    <div className={styles.blueCard}>
                        <span>مبلغ سند</span>
                        <b>{Number(form.amount || 0).toLocaleString("fa-IR")}</b>
                    </div>

                    <div>
                        <span>نوع خزانه</span>
                        <b>
                            {form.treasury_type === "BANK"
                                ? "بانک"
                                : form.treasury_type === "CASHBOX"
                                    ? "صندوق"
                                    : "تنخواه"}
                        </b>
                    </div>

                    <div>
                        <span>وضعیت</span>
                        <b>{voucherStatus === "DRAFT" ? "پیش نویس" : voucherStatus}</b>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() =>
                            window.location.href = isEditMode
                                ? `/treasury/vouchers/${id}`
                                : "/treasury/vouchers"
                        }
                    >
                        انصراف
                    </button>

                    <button
                        type="button"
                        className={styles.primary}
                        onClick={submit}
                        disabled={saving || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {saving
                            ? "در حال ذخیره..."
                            : isEditMode
                                ? "ذخیره تغییرات"
                                : "ثبت سند خزانه"}
                    </button>
                </div>
            </div>
        </div>
    );
}