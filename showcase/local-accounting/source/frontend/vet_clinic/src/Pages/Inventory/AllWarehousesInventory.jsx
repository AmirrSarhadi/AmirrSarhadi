import { API_BASE_URL } from "../../api/http";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./AllWarehousesInventory.module.css";
import {
    FaSearch,
    FaSyncAlt,
    FaBoxes,
    FaExclamationTriangle,
    FaLayerGroup,
} from "react-icons/fa";

const API_BASE = API_BASE_URL;
const ALL_WAREHOUSES_INVENTORY_API =
    `${API_BASE}/warehousing/api/v2/inventory/all-warehouses/`;

export default function AllWarehousesInventory() {
    const [rows, setRows] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [count, setCount] = useState(0);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const [q, setQ] = useState("");
    const [tab, setTab] = useState("all");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(count / pageSize)),
        [count, pageSize]
    );

    const fmt = (v) => {
        if (v === null || v === undefined || v === "") return "—";
        const num = Number(v);
        if (!Number.isNaN(num)) return num.toLocaleString("fa-IR");
        return String(v);
    };

    const buildParams = (customPage = page) => {
        const params = new URLSearchParams();

        if (q.trim()) params.set("search", q.trim());
        params.set("page", customPage);
        params.set("page_size", pageSize);

        if (tab === "below") params.set("below_reorder", "1");
        if (tab === "negative") params.set("negative", "1");
        if (tab === "diff") params.set("has_diff", "1");

        return params;
    };

    const fetchData = async (customPage = page) => {
        try {
            setLoading(true);
            setErrorMsg("");

            const { data } = await axios.get(
                `${ALL_WAREHOUSES_INVENTORY_API}?${buildParams(customPage).toString()}`
            );

            const results = Array.isArray(data) ? data : data.results || [];

            setRows(results);
            setCount(data.count ?? results.length);
            setWarehouses(data.warehouses || []);
        } catch (err) {
            console.error(err);
            setRows([]);
            setCount(0);
            setWarehouses([]);
            setErrorMsg("خطا در دریافت موجودی تمام انبارها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, pageSize, tab]);

    const submitSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchData(1);
    };

    const changeTab = (nextTab) => {
        setTab(nextTab);
        setPage(1);
    };

    const getWarehouseQty = (row, warehouseId) => {
        const item = (row.warehouses || []).find(
            (x) => String(x.id) === String(warehouseId)
        );

        return item?.qty ?? 0;
    };

    const colSpan = 13 + warehouses.length;

    return (
        <div className={styles.tableContainer}>
            <div className={styles.header}>
                <div>
                    <h3>موجودی تمام انبارها</h3>
                    <p>
                        نمایش تجمیعی موجودی کالاها به تفکیک هر انبار، نقطه سفارش، اختلاف و وضعیت منفی
                    </p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => fetchData()}
                >
                    <FaSyncAlt />
                    به‌روزرسانی
                </button>
            </div>

            <div className={styles.tabsHeader}>
                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={`${styles.tab} ${tab === "all" ? styles.activeTab : ""}`}
                        onClick={() => changeTab("all")}
                    >
                        <FaLayerGroup />
                        همه
                    </button>

                    <button
                        type="button"
                        className={`${styles.tab} ${tab === "below" ? styles.activeTab : ""}`}
                        onClick={() => changeTab("below")}
                    >
                        <FaExclamationTriangle />
                        زیر نقطه سفارش
                    </button>

                    <button
                        type="button"
                        className={`${styles.tab} ${tab === "negative" ? styles.activeTab : ""}`}
                        onClick={() => changeTab("negative")}
                    >
                        موجودی منفی
                    </button>

                    <button
                        type="button"
                        className={`${styles.tab} ${tab === "diff" ? styles.activeTab : ""}`}
                        onClick={() => changeTab("diff")}
                    >
                        اختلاف تعداد
                    </button>
                </div>

                <form className={styles.searchBox} onSubmit={submitSearch}>
                    <FaSearch />
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="جستجو بر اساس نام، کد کالا یا بارکد..."
                    />
                    <button type="submit">جستجو</button>
                </form>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.resultCount}>
                    {count.toLocaleString("fa-IR")} کالا
                </div>

                <span className={styles.hint}>
                    ستون‌های انتهایی، موجودی هر کالا را در هر انبار نشان می‌دهد.
                </span>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr className={styles.groupHeader}>
                            <th colSpan="7">کالا</th>
                            <th colSpan="2">کنترل نقطه سفارش</th>
                            <th colSpan="2">حسابداری</th>
                            <th colSpan="1">وضعیت</th>
                            <th colSpan={warehouses.length || 1}>انبارها</th>
                            <th colSpan="1">اختلاف</th>
                        </tr>

                        <tr>
                            <th>ردیف</th>
                            <th>کد کالا</th>
                            <th>بارکد</th>
                            <th>نام کالا</th>
                            <th>برند</th>
                            <th>دسته‌بندی</th>
                            <th>گروه</th>

                            <th>واحد</th>
                            <th>نقطه سفارش</th>

                            <th>موجودی کل</th>
                            <th>در سفارش</th>

                            <th>وضعیت</th>

                            {warehouses.length > 0 ? (
                                warehouses.map((w) => <th key={w.id}>{w.name}</th>)
                            ) : (
                                <th>انبار</th>
                            )}

                            <th>اختلاف</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={colSpan}>در حال بارگذاری...</td>
                            </tr>
                        ) : errorMsg ? (
                            <tr>
                                <td colSpan={colSpan} className={styles.errorText}>
                                    {errorMsg}
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={colSpan}>
                                    <div className={styles.emptyState}>
                                        <FaBoxes />
                                        <strong>موجودی‌ای پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا سند انبار ثبت کن.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (
                                <tr key={row.material_id}>
                                    <td>{(page - 1) * pageSize + index + 1}</td>

                                    <td>
                                        <code className={styles.code}>{fmt(row.sku_code)}</code>
                                    </td>

                                    <td>{fmt(row.barcode)}</td>
                                    <td className={styles.nameCell}>{row.persian_name || "—"}</td>
                                    <td>{row.brand_name || "—"}</td>
                                    <td>{row.category_name || "—"}</td>
                                    <td>{row.group_name || "—"}</td>

                                    <td>{row.unit_name || "—"}</td>

                                    <td className={Number(row.below_reorder) ? styles.warn : ""}>
                                        {fmt(row.reorder_point)}
                                    </td>

                                    <td className={styles.bold}>{fmt(row.total_on_hand)}</td>
                                    <td>{fmt(row.on_order)}</td>

                                    <td>
                                        <span
                                            className={
                                                row.has_negative
                                                    ? styles.negativeBadge
                                                    : styles.okBadge
                                            }
                                        >
                                            {row.has_negative ? "منفی" : "عادی"}
                                        </span>
                                    </td>

                                    {warehouses.length > 0 ? (
                                        warehouses.map((warehouse) => {
                                            const qty = getWarehouseQty(row, warehouse.id);

                                            return (
                                                <td
                                                    key={warehouse.id}
                                                    className={Number(qty) < 0 ? styles.negative : ""}
                                                >
                                                    {fmt(qty)}
                                                </td>
                                            );
                                        })
                                    ) : (
                                        <td>—</td>
                                    )}

                                    <td
                                        className={
                                            Number(row.diff_count) !== 0 ? styles.warn : ""
                                        }
                                    >
                                        {fmt(row.diff_count)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className={styles.pagination}>
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                    قبلی
                </button>

                <span>
                    {page.toLocaleString("fa-IR")} / {totalPages.toLocaleString("fa-IR")}
                </span>

                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                    بعدی
                </button>

                <select
                    value={pageSize}
                    onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                    }}
                >
                    {[20, 50, 100, 200].map((ps) => (
                        <option key={ps} value={ps}>
                            {ps} / صفحه
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}