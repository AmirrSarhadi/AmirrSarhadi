import { getAllPages } from "../../api/lists";
import { extractList, API_BASE_URL } from "../../api/http";
// src/Pages/Persons/StaffList.jsx
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


const API_LIST = `${API_BASE_URL}/persons/api/v2/staff_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/staff_list/`;

export default function StaffList() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [chequeStaff, setChequeStaff] = useState(null);
    const [ledgerStaff, setLedgerStaff] = useState(null);

    const navigate = useNavigate();

    const fetchStaffs = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(API_LIST);
            setStaffs(extractList(data));
        } catch (error) {
            console.error("Fetch staffs error:", error);
            toast.error("خطا در دریافت لیست کارمندان");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffs();
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
            toast.success("کارمند با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchStaffs();
        } catch (error) {
            console.error("Delete staff error:", error);
            toast.error("حذف کارمند موفقیت‌آمیز نبود");
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

    const YesNoBadge = ({ value, yes = "بله", no = "خیر" }) =>
        value ? (
            <span className={`${styles.statusBadge} ${styles.activeBadge}`}>
                <FaCheckCircle />
                {yes}
            </span>
        ) : (
            <span className={`${styles.statusBadge} ${styles.normalBadge}`}>
                <FaTimesCircle />
                {no}
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
            { Header: "نام", accessor: "first_name", Cell: ({ value }) => value || "-" },
            { Header: "نام خانوادگی", accessor: "last_name", Cell: ({ value }) => value || "-" },
            { Header: "شرکت", accessor: "company", Cell: ({ value }) => value || "-" },
            { Header: "سمت", accessor: "position", Cell: ({ value }) => value || "-" },
            { Header: "دپارتمان", accessor: "department", Cell: ({ value }) => value || "-" },
            { Header: "شهر", accessor: "city", Cell: ({ value }) => value || "-" },
            { Header: "موبایل", accessor: "mobile", Cell: ({ value }) => value || "-" },
            { Header: "ایمیل", accessor: "email", Cell: ({ value }) => value || "-" },
            {
                Header: "حقوق",
                accessor: "salary",
                Cell: ({ value }) => Number(value || 0).toLocaleString("fa-IR"),
            },
            { Header: "کد ملی", accessor: "national_id", Cell: ({ value }) => value || "-" },
            { Header: "تاریخ استخدام", accessor: "hire_date", Cell: ({ value }) => value || "-" },
            {
                Header: "مدیر",
                accessor: "is_manager",
                Cell: ({ value }) => <YesNoBadge value={value} yes="مدیر" no="عادی" />,
            },
            {
                Header: "تاییدکننده",
                accessor: "can_approve",
                Cell: ({ value }) => <YesNoBadge value={value} yes="دارد" no="ندارد" />,
            },
            {
                Header: "وضعیت",
                accessor: "is_active",
                Cell: ({ value }) => <StatusBadge value={value} />,
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
                            onClick={() => navigate(`/persons/staff/edit/${row.original.id}`)}
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
                            onClick={() => setChequeStaff(row.original)}
                        >
                            چک‌ها
                        </button>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setLedgerStaff(row.original)}
                        >
                            گردش حساب
                        </button>
                    </div>
                ),
            },
        ],
        [navigate, canWrite, disabledReason]
    );

    const filteredStaffs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return staffs;

        return staffs.filter((staff) => {
            const searchableText = [
                staff.code,
                staff.first_name,
                staff.last_name,
                staff.company,
                staff.position,
                staff.department,
                staff.mobile,
                staff.email,
                staff.national_id,
                staff.city,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [staffs, searchTerm]);

    const tableInstance = useTable(
        { columns, data: filteredStaffs },
        useSortBy
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        tableInstance;

    return (
        <>
            <PageHero eyebrow="اشخاص و طرف‌حساب‌ها" title="کارمندان" description="مدیریت پرسنل، اطلاعات تماس و وضعیت همکاری" icon={<FiUsers />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { toast.error(disabledReason); return; } navigate("/persons/staff/add"); }}><FaPlus /> افزودن کارمند</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل کارمندان" value={staffs.length.toLocaleString("fa-IR")} icon={<FiUsers />} />
                <StatCard label="فعال" value={staffs.filter((item) => item.is_active !== false).length.toLocaleString("fa-IR")} icon={<FiUserCheck />} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredStaffs.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست کارمندان</h3>
                        <p>مدیریت اطلاعات کارمندان، سمت‌ها، حقوق و وضعیت دسترسی</p>
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
                            navigate("/persons/staff/add");
                        }}
                    >
                        <FaPlus />
                        افزودن کارمند
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، موبایل، سمت، دپارتمان یا کد ملی..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredStaffs.length.toLocaleString("fa-IR")} کارمند
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
                                                <strong>کارمندی پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا کارمند جدید اضافه کن.</p>
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

                        <h3>حذف کارمند</h3>

                        <p>
                            آیا از حذف کارمند{" "}
                            <strong>
                                {deleteTarget.first_name || ""} {deleteTarget.last_name || ""}
                                {!deleteTarget.first_name &&
                                    !deleteTarget.last_name &&
                                    deleteTarget.company}
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
            {chequeStaff && (
                <div className={styles.modalOverlay}>
                    <div className={styles.chequeModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>چک‌های پرسنل</h3>
                                <p>
                                    {chequeStaff.name ||
                                        chequeStaff.full_name ||
                                        `${chequeStaff.first_name || ""} ${chequeStaff.last_name || ""}`.trim() ||
                                        "پرسنل"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setChequeStaff(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonChequesPanel
                            personType="staff"
                            personId={chequeStaff.id}
                            title="چک‌های پرسنل"
                        />
                    </div>
                </div>
            )}

            {ledgerStaff && (
                <div className={styles.modalOverlay}>
                    <div className={styles.ledgerModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>گردش حساب پرسنل</h3>
                                <p>
                                    {ledgerStaff.name ||
                                        ledgerStaff.full_name ||
                                        `${ledgerStaff.first_name || ""} ${ledgerStaff.last_name || ""}`.trim() ||
                                        "پرسنل"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setLedgerStaff(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonLedgerPanel
                            personType="staff"
                            personId={ledgerStaff.id}
                            title="گردش حساب پرسنل"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
