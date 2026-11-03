import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useState } from "react";
import styles from "./PeriodLocks.module.css";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import DateObject from "react-date-object";
import useModulePermission from "../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const formatDateForApi = (dateObject) => {
    if (!dateObject) return "";

    return dateObject
        .toDate()
        .toLocaleDateString("en-CA");
};

const formatJalali = (date) => {
    if (!date) return "-";

    return new DateObject(date)
        .convert(persian, persian_fa)
        .format("YYYY/MM/DD");
};

export default function PeriodLocks() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [locks, setLocks] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [form, setForm] = useState({
        fiscal_year: "",
        title: "",
        start_date: null,
        end_date: null,
        reason: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            console.error("Response is not JSON:", text);
            throw new Error("Invalid JSON response");
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const [locksRes, yearsRes] = await Promise.all([
                authFetch(`${ACCOUNTING_BASE}/period-locks/`),
                authFetch(`${ACCOUNTING_BASE}/fiscal-years/`),
            ]);

            const locksData = await safeJson(locksRes);
            const yearsData = await safeJson(yearsRes);

            setLocks(Array.isArray(locksData) ? locksData : locksData.results || []);
            setFiscalYears(Array.isArray(yearsData) ? yearsData : yearsData.results || []);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات قفل دوره");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (guardWrite()) return;

        if (!form.fiscal_year || !form.title || !form.start_date || !form.end_date) {
            alert("سال مالی، عنوان، تاریخ شروع و تاریخ پایان الزامی هستند");
            return;
        }

        try {
            setSubmitLoading(true);

            const res = await authFetch(`${ACCOUNTING_BASE}/period-locks/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    start_date: formatDateForApi(form.start_date),
                    end_date: formatDateForApi(form.end_date),
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.detail || data?.error || "ثبت قفل دوره انجام نشد");
                return;
            }

            alert("قفل دوره مالی با موفقیت ثبت شد");

            setForm({
                fiscal_year: "",
                title: "",
                start_date: "",
                end_date: "",
                reason: "",
            });

            fetchData();
        } catch (err) {
            console.error(err);
            alert("خطا در ثبت قفل دوره");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUnlock = async (lockId) => {
        if (guardWrite()) return;

        const ok = window.confirm("آیا از باز کردن این دوره مالی اطمینان دارید؟");
        if (!ok) return;

        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${lockId}/v2/period-locks/unlock/`, {
                method: "POST",
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.detail || data?.error || "باز کردن دوره انجام نشد");
                return;
            }

            alert("دوره مالی با موفقیت باز شد");
            fetchData();
        } catch (err) {
            console.error(err);
            alert("خطا در باز کردن دوره مالی");
        }
    };

    const handleDelete = async (lockId) => {
        if (guardWrite()) return;

        const ok = window.confirm("آیا از حذف این قفل دوره اطمینان دارید؟");
        if (!ok) return;

        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${lockId}/v2/period-locks/`, {
                method: "DELETE",
            });

            if (!res.ok && res.status !== 204) {
                const data = await safeJson(res).catch(() => null);
                console.error(data);
                alert(data?.detail || data?.error || "حذف قفل دوره انجام نشد");
                return;
            }

            alert("قفل دوره حذف شد");
            fetchData();
        } catch (err) {
            console.error(err);
            alert("خطا در حذف قفل دوره");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>قفل دوره‌های مالی</h3>
                    <p>
                        برای جلوگیری از ثبت، ویرایش، حذف، تایید یا معکوس‌سازی اسناد در بازه‌های بسته.
                    </p>
                </div>
            </div>

            <form className={styles.formCard} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    <label>
                        سال مالی
                        <select
                            name="fiscal_year"
                            value={form.fiscal_year}
                            onChange={handleChange}
                        >
                            <option value="">انتخاب سال مالی</option>
                            {fiscalYears.map((year) => (
                                <option key={year.id} value={year.id}>
                                    {year.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        عنوان
                        <input
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="مثلا قفل اسفند ۱۴۰۴"
                        />
                    </label>

                    <label>
                        تاریخ شروع

                        <DatePicker
                            value={form.start_date}
                            onChange={(date) =>
                                setForm((prev) => ({
                                    ...prev,
                                    start_date: date,
                                }))
                            }
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass={styles.dateInput}
                        />
                    </label>

                    <label>
                        تاریخ پایان

                        <DatePicker
                            value={form.end_date}
                            onChange={(date) =>
                                setForm((prev) => ({
                                    ...prev,
                                    end_date: date,
                                }))
                            }
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass={styles.dateInput}
                        />
                    </label>
                </div>

                <label className={styles.descriptionLabel}>
                    دلیل قفل
                    <textarea
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                        placeholder="توضیح اختیاری درباره علت قفل دوره"
                    />
                </label>

                <div className={styles.formActions}>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={submitLoading || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {submitLoading ? "در حال ثبت..." : "ثبت قفل دوره"}
                    </button>
                </div>
            </form>

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <div>
                        <h4>لیست قفل‌های دوره</h4>
                        <p>تمام بازه‌های قفل‌شده یا بازشده حسابداری.</p>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingBox}>در حال دریافت اطلاعات...</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>عنوان</th>
                                    <th>سال مالی</th>
                                    <th>از تاریخ</th>
                                    <th>تا تاریخ</th>
                                    <th>وضعیت</th>
                                    <th>دلیل</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {locks.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>
                                            <strong>قفل دوره‌ای ثبت نشده است</strong>
                                        </td>
                                    </tr>
                                ) : (
                                    locks.map((item) => (
                                        <tr key={item.id}>
                                            <td className={styles.titleCell}>{item.title}</td>
                                            <td>{item.fiscal_year_name || item.fiscal_year}</td>
                                            <td>{formatJalali(item.start_date)}</td>
                                            <td>{formatJalali(item.end_date)}</td>
                                            <td>
                                                <span
                                                    className={`${styles.statusBadge} ${item.is_active
                                                        ? styles.activeBadge
                                                        : styles.inactiveBadge
                                                        }`}
                                                >
                                                    {item.is_active ? "فعال" : "باز شده"}
                                                </span>
                                            </td>
                                            <td className={styles.reasonCell}>{item.reason || "-"}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.unlockBtn}
                                                        onClick={() => handleUnlock(item.id)}
                                                        disabled={!canWrite || !item.is_active}
                                                        title={!canWrite ? disabledReason : !item.is_active ? "این دوره قبلاً باز شده است" : undefined}
                                                    >
                                                        باز کردن
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : undefined}
                                                    >
                                                        حذف
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}