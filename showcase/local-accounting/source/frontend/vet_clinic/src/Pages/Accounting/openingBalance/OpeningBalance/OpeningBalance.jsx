import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./OpeningBalance.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/?is_postable=true`;
const OPENING_GET_OR_CREATE_API = `${ACCOUNTING_BASE}/opening-balance/get-or-create/`;

const ACCOUNT_GROUPS = {
    ASSET: {
        title: "دارایی‌ها",
        colorClass: "asset",
    },
    LIABILITY: {
        title: "بدهی‌ها",
        colorClass: "liability",
    },
    EQUITY: {
        title: "حقوق صاحبان سهام",
        colorClass: "equity",
    },
};

export default function OpeningBalance() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [fiscalYears, setFiscalYears] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [selectedFiscalYear, setSelectedFiscalYear] = useState("");
    const [openingBalance, setOpeningBalance] = useState(null);
    const [, setSummary] = useState(null);

    const [items, setItems] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);

    const [loading, setLoading] = useState(true);
    const [savingItems, setSavingItems] = useState(false);
    const [finalizing, setFinalizing] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedFiscalYear) {
            getOrCreateOpeningBalance(selectedFiscalYear);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFiscalYear]);

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
            setAccounts(
                accList.filter((account) =>
                    ["ASSET", "LIABILITY", "EQUITY"].includes(account.type)
                )
            );

            if (fyList.length > 0) {
                setSelectedFiscalYear(fyList[0].id);
            }
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات تراز افتتاحیه");
        } finally {
            setLoading(false);
        }
    };

    const getOrCreateOpeningBalance = async (fiscalYearId) => {
        try {
            setLoading(true);

            const res = await authFetch(OPENING_GET_OR_CREATE_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    fiscal_year: fiscalYearId,
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("خطا در ساخت یا دریافت تراز افتتاحیه");
                return;
            }

            setOpeningBalance(data);
            setItems(data.items || []);

            await fetchSummary(data.id);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت تراز افتتاحیه");
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async (openingBalanceId) => {
        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${openingBalanceId}/v2/opening-balance/summary/`);
            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                return;
            }

            setSummary(data);
        } catch (err) {
            console.error(err);
        }
    };

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const cleanMoney = (value) => {
        return String(value)
            .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
            .replace(/,/g, "")
            .replace(/[^\d.]/g, "");
    };

    const toNumber = (value) => {
        return Number(cleanMoney(value || 0));
    };

    const groupedAccounts = useMemo(() => {
        return {
            ASSET: accounts.filter((account) => account.type === "ASSET"),
            LIABILITY: accounts.filter((account) => account.type === "LIABILITY"),
            EQUITY: accounts.filter((account) => account.type === "EQUITY"),
        };
    }, [accounts]);

    const getItemByAccount = (accountId) => {
        return items.find((item) => Number(item.account) === Number(accountId));
    };

    const getAccountAmount = (account) => {
        const item = getItemByAccount(account.id);
        if (!item) return 0;

        if (account.type === "ASSET") {
            return toNumber(item.debit) - toNumber(item.credit);
        }

        return toNumber(item.credit) - toNumber(item.debit);
    };

    const localTotals = useMemo(() => {
        let assets = 0;
        let liabilities = 0;
        let equity = 0;

        accounts.forEach((account) => {
            const amount = getAccountAmount(account);

            if (account.type === "ASSET") assets += amount;
            if (account.type === "LIABILITY") liabilities += amount;
            if (account.type === "EQUITY") equity += amount;
        });

        return {
            assets,
            liabilities,
            equity,
            rightSide: liabilities + equity,
            difference: assets - (liabilities + equity),
            isBalanced: Math.round((assets - (liabilities + equity)) * 100) / 100 === 0,
        };
    }, [accounts, items]);

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const openGroupModal = (groupType) => {
        if (guardWrite()) return;

        if (!openingBalance) {
            alert("ابتدا سال مالی را انتخاب کن");
            return;
        }

        setActiveGroup(groupType);
    };

    const closeModal = () => {
        setActiveGroup(null);
    };

    const setAccountValue = (account, rawValue) => {
        if (!canWrite) return;

        const value = cleanMoney(rawValue);

        setItems((prev) => {
            const exists = prev.some((item) => Number(item.account) === Number(account.id));

            const debit = account.type === "ASSET" ? value : "0";
            const credit = account.type === "ASSET" ? "0" : value;

            if (exists) {
                return prev.map((item) =>
                    Number(item.account) === Number(account.id)
                        ? {
                            ...item,
                            debit,
                            credit,
                        }
                        : item
                );
            }

            return [
                ...prev,
                {
                    account: account.id,
                    account_code: account.code,
                    account_name: account.name,
                    account_type: account.type,
                    account_type_display: account.type_display,
                    debit,
                    credit,
                    note: "مانده افتتاحیه",
                },
            ];
        });
    };

    const removeAccountValue = (account) => {
        if (guardWrite()) return;

        setItems((prev) =>
            prev.filter((item) => Number(item.account) !== Number(account.id))
        );
    };

    const saveItems = async () => {
        if (guardWrite()) return;

        if (!openingBalance) return;

        try {
            setSavingItems(true);

            const payloadItems = items
                .filter((item) => toNumber(item.debit) > 0 || toNumber(item.credit) > 0)
                .map((item) => ({
                    account: Number(item.account),
                    debit: String(toNumber(item.debit)),
                    credit: String(toNumber(item.credit)),
                    note: item.note || "مانده افتتاحیه",
                }));

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${openingBalance.id}/v2/opening-balance/items/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    items: payloadItems,
                }),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("ذخیره آیتم‌ها انجام نشد");
                return;
            }

            setOpeningBalance(data);
            setItems(data.items || []);
            await fetchSummary(data.id);

            alert("تراز افتتاحیه ذخیره شد");
        } catch (err) {
            console.error(err);
            alert("خطا در ذخیره تراز افتتاحیه");
        } finally {
            setSavingItems(false);
        }
    };

    const finalizeOpeningBalance = async () => {
        if (guardWrite()) return;

        if (!openingBalance) return;

        if (!localTotals.isBalanced) {
            alert("تراز افتتاحیه برابر نیست. دارایی‌ها باید برابر بدهی‌ها + حقوق صاحبان سهام باشد.");
            return;
        }

        const ok = window.confirm("بعد از نهایی‌سازی، سند افتتاحیه ساخته و قفل می‌شود. ادامه می‌دهی؟");
        if (!ok) return;

        try {
            setFinalizing(true);

            await saveItems();

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${openingBalance.id}/v2/opening-balance/finalize/`, {
                method: "POST",
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert(data?.error || "نهایی‌سازی انجام نشد");
                return;
            }

            setOpeningBalance(data);
            setItems(data.items || []);
            await fetchSummary(data.id);

            alert("سند افتتاحیه با موفقیت ساخته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در نهایی‌سازی تراز افتتاحیه");
        } finally {
            setFinalizing(false);
        }
    };

    const selectedGroupAccounts = activeGroup ? groupedAccounts[activeGroup] || [] : [];
    const selectedGroupInfo = activeGroup ? ACCOUNT_GROUPS[activeGroup] : null;

    const isLocked = openingBalance?.is_locked || openingBalance?.status === "POSTED";

    if (loading && !openingBalance) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingBox}>در حال دریافت تراز افتتاحیه...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.topBar}>
                <div>
                    <h3>تراز افتتاحیه</h3>
                    <p>مانده‌های اول دوره را وارد کن تا سند افتتاحیه ساخته شود.</p>
                </div>

                <div className={styles.topActions}>
                    <select
                        value={selectedFiscalYear}
                        onChange={(e) => setSelectedFiscalYear(e.target.value)}
                        disabled={savingItems || finalizing}
                    >
                        <option value="">انتخاب سال مالی</option>
                        {fiscalYears.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={saveItems}
                        disabled={savingItems || finalizing || isLocked || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {savingItems ? "در حال ذخیره..." : "ذخیره"}
                    </button>

                    <button
                        type="button"
                        className={styles.finalizeBtn}
                        onClick={finalizeOpeningBalance}
                        disabled={finalizing || savingItems || isLocked || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {finalizing ? "در حال نهایی‌سازی..." : "نهایی‌سازی"}
                    </button>
                </div>
            </div>

            {openingBalance && (
                <div className={styles.statusRow}>
                    <span>
                        وضعیت:
                        <strong className={isLocked ? styles.postedText : styles.draftText}>
                            {openingBalance.status === "POSTED" ? "ثبت شده" : "پیش‌نویس"}
                        </strong>
                    </span>

                    {openingBalance.document_number && (
                        <span>
                            سند افتتاحیه:
                            <strong
                                className={styles.documentLink}
                                onClick={() => {
                                    window.location.href = `/accounting/documents/${openingBalance.document}`;
                                }}
                            >
                                شماره {openingBalance.document_number}
                            </strong>
                        </span>
                    )}
                </div>
            )}

            <div className={styles.formulaRow}>
                <div className={`${styles.formulaCard} ${styles.equityCard}`}>
                    <span>حقوق صاحبان سهام</span>
                    <strong>{formatMoney(localTotals.equity)} ریال</strong>
                </div>

                <div className={styles.operator}>+</div>

                <div className={`${styles.formulaCard} ${styles.liabilityCard}`}>
                    <span>بدهی‌ها</span>
                    <strong>{formatMoney(localTotals.liabilities)} ریال</strong>
                </div>

                <div className={styles.operator}>=</div>

                <div className={`${styles.formulaCard} ${styles.assetCard}`}>
                    <span>دارایی‌ها</span>
                    <strong>{formatMoney(localTotals.assets)} ریال</strong>
                </div>
            </div>

            <div className={styles.balanceStatus}>
                <span>اختلاف:</span>
                <strong className={localTotals.isBalanced ? styles.balanced : styles.notBalanced}>
                    {formatMoney(Math.abs(localTotals.difference))} ریال
                </strong>

                <span className={localTotals.isBalanced ? styles.balancedLabel : styles.notBalancedLabel}>
                    {localTotals.isBalanced ? "تراز است" : "تراز نیست"}
                </span>
            </div>

            <div className={styles.groupGrid}>
                <GroupBox
                    type="LIABILITY"
                    title="بدهی‌ها"
                    total={localTotals.liabilities}
                    accounts={groupedAccounts.LIABILITY}
                    getAccountAmount={getAccountAmount}
                    onClick={() => openGroupModal("LIABILITY")}
                />

                <GroupBox
                    type="EQUITY"
                    title="حقوق صاحبان سهام"
                    total={localTotals.equity}
                    accounts={groupedAccounts.EQUITY}
                    getAccountAmount={getAccountAmount}
                    onClick={() => openGroupModal("EQUITY")}
                />

                <GroupBox
                    type="ASSET"
                    title="دارایی‌ها"
                    total={localTotals.assets}
                    accounts={groupedAccounts.ASSET}
                    getAccountAmount={getAccountAmount}
                    onClick={() => openGroupModal("ASSET")}
                />
            </div>

            {activeGroup && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>{selectedGroupInfo?.title}</h3>
                                <p>مانده افتتاحیه حساب‌های این گروه را وارد کن.</p>
                            </div>

                            <button type="button" onClick={closeModal} className={styles.closeBtn}>
                                ×
                            </button>
                        </div>

                        <div className={styles.modalTableWrapper}>
                            <table className={styles.modalTable}>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th>کد حساب</th>
                                        <th>حساب</th>
                                        <th>مبلغ</th>
                                        <th>عملیات</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {selectedGroupAccounts.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className={styles.emptyState}>
                                                حسابی در این گروه وجود ندارد.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedGroupAccounts.map((account, index) => {
                                            const amount = getAccountAmount(account);

                                            return (
                                                <tr key={account.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{account.code}</td>
                                                    <td className={styles.accountName}>{account.name}</td>
                                                    <td>
                                                        <input
                                                            value={amount ? String(amount) : ""}
                                                            disabled={isLocked || !canWrite}
                                                            title={!canWrite ? disabledReason : undefined}
                                                            inputMode="numeric"
                                                            onChange={(e) => setAccountValue(account, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className={styles.deleteBtn}
                                                            disabled={isLocked || !canWrite}
                                                            title={!canWrite ? disabledReason : undefined}
                                                            onClick={() => removeAccountValue(account)}
                                                        >
                                                            حذف
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                                بستن
                            </button>

                            <button
                                type="button"
                                className={styles.saveBtn}
                                onClick={async () => {
                                    await saveItems();
                                    closeModal();
                                }}
                                disabled={isLocked || savingItems || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                ذخیره این بخش
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function GroupBox({ type, title, total, accounts, getAccountAmount, onClick }) {
    const nonZeroAccounts = accounts.filter((account) => getAccountAmount(account) !== 0);

    return (
        <div
            className={`${styles.groupBox} ${type === "ASSET"
                ? styles.groupAsset
                : type === "LIABILITY"
                    ? styles.groupLiability
                    : styles.groupEquity
                }`}
            onClick={onClick}
        >
            <div className={styles.groupHeader}>
                <h4>{title}</h4>
                <strong>{Number(total || 0).toLocaleString("fa-IR")} ریال</strong>
            </div>

            <div className={styles.groupList}>
                {nonZeroAccounts.length === 0 ? (
                    <div className={styles.groupEmpty}>هنوز مبلغی ثبت نشده</div>
                ) : (
                    nonZeroAccounts.slice(0, 7).map((account) => (
                        <div className={styles.groupItem} key={account.id}>
                            <span>{account.name}</span>
                            <strong>{Number(getAccountAmount(account)).toLocaleString("fa-IR")} ریال</strong>
                        </div>
                    ))
                )}
            </div>

            <div className={styles.groupFooter}>
                <span>مجموع</span>
                <strong>{Number(total || 0).toLocaleString("fa-IR")} ریال</strong>
            </div>
        </div>
    );
}