import { getAllPages } from "../../api/lists";
import { extractList, API_BASE_URL } from "../../api/http";
// src/Pages/Persons/DriverList.jsx
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

const API_LIST = `${API_BASE_URL}/persons/api/v2/driver_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/driver_list/`;

export default function DriverList() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const navigate = useNavigate();

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(API_LIST);
            setDrivers(extractList(data));
        } catch (error) {
            console.error("Fetch drivers error:", error);
            toast.error("خطا در دریافت لیست رانندگان");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
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
            toast.success("راننده با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchDrivers();
        } catch (error) {
            console.error("Delete driver error:", error);
            toast.error("حذف راننده موفقیت‌آمیز نبود");
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
            { Header: "نام", accessor: "first_name", Cell: ({ value }) => value || "-" },
            { Header: "نام خانوادگی", accessor: "last_name", Cell: ({ value }) => value || "-" },
            { Header: "نوع", accessor: "type", Cell: ({ value }) => value || "-" },
            { Header: "شرکت", accessor: "company", Cell: ({ value }) => value || "-" },
            { Header: "شهر", accessor: "city", Cell: ({ value }) => value || "-" },
            { Header: "موبایل", accessor: "mobile", Cell: ({ value }) => value || "-" },
            { Header: "تلفن", accessor: "phone", Cell: ({ value }) => value || "-" },
            {
                Header: "شماره گواهینامه",
                accessor: "licence_code",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "کد ملی",
                accessor: "national_code",
                Cell: ({ value }) => value || "-",
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
                            onClick={() => navigate(`/persons/drivers/edit/${row.original.id}`)}
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
                    </div>
                ),
            },
        ],
        [navigate, canWrite, disabledReason]
    );

    const filteredDrivers = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return drivers;

        return drivers.filter((driver) => {
            const searchableText = [
                driver.first_name,
                driver.last_name,
                driver.company,
                driver.mobile,
                driver.phone,
                driver.licence_code,
                driver.national_code,
                driver.city,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [drivers, searchTerm]);

    const tableInstance = useTable(
        { columns, data: filteredDrivers },
        useSortBy
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        tableInstance;

    return (
        <>
            <PageHero eyebrow="اشخاص و طرف‌حساب‌ها" title="رانندگان" description="مدیریت رانندگان و اطلاعات حمل‌ونقل" icon={<FiUsers />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { toast.error(disabledReason); return; } navigate("/persons/drivers/add"); }}><FaPlus /> افزودن راننده</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل رانندگان" value={drivers.length.toLocaleString("fa-IR")} icon={<FiUsers />} />
                <StatCard label="فعال" value={drivers.filter((item) => item.is_active !== false).length.toLocaleString("fa-IR")} icon={<FiUserCheck />} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredDrivers.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست رانندگان</h3>
                        <p>مدیریت اطلاعات رانندگان، گواهینامه، تماس و وضعیت فعالیت</p>
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
                            navigate("/persons/drivers/add");
                        }}
                    >
                        <FaPlus />
                        افزودن راننده
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، موبایل، گواهینامه یا کد ملی..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredDrivers.length.toLocaleString("fa-IR")} راننده
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
                                                <strong>راننده‌ای پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا راننده جدید اضافه کن.</p>
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

                        <h3>حذف راننده</h3>

                        <p>
                            آیا از حذف راننده{" "}
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
        </>
    );
}
