import { getAllPages } from "../../api/lists";
import { extractList, API_BASE_URL } from "../../api/http";
// src/Pages/Persons/ShareHolderList.jsx
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

const API_LIST = `${API_BASE_URL}/persons/api/v2/shareholder_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/shareholder_list/`;

export default function ShareHolderList() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const [shareholders, setShareholders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const navigate = useNavigate();

    const fetchShareholders = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(API_LIST);
            setShareholders(extractList(data));
        } catch (error) {
            console.error("Fetch shareholders error:", error);
            toast.error("خطا در دریافت لیست سهام‌داران");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShareholders();
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
            toast.success("سهام‌دار با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchShareholders();
        } catch (error) {
            console.error("Delete shareholder error:", error);
            toast.error("حذف سهام‌دار موفقیت‌آمیز نبود");
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

    const ShareBadge = ({ value }) => (
        <span className={`${styles.statusBadge} ${styles.vipBadge}`}>
            {Number(value || 0).toLocaleString("fa-IR")}٪
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
            { Header: "نوع", accessor: "type", Cell: ({ value }) => value || "-" },
            { Header: "نام", accessor: "first_name", Cell: ({ value }) => value || "-" },
            { Header: "نام خانوادگی", accessor: "last_name", Cell: ({ value }) => value || "-" },
            { Header: "شرکت", accessor: "company", Cell: ({ value }) => value || "-" },
            { Header: "مالک", accessor: "owner", Cell: ({ value }) => value || "-" },
            { Header: "شهر", accessor: "city", Cell: ({ value }) => value || "-" },
            { Header: "موبایل", accessor: "mobile", Cell: ({ value }) => value || "-" },
            { Header: "تلفن", accessor: "phone", Cell: ({ value }) => value || "-" },
            {
                Header: "درصد سهم",
                accessor: "share_precent",
                Cell: ({ value }) => <ShareBadge value={value} />,
            },
            {
                Header: "وضعیت",
                accessor: "is_active",
                Cell: ({ value }) => <StatusBadge value={value} />,
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
                            onClick={() =>
                                navigate(`/persons/shareholders/edit/${row.original.id}`)
                            }
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

    const filteredShareholders = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return shareholders;

        return shareholders.filter((item) => {
            const searchableText = [
                item.type,
                item.first_name,
                item.last_name,
                item.company,
                item.owner,
                item.mobile,
                item.phone,
                item.share_precent,
                item.city,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [shareholders, searchTerm]);

    const tableInstance = useTable(
        { columns, data: filteredShareholders },
        useSortBy
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        tableInstance;

    return (
        <>
            <PageHero eyebrow="اشخاص و طرف‌حساب‌ها" title="سهام‌داران" description="مدیریت سهام‌داران و اطلاعات پایه" icon={<FiUsers />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { toast.error(disabledReason); return; } navigate("/persons/shareholders/add"); }}><FaPlus /> افزودن سهام‌دار</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل سهام‌داران" value={shareholders.length.toLocaleString("fa-IR")} icon={<FiUsers />} />
                <StatCard label="فعال" value={shareholders.filter((item) => item.is_active !== false).length.toLocaleString("fa-IR")} icon={<FiUserCheck />} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredShareholders.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست سهام‌داران</h3>
                        <p>مدیریت اطلاعات سهام‌داران، درصد سهم و وضعیت فعالیت</p>
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
                            navigate("/persons/shareholders/add");
                        }}
                    >
                        <FaPlus />
                        افزودن سهام‌دار
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، شرکت، موبایل یا درصد سهم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredShareholders.length.toLocaleString("fa-IR")} سهام‌دار
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
                                                <strong>سهام‌داری پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا سهام‌دار جدید اضافه کن.</p>
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

                        <h3>حذف سهام‌دار</h3>

                        <p>
                            آیا از حذف سهام‌دار{" "}
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
