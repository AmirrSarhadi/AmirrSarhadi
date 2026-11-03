import { getAllPages } from "../../api/lists";
import { extractList, API_BASE_URL } from "../../api/http";
// src/Pages/Persons/VendorList.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
    FaPlus,
    FaTrashAlt,
    FaEdit,
    FaCheckCircle,
    FaTimesCircle,
    FaSearch,
} from "react-icons/fa";
import { useTable, useSortBy } from "../../hooks/useTable";
import styles from "./PersonTable.module.css";
import { PageHero, StatGrid, StatCard, PrimaryButton } from "../../components/ERP/ERP";
import { FiUsers, FiUserCheck, FiSearch } from "react-icons/fi";
import useModulePermission from "../../hooks/useModulePermission";
import PersonChequesPanel from "../../components/PersonChequesPanel/PersonChequesPanel";
import PersonLedgerPanel from "../../components/PersonLedgerPanel/PersonLedgerPanel";

const API_LIST = `${API_BASE_URL}/persons/api/v2/vendor_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/vendor_list/`;

export default function VendorList() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [chequeVendor, setChequeVendor] = useState(null);
    const [ledgerVendor, setLedgerVendor] = useState(null);

    const navigate = useNavigate();

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(API_LIST);
            setVendors(extractList(data));
        } catch (error) {
            console.error("Fetch vendors error:", error);
            toast.error("خطا در دریافت لیست تأمین‌کنندگان");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const confirmDelete = async () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!deleteTarget?.id) return;

        try {
            setDeleting(true);
            await axios.delete(API_DETAIL(deleteTarget.id));
            toast.success("تأمین‌کننده با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchVendors();
        } catch (error) {
            console.error("Delete vendor error:", error);
            toast.error("حذف تأمین‌کننده موفقیت‌آمیز نبود");
        } finally {
            setDeleting(false);
        }
    };

    const StatusBadge = ({ value }) =>
        value ? (
            <span className={`${styles.statusBadge} ${styles.activeBadge}`}>
                <FaCheckCircle />
                فعال
            </span>
        ) : (
            <span className={`${styles.statusBadge} ${styles.inactiveBadge}`}>
                <FaTimesCircle />
                غیرفعال
            </span>
        );

    const columns = useMemo(
        () => [
            {
                Header: "ردیف",
                id: "rowIndex",
                Cell: ({ row }) => row.index + 1,
                disableSortBy: true,
            },
            { Header: "کد", accessor: "code", Cell: ({ value }) => value || "-" },
            { Header: "نام صاحب", accessor: "owner", Cell: ({ value }) => value || "-" },
            { Header: "شرکت", accessor: "company", Cell: ({ value }) => value || "-" },
            { Header: "کشور", accessor: "country", Cell: ({ value }) => value || "-" },
            { Header: "استان", accessor: "state", Cell: ({ value }) => value || "-" },
            { Header: "شهر", accessor: "city", Cell: ({ value }) => value || "-" },
            { Header: "موبایل", accessor: "mobile", Cell: ({ value }) => value || "-" },
            { Header: "تلفن", accessor: "phone", Cell: ({ value }) => value || "-" },
            { Header: "ایمیل", accessor: "email", Cell: ({ value }) => value || "-" },
            {
                Header: "شناسه ملی",
                accessor: "national_code",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "کد اقتصادی",
                accessor: "eco_code",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "شماره ثبت",
                accessor: "reg_number",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "وضعیت",
                accessor: "is_active",
                Cell: ({ value }) => <StatusBadge value={value} />,
            },
            {
                Header: "تاریخ تولد",
                accessor: "birthday_date",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "توضیحات",
                accessor: "description",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "عملیات",
                id: "actions",
                disableSortBy: true,
                Cell: ({ row }) => (
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.btnEdit}
                            disabled={!canWrite}
                            title={!canWrite ? disabledReason : "ویرایش"}
                            onClick={() => navigate(`/persons/vendors/edit/${row.original.id}`)}
                        >
                            <FaEdit />
                            <span>ویرایش</span>
                        </button>

                        <button
                            type="button"
                            className={styles.btnDelete}
                            disabled={!canWrite}
                            title={!canWrite ? disabledReason : "حذف"}
                            onClick={() => setDeleteTarget(row.original)}
                        >
                            <FaTrashAlt />
                            <span>حذف</span>
                        </button>

                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setChequeVendor(row.original)}
                        >
                            چک‌ها
                        </button>

                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setLedgerVendor(row.original)}
                        >
                            گردش حساب
                        </button>
                    </div>
                ),
            },
        ],
        [navigate, canWrite, disabledReason]
    );

    const filteredVendors = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return vendors;

        return vendors.filter((vendor) => {
            const searchableText = [
                vendor.code,
                vendor.owner,
                vendor.company,
                vendor.mobile,
                vendor.phone,
                vendor.email,
                vendor.national_code,
                vendor.eco_code,
                vendor.reg_number,
                vendor.city,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [vendors, searchTerm]);

    const tableInstance = useTable(
        {
            columns,
            data: filteredVendors,
        },
        useSortBy
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        tableInstance;

    return (
        <>
            <PageHero eyebrow="اشخاص و طرف‌حساب‌ها" title="تأمین‌کنندگان" description="مدیریت تأمین‌کنندگان، چک‌ها و گردش حساب" icon={<FiUsers />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { toast.error(disabledReason); return; } navigate("/persons/vendors/add"); }}><FaPlus /> افزودن تأمین‌کننده</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل تأمین‌کنندگان" value={vendors.length.toLocaleString("fa-IR")} icon={<FiUsers />} />
                <StatCard label="فعال" value={vendors.filter((item) => item.is_active !== false).length.toLocaleString("fa-IR")} icon={<FiUserCheck />} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredVendors.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست تأمین‌کنندگان</h3>
                        <p>مدیریت اطلاعات تأمین‌کنندگان، مشخصات تماس و اطلاعات ثبتی</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addBtn}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                        onClick={() => {
                            if (!canWrite) {
                                toast.error(disabledReason);
                                return;
                            }
                            navigate("/persons/vendors/add");
                        }}
                    >
                        <FaPlus />
                        افزودن تأمین‌کننده
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس شرکت، موبایل، کد اقتصادی یا شناسه ملی..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredVendors.length.toLocaleString("fa-IR")} تأمین‌کننده
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
                        <table {...getTableProps()} className={styles.table}>
                            <thead>
                                {headerGroups.map((headerGroup) => {
                                    const { key, ...headerGroupProps } =
                                        headerGroup.getHeaderGroupProps();

                                    return (
                                        <tr key={key} {...headerGroupProps}>
                                            {headerGroup.headers.map((column) => {
                                                const { key, ...columnProps } = column.getHeaderProps(
                                                    column.getSortByToggleProps()
                                                );

                                                return (
                                                    <th key={key} {...columnProps}>
                                                        {column.render("Header")}
                                                        <span className={styles.sortIcon}>
                                                            {column.isSorted
                                                                ? column.isSortedDesc
                                                                    ? "↓"
                                                                    : "↑"
                                                                : ""}
                                                        </span>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </thead>

                            <tbody {...getTableBodyProps()}>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length}>
                                            <div className={styles.emptyState}>
                                                <strong>تأمین‌کننده‌ای پیدا نشد</strong>
                                                <p>
                                                    عبارت جستجو را تغییر بده یا تأمین‌کننده جدید اضافه کن.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => {
                                        prepareRow(row);
                                        const { key, ...rowProps } = row.getRowProps();

                                        return (
                                            <tr key={key} {...rowProps}>
                                                {row.cells.map((cell) => {
                                                    const { key, ...cellProps } = cell.getCellProps();

                                                    return (
                                                        <td key={key} {...cellProps}>
                                                            {cell.render("Cell")}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {deleteTarget && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalIcon}>
                            <FaTrashAlt />
                        </div>

                        <h3>حذف تأمین‌کننده</h3>

                        <p>
                            آیا از حذف تأمین‌کننده{" "}
                            <strong>{deleteTarget.company || deleteTarget.owner || "انتخاب‌شده"}</strong>{" "}
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
                                onClick={confirmDelete}
                                disabled={deleting || !canWrite}
                                title={!canWrite ? disabledReason : undefined}
                            >
                                {deleting ? "در حال حذف..." : "حذف شود"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {chequeVendor && (
                <div className={styles.modalOverlay}>
                    <div className={styles.chequeModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>چک‌های تأمین‌کننده</h3>
                                <p>
                                    {chequeVendor.name ||
                                        chequeVendor.full_name ||
                                        chequeVendor.title ||
                                        chequeVendor.company ||
                                        "تأمین‌کننده"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setChequeVendor(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonChequesPanel
                            personType="vendor"
                            personId={chequeVendor.id}
                            title="چک‌های تأمین‌کننده"
                        />
                    </div>
                </div>
            )}

            {ledgerVendor && (
                <div className={styles.modalOverlay}>
                    <div className={styles.ledgerModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>گردش حساب تأمین‌کننده</h3>
                                <p>
                                    {ledgerVendor.name ||
                                        ledgerVendor.full_name ||
                                        ledgerVendor.title ||
                                        ledgerVendor.company ||
                                        "تأمین‌کننده"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setLedgerVendor(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonLedgerPanel
                            personType="vendor"
                            personId={ledgerVendor.id}
                            title="گردش حساب تأمین‌کننده"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
