import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./YearEndOperations.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/?type=EQUITY&is_postable=true`;
const PROFIT_LOSS_API = `${ACCOUNTING_BASE}/reports/profit-loss/`;

export default function YearEndOperations() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [fiscalYears, setFiscalYears] = useState([]);
    const [equityAccounts, setEquityAccounts] = useState([]);

    const [sourceYear, setSourceYear] = useState("");
    const [targetYear, setTargetYear] = useState("");
    const [retainedEarningsAccount, setRetainedEarningsAccount] = useState("");

    const [profitLoss, setProfitLoss] = useState({
        total_income: 0,
        total_expense: 0,
        net_profit: 0,
        is_profit: true,
    });

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (sourceYear) {
            fetchProfitLoss(sourceYear);
        }
    }, [sourceYear]);

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

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [fyRes, accRes] = await Promise.all([
                authFetch(FISCAL_YEARS_API),
                authFetch(ACCOUNTS_API),
            ]);

            const [fyData, accData] = await Promise.all([
                safeJson(fyRes),
                safeJson(accRes),
            ]);

            const fyList = normalizeResponse(fyData);
            const accList = normalizeResponse(accData);

            setFiscalYears(fyList);
            setEquityAccounts(accList);

            const currentYear = fyList.find(
                (item) => String(item.id) === String(sourceYear)
            );
            const preferredYear =
                currentYear || fyList.find((item) => !item.is_closed) || fyList[0];

            if (preferredYear) {
                setSourceYear(preferredYear.id);
                await fetchProfitLoss(preferredYear.id);
            }

            if (accList.length > 0) {
                const retained = accList.find((item) =>
                    String(item.name || "").includes("سود")
                );

                setRetainedEarningsAccount(retained?.id || accList[0].id);
            }
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات عملیات پایان سال");
        } finally {
            setLoading(false);
        }
    };

    const fetchProfitLoss = async (yearId = sourceYear) => {
        if (!yearId) return;

        try {
            const res = await authFetch(`${PROFIT_LOSS_API}?fiscal_year=${yearId}`);
            const data = await safeJson(res);

            setProfitLoss(
                data.summary || {
                    total_income: 0,
                    total_expense: 0,
                    net_profit: 0,
                    is_profit: true,
                }
            );
        } catch (err) {
            console.error(err);
        }
    };

    const selectedSourceYear = useMemo(() => {
        return fiscalYears.find((item) => String(item.id) === String(sourceYear));
    }, [fiscalYears, sourceYear]);

    const selectedTargetYear = useMemo(() => {
        return fiscalYears.find((item) => String(item.id) === String(targetYear));
    }, [fiscalYears, targetYear]);

    const targetOptions = useMemo(() => {
        if (!selectedSourceYear) return [];

        return fiscalYears.filter(
            (item) =>
                String(item.id) !== String(sourceYear) &&
                !item.is_closed &&
                item.start_date > selectedSourceYear.end_date
        );
    }, [fiscalYears, sourceYear, selectedSourceYear]);

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString("fa-IR");
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const closeTemporaryAccounts = async () => {
        if (guardWrite()) return;

        if (!sourceYear) {
            alert("سال مالی مبدا را انتخاب کن");
            return;
        }

        if (!retainedEarningsAccount) {
            alert("حساب سود و زیان انباشته را انتخاب کن");
            return;
        }

        const ok = window.confirm(
            "حساب‌های درآمد و هزینه بسته شوند و سند بستن حساب‌های موقت ساخته شود؟"
        );

        if (!ok) return;

        try {
            setActionLoading("temporary");

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${sourceYear}/v2/fiscal-years/close-temporary/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    retained_earnings_account: Number(retainedEarningsAccount),
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.error || "بستن حساب‌های موقت انجام نشد");
                return;
            }

            alert(`سند بستن حساب‌های موقت ساخته شد. شماره سند: ${data.document_number}`);
            window.location.href = `/accounting/documents/${data.document_id}`;
        } catch (err) {
            console.error(err);
            alert("خطا در بستن حساب‌های موقت");
        } finally {
            setActionLoading("");
        }
    };

    const createClosingDocument = async () => {
        if (guardWrite()) return;

        if (!sourceYear) {
            alert("سال مالی مبدا را انتخاب کن");
            return;
        }

        const ok = window.confirm("سند اختتامیه برای بستن حساب‌های دائمی ساخته شود؟");
        if (!ok) return;

        try {
            setActionLoading("closingDocument");

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${sourceYear}/v2/fiscal-years/closing-document/`, {
                method: "POST",
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.error || "ساخت سند اختتامیه انجام نشد");
                return;
            }

            alert(`سند اختتامیه ساخته شد. شماره سند: ${data.document_number}`);
            window.location.href = `/accounting/documents/${data.document_id}`;
        } catch (err) {
            console.error(err);
            alert("خطا در ساخت سند اختتامیه");
        } finally {
            setActionLoading("");
        }
    };

    const closeFiscalYear = async () => {
        if (guardWrite()) return;

        if (!sourceYear) {
            alert("سال مالی مبدا را انتخاب کن");
            return;
        }

        const ok = window.confirm(
            "سال مالی بسته شود؟ بعد از بستن، ثبت و ویرایش سند در این سال ممنوع می‌شود."
        );

        if (!ok) return;

        try {
            setActionLoading("closeYear");

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${sourceYear}/v2/fiscal-years/close/`, {
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

            await fetchInitialData();
            alert("سال مالی با موفقیت بسته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در بستن سال مالی");
        } finally {
            setActionLoading("");
        }
    };

    const transferOpening = async () => {
        if (guardWrite()) return;

        if (!sourceYear) {
            alert("سال مالی مبدا را انتخاب کن");
            return;
        }

        if (!targetYear) {
            alert("سال مالی مقصد را انتخاب کن");
            return;
        }

        const ok = window.confirm(
            `مانده سال ${selectedSourceYear?.name || ""} به تراز افتتاحیه سال ${selectedTargetYear?.name || ""
            } منتقل شود؟`
        );

        if (!ok) return;

        try {
            setActionLoading("transfer");

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${sourceYear}/v2/fiscal-years/transfer-opening/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    target_fiscal_year: Number(targetYear),
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.error || "انتقال مانده انجام نشد");
                return;
            }

            alert("مانده با موفقیت به تراز افتتاحیه سال مقصد منتقل شد");
            window.location.href = "/accounting/opening-balance";
        } catch (err) {
            console.error(err);
            alert("خطا در انتقال مانده");
        } finally {
            setActionLoading("");
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingBox}>در حال دریافت اطلاعات پایان سال...</div>
            </div>
        );
    }

    const isSourceClosed = !!selectedSourceYear?.is_closed;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>عملیات پایان سال مالی</h3>
                    <p>
                        بستن حساب‌های موقت، ساخت سند اختتامیه، بستن سال مالی و انتقال مانده به افتتاحیه سال بعد.
                    </p>
                </div>

                <button type="button" className={styles.refreshBtn} onClick={fetchInitialData}>
                    بروزرسانی
                </button>
            </div>

            <div className={styles.setupCard}>
                <div className={styles.formGrid}>
                    <label>
                        سال مالی مبدا
                        <select value={sourceYear} onChange={(e) => setSourceYear(e.target.value)}>
                            <option value="">انتخاب سال مالی</option>

                            {fiscalYears.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} {item.is_closed ? "(بسته شده)" : "(باز)"}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        سال مالی مقصد برای افتتاحیه
                        <select value={targetYear} onChange={(e) => setTargetYear(e.target.value)}>
                            <option value="">انتخاب سال مقصد</option>

                            {targetOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        حساب سود و زیان انباشته
                        <select
                            value={retainedEarningsAccount}
                            onChange={(e) => setRetainedEarningsAccount(e.target.value)}
                        >
                            <option value="">انتخاب حساب</option>

                            {equityAccounts.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.code} - {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <span>درآمد دوره</span>
                    <strong className={styles.greenText}>
                        {formatMoney(profitLoss.total_income)}
                    </strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>هزینه دوره</span>
                    <strong className={styles.redText}>
                        {formatMoney(profitLoss.total_expense)}
                    </strong>
                </div>

                <div
                    className={`${styles.summaryCard} ${profitLoss.is_profit ? styles.profitCard : styles.lossCard
                        }`}
                >
                    <span>{profitLoss.is_profit ? "سود خالص" : "زیان خالص"}</span>
                    <strong>
                        {formatMoney(Math.abs(Number(profitLoss.net_profit || 0)))}
                    </strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>وضعیت سال مالی</span>
                    <strong className={isSourceClosed ? styles.redText : styles.greenText}>
                        {isSourceClosed ? "بسته شده" : "باز"}
                    </strong>
                </div>
            </div>

            <div className={styles.stepsGrid}>
                <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>۱</div>
                    <h4>بستن حساب‌های موقت</h4>
                    <p>
                        حساب‌های درآمد و هزینه بسته می‌شوند و سود/زیان به حساب سود و زیان انباشته منتقل می‌شود.
                    </p>

                    <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={closeTemporaryAccounts}
                        disabled={actionLoading === "temporary" || isSourceClosed || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {actionLoading === "temporary" ? "در حال انجام..." : "بستن حساب‌های موقت"}
                    </button>
                </div>

                <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>۲</div>
                    <h4>ساخت سند اختتامیه</h4>
                    <p>
                        مانده حساب‌های دائمی مثل دارایی، بدهی و سرمایه بسته می‌شود و سند اختتامیه ساخته می‌شود.
                    </p>

                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={createClosingDocument}
                        disabled={actionLoading === "closingDocument" || isSourceClosed || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {actionLoading === "closingDocument" ? "در حال ساخت..." : "ساخت سند اختتامیه"}
                    </button>
                </div>

                <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>۳</div>
                    <h4>بستن نهایی سال مالی</h4>
                    <p>
                        بعد از ساخت سندهای پایان سال، سال مالی بسته می‌شود و ثبت سند جدید ممنوع می‌شود.
                    </p>

                    <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={closeFiscalYear}
                        disabled={actionLoading === "closeYear" || isSourceClosed || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {actionLoading === "closeYear" ? "در حال بستن..." : "بستن سال مالی"}
                    </button>
                </div>

                <div className={styles.stepCard}>
                    <div className={styles.stepNumber}>۴</div>
                    <h4>انتقال مانده به سال بعد</h4>
                    <p>
                        مانده حساب‌های دائمی به تراز افتتاحیه سال مقصد منتقل می‌شود تا افتتاحیه سال بعد آماده شود.
                    </p>

                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={transferOpening}
                        disabled={actionLoading === "transfer" || !isSourceClosed || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {actionLoading === "transfer" ? "در حال انتقال..." : "انتقال افتتاحیه"}
                    </button>
                </div>
            </div>

            <div className={styles.noticeBox}>
                <strong>ترتیب پیشنهادی:</strong>
                <span>
                    اول بستن حساب‌های موقت، بعد ساخت سند اختتامیه، سپس بستن سال مالی و در پایان انتقال مانده به افتتاحیه سال بعد.
                </span>
            </div>
        </div>
    );
}