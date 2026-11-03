import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "../../Sales/Invoices/SalesList.module.css";
import {
    FaCheckCircle,
    FaTimesCircle,
    FaSearch,
    FaPlus,
    FaEye,
    FaWarehouse,
    FaFileInvoiceDollar,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import useModulePermission from "../../../hooks/useModulePermission";

const API = API_BASE_URL;

function formatMoney(v) {
    return Number(v || 0).toLocaleString("fa-IR");
}

function formatDate(s) {
    if (!s) return "-";
    try {
        return new Date(s).toLocaleDateString("fa-IR");
    } catch {
        return s;
    }
}

export default function ReturnedPurchaseList() {
    const { canWrite, disabledReason } = useModulePermission("purchases");

    const [rows, setRows] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const fetchAll = async () => {
        setLoading(true);

        try {
            const [invoiceRes, vendorRes, warehouseRes] = await Promise.all([
                getAllPages(`${API}/costs/api/v2/returned_buy_invoices/`),
                getAllPages(`${API}/costs/api/v2/vendors/`),
                getAllPages(`${API}/warehousing/api/v2/warehouses/`).catch(() => ({ data: [] })),
            ]);

            setRows(extractList(invoiceRes.data));
            setVendors(extractList(vendorRes.data));
            setWarehouses(extractList(warehouseRes.data));
        } catch (error) {
            console.error("Fetch returned purchase list error:", error);
            toast.error("خطا در دریافت لیست برگشت از خرید");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const vendorNameById = useMemo(() => {
        const map = new Map();

        vendors.forEach((v) => {
            const name =
                v.company ||
                `${v.first_name || ""} ${v.last_name || ""}`.trim() ||
                `#${v.id}`;

            map.set(v.id, name);
        });

        return map;
    }, [vendors]);

    const warehouseNameById = useMemo(() => {
        const map = new Map();

        warehouses.forEach((w) => {
            map.set(w.id, w.name || `#${w.id}`);
        });

        return map;
    }, [warehouses]);

    const filtered = useMemo(() => {
        const query = q.trim();

        if (!query) return rows;

        return rows.filter((r) => {
            const vendorName = vendorNameById.get(r.vendor) || "";
            const warehouseName = warehouseNameById.get(r.warehouse) || "";

            return (
                String(r.code || "").includes(query) ||
                String(r.reference || "").includes(query) ||
                String(r.title || "").includes(query) ||
                vendorName.includes(query) ||
                warehouseName.includes(query)
            );
        });
    }, [rows, q, vendorNameById, warehouseNameById]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

    const pageData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const StatusBadge = () => (
        <span className={`${styles.badge} ${styles.badgeDanger}`}>
            <FaTimesCircle />
            مرجوع شده
        </span>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>فاکتورهای برگشت از خرید</h2>
                    <p>لیست برگشت از خرید، خروج انبار و سند حسابداری برگشت خرید</p>
                </div>

                {canWrite ? (
                    <Link to="/purchases/returns/new" className={styles.addBtn}>
                        <FaPlus />
                        برگشت از خرید جدید
                    </Link>
                ) : (
                    <button
                        type="button"
                        className={`${styles.addBtn} ${styles.addBtnDisabled}`}
                        disabled
                        title={disabledReason}
                    >
                        <FaPlus />
                        برگشت از خرید جدید
                    </button>
                )}
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <FaSearch />
                    <input
                        placeholder="جستجو بر اساس شماره، ارجاع، عنوان، تأمین‌کننده یا انبار..."
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className={styles.resultCount}>
                    {filtered.length.toLocaleString("fa-IR")} فاکتور
                </div>
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>شماره</th>
                            <th>تاریخ</th>
                            <th>ارجاع</th>
                            <th>عنوان</th>
                            <th>تأمین‌کننده</th>
                            <th>انبار</th>
                            <th>مبلغ کل</th>
                            <th>وضعیت</th>
                            <th>سند حسابداری</th>
                            <th>رسید/حواله انبار</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" className={styles.center}>
                                    در حال بارگذاری...
                                </td>
                            </tr>
                        ) : pageData.length === 0 ? (
                            <tr>
                                <td colSpan="11" className={styles.center}>
                                    موردی یافت نشد.
                                </td>
                            </tr>
                        ) : (
                            pageData.map((r) => (
                                <tr key={r.id}>
                                    <td className={styles.code}>{r.code || "-"}</td>
                                    <td>{formatDate(r.date)}</td>
                                    <td>{r.reference || "-"}</td>
                                    <td className={styles.titleCell}>{r.title || "-"}</td>
                                    <td className={styles.person}>
                                        {vendorNameById.get(r.vendor) || "-"}
                                    </td>
                                    <td>{warehouseNameById.get(r.warehouse) || "-"}</td>
                                    <td>{formatMoney(r.total_amount)} ریال</td>
                                    <td>
                                        <StatusBadge />
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.badge} ${r.accounting_document ? styles.badgeOk : styles.badgeDanger
                                                }`}
                                        >
                                            <FaFileInvoiceDollar />
                                            {r.accounting_document ? "ثبت شده" : "ندارد"}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.badge} ${r.warehouse_receipt ? styles.badgeOk : styles.badgeDanger
                                                }`}
                                        >
                                            <FaWarehouse />
                                            {r.warehouse_receipt ? "ثبت شده" : "ندارد"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            <button
                                                type="button"
                                                className={styles.viewBtn}
                                                title="جزئیات"
                                                onClick={() => toast.info("صفحه جزئیات برگشت از خرید در مرحله بعد اضافه می‌شود.")}
                                            >
                                                <FaEye />
                                            </button>

                                            <button
                                                type="button"
                                                className={styles.approveBtn}
                                                title={!canWrite ? disabledReason : "سند و انبار"}
                                                disabled
                                            >
                                                <FaCheckCircle />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className={styles.pager}>
                <div className={styles.pageSize}>
                    نمایش:
                    {[5, 10, 15, 20, 50, 100].map((ps) => (
                        <button
                            key={ps}
                            type="button"
                            className={`${styles.psBtn} ${pageSize === ps ? styles.activePs : ""}`}
                            onClick={() => {
                                setPageSize(ps);
                                setPage(1);
                            }}
                        >
                            {ps}
                        </button>
                    ))}
                </div>

                <div className={styles.pages}>
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        ‹
                    </button>

                    <span>
                        {page} / {totalPages}
                    </span>

                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        ›
                    </button>
                </div>
            </div>
        </div>
    );
}