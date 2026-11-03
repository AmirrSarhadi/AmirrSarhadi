import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "../CommercialReports/CommercialReport.module.css";

export default function SerialNumberReport() {
    const [warehouses, setWarehouses] = useState([]);
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);

    const [warehouseId, setWarehouseId] = useState("");
    const [stockStatus, setStockStatus] = useState("");
    const [search, setSearch] = useState("");

    const formatQty = (value) => {
        if (value === null || value === undefined || value === "") return "0";

        return Number(value).toLocaleString("fa-IR", {
            maximumFractionDigits: 3,
        });
    };

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") return "0";
        return Number(value).toLocaleString("fa-IR");
    };

    const buildQuery = () => {
        const params = new URLSearchParams();

        if (warehouseId) params.append("warehouse", warehouseId);
        if (stockStatus) params.append("stock_status", stockStatus);
        if (search.trim()) params.append("search", search.trim());

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchReport = async () => {
        try {
            setLoading(true);

            const res = await authFetch(
                `${API_BASE_URL}/warehousing/api/v2/reports/serial-numbers/${buildQuery()}`
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.detail || "خطا در دریافت گزارش شماره سریال");
            }

            setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []);
            setRows(Array.isArray(data.rows) ? data.rows : []);
            setSummary(data.summary || {});
        } catch (error) {
            console.error(error);
            alert("خطا در دریافت گزارش شماره سریال");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = useMemo(() => {
        return [
            { label: "تعداد کالا", value: formatQty(summary.material_count) },
            { label: "دارای سریال", value: formatQty(summary.serial_count) },
            { label: "جمع موجودی", value: formatQty(summary.total_qty) },
            { label: "موجودی مثبت", value: formatQty(summary.positive_qty_count), positive: true },
            { label: "موجودی صفر", value: formatQty(summary.zero_qty_count) },
            { label: "زیر آستانه کمبود", value: formatQty(summary.below_threshold_count), danger: true },
        ];
    }, [summary]);

    const clearFilters = () => {
        setWarehouseId("");
        setStockStatus("");
        setSearch("");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>گزارش شماره سریال</h3>
                    <p>
                        گزارش کالاها بر اساس کد سریال ثبت‌شده در پروفایل کالا، همراه با موجودی، آستانه کمبود و ارزش خرید/فروش.
                    </p>
                </div>

                <button type="button" className={styles.refreshBtn} onClick={fetchReport}>
                    بروزرسانی گزارش
                </button>
            </div>

            <div className={styles.statsGrid}>
                {stats.map((item) => (
                    <div key={item.label} className={styles.statCard}>
                        <span>{item.label}</span>
                        <strong
                            className={
                                item.danger
                                    ? styles.dangerText
                                    : item.positive
                                        ? styles.positiveText
                                        : ""
                            }
                        >
                            {item.value}
                        </strong>
                    </div>
                ))}
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس نام کالا، کد کالا، بارکد یا شماره سریال..."
                    />
                </div>

                <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                    <option value="">همه انبارها</option>
                    {warehouses.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value)}>
                    <option value="">همه وضعیت‌ها</option>
                    <option value="positive">موجودی مثبت</option>
                    <option value="zero">موجودی صفر</option>
                    <option value="negative">موجودی منفی</option>
                    <option value="below_threshold">زیر آستانه کمبود</option>
                </select>

                <button type="button" className={styles.applyBtn} onClick={fetchReport}>
                    اعمال فیلتر
                </button>

                <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                    پاک کردن
                </button>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className={styles.skeletonRow}>
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
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره سریال</th>
                                <th>کد کالا</th>
                                <th>بارکد</th>
                                <th>نام کالا</th>
                                <th>گروه</th>
                                <th>دسته‌بندی</th>
                                <th>برند</th>
                                <th>انبار</th>
                                <th>موجودی</th>
                                <th>واحد</th>
                                <th>آستانه کمبود</th>
                                <th>قیمت خرید</th>
                                <th>قیمت فروش</th>
                                <th>وضعیت</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan="15" className={styles.emptyState}>
                                        <strong>اطلاعاتی برای نمایش وجود ندارد</strong>
                                        <p>فیلترها را تغییر بده یا برای کالاها serial_code ثبت کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td className={styles.codeCell}>
                                            {item.serial_code || "-"}
                                        </td>
                                        <td>{item.sku_code}</td>
                                        <td>{item.barcode}</td>
                                        <td className={styles.nameCell}>{item.persian_name}</td>
                                        <td>{item.group_name}</td>
                                        <td>{item.category_name}</td>
                                        <td>{item.brand_name}</td>
                                        <td>{item.warehouse_name}</td>
                                        <td
                                            className={
                                                Number(item.qty) < 0
                                                    ? styles.dangerText
                                                    : Number(item.qty) > 0
                                                        ? styles.positiveText
                                                        : ""
                                            }
                                        >
                                            {formatQty(item.qty)}
                                        </td>
                                        <td>{item.unit || "-"}</td>
                                        <td>{formatQty(item.shortage_threshold)}</td>
                                        <td>{formatMoney(item.unit_buying_price)}</td>
                                        <td>{formatMoney(item.unit_selling_price)}</td>
                                        <td>
                                            {item.below_threshold ? (
                                                <span className={styles.dangerText}>
                                                    زیر آستانه
                                                </span>
                                            ) : (
                                                <span className={styles.positiveText}>
                                                    عادی
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="9">جمع کل</td>
                                <td>{formatQty(summary.total_qty)}</td>
                                <td colSpan="5">{formatQty(summary.material_count)} کالا</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}