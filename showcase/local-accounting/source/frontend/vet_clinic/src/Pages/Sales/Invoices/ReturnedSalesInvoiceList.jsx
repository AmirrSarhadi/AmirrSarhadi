import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./SalesList.module.css";
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
const STATUS_ORDER = ["پیش نویس", "تایید شده", "دریافت شده", "مرجوع شده"];

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

function getPersonName(item) {
    return (
        item?.company ||
        `${item?.first_name || ""} ${item?.last_name || ""}`.trim() ||
        (item?.id ? `#${item.id}` : "-")
    );
}

export default function ReturnedSalesInvoiceList() {
    const { canWrite, disabledReason } = useModulePermission("sales");
    const [rows, setRows] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [q, setQ] = useState("");
    const [status, setStatus] = useState("همه");
    const [sortKey, setSortKey] = useState("date");
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [detailInvoice, setDetailInvoice] = useState(null);

    const fetchAll = async () => {
        setLoading(true);

        try {
            const [invoiceRes, customerRes, warehouseRes] = await Promise.all([
                getAllPages(`${API}/incomes/api/v2/returned_sales_invoices/`),
                getAllPages(`${API}/incomes/api/v2/customers/`),
                getAllPages(`${API}/warehousing/api/v2/warehouses/`).catch(() => ({ data: [] })),
            ]);

            setRows(extractList(invoiceRes.data));
            setCustomers(extractList(customerRes.data));
            setWarehouses(extractList(warehouseRes.data));
        } catch (error) {
            console.error("Fetch returned sales list error:", error);
            toast.error("خطا در دریافت لیست برگشت از فروش");
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const customerNameById = useMemo(() => {
        const map = new Map();
        customers.forEach((c) => map.set(c.id, getPersonName(c)));
        return map;
    }, [customers]);

    const warehouseNameById = useMemo(() => {
        const map = new Map();
        warehouses.forEach((w) => map.set(w.id, w.name || `#${w.id}`));
        return map;
    }, [warehouses]);

    const counters = useMemo(() => {
        const c = { همه: rows.length };
        STATUS_ORDER.forEach((s) => {
            c[s] = rows.filter((r) => r.invoice_type === s).length;
        });
        return c;
    }, [rows]);

    const filtered = useMemo(() => {
        let data = [...rows];

        if (status !== "همه") {
            data = data.filter((r) => r.invoice_type === status);
        }

        if (q.trim()) {
            const query = q.trim();
            data = data.filter((r) => {
                const customerName = customerNameById.get(r.customer_name) || "";
                const warehouseName = warehouseNameById.get(r.warehouse) || "";

                return (
                    String(r.code || "").includes(query) ||
                    String(r.reference || "").includes(query) ||
                    String(r.title || "").includes(query) ||
                    customerName.includes(query) ||
                    warehouseName.includes(query)
                );
            });
        }

        return data;
    }, [rows, status, q, customerNameById, warehouseNameById]);

    const sorted = useMemo(() => {
        const data = [...filtered];

        data.sort((a, b) => {
            let av = a[sortKey];
            let bv = b[sortKey];

            if (["date", "expiry_date"].includes(sortKey)) {
                av = av ? new Date(av).getTime() : 0;
                bv = bv ? new Date(bv).getTime() : 0;
            }

            if (["total_amount", "paid_amount"].includes(sortKey)) {
                av = Number(av || 0);
                bv = Number(bv || 0);
            }

            if (sortKey === "invoice_type") {
                av = STATUS_ORDER.indexOf(a.invoice_type);
                bv = STATUS_ORDER.indexOf(b.invoice_type);
            }

            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

    const pageData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [sorted, page, pageSize]);

    const setSort = (key) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const StatusBadge = ({ s }) => {
        if (s === "مرجوع شده") {
            return (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>
                    <FaTimesCircle /> مرجوع شده
                </span>
            );
        }

        if (s === "تایید شده" || s === "دریافت شده") {
            return (
                <span className={`${styles.badge} ${styles.badgeOk}`}>
                    <FaCheckCircle /> {s}
                </span>
            );
        }

        return <span className={styles.badge}>{s || "پیش نویس"}</span>;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>فاکتورهای برگشت از فروش</h2>
                    <p>مدیریت برگشت از فروش، ورود کالا به انبار و سند حسابداری برگشت فروش</p>
                </div>

                {canWrite ? (
                    <Link to="/sales/returns/new" className={styles.addBtn}>
                        <FaPlus />
                        فاکتور برگشت از فروش جدید
                    </Link>
                ) : (
                    <button
                        type="button"
                        className={`${styles.addBtn} ${styles.addBtnDisabled}`}
                        disabled
                        title={disabledReason}
                    >
                        <FaPlus />
                        فاکتور برگشت از فروش جدید
                    </button>
                )}
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <FaSearch />
                    <input
                        placeholder="جستجو بر اساس شماره، ارجاع، عنوان، مشتری یا انبار..."
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

            <div className={styles.tabs}>
                {["همه", ...STATUS_ORDER].map((t) => (
                    <button
                        key={t}
                        className={`${styles.tab} ${status === t ? styles.active : ""}`}
                        onClick={() => {
                            setStatus(t);
                            setPage(1);
                        }}
                    >
                        {t}
                        <span className={styles.count}>{counters[t] || 0}</span>
                    </button>
                ))}
            </div>

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <Th onClick={() => setSort("code")} active={sortKey === "code"} dir={sortDir}>شماره</Th>
                            <Th onClick={() => setSort("date")} active={sortKey === "date"} dir={sortDir}>تاریخ</Th>
                            <Th onClick={() => setSort("reference")} active={sortKey === "reference"} dir={sortDir}>ارجاع</Th>
                            <Th onClick={() => setSort("title")} active={sortKey === "title"} dir={sortDir}>عنوان</Th>
                            <th>مشتری</th>
                            <th>انبار ورود</th>
                            <Th onClick={() => setSort("total_amount")} active={sortKey === "total_amount"} dir={sortDir}>مبلغ</Th>
                            <Th onClick={() => setSort("invoice_type")} active={sortKey === "invoice_type"} dir={sortDir}>وضعیت</Th>
                            <th>سند حسابداری</th>
                            <th>رسید/حواله انبار</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" className={styles.center}>در حال بارگذاری...</td>
                            </tr>
                        ) : pageData.length === 0 ? (
                            <tr>
                                <td colSpan="11" className={styles.center}>فاکتور برگشتی یافت نشد.</td>
                            </tr>
                        ) : (
                            pageData.map((r) => (
                                <tr key={r.id}>
                                    <td className={styles.code}>{r.code || "-"}</td>
                                    <td>{formatDate(r.date)}</td>
                                    <td>{r.reference || "-"}</td>
                                    <td className={styles.titleCell}>{r.title || "-"}</td>
                                    <td className={styles.person}>{customerNameById.get(r.customer_name) || "-"}</td>
                                    <td>{warehouseNameById.get(r.warehouse) || "-"}</td>
                                    <td>{formatMoney(r.total_amount)} ریال</td>
                                    <td><StatusBadge s={r.invoice_type} /></td>
                                    <td>
                                        <span className={`${styles.badge} ${r.accounting_document ? styles.badgeOk : styles.badgeDanger}`}>
                                            <FaFileInvoiceDollar />
                                            {r.accounting_document ? "ثبت شده" : "ندارد"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${r.warehouse_receipt ? styles.badgeOk : styles.badgeDanger}`}>
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
                                                onClick={() => setDetailInvoice(r)}
                                            >
                                                <FaEye />
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
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                    <span>{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
                </div>
            </div>

            {detailInvoice && (
                <div className={styles.modalOverlay} onClick={() => setDetailInvoice(null)}>
                    <div className={styles.paymentsModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>جزئیات برگشت از فروش</h3>
                                <p>فاکتور شماره {detailInvoice.code}</p>
                            </div>

                            <button type="button" onClick={() => setDetailInvoice(null)}>×</button>
                        </div>

                        <div className={styles.paymentSummary}>
                            <div>
                                <span>مشتری</span>
                                <strong>{customerNameById.get(detailInvoice.customer_name) || "-"}</strong>
                            </div>
                            <div>
                                <span>انبار ورود</span>
                                <strong>{warehouseNameById.get(detailInvoice.warehouse) || "-"}</strong>
                            </div>
                            <div>
                                <span>مبلغ کل</span>
                                <strong>{formatMoney(detailInvoice.total_amount)} ریال</strong>
                            </div>
                        </div>

                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>ردیف</th>
                                        <th>کالا</th>
                                        <th>تعداد</th>
                                        <th>مبلغ واحد</th>
                                        <th>تخفیف</th>
                                        <th>مبلغ کل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(detailInvoice.items || []).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className={styles.center}>آیتمی ثبت نشده است.</td>
                                        </tr>
                                    ) : (
                                        detailInvoice.items.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td>{index + 1}</td>
                                                <td>{item.material_name || item.material || "-"}</td>
                                                <td>{formatMoney(item.quantity)}</td>
                                                <td>{formatMoney(item.unit_price)}</td>
                                                <td>{formatMoney(item.discount_amount)}</td>
                                                <td>{formatMoney(item.total_price)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Th({ children, onClick, active, dir }) {
    return (
        <th onClick={onClick}>
            <span style={{ cursor: onClick ? "pointer" : "default" }}>
                {children} {active ? (dir === "asc" ? "▲" : "▼") : ""}
            </span>
        </th>
    );
}