import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import styles from "./EditDocument.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

const DOCUMENTS_API = `${ACCOUNTING_BASE}/documents/`;
const ACCOUNTS_API = `${ACCOUNTING_BASE}/accounts/?is_postable=true`;
const FISCAL_YEARS_API = `${ACCOUNTING_BASE}/fiscal-years/`;
const PROJECTS_API = `${ACCOUNTING_BASE}/projects/`;
const DETAILS_API = `${ACCOUNTING_BASE}/details/?is_active=true`;
const COST_CENTERS_API = `${ACCOUNTING_BASE}/cost-centers/?is_active=true`;
const BRANCHES_API = `${ACCOUNTING_BASE}/branches/?is_active=true`;
const DEPARTMENTS_API = `${ACCOUNTING_BASE}/departments/?is_active=true`;

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

export default function EditDocument() {
    const { id } = useParams();
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [accounts, setAccounts] = useState([]);
    const [fiscalYears, setFiscalYears] = useState([]);
    const [projects, setProjects] = useState([]);
    const [details, setDetails] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [branches, setBranches] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [form, setForm] = useState({
        fiscal_year: "",
        number: "",
        auto_number: false,
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

    useEffect(() => {
        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const [
                docRes,
                accRes,
                fyRes,
                projectRes,
                detailRes,
                costCenterRes,
                branchRes,
                departmentRes,
            ] = await Promise.all([
                authFetch(`${ACCOUNTING_DETAIL_BASE}/${id}/v2/documents/`),
                authFetch(ACCOUNTS_API),
                authFetch(FISCAL_YEARS_API),
                authFetch(PROJECTS_API),
                authFetch(DETAILS_API),
                authFetch(COST_CENTERS_API),
                authFetch(BRANCHES_API),
                authFetch(DEPARTMENTS_API),
            ]);

            const [
                docData,
                accData,
                fyData,
                projectData,
                detailData,
                costCenterData,
                branchData,
                departmentData,
            ] = await Promise.all([
                safeJson(docRes),
                safeJson(accRes),
                safeJson(fyRes),
                safeJson(projectRes),
                safeJson(detailRes),
                safeJson(costCenterRes),
                safeJson(branchRes),
                safeJson(departmentRes),
            ]);

            if (!docRes.ok) {
                alert("سند پیدا نشد");
                return;
            }

            if (docData.is_locked) {
                alert("این سند قفل شده و قابل ویرایش نیست");
                window.location.href = `/accounting/documents/${id}`;
                return;
            }

            setAccounts(normalizeResponse(accData));
            setFiscalYears(normalizeResponse(fyData));
            setProjects(normalizeResponse(projectData));
            setDetails(normalizeResponse(detailData));
            setCostCenters(normalizeResponse(costCenterData));
            setBranches(normalizeResponse(branchData));
            setDepartments(normalizeResponse(departmentData));

            setForm({
                fiscal_year: docData.fiscal_year || "",
                number: docData.number || "",
                auto_number: docData.auto_number || false,
                date: docData.date_jalali || "",
                reference: docData.reference || "",
                project: docData.project || "",
                description: docData.description || "",
                currency: docData.currency || "IRR",
                status: docData.status || "DRAFT",
                document_type: docData.document_type || "MANUAL",
            });

            if (docData.items?.length > 0) {
                setRows(
                    docData.items.map((item) => ({
                        account: item.account || "",
                        detail_account: item.detail_id_display || item.detail_account || "",
                        cost_center: item.cost_center || "",
                        branch: item.branch || "",
                        department: item.department || "",
                        note: item.note || "",
                        currency: item.currency || "IRR",
                        debit: item.debit || "",
                        credit: item.credit || "",
                    }))
                );
            }
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت اطلاعات سند");
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

    const cleanMoney = (value) => {
        return String(value)
            .replace(/,/g, "")
            .replace(/[^\d.]/g, "");
    };

    const toNumber = (value) => {
        return Number(cleanMoney(value || 0));
    };

    const updateRow = (index, key, value) => {
        setRows((prev) => {
            const next = [...prev];

            if (key === "debit") {
                next[index] = {
                    ...next[index],
                    debit: cleanMoney(value),
                    credit: cleanMoney(value) ? "" : next[index].credit,
                };
            } else if (key === "credit") {
                next[index] = {
                    ...next[index],
                    credit: cleanMoney(value),
                    debit: cleanMoney(value) ? "" : next[index].debit,
                };
            } else {
                next[index] = {
                    ...next[index],
                    [key]: value,
                };
            }

            return next;
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
            alert("حداقل دو ردیف لازم است");
            return;
        }

        setRows((prev) => prev.filter((_, i) => i !== index));
    };

    const totalDebit = useMemo(() => {
        return rows.reduce((sum, row) => sum + toNumber(row.debit), 0);
    }, [rows]);

    const totalCredit = useMemo(() => {
        return rows.reduce((sum, row) => sum + toNumber(row.credit), 0);
    }, [rows]);

    const isBalanced =
        Math.round((totalDebit - totalCredit) * 100) / 100 === 0 &&
        totalDebit > 0;

    const validateBeforeSubmit = () => {
        if (!form.fiscal_year) {
            alert("سال مالی الزامی است");
            return false;
        }

        if (!form.date) {
            alert("تاریخ سند الزامی است");
            return false;
        }

        const validRows = rows.filter(
            (row) =>
                row.account &&
                (toNumber(row.debit) > 0 || toNumber(row.credit) > 0)
        );

        if (validRows.length < 2) {
            alert("حداقل دو ردیف معتبر وارد کن");
            return false;
        }

        if (!isBalanced) {
            alert("سند تراز نیست");
            return false;
        }

        return true;
    };

    const submitEdit = async () => {
        if (guardWrite()) return;

        if (!validateBeforeSubmit()) return;

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
            items: rows
                .filter(
                    (row) =>
                        row.account &&
                        (toNumber(row.debit) > 0 || toNumber(row.credit) > 0)
                )
                .map((row, index) => ({
                    row_no: index + 1,
                    account: Number(row.account),
                    detail_account: row.detail_account ? Number(row.detail_account) : null,
                    cost_center: row.cost_center ? Number(row.cost_center) : null,
                    branch: row.branch ? Number(row.branch) : null,
                    department: row.department ? Number(row.department) : null,
                    note: row.note || "",
                    currency: row.currency || "IRR",
                    debit: String(toNumber(row.debit)),
                    credit: String(toNumber(row.credit)),
                })),
        };

        try {
            setSaving(true);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${id}/v2/documents/`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("ویرایش سند انجام نشد");
                return;
            }

            alert("سند با موفقیت ویرایش شد");

            window.location.href = `/accounting/documents/${id}`;
        } catch (err) {
            console.error(err);
            alert("خطا در ویرایش سند");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingBox}>
                    در حال دریافت اطلاعات سند...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>ویرایش سند حسابداری</h3>
                    <p>اطلاعات سند و ردیف‌های آن را ویرایش کن.</p>
                </div>

                <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={saving || !canWrite}
                    title={!canWrite ? disabledReason : undefined}
                    onClick={submitEdit}
                >
                    {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
            </div>

            <div className={styles.formCard}>
                <div className={styles.formGrid}>
                    <label>
                        سال مالی
                        <select
                            value={form.fiscal_year}
                            onChange={(e) =>
                                updateForm("fiscal_year", e.target.value)
                            }
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
                            onChange={(e) =>
                                updateForm("number", cleanMoney(e.target.value))
                            }
                        />
                    </label>

                    <label>
                        تاریخ
                        <DatePicker
                            value={form.date}
                            onChange={(date) =>
                                updateForm(
                                    "date",
                                    date ? date.format("YYYY/MM/DD") : ""
                                )
                            }
                            calendar={persian}
                            locale={persian_fa}
                            calendarPosition="bottom-right"
                            inputClass={styles.dateInput}
                        />
                    </label>

                    <label>
                        ارجاع
                        <input
                            value={form.reference}
                            onChange={(e) =>
                                updateForm("reference", e.target.value)
                            }
                        />
                    </label>

                    <label>
                        پروژه
                        <select
                            value={form.project}
                            onChange={(e) =>
                                updateForm("project", e.target.value)
                            }
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
                            onChange={(e) =>
                                updateForm("currency", e.target.value)
                            }
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
                            onChange={(e) =>
                                updateForm("status", e.target.value)
                            }
                        >
                            <option value="DRAFT">پیش نویس</option>
                            <option value="APPROVED">تایید شده</option>
                        </select>
                    </label>

                    <label>
                        نوع سند
                        <select
                            value={form.document_type}
                            onChange={(e) =>
                                updateForm("document_type", e.target.value)
                            }
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
                        onChange={(e) =>
                            updateForm("description", e.target.value)
                        }
                    />
                </label>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <div>
                        <h4>ردیف‌های سند</h4>
                        <p>هر ردیف فقط بدهکار یا بستانکار دارد.</p>
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
                                            onChange={(e) =>
                                                updateRow(index, "account", e.target.value)
                                            }
                                        >
                                            <option value="">انتخاب حساب</option>

                                            {accounts.map((account) => (
                                                <option
                                                    key={account.id}
                                                    value={account.id}
                                                >
                                                    {account.code} - {account.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.detail_account}
                                            onChange={(e) =>
                                                updateRow(index, "detail_account", e.target.value)
                                            }
                                        >
                                            <option value="">بدون تفصیل</option>

                                            {details.map((detail) => (
                                                <option
                                                    key={detail.id}
                                                    value={detail.id}
                                                >
                                                    {detail.code} - {detail.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.cost_center}
                                            onChange={(e) =>
                                                updateRow(index, "cost_center", e.target.value)
                                            }
                                        >
                                            <option value="">بدون مرکز هزینه</option>

                                            {costCenters.map((costCenter) => (
                                                <option
                                                    key={costCenter.id}
                                                    value={costCenter.id}
                                                >
                                                    {costCenter.code} - {costCenter.title}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.branch}
                                            onChange={(e) =>
                                                updateRow(index, "branch", e.target.value)
                                            }
                                        >
                                            <option value="">بدون شعبه</option>

                                            {branches.map((branch) => (
                                                <option
                                                    key={branch.id}
                                                    value={branch.id}
                                                >
                                                    {branch.code} - {branch.title}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={row.department}
                                            onChange={(e) =>
                                                updateRow(index, "department", e.target.value)
                                            }
                                        >
                                            <option value="">بدون دپارتمان</option>

                                            {departments.map((department) => (
                                                <option
                                                    key={department.id}
                                                    value={department.id}
                                                >
                                                    {department.code} - {department.title}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            value={row.note}
                                            onChange={(e) =>
                                                updateRow(index, "note", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={row.currency}
                                            onChange={(e) =>
                                                updateRow(index, "currency", e.target.value)
                                            }
                                        >
                                            <option value="IRR">ریال</option>
                                            <option value="IRT">تومان</option>
                                            <option value="USD">دلار</option>
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            inputMode="decimal"
                                            value={row.debit}
                                            onChange={(e) =>
                                                updateRow(index, "debit", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            inputMode="decimal"
                                            value={row.credit}
                                            onChange={(e) =>
                                                updateRow(index, "credit", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <span className={styles.amountBadge}>
                                            {(
                                                toNumber(row.debit) ||
                                                toNumber(row.credit)
                                            ).toLocaleString("fa-IR")}
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

                                <td>
                                    {totalDebit.toLocaleString("fa-IR")}
                                </td>

                                <td>
                                    {totalCredit.toLocaleString("fa-IR")}
                                </td>

                                <td colSpan="2">
                                    <span
                                        className={`${styles.balanceBadge} ${isBalanced
                                            ? styles.balanced
                                            : styles.notBalanced
                                            }`}
                                    >
                                        {isBalanced
                                            ? "تراز"
                                            : "نامتوازن"}
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