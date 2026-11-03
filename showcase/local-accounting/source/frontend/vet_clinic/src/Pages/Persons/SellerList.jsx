import { getAllPages } from "../../api/lists";
import { extractList, API_BASE_URL } from "../../api/http";
// src/Pages/Persons/SellerList.jsx
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


const API_LIST = `${API_BASE_URL}/persons/api/v2/seller_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/seller_list/`;

export default function SellerList() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [chequeSeller, setChequeSeller] = useState(null);
    const [ledgerSeller, setLedgerSeller] = useState(null);

    const navigate = useNavigate();

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(API_LIST);
            setSellers(extractList(data));
        } catch (error) {
            console.error("Fetch sellers error:", error);
            toast.error("خطا در دریافت لیست فروشندگان");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
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
            toast.success("فروشنده با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchSellers();
        } catch (error) {
            console.error("Delete seller error:", error);
            toast.error("حذف فروشنده موفقیت‌آمیز نبود");
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

    const CommissionBadge = ({ value }) =>
        value ? (
            <span className={`${styles.statusBadge} ${styles.activeBadge}`}>
                <FaCheckCircle />
                ثبت می‌شود
            </span>
        ) : (
            <span className={`${styles.statusBadge} ${styles.normalBadge}`}>
                <FaTimesCircle />
                ثبت نمی‌شود
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
            { Header: "موبایل", accessor: "mobile", Cell: ({ value }) => value || "-" },
            { Header: "شهر", accessor: "city", Cell: ({ value }) => value || "-" },
            {
                Header: "درصد فروش",
                accessor: "selling_percent",
                Cell: ({ value }) => `${value || 0}%`,
            },
            {
                Header: "درصد برگشت فروش",
                accessor: "sell_back_percent",
                Cell: ({ value }) => `${value || 0}%`,
            },
            {
                Header: "هدف فروش",
                accessor: "sales_target",
                Cell: ({ value }) => Number(value || 0).toLocaleString("fa-IR"),
            },
            {
                Header: "جمع فروش",
                accessor: "total_sales",
                Cell: ({ value }) => Number(value || 0).toLocaleString("fa-IR"),
            },
            {
                Header: "حساب هزینه",
                accessor: "expense_account",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "تاریخ استخدام",
                accessor: "hire_date",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "ثبت کمیسیون",
                accessor: "recording_commission",
                Cell: ({ value }) => <CommissionBadge value={value} />,
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
                            onClick={() => navigate(`/persons/sellers/edit/${row.original.id}`)}
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
                            onClick={() => setChequeSeller(row.original)}
                        >
                            چک‌ها
                        </button>
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setLedgerSeller(row.original)}
                        >
                            گردش حساب
                        </button>
                    </div>
                ),
            },
        ],
        [navigate, canWrite, disabledReason]
    );

    const filteredSellers = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return sellers;

        return sellers.filter((seller) => {
            const searchableText = [
                seller.code,
                seller.first_name,
                seller.last_name,
                seller.company,
                seller.owner,
                seller.mobile,
                seller.email,
                seller.national_id,
                seller.city,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [sellers, searchTerm]);

    const tableInstance = useTable(
        { columns, data: filteredSellers },
        useSortBy
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        tableInstance;

    return (
        <>
            <PageHero eyebrow="اشخاص و طرف‌حساب‌ها" title="فروشندگان" description="مدیریت فروشندگان، عملکرد و گردش حساب" icon={<FiUsers />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { toast.error(disabledReason); return; } navigate("/persons/sellers/add"); }}><FaPlus /> افزودن فروشنده</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل فروشندگان" value={sellers.length.toLocaleString("fa-IR")} icon={<FiUsers />} />
                <StatCard label="فعال" value={sellers.filter((item) => item.is_active !== false).length.toLocaleString("fa-IR")} icon={<FiUserCheck />} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredSellers.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست فروشندگان</h3>
                        <p>مدیریت اطلاعات فروشندگان، پورسانت، هدف فروش و وضعیت فعالیت</p>
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
                            navigate("/persons/sellers/add");
                        }}
                    >
                        <FaPlus />
                        افزودن فروشنده
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، موبایل، شرکت یا کد فروشنده..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredSellers.length.toLocaleString("fa-IR")} فروشنده
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
                                                <strong>فروشنده‌ای پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده یا فروشنده جدید اضافه کن.</p>
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

                        <h3>حذف فروشنده</h3>

                        <p>
                            آیا از حذف فروشنده{" "}
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
            {chequeSeller && (
                <div className={styles.modalOverlay}>
                    <div className={styles.chequeModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>چک‌های فروشنده</h3>
                                <p>
                                    {chequeSeller.name ||
                                        chequeSeller.full_name ||
                                        chequeSeller.title ||
                                        chequeSeller.company ||
                                        "فروشنده"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setChequeSeller(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonChequesPanel
                            personType="seller"
                            personId={chequeSeller.id}
                            title="چک‌های فروشنده"
                        />
                    </div>
                </div>
            )}

            {ledgerSeller && (
                <div className={styles.modalOverlay}>
                    <div className={styles.ledgerModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>گردش حساب فروشنده</h3>
                                <p>
                                    {ledgerSeller.name ||
                                        ledgerSeller.full_name ||
                                        ledgerSeller.title ||
                                        ledgerSeller.company ||
                                        "فروشنده"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setLedgerSeller(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonLedgerPanel
                            personType="seller"
                            personId={ledgerSeller.id}
                            title="گردش حساب فروشنده"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
