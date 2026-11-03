import { getAllPages } from "../../api/lists";
import { API_BASE_URL, extractList } from "../../api/http";
// src/Pages/Services/ServiceItemsTable.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
    FaEye,
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaPlus,
} from "react-icons/fa";
import styles from "./ServiceItemsTable.module.css";
import { PageHero, StatGrid, StatCard, PrimaryButton } from "../../components/ERP/ERP";
import { FiBriefcase, FiSearch, FiDollarSign } from "react-icons/fi";
import useModulePermission from "../../hooks/useModulePermission";
import ServiceDetailsModal from "./ServiceDetailsModal";

const API_URL = `${API_BASE_URL}/services/api/v2/services/`;
const DETAIL_URL = (id) => `${API_BASE_URL}/services/api/v2/services/${id}/`;

function ServiceItemsTable() {
    const { canWrite, disabledReason } = useModulePermission("catalog");

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedService, setSelectedService] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchServices = async () => {
        try {
            setLoading(true);
            setError("");

            const res = await getAllPages(API_URL);
            setServices(extractList(res.data));
        } catch (err) {
            console.error("Fetch services error:", err);
            setError("خطا در دریافت لیست خدمات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const filteredServices = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return services;

        return services.filter((service) =>
            [
                service.code,
                service.accounting_code,
                service.persian_name,
                service.english_name,
                service.category_name,
                service.description,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [services, searchTerm]);

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString("fa-IR");
    };

    const handleDelete = async () => {
        if (!canWrite) {
            alert(disabledReason);
            return;
        }

        if (!deleteTarget?.id) return;

        try {
            setDeleting(true);
            await axios.delete(DETAIL_URL(deleteTarget.id));

            setDeleteTarget(null);
            fetchServices();
        } catch (err) {
            console.error("Delete service error:", err);
            alert("حذف خدمت انجام نشد.");
        } finally {
            setDeleting(false);
        }
    };

    if (error) {
        return (
            <div className={styles.errorBox}>
                <strong>خطا</strong>
                <p>{error}</p>
                <button type="button" onClick={fetchServices}>
                    تلاش دوباره
                </button>
            </div>
        );
    }

    return (
        <>
            <PageHero eyebrow="کاتالوگ خدمات" title="خدمات" description="مدیریت خدمات، کد حسابداری، قیمت خرید و فروش" icon={<FiBriefcase />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { alert(disabledReason); return; } window.location.assign('/services/add'); }}><FaPlus /> افزودن خدمت</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل خدمات" value={services.length.toLocaleString("fa-IR")} icon={<FiBriefcase />} />
                <StatCard label="نتیجه جستجو" value={filteredServices.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
                <StatCard label="میانگین قیمت فروش" value={`${Math.round(services.reduce((sum, item) => sum + Number(item.service_selling_price || 0), 0) / (services.length || 1)).toLocaleString("fa-IR")} ریال`} icon={<FiDollarSign />} tone="success" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست خدمات</h3>
                        <p>مدیریت خدمات، کدها، قیمت‌ها و دسته‌بندی‌ها</p>
                    </div>

                    <Link
                        to="/services/add"
                        className={styles.addBtn}
                        aria-disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                        onClick={(e) => {
                            if (!canWrite) {
                                e.preventDefault();
                                alert(disabledReason);
                            }
                        }}
                    >
                        <FaPlus />
                        افزودن خدمت
                    </Link>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، کد خدمت، کد حسابداری یا توضیحات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredServices.length.toLocaleString("fa-IR")} خدمت
                    </div>
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
                                    <th>کد خدمت</th>
                                    <th>کد حسابداری</th>
                                    <th>نام فارسی</th>
                                    <th>نام انگلیسی</th>
                                    <th>قیمت فروش</th>
                                    <th>قیمت خرید</th>
                                    <th>مالیات</th>
                                    <th>شرح</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredServices.length === 0 ? (
                                    <tr>
                                        <td colSpan="10">
                                            <div className={styles.emptyState}>
                                                <strong>خدمتی پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا خدمت جدید اضافه کن.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredServices.map((service, index) => (
                                        <tr key={service.id}>
                                            <td>{index + 1}</td>

                                            <td>
                                                <code className={styles.code}>
                                                    {service.code || "-"}
                                                </code>
                                            </td>

                                            <td>
                                                <code className={styles.code}>
                                                    {service.accounting_code || "-"}
                                                </code>
                                            </td>

                                            <td className={styles.nameCell}>
                                                {service.persian_name || "-"}
                                            </td>

                                            <td>{service.english_name || "-"}</td>

                                            <td>
                                                <span className={styles.priceBadge}>
                                                    {formatMoney(service.service_selling_price)}{" "}
                                                    
                                                </span>
                                            </td>

                                            <td>
                                                <span className={styles.buyBadge}>
                                                    {formatMoney(service.service_buying_price)}{" "}
                                                    
                                                </span>
                                            </td>

                                            <td>{service.selling_tax ? `${Number(service.selling_tax_value || 0).toLocaleString("fa-IR")} ریال` : "معاف"}</td>

                                            <td>{service.description || "-"}</td>

                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.viewBtn}
                                                        onClick={() => setSelectedService(service)}
                                                        title="جزئیات"
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <Link
                                                        to={`/services/edit/${service.id}`}
                                                        className={styles.editBtn}
                                                        aria-disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : "ویرایش"}
                                                        onClick={(e) => {
                                                            if (!canWrite) {
                                                                e.preventDefault();
                                                                alert(disabledReason);
                                                            }
                                                        }}
                                                    >
                                                        <FaEdit />
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        className={styles.deleteBtn}
                                                        onClick={() => { if (!canWrite) { alert(disabledReason); return; } setDeleteTarget(service); }}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : "حذف"}
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

            {selectedService && (
                <ServiceDetailsModal
                    service={selectedService}
                    onClose={() => setSelectedService(null)}
                />
            )}

            {deleteTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalIcon}>
                            <FaTrashAlt />
                        </div>

                        <h3>حذف خدمت</h3>

                        <p>
                            آیا از حذف خدمت{" "}
                            <strong>
                                {deleteTarget.persian_name || deleteTarget.english_name}
                            </strong>{" "}
                            مطمئن هستی؟
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
                                disabled={deleting || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
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

export default ServiceItemsTable;
