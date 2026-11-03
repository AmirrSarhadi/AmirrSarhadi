import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./JournalList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const JOURNAL_API = `${ACCOUNTING_BASE}/journal/`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/`;

const ACCOUNT_TYPES = [
    { value: "ASSET", label: "دارایی‌ها" },
    { value: "LIABILITY", label: "بدهی‌ها" },
    { value: "EQUITY", label: "حقوق صاحبان سهام" },
    { value: "COGS", label: "بهای تمام شده کالای فروخته شده" },
    { value: "SALE", label: "فروش" },
    { value: "INCOME", label: "درآمد" },
    { value: "EXPENSE", label: "هزینه‌ها" },
    { value: "OTHER", label: "سایر حساب‌ها" },
];

export default function JournalList() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [entries, setEntries] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [search, setSearch] = useState("");
    const [fiscalYear, setFiscalYear] = useState("");
    const [account, setAccount] = useState("");
    const [accountType, setAccountType] = useState("");
    const [status, setStatus] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchJournal();
        }, 350);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, fiscalYear, account, accountType, status]);

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

        if (search.trim()) params.append("search", search.trim());
        if (fiscalYear) params.append("fiscal_year", fiscalYear);
        if (account) params.append("account", account);
        if (accountType) params.append("account_type", accountType);
        if (status) params.append("status", status);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [journalRes, fyRes, accRes] = await Promise.all([
                authFetch(`${JOURNAL_API}${buildQuery()}`),
                authFetch(FISCAL_YEARS_API),
                authFetch(ACCOUNTS_API),
            ]);

            const [journalData, fyData, accData] = await Promise.all([
                safeJson(journalRes),
                safeJson(fyRes),
                safeJson(accRes),
            ]);

            setEntries(normalizeResponse(journalData));
            setFiscalYears(normalizeResponse(fyData));
            setAccounts(normalizeResponse(accData));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت دفتر روزنامه");
        } finally {
            setLoading(false);
        }
    };

    const fetchJournal = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${JOURNAL_API}${buildQuery()}`);
            const data = await safeJson(res);

            setEntries(normalizeResponse(data));
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی دفتر روزنامه");
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSearch("");
        setFiscalYear("");
        setAccount("");
        setAccountType("");
        setStatus("");
    };

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const totals = useMemo(() => {
        const debit = entries.reduce((sum, item) => sum + Number(item.debit || 0), 0);
        const credit = entries.reduce((sum, item) => sum + Number(item.credit || 0), 0);

        return {
            debit,
            credit,
            difference: debit - credit,
            count: entries.length,
        };
    }, [entries]);

    const isBalanced = Math.round(totals.difference * 100) / 100 === 0;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>دفتر روزنامه</h3>
                    <p>نمایش تمام ردیف‌های اسناد حسابداری به ترتیب تاریخ و شماره سند.</p>
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

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span>تعداد ردیف‌ها</span>
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
                    <span>وضعیت تراز</span>
                    <strong
                        className={isBalanced ? styles.statBalanced : styles.statNotBalanced}
                    >
                        {isBalanced
                            ? "تراز"
                            : `اختلاف ${formatMoney(Math.abs(totals.difference))}`}
                    </strong>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو در شماره سند، ارجاع، شرح، حساب..."
                    />
                </div>

                <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
                    <option value="">همه سال‌ها</option>
                    {fiscalYears.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select value={account} onChange={(e) => setAccount(e.target.value)}>
                    <option value="">همه حساب‌ها</option>
                    {accounts.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.code} - {item.name}
                        </option>
                    ))}
                </select>

                <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                >
                    <option value="">همه نوع حساب‌ها</option>
                    {ACCOUNT_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
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
                                <th>سال مالی</th>
                                <th>شرح سند</th>
                                <th>کد حساب</th>
                                <th>حساب</th>
                                <th>نوع حساب</th>
                                <th>شرح ردیف</th>
                                <th>واحد پول</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>وضعیت سند</th>
                                <th>قفل</th>
                            </tr>
                        </thead>

                        <tbody>
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className={styles.emptyState}>
                                        <strong>ردیفی پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا سند جدید ثبت کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((item, index) => (
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

                                        <td>{item.fiscal_year_name || "-"}</td>

                                        <td className={styles.descriptionCell}>
                                            {item.document_description || "-"}
                                        </td>

                                        <td>{item.account_code || "-"}</td>

                                        <td className={styles.accountCell}>
                                            {item.account_name || "-"}
                                        </td>

                                        <td>
                                            <span className={styles.typeBadge}>
                                                {item.account_type_display || item.account_type}
                                            </span>
                                        </td>

                                        <td className={styles.noteCell}>{item.note || "-"}</td>

                                        <td>{item.currency || "IRR"}</td>

                                        <td>{formatMoney(item.debit)}</td>

                                        <td>{formatMoney(item.credit)}</td>

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

                                        <td>
                                            <span
                                                className={`${styles.lockBadge} ${item.document_is_locked
                                                    ? styles.lockedBadge
                                                    : styles.unlockedBadge
                                                    }`}
                                            >
                                                {item.document_is_locked ? "قفل" : "باز"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="10">جمع</td>
                                <td>{formatMoney(totals.debit)}</td>
                                <td>{formatMoney(totals.credit)}</td>
                                <td colSpan="2">
                                    <span
                                        className={`${styles.balanceBadge} ${isBalanced ? styles.balanced : styles.notBalanced
                                            }`}
                                    >
                                        {isBalanced
                                            ? "تراز"
                                            : `اختلاف: ${formatMoney(Math.abs(totals.difference))}`}
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