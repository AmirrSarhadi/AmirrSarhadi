import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./LedgerList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const LEDGER_API = `${ACCOUNTING_BASE}/ledger/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/?is_postable=true`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;

export default function LedgerList() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);

    const [account, setAccount] = useState("");
    const [fiscalYear, setFiscalYear] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchLedger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, fiscalYear, status]);

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

    const buildQuery = () => {
        const params = new URLSearchParams();

        if (account) params.append("account", account);
        if (fiscalYear) params.append("fiscal_year", fiscalYear);
        if (status) params.append("status", status);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [accountRes, fyRes] = await Promise.all([
                authFetch(ACCOUNTS_API),
                authFetch(FISCAL_YEARS_API),
            ]);

            const [accountData, fyData] = await Promise.all([
                safeJson(accountRes),
                safeJson(fyRes),
            ]);

            const accountList = normalizeResponse(accountData);
            const fyList = normalizeResponse(fyData);

            setAccounts(accountList);
            setFiscalYears(fyList);

            if (accountList.length > 0) {
                setAccount(accountList[0].id);
            }
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات دفتر کل");
        } finally {
            setLoading(false);
        }
    };

    const fetchLedger = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${LEDGER_API}${buildQuery()}`);
            const data = await safeJson(res);

            setEntries(normalizeResponse(data));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت دفتر کل");
        } finally {
            setLoading(false);
        }
    };

    const selectedAccount = useMemo(() => {
        return accounts.find((item) => String(item.id) === String(account));
    }, [accounts, account]);

    const rowsWithBalance = useMemo(() => {
        let balance = 0;

        return entries.map((item) => {
            const debit = Number(item.debit || 0);
            const credit = Number(item.credit || 0);

            balance += debit - credit;

            return {
                ...item,
                balance,
            };
        });
    }, [entries]);

    const totals = useMemo(() => {
        const debit = entries.reduce((sum, item) => sum + Number(item.debit || 0), 0);
        const credit = entries.reduce((sum, item) => sum + Number(item.credit || 0), 0);

        return {
            debit,
            credit,
            balance: debit - credit,
            count: entries.length,
        };
    }, [entries]);

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const clearFilters = () => {
        setFiscalYear("");
        setStatus("");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>دفتر کل</h3>
                    <p>
                        گردش بدهکار و بستانکار یک حساب را به همراه مانده لحظه‌ای مشاهده کن.
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.createBtn}
                    onClick={() => {
                        if (!canWrite) {
                            alert(disabledReason);
                            return;
                        }

                        window.location.href = "/accounting/documents/create";
                    }}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    ایجاد سند جدید
                </button>
            </div>

            <div className={styles.accountCard}>
                <span>حساب انتخاب‌شده</span>
                <strong>
                    {selectedAccount
                        ? `${selectedAccount.code} - ${selectedAccount.name}`
                        : "حسابی انتخاب نشده"}
                </strong>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span>تعداد گردش</span>
                    <strong>{totals.count.toLocaleString("fa-IR")}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>جمع بدهکار</span>
                    <strong>{formatMoney(totals.debit)}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>جمع بستانکار</span>
                    <strong>{formatMoney(totals.credit)}</strong>
                </div>

                <div className={styles.statCard}>
                    <span>مانده</span>
                    <strong className={totals.balance >= 0 ? styles.debitBalance : styles.creditBalance}>
                        {formatMoney(Math.abs(totals.balance))}
                        {" "}
                        {totals.balance >= 0 ? "بدهکار" : "بستانکار"}
                    </strong>
                </div>
            </div>

            <div className={styles.toolbar}>
                <select value={account} onChange={(e) => setAccount(e.target.value)}>
                    <option value="">انتخاب حساب</option>
                    {accounts.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.code} - {item.name}
                        </option>
                    ))}
                </select>

                <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
                    <option value="">همه سال‌ها</option>
                    {fiscalYears.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">همه وضعیت‌ها</option>
                    <option value="DRAFT">پیش نویس</option>
                    <option value="APPROVED">تایید شده</option>
                </select>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن فیلتر
                </button>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
                            <span />
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
                                <th>تاریخ</th>
                                <th>شماره سند</th>
                                <th>شرح سند</th>
                                <th>شرح ردیف</th>
                                <th>واحد پول</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>مانده</th>
                                <th>وضعیت سند</th>
                            </tr>
                        </thead>

                        <tbody>
                            {!account ? (
                                <tr>
                                    <td colSpan="10" className={styles.emptyState}>
                                        <strong>حسابی انتخاب نشده</strong>
                                        <p>برای مشاهده دفتر کل، یک حساب انتخاب کن.</p>
                                    </td>
                                </tr>
                            ) : rowsWithBalance.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className={styles.emptyState}>
                                        <strong>گردشی برای این حساب پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا سند جدید ثبت کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                rowsWithBalance.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>

                                        <td>{item.document_date_jalali || item.document_date || "-"}</td>

                                        <td
                                            className={styles.documentNumber}
                                            onClick={() => {
                                                window.location.href = `/accounting/documents/${item.document_id}`;
                                            }}
                                        >
                                            {item.document_number}
                                        </td>

                                        <td className={styles.descriptionCell}>
                                            {item.document_description || "-"}
                                        </td>

                                        <td className={styles.noteCell}>{item.note || "-"}</td>

                                        <td>{item.currency || "IRR"}</td>

                                        <td>{formatMoney(item.debit)}</td>

                                        <td>{formatMoney(item.credit)}</td>

                                        <td>
                                            <span
                                                className={`${styles.balanceBadge} ${item.balance >= 0 ? styles.debitBadge : styles.creditBadge
                                                    }`}
                                            >
                                                {formatMoney(Math.abs(item.balance))}
                                                {" "}
                                                {item.balance >= 0 ? "بدهکار" : "بستانکار"}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${item.document_status === "APPROVED"
                                                    ? styles.approvedBadge
                                                    : styles.draftBadge
                                                    }`}
                                            >
                                                {item.document_status_display || item.document_status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="6">جمع</td>
                                <td>{formatMoney(totals.debit)}</td>
                                <td>{formatMoney(totals.credit)}</td>
                                <td colSpan="2">
                                    <span
                                        className={`${styles.balanceBadge} ${totals.balance >= 0 ? styles.debitBadge : styles.creditBadge
                                            }`}
                                    >
                                        {formatMoney(Math.abs(totals.balance))}
                                        {" "}
                                        {totals.balance >= 0 ? "بدهکار" : "بستانکار"}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}