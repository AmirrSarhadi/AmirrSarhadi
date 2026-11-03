import { API_BASE_URL } from "../../api/http";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./StockItems.module.css";
import {
    FaSearch,
    FaSyncAlt,
    FaChartBar,
    FaTimes,
    FaBoxes,
} from "react-icons/fa";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API_BASE = API_BASE_URL;
const INVENTORY_REPORT_API = `${API_BASE}/warehousing/api/v2/inventory/report/`;
const INVENTORY_MOVEMENTS_API = `${API_BASE}/warehousing/api/v2/inventory/movements/`;
const WAREHOUSE_API = `${API_BASE}/warehousing/api/v2/warehouses/`;

export default function StockItems() {
    const [rows, setRows] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [count, setCount] = useState(0);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const [warehouseId, setWarehouseId] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [q, setQ] = useState("");

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [chartOpen, setChartOpen] = useState(false);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [chartMeta, setChartMeta] = useState({ name: "", sku: "" });

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

        if (warehouseId) params.set("warehouse", warehouseId);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (q.trim()) params.set("search", q.trim());

        params.set("page", customPage);
        params.set("page_size", pageSize);

        return params;
    };

    const fetchWarehouses = async () => {
        try {
            const { data } = await axios.get(WAREHOUSE_API);
            setWarehouses(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error(err);
            setWarehouses([]);
        }
    };

    const fetchData = async (customPage = page) => {
        try {
            setLoading(true);
            setErrorMsg("");

            const { data } = await axios.get(
                `${INVENTORY_REPORT_API}?${buildParams(customPage).toString()}`
            );

            const results = Array.isArray(data) ? data : data.results || [];

            setRows(results);
            setCount(data.count ?? results.length);
        } catch (err) {
            console.error(err);
            setRows([]);
            setCount(0);
            setErrorMsg("خطا در دریافت موجودی کالا");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        fetchData();
    }, [page, pageSize]);

    const onSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchData(1);
    };

    const openChart = async (row) => {
        setChartOpen(true);
        setChartLoading(true);
        setChartMeta({
            name: row.persian_name || "—",
            sku: row.sku_code || "—",
        });

        try {
            const params = new URLSearchParams();
            params.set("material", row.material_id);

            if (warehouseId) params.set("warehouse", warehouseId);
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const { data } = await axios.get(
                `${INVENTORY_MOVEMENTS_API}?${params.toString()}`
            );

            setChartData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setChartData([]);
        } finally {
            setChartLoading(false);
        }
    };

    return (
        <div className={styles.tableContainer}>
            <div className={styles.header}>
                <div>
                    <h3>موجودی کالا</h3>
                    <p>گزارش موجودی، افزایش، کاهش و گردش هر کالا در انبارها</p>
                </div>

                <button type="button" className={styles.addBtn} onClick={() => fetchData()}>
                    <FaSyncAlt />
                    به‌روزرسانی
                </button>
            </div>

            <form className={styles.filterCard} onSubmit={onSearch}>
                <div className={styles.filterGrid}>
                    <div className={styles.formField}>
                        <label>انبار</label>
                        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                            <option value="">همه انبارها</option>
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formField}>
                        <label>از تاریخ</label>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>

                    <div className={styles.formField}>
                        <label>تا تاریخ</label>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>

                    <div className={`${styles.formField} ${styles.searchField}`}>
                        <label>جستجو</label>
                        <div className={styles.searchBox}>
                            <FaSearch />
                            <input
                                type="text"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="جستجو بر اساس نام، کد کالا یا بارکد..."
                            />
                            <button type="submit">جستجو</button>
                        </div>
                    </div>
                </div>
            </form>

            <div className={styles.toolbar}>
                <div className={styles.resultCount}>
                    {count.toLocaleString("fa-IR")} کالا
                </div>
                <span className={styles.hint}>برای مشاهده نمودار گردش، روی ردیف کالا کلیک کن.</span>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ردیف</th>
                            <th>کد کالا</th>
                            <th>نام کالا</th>
                            <th>برند</th>
                            <th>دسته</th>
                            <th>گروه</th>
                            <th>بارکد</th>
                            <th>اول دوره</th>
                            <th>افزایش</th>
                            <th>کاهش</th>
                            <th>موجودی فعلی</th>
                            <th>قیمت خرید</th>
                            <th>قیمت فروش</th>
                            <th>نمودار</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="14">در حال بارگذاری...</td>
                            </tr>
                        ) : errorMsg ? (
                            <tr>
                                <td colSpan="14" className={styles.errorText}>{errorMsg}</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan="14">
                                    <div className={styles.emptyState}>
                                        <FaBoxes />
                                        <strong>موجودی‌ای پیدا نشد</strong>
                                        <p>فیلترها را تغییر بده یا سند انبار ثبت کن.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, i) => (
                                <tr key={r.material_id} onClick={() => openChart(r)}>
                                    <td>{(page - 1) * pageSize + i + 1}</td>
                                    <td><code className={styles.code}>{fmt(r.sku_code)}</code></td>
                                    <td className={styles.nameCell}>{r.persian_name || "—"}</td>
                                    <td>{r.brand_name || "—"}</td>
                                    <td>{r.category_name || "—"}</td>
                                    <td>{r.group_name || "—"}</td>
                                    <td>{fmt(r.barcode)}</td>
                                    <td>{fmt(r.opening_qty)}</td>
                                    <td className={styles.positive}>{fmt(r.increased_qty)}</td>
                                    <td className={styles.negative}>{fmt(r.decreased_qty)}</td>
                                    <td className={styles.bold}>{fmt(r.on_hand)}</td>
                                    <td>{fmt(r.unit_buying_price)}</td>
                                    <td>{fmt(r.unit_selling_price)}</td>
                                    <td>
                                        <button type="button" className={styles.chartBtn}>
                                            <FaChartBar />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className={styles.pagination}>
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    قبلی
                </button>

                <span>{page.toLocaleString("fa-IR")} / {totalPages.toLocaleString("fa-IR")}</span>

                <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
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

            {chartOpen && (
                <div className={styles.modalOverlay} onClick={() => setChartOpen(false)}>
                    <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <h3>نمودار افزایش / کاهش</h3>
                                <p>{chartMeta.name} - کد: {chartMeta.sku}</p>
                            </div>

                            <button type="button" className={styles.closeIconBtn} onClick={() => setChartOpen(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className={styles.chartBody}>
                            {chartLoading ? (
                                <div className={styles.center}>در حال بارگذاری...</div>
                            ) : chartData.length === 0 ? (
                                <div className={styles.center}>داده‌ای برای نمایش نیست</div>
                            ) : (
                                <Bar
                                    data={{
                                        labels: chartData.map((d) => d.date),
                                        datasets: [
                                            {
                                                label: "افزایش",
                                                data: chartData.map((d) => d.increased),
                                                backgroundColor: "rgba(34,197,94,0.6)",
                                            },
                                            {
                                                label: "کاهش",
                                                data: chartData.map((d) => d.decreased),
                                                backgroundColor: "rgba(239,68,68,0.6)",
                                            },
                                        ],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: "top" },
                                            tooltip: { rtl: true, textDirection: "rtl" },
                                        },
                                        scales: {
                                            y: { beginAtZero: true },
                                        },
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}