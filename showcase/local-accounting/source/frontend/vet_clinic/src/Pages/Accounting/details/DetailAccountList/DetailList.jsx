import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
// صفحه تفضیل
import { useEffect, useMemo, useState } from "react";
import styles from "./DetailList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;
const DETAILS_API = `${ACCOUNTING_BASE}/details/`;

const DETAIL_TYPES = [
    { value: "PERSON", label: "شخص" },
    { value: "CUSTOMER", label: "مشتری" },
    { value: "SUPPLIER", label: "تامین‌کننده" },
    { value: "BANK", label: "بانک" },
    { value: "CASH", label: "صندوق" },
    { value: "EMPLOYEE", label: "کارمند" },
    { value: "DOCTOR", label: "پزشک" },
    { value: "OTHER", label: "سایر" },
];

const emptyForm = {
    code: "",
    name: "",
    type: "PERSON",
    phone: "",
    national_code: "",
    economic_code: "",
    address: "",
    is_active: true,
};

export default function DetailList() {
    const { canWrite, disabledReason } = useModulePermission("accounting");

    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingDetail, setEditingDetail] = useState(null);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        fetchDetails();
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

    const buildQuery = () => {
        const params = new URLSearchParams();

        if (search.trim()) params.append("search", search.trim());
        if (typeFilter) params.append("type", typeFilter);
        if (activeFilter) params.append("is_active", activeFilter);

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchDetails = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${DETAILS_API}${buildQuery()}`);
            const data = await safeJson(res);

            setDetails(normalizeResponse(data));
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت تفصیل‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDetails();
        }, 350);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, typeFilter, activeFilter]);

    const filteredCount = useMemo(() => details.length, [details]);

    const getTypeLabel = (type) => {
        return DETAIL_TYPES.find((item) => item.value === type)?.label || type;
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

    const openCreateModal = () => {
        if (guardWrite()) return;

        setEditingDetail(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEditModal = (detail) => {
        if (guardWrite()) return;

        setEditingDetail(detail);
        setForm({
            code: detail.code || "",
            name: detail.name || "",
            type: detail.type || "PERSON",
            phone: detail.phone || "",
            national_code: detail.national_code || "",
            economic_code: detail.economic_code || "",
            address: detail.address || "",
            is_active: detail.is_active !== false,
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingDetail(null);
        setForm(emptyForm);
    };

    const submitDetail = async () => {
        if (guardWrite()) return;

        if (!form.code.trim()) {
            alert("کد تفصیل الزامی است");
            return;
        }

        if (!form.name.trim()) {
            alert("نام تفصیل الزامی است");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                code: form.code.trim(),
                name: form.name.trim(),
                type: form.type,
                phone: form.phone.trim(),
                national_code: form.national_code.trim(),
                economic_code: form.economic_code.trim(),
                address: form.address.trim(),
                is_active: form.is_active,
            };

            const url = editingDetail ? `${ACCOUNTING_DETAIL_BASE}/${editingDetail.id}/v2/details/` : DETAILS_API;
            const method = editingDetail ? "PUT" : "POST";

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
                alert("ذخیره تفصیل انجام نشد");
                return;
            }

            closeModal();
            await fetchDetails();
            alert(editingDetail ? "تفصیل ویرایش شد" : "تفصیل جدید ساخته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در ذخیره تفصیل");
        } finally {
            setSaving(false);
        }
    };

    const deleteDetail = async (detail) => {
        if (guardWrite()) return;

        const ok = window.confirm(`تفصیل "${detail.name}" حذف شود؟`);
        if (!ok) return;

        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${detail.id}/v2/details/`, {
                method: "DELETE",
            });

            if (!res.ok && res.status !== 204) {
                const data = await safeJson(res).catch(() => null);
                console.error(data);
                alert("حذف تفصیل انجام نشد");
                return;
            }

            await fetchDetails();
            alert("تفصیل حذف شد");
        } catch (err) {
            console.error(err);
            alert("خطا در حذف تفصیل");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setTypeFilter("");
        setActiveFilter("");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>تفصیل‌ها</h3>
                    <p>اشخاص، مشتریان، تامین‌کنندگان، بانک‌ها، صندوق‌ها و سایر تفصیل‌ها را مدیریت کن.</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={openCreateModal}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    ایجاد تفصیل جدید
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس کد، نام، موبایل، کد ملی..."
                    />
                </div>

                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="">همه نوع‌ها</option>
                    {DETAIL_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                    <option value="">همه وضعیت‌ها</option>
                    <option value="true">فعال</option>
                    <option value="false">غیرفعال</option>
                </select>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن فیلتر
                </button>

                <span className={styles.resultCount}>
                    {filteredCount.toLocaleString("fa-IR")} مورد
                </span>
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
                                <th>کد</th>
                                <th>نام</th>
                                <th>نوع</th>
                                <th>موبایل</th>
                                <th>کد ملی</th>
                                <th>کد اقتصادی</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {details.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className={styles.emptyState}>
                                        <strong>تفصیلی پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا تفصیل جدید بساز.</p>
                                    </td>
                                </tr>
                            ) : (
                                details.map((detail, index) => (
                                    <tr key={detail.id}>
                                        <td>{index + 1}</td>
                                        <td className={styles.codeCell}>{detail.code}</td>
                                        <td className={styles.nameCell}>{detail.name}</td>
                                        <td>
                                            <span className={styles.typeBadge}>
                                                {detail.type_display || getTypeLabel(detail.type)}
                                            </span>
                                        </td>
                                        <td>{detail.phone || "-"}</td>
                                        <td>{detail.national_code || "-"}</td>
                                        <td>{detail.economic_code || "-"}</td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${detail.is_active ? styles.activeBadge : styles.inactiveBadge
                                                    }`}
                                            >
                                                {detail.is_active ? "فعال" : "غیرفعال"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    type="button"
                                                    className={styles.btnLedger}
                                                    onClick={() => {
                                                        window.location.href = `/accounting/details/${detail.id}/ledger`;
                                                    }}
                                                >
                                                    گردش
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.btnEdit}
                                                    onClick={() => openEditModal(detail)}
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    ویرایش
                                                </button>

                                                <button
                                                    type="button"
                                                    className={styles.btnDelete}
                                                    onClick={() => deleteDetail(detail)}
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

            {modalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3>{editingDetail ? "ویرایش تفصیل" : "ایجاد تفصیل جدید"}</h3>

                        <div className={styles.formGrid}>
                            <label>
                                کد تفصیل
                                <input
                                    value={form.code}
                                    onChange={(e) => updateForm("code", e.target.value)}
                                    placeholder="مثلاً CUST-001"
                                />
                            </label>

                            <label>
                                نام تفصیل
                                <input
                                    value={form.name}
                                    onChange={(e) => updateForm("name", e.target.value)}
                                    placeholder="مثلاً علی رضایی"
                                />
                            </label>

                            <label>
                                نوع تفصیل
                                <select value={form.type} onChange={(e) => updateForm("type", e.target.value)}>
                                    {DETAIL_TYPES.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                وضعیت
                                <select
                                    value={form.is_active ? "true" : "false"}
                                    onChange={(e) => updateForm("is_active", e.target.value === "true")}
                                >
                                    <option value="true">فعال</option>
                                    <option value="false">غیرفعال</option>
                                </select>
                            </label>

                            <label>
                                موبایل / تلفن
                                <input
                                    value={form.phone}
                                    onChange={(e) => updateForm("phone", e.target.value)}
                                    placeholder="0912..."
                                />
                            </label>

                            <label>
                                کد ملی
                                <input
                                    value={form.national_code}
                                    onChange={(e) => updateForm("national_code", e.target.value)}
                                    placeholder="کد ملی"
                                />
                            </label>

                            <label>
                                کد اقتصادی
                                <input
                                    value={form.economic_code}
                                    onChange={(e) => updateForm("economic_code", e.target.value)}
                                    placeholder="کد اقتصادی"
                                />
                            </label>

                            <label className={styles.fullWidth}>
                                آدرس
                                <textarea
                                    value={form.address}
                                    onChange={(e) => updateForm("address", e.target.value)}
                                    placeholder="آدرس..."
                                />
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
                                onClick={submitDetail}
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