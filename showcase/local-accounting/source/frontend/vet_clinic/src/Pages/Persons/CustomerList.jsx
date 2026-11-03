import { getAllPages } from "../../api/lists";
import { extractList, API_BASE_URL } from "../../api/http";
// src/Pages/Persons/CustomerList.jsx
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


const API_LIST = `${API_BASE_URL}/persons/api/v2/customer_list/`;
const API_DETAIL = (id) =>
    `${API_BASE_URL}/persons/api/${id}/v2/customer_list/`;

export default function CustomerList() {
    const { canWrite, disabledReason } = useModulePermission("persons");

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [chequeCustomer, setChequeCustomer] = useState(null);
    const [ledgerCustomer, setLedgerCustomer] = useState(null);

    const navigate = useNavigate();

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(API_LIST);
            setCustomers(extractList(data));
        } catch (error) {
            console.error("Fetch customers error:", error);
            toast.error("خطا در دریافت لیست مشتریان");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
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

            toast.success("مشتری با موفقیت حذف شد");
            setDeleteTarget(null);
            fetchCustomers();
        } catch (error) {
            console.error("Delete customer error:", error);
            toast.error("حذف مشتری موفقیت‌آمیز نبود");
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

    const VipBadge = ({ value }) =>
        value ? (
            <span className={`${styles.statusBadge} ${styles.vipBadge}`}>VIP</span>
        ) : (
            <span className={`${styles.statusBadge} ${styles.normalBadge}`}>
                عادی
            </span>
        );

    const CreditBadge = ({ value }) => {
        const amount = Number(value || 0);

        if (amount > 0) {
            return (
                <span className={`${styles.balanceBadge} ${styles.creditBadge}`}>
                    بستانکار: {amount.toLocaleString("fa-IR")}
                </span>
            );
        }

        if (amount < 0) {
            return (
                <span className={`${styles.balanceBadge} ${styles.debtBadge}`}>
                    بدهکار: {Math.abs(amount).toLocaleString("fa-IR")}
                </span>
            );
        }

        return (
            <span className={`${styles.balanceBadge} ${styles.zeroBadge}`}>
                تسویه
            </span>
        );
    };

    const columns = useMemo(
        () => [
            {
                Header: "ردیف",
                id: "rowIndex",
                Cell: ({ row }) => row.index + 1,
                disableSortBy: true,
            },
            {
                Header: "کد",
                accessor: "code",
            },
            {
                Header: "نام صاحب",
                accessor: "owner",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "نام",
                accessor: "first_name",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "نام خانوادگی",
                accessor: "last_name",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "نوع",
                accessor: "type",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "شرکت",
                accessor: "company",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "شهر",
                accessor: "city",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "موبایل",
                accessor: "mobile",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "ایمیل",
                accessor: "email",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "شناسه ملی",
                accessor: "national_code",
                Cell: ({ value }) => value || "-",
            },
            {
                Header: "اعتبار مالی",
                accessor: "financial_credit",
                Cell: ({ value }) => <CreditBadge value={value} />,
            },
            {
                Header: "وضعیت",
                accessor: "is_active",
                Cell: ({ value }) => <StatusBadge value={value} />,
            },
            {
                Header: "نوع مشتری",
                accessor: "is_vip",
                Cell: ({ value }) => <VipBadge value={value} />,
            },
            {
                Header: "درصد تخفیف",
                accessor: "discount_percentage",
                Cell: ({ value }) => `${value || 0}%`,
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
                                navigate(`/persons/customers/edit/${row.original.id}`)
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
                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setChequeCustomer(row.original)}
                        >
                            چک‌ها
                        </button>

                        <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => setLedgerCustomer(row.original)}
                        >
                            گردش حساب
                        </button>
                    </div>
                ),
            },
        ],
        [navigate, canWrite, disabledReason]
    );

    const filteredCustomers = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return customers;

        return customers.filter((customer) => {
            const searchableText = [
                customer.code,
                customer.owner,
                customer.first_name,
                customer.last_name,
                customer.company,
                customer.mobile,
                customer.email,
                customer.national_code,
                customer.city,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(q);
        });
    }, [customers, searchTerm]);

    const tableInstance = useTable(
        {
            columns,
            data: filteredCustomers,
        },
        useSortBy
    );

    const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
        tableInstance;

    return (
        <>
            <PageHero eyebrow="اشخاص و طرف‌حساب‌ها" title="مشتریان" description="مدیریت پرونده، اعتبار و گردش حساب مشتریان" icon={<FiUsers />} actions={<PrimaryButton type="button" disabled={!canWrite} title={!canWrite ? disabledReason : undefined} onClick={() => { if (!canWrite) { toast.error(disabledReason); return; } navigate("/persons/customers/add"); }}><FaPlus /> افزودن مشتری</PrimaryButton>} />
            <StatGrid>
                <StatCard label="کل مشتریان" value={customers.length.toLocaleString("fa-IR")} icon={<FiUsers />} />
                <StatCard label="فعال" value={customers.filter((item) => item.is_active !== false).length.toLocaleString("fa-IR")} icon={<FiUserCheck />} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredCustomers.length.toLocaleString("fa-IR")} icon={<FiSearch />} tone="info" />
            </StatGrid>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست مشتریان</h3>
                        <p>مدیریت اطلاعات مشتریان، وضعیت حساب و مشخصات تماس</p>
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
                            navigate("/persons/customers/add");
                        }}
                    >
                        <FaPlus />
                        افزودن مشتری
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="جستجو بر اساس نام، موبایل، شرکت یا شناسه ملی..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredCustomers.length.toLocaleString("fa-IR")} مشتری
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
                                                <strong>مشتری‌ای پیدا نشد</strong>
                                                <p>
                                                    عبارت جستجو را تغییر بده یا مشتری جدید اضافه کن.
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

                        <h3>حذف مشتری</h3>

                        <p>
                            آیا از حذف مشتری{" "}
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
            {chequeCustomer && (
                <div className={styles.modalOverlay}>
                    <div className={styles.chequeModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>چک‌های مشتری</h3>
                                <p>
                                    {chequeCustomer.name ||
                                        chequeCustomer.full_name ||
                                        chequeCustomer.title ||
                                        "مشتری"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setChequeCustomer(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonChequesPanel
                            personType="customer"
                            personId={chequeCustomer.id}
                            title="چک‌های مشتری"
                        />
                    </div>
                </div>
            )}

            {ledgerCustomer && (
                <div className={styles.modalOverlay}>
                    <div className={styles.ledgerModal}>
                        <div className={styles.reportModalHeader}>
                            <div>
                                <h3>گردش حساب مشتری</h3>
                                <p>
                                    {ledgerCustomer.name ||
                                        ledgerCustomer.full_name ||
                                        ledgerCustomer.title ||
                                        "مشتری"}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setLedgerCustomer(null)}
                            >
                                ×
                            </button>
                        </div>

                        <PersonLedgerPanel
                            personType="customer"
                            personId={ledgerCustomer.id}
                            title="گردش حساب مشتری"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
