import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import styles from "./AccountList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;
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

const emptyForm = {
    code: "",
    name: "",
    type: "ASSET",
    parent: "",
    is_postable: true,
};

export default function AccountList() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [accounts, setAccounts] = useState([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [postableFilter, setPostableFilter] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        fetchAccounts();
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

    const fetchAccounts = async () => {
        try {
            setLoading(true);

            const res = await authFetch(ACCOUNTS_API);
            const data = await safeJson(res);

            setAccounts(normalizeResponse(data));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت لیست حساب‌ها");
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = useMemo(() => {
        return accounts.filter((account) => {
            const q = search.trim().toLowerCase();

            const matchesSearch =
                !q ||
                String(account.name || "").toLowerCase().includes(q) ||
                String(account.code || "").toLowerCase().includes(q);

            const matchesType = !typeFilter || account.type === typeFilter;

            const matchesPostable =
                !postableFilter ||
                String(account.is_postable) === postableFilter;

            return matchesSearch && matchesType && matchesPostable;
        });
    }, [accounts, search, typeFilter, postableFilter]);

    const rootAccounts = useMemo(() => {
        return filteredAccounts.filter((item) => !item.parent);
    }, [filteredAccounts]);

    const childrenMap = useMemo(() => {
        const map = {};

        filteredAccounts.forEach((account) => {
            if (account.parent) {
                if (!map[account.parent]) map[account.parent] = [];
                map[account.parent].push(account);
            }
        });

        return map;
    }, [filteredAccounts]);

    const getTypeLabel = (type) => {
        return ACCOUNT_TYPES.find((item) => item.value === type)?.label || type;
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const openCreateModal = () => {
        if (guardWrite()) return;

        setEditingAccount(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (account) => {
        if (guardWrite()) return;

        setEditingAccount(account);
        setForm({
            code: account.code || "",
            name: account.name || "",
            type: account.type || "ASSET",
            parent: account.parent || "",
            is_postable: !!account.is_postable,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingAccount(null);
        setForm(emptyForm);
    };

    const updateForm = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const submitAccount = async () => {
        if (guardWrite()) return;

        if (!form.code.trim()) {
            alert("کد حساب الزامی است");
            return;
        }

        if (!form.name.trim()) {
            alert("نام حساب الزامی است");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                code: form.code.trim(),
                name: form.name.trim(),
                type: form.type,
                parent: form.parent ? Number(form.parent) : null,
                is_postable: form.is_postable,
            };

            const url = editingAccount
                ? `${ACCOUNTING_DETAIL_BASE}/${editingAccount.id}/v2/accounts/`
                : ACCOUNTS_API;

            const method = editingAccount ? "PUT" : "POST";

            const res = await authFetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("ثبت حساب انجام نشد");
                return;
            }

            closeModal();
            await fetchAccounts();
            alert(editingAccount ? "حساب ویرایش شد" : "حساب جدید ساخته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در ذخیره حساب");
        } finally {
            setSaving(false);
        }
    };

    const deleteAccount = async (account) => {
        if (guardWrite()) return;

        const ok = window.confirm(`حساب "${account.name}" حذف شود؟`);
        if (!ok) return;

        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${account.id}/v2/accounts/`, {
                method: "DELETE",
            });

            if (!res.ok && res.status !== 204) {
                const data = await safeJson(res).catch(() => null);
                console.error(data);
                alert("حذف حساب انجام نشد");
                return;
            }

            await fetchAccounts();
        } catch (err) {
            console.error(err);
            alert("خطا در حذف حساب");
        }
    };

    const togglePostable = async (account) => {
        if (guardWrite()) return;

        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${account.id}/v2/accounts/toggle-postable/`, {
                method: "POST",
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("تغییر وضعیت انجام نشد");
                return;
            }

            await fetchAccounts();
        } catch (err) {
            console.error(err);
            alert("خطا در تغییر وضعیت");
        }
    };

    const renderAccountRow = (account, level = 0) => {
        const children = childrenMap[account.id] || [];

        return (
            <Fragment key={account.id}>
                <tr>
                    <td>{account.code}</td>

                    <td className={styles.nameCell}>
                        <span style={{ paddingRight: `${level * 22}px` }}>
                            {level > 0 ? "↳ " : ""}
                            {account.name}
                        </span>
                    </td>

                    <td>{getTypeLabel(account.type)}</td>

                    <td>{level + 1}</td>

                    <td>{account.parent_name || "-"}</td>

                    <td>
                        <span
                            className={`${styles.badge} ${account.is_postable ? styles.postableBadge : styles.groupBadge
                                }`}
                        >
                            {account.is_postable ? "قابل ثبت" : "گروهی"}
                        </span>
                    </td>

                    <td>
                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => openEditModal(account)}
                                disabled={!canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                ویرایش
                            </button>

                            <button
                                type="button"
                                className={styles.btnToggle}
                                onClick={() => togglePostable(account)}
                                disabled={!canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {account.is_postable ? "گروهی کن" : "قابل ثبت کن"}
                            </button>

                            <button
                                type="button"
                                className={styles.btnDelete}
                                onClick={() => deleteAccount(account)}
                                disabled={!canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                حذف
                            </button>
                        </div>
                    </td>
                </tr>

                {children.map((child) => renderAccountRow(child, level + 1))}
            </Fragment>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>درخت حساب‌ها</h3>
                    <p>حساب‌های اصلی، زیرحساب‌ها و حساب‌های قابل ثبت را مدیریت کن.</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={openCreateModal}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    ایجاد حساب جدید
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس کد یا نام حساب..."
                    />
                </div>

                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">همه نوع‌ها</option>
                    {ACCOUNT_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <select
                    value={postableFilter}
                    onChange={(e) => setPostableFilter(e.target.value)}
                >
                    <option value="">همه وضعیت‌ها</option>
                    <option value="true">قابل ثبت</option>
                    <option value="false">گروهی</option>
                </select>

                <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => {
                        setSearch("");
                        setTypeFilter("");
                        setPostableFilter("");
                    }}
                >
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
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>کد</th>
                                <th>نام حساب</th>
                                <th>نوع</th>
                                <th>سطح</th>
                                <th>والد</th>
                                <th>وضعیت ثبت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className={styles.emptyState}>
                                        <strong>حسابی پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا حساب جدید بساز.</p>
                                    </td>
                                </tr>
                            ) : rootAccounts.length > 0 ? (
                                rootAccounts.map((account) => renderAccountRow(account))
                            ) : (
                                filteredAccounts.map((account) => renderAccountRow(account))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>{editingAccount ? "ویرایش حساب" : "ایجاد حساب جدید"}</h3>

                        <div className={styles.formGrid}>
                            <label>
                                کد حساب
                                <input
                                    value={form.code}
                                    onChange={(e) => updateForm("code", e.target.value)}
                                    placeholder="مثلاً 10101"
                                />
                            </label>

                            <label>
                                نام حساب
                                <input
                                    value={form.name}
                                    onChange={(e) => updateForm("name", e.target.value)}
                                    placeholder="مثلاً بانک ملت"
                                />
                            </label>

                            <label>
                                نوع حساب
                                <select value={form.type} onChange={(e) => updateForm("type", e.target.value)}>
                                    {ACCOUNT_TYPES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                حساب والد
                                <select
                                    value={form.parent}
                                    onChange={(e) => updateForm("parent", e.target.value)}
                                >
                                    <option value="">بدون والد</option>
                                    {accounts
                                        .filter((item) => item.id !== editingAccount?.id)
                                        .map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.code} - {item.name}
                                            </option>
                                        ))}
                                </select>
                            </label>

                            <label>
                                وضعیت ثبت
                                <select
                                    value={form.is_postable ? "true" : "false"}
                                    onChange={(e) => updateForm("is_postable", e.target.value === "true")}
                                >
                                    <option value="true">قابل ثبت</option>
                                    <option value="false">گروهی</option>
                                </select>
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={closeModal}
                                disabled={saving}
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                className={styles.confirmBtn}
                                onClick={submitAccount}
                                disabled={saving || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {saving ? "در حال ذخیره..." : "ذخیره"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}