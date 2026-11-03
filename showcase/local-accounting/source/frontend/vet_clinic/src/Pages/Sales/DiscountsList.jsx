import { getAllPages } from "../../api/lists";
import { API_BASE_URL, extractList } from "../../api/http";
// src/Pages/Sales/DiscountsList.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrashAlt, FaPlus, FaSearch } from "react-icons/fa";
import styles from "./DiscountsList.module.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE = API_BASE_URL;

const DISCOUNT_TYPE_LABELS = {
    all_materials: "همه کالاها",
    all_persons: "همه اشخاص",
    material: "کالا",
    person: "شخص",
    material_category: "دسته‌بندی کالا",
    person_category: "دسته‌بندی شخص",
};

const money = (value) => Number(value || 0).toLocaleString("fa-IR");

export default function DiscountsList() {
    const navigate = useNavigate();

    const [discounts, setDiscounts] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [vendors, setVendors] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);

            const [
                discountsRes,
                materialsRes,
                customersRes,
                sellersRes,
                vendorsRes,
            ] = await Promise.all([
                getAllPages(`${API_BASE}/incomes/api/v2/income_discounts/`),
                getAllPages(`${API_BASE}/services/api/v2/materials/`),
                getAllPages(`${API_BASE}/persons/api/v2/customer_list/`),
                getAllPages(`${API_BASE}/persons/api/v2/seller_list/`),
                getAllPages(`${API_BASE}/persons/api/v2/vendor_list/`),
            ]);

            setDiscounts(extractList(discountsRes.data));
            setMaterials(extractList(materialsRes.data));
            setCustomers(extractList(customersRes.data));
            setSellers(extractList(sellersRes.data));
            setVendors(extractList(vendorsRes.data));
        } catch (err) {
            console.error("Fetch discounts error:", err);
            toast.error("خطا در دریافت لیست تخفیف‌ها");
        } finally {
            setLoading(false);
        }
    };

    const materialMap = useMemo(() => {
        const map = new Map();
        materials.forEach((m) =>
            map.set(m.id, m.persian_name || m.english_name || `#${m.id}`)
        );
        return map;
    }, [materials]);

    const customerMap = useMemo(() => {
        const map = new Map();
        customers.forEach((p) =>
            map.set(
                p.id,
                p.company ||
                `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                `#${p.id}`
            )
        );
        return map;
    }, [customers]);

    const sellerMap = useMemo(() => {
        const map = new Map();
        sellers.forEach((p) =>
            map.set(
                p.id,
                p.company ||
                `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                `#${p.id}`
            )
        );
        return map;
    }, [sellers]);

    const vendorMap = useMemo(() => {
        const map = new Map();
        vendors.forEach((p) =>
            map.set(
                p.id,
                p.company ||
                `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
                `#${p.id}`
            )
        );
        return map;
    }, [vendors]);

    const getTargetText = (discount) => {
        if (discount.discount_type === "material") {
            return materialMap.get(discount.target_material) || "کالای انتخاب‌شده";
        }

        if (discount.discount_type === "person") {
            const parts = [];

            if (discount.target_customer) {
                parts.push(`مشتری: ${customerMap.get(discount.target_customer) || "#"}`);
            }

            if (discount.target_seller) {
                parts.push(`فروشنده: ${sellerMap.get(discount.target_seller) || "#"}`);
            }

            if (discount.target_vendor) {
                parts.push(`تأمین‌کننده: ${vendorMap.get(discount.target_vendor) || "#"}`);
            }

            return parts.length ? parts.join("، ") : "شخص انتخاب‌شده";
        }

        return DISCOUNT_TYPE_LABELS[discount.discount_type] || "—";
    };

    const filteredDiscounts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        return discounts.filter((d) => {
            const target = getTargetText(d);

            const matchesType = typeFilter === "all" || d.discount_type === typeFilter;

            const matchesSearch =
                !q ||
                [
                    d.title,
                    d.description,
                    d.notes,
                    DISCOUNT_TYPE_LABELS[d.discount_type],
                    target,
                    d.percent,
                    d.amount,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(q);

            return matchesType && matchesSearch;
        });
    }, [
        discounts,
        searchTerm,
        typeFilter,
        materialMap,
        customerMap,
        sellerMap,
        vendorMap,
    ]);

    const handleDelete = async () => {
        if (!deleteTarget?.id) return;

        try {
            setDeleting(true);

            await axios.delete(
                `${API_BASE}/incomes/api/${deleteTarget.id}/v2/income_discounts/`
            );

            toast.success("تخفیف با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchAll();
        } catch (err) {
            console.error("Delete discount error:", err);
            toast.error("حذف تخفیف ناموفق بود");
        } finally {
            setDeleting(false);
        }
    };

    const typesForFilter = [
        { value: "all", label: "همه" },
        ...Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
        })),
    ];

    return (
        <>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست اقلام تخفیف‌دار</h3>
                        <p>مدیریت تخفیف‌های فروش بر اساس کالا، شخص یا گروه‌های عمومی</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => navigate("/sales/discounts/new")}
                    >
                        <FaPlus />
                        اقلام تخفیف‌دار جدید
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس عنوان، نوع، هدف، مبلغ یا توضیحات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredDiscounts.length.toLocaleString("fa-IR")} تخفیف
                    </div>
                </div>

                <div className={styles.tabs}>
                    {typesForFilter.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            className={`${styles.tab} ${typeFilter === item.value ? styles.active : ""
                                }`}
                            onClick={() => setTypeFilter(item.value)}
                        >
                            {item.label}
                        </button>
                    ))}
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
                                    <th>عنوان</th>
                                    <th>نوع</th>
                                    <th>هدف</th>
                                    <th>درصد</th>
                                    <th>مبلغ</th>
                                    <th>اعتبار</th>
                                    <th>نوع مصرف</th>
                                    <th>تعداد استفاده</th>
                                    <th>توضیحات</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredDiscounts.length === 0 ? (
                                    <tr>
                                        <td colSpan="11">
                                            <div className={styles.emptyState}>
                                                <strong>تخفیفی پیدا نشد</strong>
                                                <p>تخفیف جدید ثبت کن یا عبارت جستجو را تغییر بده.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDiscounts.map((d, index) => (
                                        <tr key={d.id}>
                                            <td>{index + 1}</td>

                                            <td className={styles.titleCell}>{d.title || "—"}</td>

                                            <td>
                                                <span className={styles.typeBadge}>
                                                    {DISCOUNT_TYPE_LABELS[d.discount_type] || "—"}
                                                </span>
                                            </td>

                                            <td>{getTargetText(d)}</td>

                                            <td>
                                                <span className={styles.percentBadge}>
                                                    {Number(d.percent || 0).toLocaleString("fa-IR")}٪
                                                </span>
                                            </td>

                                            <td>
                                                <span className={styles.amountBadge}>
                                                    {money(d.amount)}
                                                </span>
                                            </td>

                                            <td>
                                                <div className={styles.dateRange}>
                                                    <span>{d.valid_from || "—"}</span>
                                                    <small>تا</small>
                                                    <span>{d.valid_to || "—"}</span>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`${styles.statusBadge} ${d.single_use ? styles.warningBadge : styles.activeBadge
                                                        }`}
                                                >
                                                    {d.single_use ? "یکبار مصرف" : "چندبار مصرف"}
                                                </span>
                                            </td>

                                            <td>{Number(d.usage_count || 0).toLocaleString("fa-IR")}</td>

                                            <td>{d.notes || d.description || "—"}</td>

                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.editBtn}
                                                        onClick={() =>
                                                            navigate(`/sales/discounts/new?id=${d.id}`)
                                                        }
                                                        title="ویرایش"
                                                    >
                                                        <FaEdit />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        onClick={() => setDeleteTarget(d)}
                                                        title="حذف"
                                                    >
                                                        <FaTrashAlt />
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
            </div>

            {deleteTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.confirmModal}>
                        <div className={styles.modalIcon}>
                            <FaTrashAlt />
                        </div>

                        <h3>حذف تخفیف</h3>

                        <p>
                            آیا از حذف تخفیف <strong>{deleteTarget.title}</strong> مطمئن هستی؟
                        </p>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                className={styles.confirmDeleteBtn}
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? "در حال حذف..." : "حذف شود"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}