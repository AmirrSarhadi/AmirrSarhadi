import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import styles from "./CreateDocument.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";
import { FiFilePlus, FiArrowDownCircle, FiArrowUpCircle, FiCheckCircle, FiPlus } from "react-icons/fi";
import { PageHero, StatGrid, StatCard, PrimaryButton } from "../../../../components/ERP";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;
const PROJECTS_API = `${ACCOUNTING_BASE}/projects/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/?is_postable=true`;
const DETAILS_API = `${ACCOUNTING_BASE}/details/?is_active=true`;
const COST_CENTERS_API = `${ACCOUNTING_BASE}/cost-centers/?is_active=true`;
const BRANCHES_API = `${ACCOUNTING_BASE}/branches/?is_active=true`;
const DEPARTMENTS_API = `${ACCOUNTING_BASE}/departments/?is_active=true`;
const DOCUMENTS_API = `${ACCOUNTING_BASE}/documents/`;
const NEXT_NUMBER_API = `${ACCOUNTING_BASE}/documents/next-number/`;

const emptyRow = {
    account: "",
    detail_account: "",
    cost_center: "",
    branch: "",
    department: "",
    note: "",
    currency: "IRR",
    debit: "",
    credit: "",
};

export default function CreateDocument() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [fiscalYears, setFiscalYears] = useState([]);
    const [projects, setProjects] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [details, setDetails] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        fiscal_year: "",
        number: "",
        auto_number: true,
        date: "",
        reference: "",
        project: "",
        description: "",
        currency: "IRR",
        status: "DRAFT",
        document_type: "MANUAL",
    });

    const [rows, setRows] = useState([
        { ...emptyRow },
        { ...emptyRow },
    ]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (form.fiscal_year && form.auto_number) {
            fetchNextNumber(form.fiscal_year);
        }
    }, [form.fiscal_year, form.auto_number]);

    const normalizeResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    };

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            console.error("Response is not JSON:", text);
            throw new Error(`Invalid JSON response: ${res.url}`);
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [
                fyRes,
                projectRes,
                accountRes,
                detailRes,
                costCenterRes,
                branchRes,
                departmentRes,
            ] = await Promise.all([
                authFetch(FISCAL_YEARS_API),
                authFetch(PROJECTS_API),
                authFetch(ACCOUNTS_API),
                authFetch(DETAILS_API),
                authFetch(COST_CENTERS_API),
                authFetch(BRANCHES_API),
                authFetch(DEPARTMENTS_API),
            ]);

            const [
                fyData,
                projectData,
                accountData,
                detailData,
                costCenterData,
                branchData,
                departmentData,
            ] = await Promise.all([
                safeJson(fyRes),
                safeJson(projectRes),
                safeJson(accountRes),
                safeJson(detailRes),
                safeJson(costCenterRes),
                safeJson(branchRes),
                safeJson(departmentRes),
            ]);

            const fyList = normalizeResponse(fyData);
            const projectList = normalizeResponse(projectData);
            const accountList = normalizeResponse(accountData);
            const detailList = normalizeResponse(detailData);
            const costCenterList = normalizeResponse(costCenterData);
            const branchList = normalizeResponse(branchData);
            const departmentList = normalizeResponse(departmentData);

            setFiscalYears(fyList);
            setProjects(projectList);
            setAccounts(accountList);
            setDetails(detailList);
            setCostCenters(costCenterList);
            setBranches(branchList);
            setDepartments(departmentList);

            if (fyList.length > 0) {
                setForm((prev) => ({
                    ...prev,
                    fiscal_year: fyList[0].id,
                }));
            }
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات اولیه حسابداری");
        } finally {
            setLoading(false);
        }
    };

    const fetchNextNumber = async (fiscalYearId) => {
        try {
            const res = await authFetch(`${NEXT_NUMBER_API}?fiscal_year=${fiscalYearId}`);
            const data = await safeJson(res);

            if (res.ok) {
                setForm((prev) => ({
                    ...prev,
                    number: data.next_number,
                }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toEnglishDigits = (value) => {
        return String(value)
            .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    };

    const cleanMoney = (value) => {
        return toEnglishDigits(value)
            .replace(/,/g, "")
            .replace(/[^\d.]/g, "");
    };

    const formatMoney = (value) => {
        if (value === "" || value === null || value === undefined) return "";
        return String(value);
    };

    const toNumber = (value) => {
        const cleaned = cleanMoney(value);
        return Number(cleaned || 0);
    };

    const totalDebit = useMemo(() => {
        return rows.reduce((sum, row) => sum + toNumber(row.debit), 0);
    }, [rows]);

    const totalCredit = useMemo(() => {
        return rows.reduce((sum, row) => sum + toNumber(row.credit), 0);
    }, [rows]);

    const difference = totalDebit - totalCredit;
    const isBalanced = Math.round(difference * 100) / 100 === 0 && totalDebit > 0;

    const updateForm = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const updateRow = (index, key, value) => {
        setRows((prev) => {
            const nextRows = [...prev];

            if (key === "debit") {
                nextRows[index] = {
                    ...nextRows[index],
                    debit: cleanMoney(value),
                    credit: cleanMoney(value) ? "" : nextRows[index].credit,
                };
            } else if (key === "credit") {
                nextRows[index] = {
                    ...nextRows[index],
                    credit: cleanMoney(value),
                    debit: cleanMoney(value) ? "" : nextRows[index].debit,
                };
            } else {
                nextRows[index] = {
                    ...nextRows[index],
                    [key]: value,
                };
            }

            return nextRows;
        });
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const addRow = () => {
        if (guardWrite()) return;

        setRows((prev) => [
            ...prev,
            {
                ...emptyRow,
                currency: form.currency,
            },
        ]);
    };

    const removeRow = (index) => {
        if (guardWrite()) return;

        if (rows.length <= 2) {
            alert("سند باید حداقل دو ردیف داشته باشد");
            return;
        }

        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    const validateBeforeSubmit = () => {
        if (!form.fiscal_year) {
            alert("سال مالی را انتخاب کن");
            return false;
        }

        if (!form.number) {
            alert("شماره سند الزامی است");
            return false;
        }

        if (!form.date) {
            alert("تاریخ سند الزامی است");
            return false;
        }

        const validRows = rows.filter(
            (row) => row.account && (toNumber(row.debit) > 0 || toNumber(row.credit) > 0)
        );

        if (validRows.length < 2) {
            alert("حداقل دو ردیف معتبر برای سند وارد کن");
            return false;
        }

        const invalidRow = validRows.find(
            (row) => toNumber(row.debit) > 0 && toNumber(row.credit) > 0
        );

        if (invalidRow) {
            alert("در هر ردیف فقط یکی از بدهکار یا بستانکار باید مقدار داشته باشد");
            return false;
        }

        if (!isBalanced) {
            alert("سند تراز نیست؛ جمع بدهکار و بستانکار باید برابر باشد");
            return false;
        }

        return true;
    };

    const submitDocument = async () => {
        if (guardWrite()) return;

        if (!validateBeforeSubmit()) return;

        const validRows = rows
            .filter((row) => row.account && (toNumber(row.debit) > 0 || toNumber(row.credit) > 0))
            .map((row, index) => ({
                row_no: index + 1,
                account: Number(row.account),
                detail_account: row.detail_account ? Number(row.detail_account) : null,
                cost_center: row.cost_center ? Number(row.cost_center) : null,
                branch: row.branch ? Number(row.branch) : null,
                department: row.department ? Number(row.department) : null,
                note: row.note || "",
                currency: row.currency || form.currency || "IRR",
                debit: String(toNumber(row.debit)),
                credit: String(toNumber(row.credit)),
            }));

        const payload = {
            fiscal_year: Number(form.fiscal_year),
            number: form.number || "",
            auto_number: form.auto_number,
            date: form.date,
            reference: form.reference || "",
            project: form.project ? Number(form.project) : null,
            description: form.description || "",
            currency: form.currency || "IRR",
            status: form.status,
            document_type: form.document_type,
            items: validRows,
        };

        try {
            setSaving(true);

            const res = await authFetch(DOCUMENTS_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                console.error(errorData);
                alert(JSON.stringify(errorData, null, 2));
                return;
            }

            alert("سند با موفقیت ثبت شد");
            window.location.href = "/accounting/documents";

            setRows([
                { ...emptyRow, currency: form.currency },
                { ...emptyRow, currency: form.currency },
            ]);

            setForm((prev) => ({
                ...prev,
                reference: "",
                description: "",
                status: "DRAFT",
                document_type: "MANUAL",
            }));

            if (form.fiscal_year && form.auto_number) {
                await fetchNextNumber(form.fiscal_year);
            }
        } catch (err) {
            console.error(err);
            alert("خطا در ثبت سند");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
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
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <PageHero eyebrow="حسابداری / سند جدید" title="ایجاد سند حسابداری" description="اطلاعات سند و ردیف‌های بدهکار/بستانکار را وارد کنید؛ ثبت نهایی فقط در حالت تراز امکان‌پذیر است." icon={<FiFilePlus />} actions={<PrimaryButton type="button" onClick={submitDocument} disabled={saving || !canWrite} title={!canWrite ? disabledReason : undefined}>{saving ? "در حال ثبت..." : "ثبت سند"}</PrimaryButton>} />
            <StatGrid>
                <StatCard label="جمع بدهکار" value={totalDebit.toLocaleString("fa-IR")} hint="جمع ردیف‌های بدهکار" icon={<FiArrowDownCircle />} tone="info" />
                <StatCard label="جمع بستانکار" value={totalCredit.toLocaleString("fa-IR")} hint="جمع ردیف‌های بستانکار" icon={<FiArrowUpCircle />} tone="success" />
                <StatCard label="اختلاف" value={Math.abs(difference).toLocaleString("fa-IR")} hint={isBalanced ? "سند آماده ثبت است" : "برای ثبت باید صفر شود"} icon={<FiCheckCircle />} tone={isBalanced ? "success" : "warning"} />
                <StatCard label="تعداد ردیف" value={rows.length.toLocaleString("fa-IR")} hint="ردیف‌های فعلی سند" icon={<FiPlus />} />
            </StatGrid>

            <div className={styles.formCard}>
                <div className={styles.formGrid}>
                    <label>
                        سال مالی
                        <select
                            value={form.fiscal_year}
                            onChange={(e) => updateForm("fiscal_year", e.target.value)}
                        >
                            <option value="">انتخاب سال مالی</option>

                            {fiscalYears.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        شماره
                        <input
                            value={form.number}
                            disabled={form.auto_number}
                            onChange={(e) => updateForm("number", cleanMoney(e.target.value))}
                        />
                    </label>

                    <label>
                        شماره خودکار
                        <select
                            value={form.auto_number ? "yes" : "no"}
                            onChange={(e) => updateForm("auto_number", e.target.value === "yes")}
                        >
                            <option value="yes">بله</option>
                            <option value="no">خیر</option>
                        </select>
                    </label>

                    <label>
                        تاریخ
                        <DatePicker
                            value={form.date}
                            onChange={(date) => updateForm("date", date ? date.format("YYYY/MM/DD") : "")}
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass={styles.dateInput}
                            placeholder="انتخاب تاریخ"
                        />
                    </label>

                    <label>
                        ارجاع
                        <input
                            value={form.reference}
                            onChange={(e) => updateForm("reference", e.target.value)}
                            placeholder="مثلاً INV-1001"
                        />
                    </label>

                    <label>
                        پروژه
                        <select
                            value={form.project}
                            onChange={(e) => updateForm("project", e.target.value)}
                        >
                            <option value="">بدون پروژه</option>

                            {projects.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        واحد پول
                        <select
                            value={form.currency}
                            onChange={(e) => {
                                updateForm("currency", e.target.value);
                                setRows((prev) =>
                                    prev.map((row) => ({
                                        ...row,
                                        currency: e.target.value,
                                    }))
                                );
                            }}
                        >
                            <option value="IRR">ریال</option>
                            <option value="IRT">تومان</option>
                            <option value="USD">دلار</option>
                        </select>
                    </label>

                    <label>
                        وضعیت
                        <select
                            value={form.status}
                            onChange={(e) => updateForm("status", e.target.value)}
                        >
                            <option value="DRAFT">پیش نویس</option>
                            <option value="APPROVED">تایید شده</option>
                        </select>
                    </label>

                    <label>
                        نوع سند
                        <select
                            value={form.document_type}
                            onChange={(e) => updateForm("document_type", e.target.value)}
                        >
                            <option value="MANUAL">دستی</option>
                            <option value="AUTO">اتوماتیک</option>
                        </select>
                    </label>
                </div>

                <label className={styles.descriptionLabel}>
                    شرح سند
                    <textarea
                        value={form.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder="شرح کلی سند..."
                    />
                </label>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <div>
                        <h4>ردیف‌های سند</h4>
                        <p>هر ردیف یا بدهکار است یا بستانکار.</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addRowBtn}
                        onClick={addRow}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        افزودن ردیف
                    </button>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>حساب</th>
                                <th>تفصیل</th>
                                <th>مرکز هزینه</th>
                                <th>شعبه</th>
                                <th>دپارتمان</th>
                                <th>شرح</th>
                                <th>واحد پول</th>
                                <th>بدهکار</th>
                                <th>بستانکار</th>
                                <th>مبلغ</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((row, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>

                                    <td>
                                        <select
                                            value={row.account}
                                            onChange={(e) => updateRow(index, "account", e.target.value)}
                                        >
                                            <option value="">انتخاب حساب</option>

                                            {accounts.map((account) => (
                                                <option key={account.id} value={account.id}>
                                                    {account.code} - {account.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.detail_account}
                                            onChange={(e) => updateRow(index, "detail_account", e.target.value)}
                                        >
                                            <option value="">بدون تفصیل</option>

                                            {details.map((detail) => (
                                                <option key={detail.id} value={detail.id}>
                                                    {detail.code} - {detail.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.cost_center}
                                            onChange={(e) => updateRow(index, "cost_center", e.target.value)}
                                        >
                                            <option value="">بدون مرکز هزینه</option>

                                            {costCenters.map((costCenter) => (
                                                <option key={costCenter.id} value={costCenter.id}>
                                                    {costCenter.code} - {costCenter.title}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.branch}
                                            onChange={(e) => updateRow(index, "branch", e.target.value)}
                                        >
                                            <option value="">بدون شعبه</option>

                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.code} - {branch.title}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.department}
                                            onChange={(e) => updateRow(index, "department", e.target.value)}
                                        >
                                            <option value="">بدون دپارتمان</option>

                                            {departments.map((department) => (
                                                <option key={department.id} value={department.id}>
                                                    {department.code} - {department.title}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            value={row.note}
                                            onChange={(e) => updateRow(index, "note", e.target.value)}
                                            placeholder="شرح ردیف"
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={row.currency}
                                            onChange={(e) => updateRow(index, "currency", e.target.value)}
                                        >
                                            <option value="IRR">ریال</option>
                                            <option value="IRT">تومان</option>
                                            <option value="USD">دلار</option>
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            inputMode="decimal"
                                            value={formatMoney(row.debit)}
                                            onChange={(e) => updateRow(index, "debit", e.target.value)}
                                            placeholder="0"
                                        />
                                    </td>

                                    <td>
                                        <input
                                            inputMode="decimal"
                                            value={formatMoney(row.credit)}
                                            onChange={(e) => updateRow(index, "credit", e.target.value)}
                                            placeholder="0"
                                        />
                                    </td>

                                    <td>
                                        <span className={styles.amountBadge}>
                                            {(toNumber(row.debit) || toNumber(row.credit)).toLocaleString("fa-IR")}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className={styles.deleteRowBtn}
                                            onClick={() => removeRow(index)}
                                            disabled={!canWrite}
                                            title={!canWrite ? disabledReason : undefined}
                                        >
                                            حذف
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="8">جمع</td>
                                <td>{totalDebit.toLocaleString("fa-IR")}</td>
                                <td>{totalCredit.toLocaleString("fa-IR")}</td>
                                <td colSpan="2">
                                    <span
                                        className={`${styles.balanceBadge} ${isBalanced ? styles.balanced : styles.notBalanced
                                            }`}
                                    >
                                        {isBalanced
                                            ? "تراز"
                                            : `اختلاف: ${Math.abs(difference).toLocaleString("fa-IR")}`}
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