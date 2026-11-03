import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./DetailLedger.module.css";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/?is_postable=true`;
const COST_CENTERS_API = `${ACCOUNTING_BASE}/cost-centers/`;
const BRANCHES_API = `${ACCOUNTING_BASE}/branches/`;
const DEPARTMENTS_API = `${ACCOUNTING_BASE}/departments/`;

export default function DetailLedger() {
    const { id } = useParams();

    const [detail, setDetail] = useState(null);
    const [rows, setRows] = useState([]);
    const [openingRows, setOpeningRows] = useState([]);

    const [fiscalYears, setFiscalYears] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        fiscal_year: "",
        account: "",
        status: "APPROVED",
        date_from: "",
        date_to: "",
        cost_center: "",
        branch: "",
        department: "",
        search: "",
    });

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        fetchLedger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filters.fiscal_year,
        filters.account,
        filters.status,
        filters.date_from,
        filters.date_to,
        filters.cost_center,
        filters.branch,
        filters.department,
    ]);

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

    const getPreviousDate = (date) => {
        if (!date) return "";

        const current = new Date(date);
        current.setDate(current.getDate() - 1);

        return current.toISOString().slice(0, 10);
    };

    const buildQuery = (override = {}) => {
        const params = new URLSearchParams();
        const merged = {
            ...filters,
            ...override,
        };

        if (merged.fiscal_year) params.append("fiscal_year", merged.fiscal_year);
        if (merged.account) params.append("account", merged.account);
        if (merged.status) params.append("status", merged.status);
        if (merged.date_from) params.append("date_from", merged.date_from);
        if (merged.date_to) params.append("date_to", merged.date_to);
        if (merged.cost_center) params.append("cost_center", merged.cost_center);
        if (merged.branch) params.append("branch", merged.branch);
        if (merged.department) params.append("department", merged.department);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [
                detailRes,
                fyRes,
                accRes,
                ccRes,
                branchRes,
                deptRes,
            ] = await Promise.all([
                authFetch(`${ACCOUNTING_DETAIL_BASE}/${id}/v2/details/`),
                authFetch(FISCAL_YEARS_API),
                authFetch(ACCOUNTS_API),
                authFetch(COST_CENTERS_API),
                authFetch(BRANCHES_API),
                authFetch(DEPARTMENTS_API),
            ]);

            const [
                detailData,
                fyData,
                accData,
                ccData,
                branchData,
                deptData,
            ] = await Promise.all([
                safeJson(detailRes),
                safeJson(fyRes),
                safeJson(accRes),
                safeJson(ccRes),
                safeJson(branchRes),
                safeJson(deptRes),
            ]);

            setDetail(detailData);
            setFiscalYears(normalizeResponse(fyData));
            setAccounts(normalizeResponse(accData));
            setCostCenters(normalizeResponse(ccData));
            setBranches(normalizeResponse(branchData));
            setDepartments(normalizeResponse(deptData));

            await fetchLedger();
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت گردش تفصیل");
        } finally {
            setLoading(false);
        }
    };

    const fetchLedger = async () => {
        if (!id) return;

        try {
            setLoading(true);

            const ledgerRes = await authFetch(
                `${ACCOUNTING_DETAIL_BASE}/${id}/v2/details/ledger/${buildQuery()}`
            );

            const ledgerData = await safeJson(ledgerRes);
            setRows(normalizeResponse(ledgerData));

            if (filters.date_from) {
                const openingRes = await authFetch(
                    `${ACCOUNTING_DETAIL_BASE}/${id}/v2/details/ledger/${buildQuery({
                        date_from: "",
                        date_to: getPreviousDate(filters.date_from),
                    })}`
                );

                const openingData = await safeJson(openingRes);
                setOpeningRows(normalizeResponse(openingData));
            } else {
                setOpeningRows([]);
            }
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی گردش تفصیل");
        } finally {
            setLoading(false);
        }
    };

    const updateFilter = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString("fa-IR");
    };

    const formatBalanceType = (value) => {
        if (value > 0) return "بدهکار";
        if (value < 0) return "بستانکار";
        return "صفر";
    };

    const filteredRows = useMemo(() => {
        const search = filters.search.trim().toLowerCase();

        if (!search) return rows;

        return rows.filter((row) => {
            return (
                String(row.document_number || "").toLowerCase().includes(search) ||
                String(row.document_description || "").toLowerCase().includes(search) ||
                String(row.note || "").toLowerCase().includes(search) ||
                String(row.account_name || "").toLowerCase().includes(search) ||
                String(row.debit || "").includes(search) ||
                String(row.credit || "").includes(search)
            );
        });
    }, [rows, filters.search]);

    const openingBalance = useMemo(() => {
        return openingRows.reduce((sum, row) => {
            return sum + Number(row.debit || 0) - Number(row.credit || 0);
        }, 0);
    }, [openingRows]);

    const rowsWithRunningBalance = useMemo(() => {
        let runningBalance = openingBalance;

        return filteredRows.map((row) => {
            const debit = Number(row.debit || 0);
            const credit = Number(row.credit || 0);

            runningBalance += debit - credit;

            return {
                ...row,
                running_balance: runningBalance,
            };
        });
    }, [filteredRows, openingBalance]);

    const totals = useMemo(() => {
        return filteredRows.reduce(
            (acc, row) => {
                acc.debit += Number(row.debit || 0);
                acc.credit += Number(row.credit || 0);
                return acc;
            },
            {
                debit: 0,
                credit: 0,
            }
        );
    }, [filteredRows]);

    const closingBalance = openingBalance + totals.debit - totals.credit;

    const clearFilters = () => {
        setFilters({
            fiscal_year: "",
            account: "",
            status: "APPROVED",
            date_from: "",
            date_to: "",
            cost_center: "",
            branch: "",
            department: "",
            search: "",
        });
    };


    const exportExcel = () => {
        const headers = [
            "ردیف",
            "شماره سند",
            "تاریخ",
            "حساب",
            "شرح سند",
            "شرح ردیف",
            "مرکز هزینه",
            "شعبه",
            "دپارتمان",
            "بدهکار",
            "بستانکار",
            "مانده",
            "نوع مانده",
        ];

        const lines = rowsWithRunningBalance.map((row, index) => [
            index + 1,
            row.document_number || "",
            row.document_date_jalali || row.document_date || "",
            `${row.account_code || ""} - ${row.account_name || ""}`,
            row.document_description || "",
            row.note || "",
            row.cost_center_title || "",
            row.branch_title || "",
            row.department_title || "",
            row.debit || 0,
            row.credit || 0,
            Math.abs(Number(row.running_balance || 0)),
            formatBalanceType(Number(row.running_balance || 0)),
        ]);

        const csvContent = [headers, ...lines]
            .map((line) =>
                line
                    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `detail-ledger-${detail?.code || id}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    if (loading && !detail) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingBox}>در حال دریافت گردش تفصیل...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>گردش تفصیل</h3>
                    <p>
                        {detail
                            ? `${detail.code} - ${detail.name}`
                            : "جزئیات گردش تفصیل"}
                    </p>
                </div>

                <div className={styles.headerActions}>
                    {/* <button type="button" className={styles.printBtn} onClick={printPage}>
                        چاپ
                    </button> */}

                    <button type="button" className={styles.printBtn} onClick={exportExcel}>
                        خروجی اکسل
                    </button>

                    <button type="button" className={styles.refreshBtn} onClick={fetchLedger}>
                        بروزرسانی
                    </button>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <span>مانده اول دوره</span>
                    <strong className={openingBalance >= 0 ? styles.greenText : styles.redText}>
                        {formatMoney(Math.abs(openingBalance))}
                        {" "}
                        {formatBalanceType(openingBalance)}
                    </strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>جمع بدهکار</span>
                    <strong className={styles.greenText}>{formatMoney(totals.debit)}</strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>جمع بستانکار</span>
                    <strong className={styles.redText}>{formatMoney(totals.credit)}</strong>
                </div>

                <div className={styles.summaryCard}>
                    <span>مانده پایان دوره</span>
                    <strong className={closingBalance >= 0 ? styles.greenText : styles.redText}>
                        {formatMoney(Math.abs(closingBalance))}
                        {" "}
                        {formatBalanceType(closingBalance)}
                    </strong>
                </div>
            </div>

            <div className={styles.filters}>
                <input
                    className={styles.searchInput}
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                    placeholder="جستجو در شماره سند، شرح، حساب یا مبلغ..."
                />

                <select
                    value={filters.fiscal_year}
                    onChange={(e) => updateFilter("fiscal_year", e.target.value)}
                >
                    <option value="">همه سال‌های مالی</option>
                    {fiscalYears.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.account}
                    onChange={(e) => updateFilter("account", e.target.value)}
                >
                    <option value="">همه حساب‌ها</option>
                    {accounts.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.code} - {item.name}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                >
                    <option value="">همه وضعیت‌ها</option>
                    <option value="DRAFT">پیش نویس</option>
                    <option value="PENDING">در انتظار تایید</option>
                    <option value="APPROVED">تایید شده</option>
                    <option value="REJECTED">رد شده</option>
                </select>

                <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => updateFilter("date_from", e.target.value)}
                />

                <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => updateFilter("date_to", e.target.value)}
                />

                <select
                    value={filters.cost_center}
                    onChange={(e) => updateFilter("cost_center", e.target.value)}
                >
                    <option value="">همه مراکز هزینه</option>
                    {costCenters.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.code} - {item.title}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.branch}
                    onChange={(e) => updateFilter("branch", e.target.value)}
                >
                    <option value="">همه شعب</option>
                    {branches.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.code} - {item.title}
                        </option>
                    ))}
                </select>

                <select
                    value={filters.department}
                    onChange={(e) => updateFilter("department", e.target.value)}
                >
                    <option value="">همه دپارتمان‌ها</option>
                    {departments.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.code} - {item.title}
                        </option>
                    ))}
                </select>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن فیلتر
                </button>
            </div>

            <div className={styles.printArea}>
                <div className={styles.printHeader}>
                    <strong>دفتر تفصیلی</strong>
                    <span>
                        {detail ? `${detail.code} - ${detail.name}` : "-"}
                    </span>
                    <small>
                        تاریخ چاپ: {new Date().toLocaleDateString("fa-IR")}
                    </small>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره سند</th>
                                <th>تاریخ</th>
                                <th>حساب</th>
                                <th>شرح سند</th>
                                <th>شرح ردیف</th>
                                <th>مرکز هزینه</th>
                                <th>شعبه</th>
                                <th>دپارتمان</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>مانده تجمعی</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rowsWithRunningBalance.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className={styles.emptyState}>
                                        اطلاعاتی برای نمایش وجود ندارد
                                    </td>
                                </tr>
                            ) : (
                                rowsWithRunningBalance.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>{index + 1}</td>

                                        <td className={styles.linkCell}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    window.location.href = `/accounting/documents/${row.document_id}`;
                                                }}
                                            >
                                                {row.document_number}
                                            </button>
                                        </td>

                                        <td>{row.document_date_jalali || row.document_date}</td>

                                        <td className={styles.nameCell}>
                                            {row.account_code} - {row.account_name}
                                        </td>

                                        <td className={styles.descriptionCell}>
                                            {row.document_description || "-"}
                                        </td>

                                        <td className={styles.descriptionCell}>{row.note || "-"}</td>

                                        <td>{row.cost_center_title || "-"}</td>
                                        <td>{row.branch_title || "-"}</td>
                                        <td>{row.department_title || "-"}</td>

                                        <td className={styles.greenText}>{formatMoney(row.debit)}</td>
                                        <td className={styles.redText}>{formatMoney(row.credit)}</td>

                                        <td>
                                            <span
                                                className={`${styles.balanceBadge} ${Number(row.running_balance || 0) >= 0
                                                    ? styles.debitBadge
                                                    : styles.creditBadge
                                                    }`}
                                            >
                                                {formatMoney(Math.abs(Number(row.running_balance || 0)))}
                                                {" "}
                                                {formatBalanceType(Number(row.running_balance || 0))}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="9">جمع دوره</td>
                                <td>{formatMoney(totals.debit)}</td>
                                <td>{formatMoney(totals.credit)}</td>
                                <td>
                                    <span
                                        className={`${styles.balanceBadge} ${closingBalance >= 0
                                            ? styles.debitBadge
                                            : styles.creditBadge
                                            }`}
                                    >
                                        {formatMoney(Math.abs(closingBalance))}
                                        {" "}
                                        {formatBalanceType(closingBalance)}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}