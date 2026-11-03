import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./FiscalYearList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

const emptyForm = {
    name: "",
    start_date: "",
    end_date: "",
};

export default function FiscalYearList() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [fiscalYears, setFiscalYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [sourceYear, setSourceYear] = useState(null);
    const [targetFiscalYear, setTargetFiscalYear] = useState("");

    useEffect(() => {
        fetchFiscalYears();
    }, []);

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            console.error("Response is not JSON:", text);
            throw new Error(`Invalid JSON response: ${res.url}`);
        }
    };

    const normalizeResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    };

    const fetchFiscalYears = async () => {
        try {
            setLoading(true);

            const res = await authFetch(FISCAL_YEARS_API);
            const data = await safeJson(res);

            setFiscalYears(normalizeResponse(data));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت سال‌های مالی");
        } finally {
            setLoading(false);
        }
    };

    const updateForm = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const createFiscalYear = async () => {
        if (guardWrite()) return;

        if (!form.name.trim()) {
            alert("نام سال مالی الزامی است");
            return;
        }

        if (!form.start_date || !form.end_date) {
            alert("تاریخ شروع و پایان الزامی است");
            return;
        }

        try {
            setActionLoadingId("create");

            const res = await authFetch(FISCAL_YEARS_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: form.name.trim(),
                    start_date: form.start_date,
                    end_date: form.end_date,
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("ساخت سال مالی انجام نشد");
                return;
            }

            setModalOpen(false);
            setForm(emptyForm);
            await fetchFiscalYears();
            alert("سال مالی با موفقیت ساخته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در ساخت سال مالی");
        } finally {
            setActionLoadingId(null);
        }
    };

    const closeFiscalYear = async (year) => {
        if (guardWrite()) return;

        const ok = window.confirm(
            `سال مالی "${year.name}" بسته شود؟ بعد از بستن، ثبت و ویرایش سند در این سال ممنوع می‌شود.`
        );

        if (!ok) return;

        try {
            setActionLoadingId(year.id);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${year.id}/v2/fiscal-years/close/`, {
                method: "POST",
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);

                if (data?.documents?.length) {
                    alert(`امکان بستن وجود ندارد. اسناد مشکل‌دار: ${data.documents.join(", ")}`);
                } else {
                    alert(data?.error || "بستن سال مالی انجام نشد");
                }

                return;
            }

            await fetchFiscalYears();
            alert("سال مالی با موفقیت بسته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در بستن سال مالی");
        } finally {
            setActionLoadingId(null);
        }
    };

    const openTransferModal = (year) => {
        if (guardWrite()) return;

        setSourceYear(year);
        setTargetFiscalYear("");
        setTransferModalOpen(true);
    };

    const transferOpening = async () => {
        if (guardWrite()) return;

        if (!sourceYear) return;

        if (!targetFiscalYear) {
            alert("سال مالی مقصد را انتخاب کن");
            return;
        }

        const ok = window.confirm(
            `مانده سال مالی "${sourceYear.name}" به تراز افتتاحیه سال مقصد منتقل شود؟`
        );

        if (!ok) return;

        try {
            setActionLoadingId(`transfer-${sourceYear.id}`);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${sourceYear.id}/v2/fiscal-years/transfer-opening/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    target_fiscal_year: Number(targetFiscalYear),
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.error || "انتقال مانده انجام نشد");
                return;
            }

            setTransferModalOpen(false);
            setSourceYear(null);
            setTargetFiscalYear("");
            alert("مانده با موفقیت به تراز افتتاحیه سال مقصد منتقل شد");
        } catch (err) {
            console.error(err);
            alert("خطا در انتقال مانده");
        } finally {
            setActionLoadingId(null);
        }
    };

    const availableTargets = useMemo(() => {
        if (!sourceYear) return [];

        return fiscalYears.filter(
            (year) => Number(year.id) !== Number(sourceYear.id) && !year.is_closed
        );
    }, [fiscalYears, sourceYear]);

    const formatDate = (value) => {
        return value || "-";
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>مدیریت سال مالی</h3>
                    <p>سال‌های مالی را بساز، ببند و مانده پایان سال را به افتتاحیه سال بعد منتقل کن.</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => {
                        if (guardWrite()) return;
                        setForm(emptyForm);
                        setModalOpen(true);
                    }}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    ایجاد سال مالی
                </button>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>نام سال مالی</th>
                                <th>تاریخ شروع</th>
                                <th>تاریخ پایان</th>
                                <th>وضعیت</th>
                                <th>تاریخ بستن</th>
                                <th>بسته شده توسط</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {fiscalYears.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.emptyState}>
                                        <strong>سال مالی وجود ندارد</strong>
                                        <p>اولین سال مالی را ایجاد کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                fiscalYears.map((year, index) => (
                                    <tr key={year.id}>
                                        <td>{index + 1}</td>

                                        <td className={styles.nameCell}>{year.name}</td>

                                        <td>{formatDate(year.start_date)}</td>
                                        <td>{formatDate(year.end_date)}</td>

                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${year.is_closed ? styles.closedBadge : styles.openBadge
                                                    }`}
                                            >
                                                {year.is_closed ? "بسته شده" : "باز"}
                                            </span>
                                        </td>

                                        <td>{year.closed_at || "-"}</td>
                                        <td>{year.closed_by || "-"}</td>

                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    type="button"
                                                    className={styles.btnClose}
                                                    disabled={actionLoadingId === year.id || !canWrite || year.is_closed}
                                                    title={!canWrite ? disabledReason : year.is_closed ? "سال مالی قبلاً بسته شده است" : undefined}
                                                    onClick={() => closeFiscalYear(year)}
                                                >
                                                    بستن سال
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.btnTransfer}
                                                    disabled={actionLoadingId === `transfer-${year.id}` || !canWrite || !year.is_closed}
                                                    title={!canWrite ? disabledReason : !year.is_closed ? "ابتدا باید سال مالی بسته شود" : undefined}
                                                    onClick={() => openTransferModal(year)}
                                                >
                                                    انتقال مانده
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.btnOpening}
                                                    onClick={() => {
                                                        if (guardWrite()) return;
                                                        window.location.href = "/accounting/opening-balance";
                                                    }}
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    تراز افتتاحیه
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

            {modalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>ایجاد سال مالی جدید</h3>

                        <div className={styles.formGrid}>
                            <label>
                                نام سال مالی
                                <input
                                    value={form.name}
                                    onChange={(e) => updateForm("name", e.target.value)}
                                    placeholder="مثلاً 1406"
                                />
                            </label>

                            <label>
                                تاریخ شروع
                                <input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => updateForm("start_date", e.target.value)}
                                />
                            </label>

                            <label>
                                تاریخ پایان
                                <input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => updateForm("end_date", e.target.value)}
                                />
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setModalOpen(false)}
                                disabled={actionLoadingId === "create"}
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                className={styles.confirmBtn}
                                onClick={createFiscalYear}
                                disabled={actionLoadingId === "create" || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {actionLoadingId === "create" ? "در حال ساخت..." : "ساخت سال مالی"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {transferModalOpen && sourceYear && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>انتقال مانده سال مالی</h3>

                        <p className={styles.modalText}>
                            مانده سال مالی <strong>{sourceYear.name}</strong> به تراز افتتاحیه سال مقصد منتقل می‌شود.
                        </p>

                        <div className={styles.formGrid}>
                            <label>
                                سال مالی مقصد
                                <select
                                    value={targetFiscalYear}
                                    onChange={(e) => setTargetFiscalYear(e.target.value)}
                                >
                                    <option value="">انتخاب سال مقصد</option>
                                    {availableTargets.map((year) => (
                                        <option key={year.id} value={year.id}>
                                            {year.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setTransferModalOpen(false)}
                                disabled={actionLoadingId === `transfer-${sourceYear.id}`}
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                className={styles.confirmBtn}
                                onClick={transferOpening}
                                disabled={actionLoadingId === `transfer-${sourceYear.id}` || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {actionLoadingId === `transfer-${sourceYear.id}`
                                    ? "در حال انتقال..."
                                    : "انتقال مانده"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}