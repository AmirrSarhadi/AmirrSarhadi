import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "../CommercialReports/CommercialReport.module.css";

export default function MaterialLedgerReport() {
    const [materials, setMaterials] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [materialInfo, setMaterialInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [nature, setNature] = useState("");
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

        if (selectedMaterial) params.append("material", selectedMaterial);
        if (selectedWarehouse) params.append("warehouse", selectedWarehouse);
        if (dateFrom) params.append("from", dateFrom);
        if (dateTo) params.append("to", dateTo);
        if (nature) params.append("nature", nature);
        if (search.trim()) params.append("search", search.trim());

        const query = params.toString();
        return query ? `?${query}` : "";
    };

    const fetchReport = async () => {
        try {
            setLoading(true);

            const res = await authFetch(
                `${API_BASE_URL}/warehousing/api/v2/reports/material-ledger/${buildQuery()}`
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.detail || "خطا در دریافت کارت حساب کالا");
            }

            setMaterials(Array.isArray(data.materials) ? data.materials : []);
            setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []);
            setRows(Array.isArray(data.rows) ? data.rows : []);
            setSummary(data.summary || {});
            setMaterialInfo(data.selected_material || null);

            if (!selectedMaterial && data.selected_material?.id) {
                setSelectedMaterial(String(data.selected_material.id));
            }
        } catch (error) {
            console.error(error);
            alert("خطا در دریافت کارت حساب کالا");
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
            { label: "مانده اول دوره", value: formatQty(summary.opening_qty) },
            { label: "جمع ورود", value: formatQty(summary.in_qty), positive: true },
            { label: "جمع خروج", value: formatQty(summary.out_qty), danger: true },
            { label: "خالص گردش", value: formatQty(summary.net_qty) },
            { label: "مانده پایان", value: formatQty(summary.ending_qty) },
            { label: "ارزش موجودی", value: formatMoney(summary.buying_value) },
        ];
    }, [summary]);

    const clearFilters = () => {
        setSelectedWarehouse("");
        setDateFrom("");
        setDateTo("");
        setNature("");
        setSearch("");
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>کارت حساب کالا</h3>
                    <p>
                        گردش کامل ورود، خروج و انتقال کالا به تفکیک انبار، همراه با مانده اول دوره و مانده بعد از هر حواله.
                    </p>

                    {materialInfo && (
                        <p>
                            کالا: <strong>{materialInfo.name}</strong>
                            {" "}
                            | کد کالا: <strong>{materialInfo.sku_code}</strong>
                            {" "}
                            | واحد: <strong>{materialInfo.unit || "-"}</strong>
                        </p>
                    )}
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
                        placeholder="جستجو بر اساس شماره حواله، شرح، ارجاع، نوع گردش یا انبار..."
                    />
                </div>

                <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                >
                    {materials.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name} - {item.sku_code}
                        </option>
                    ))}
                </select>

                <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                >
                    <option value="">همه انبارها</option>
                    {warehouses.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                />

                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                />

                <select value={nature} onChange={(e) => setNature(e.target.value)}>
                    <option value="">همه گردش‌ها</option>
                    <option value="in">فقط ورود</option>
                    <option value="out">فقط خروج</option>
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
                                <th>تاریخ</th>
                                <th>شماره حواله</th>
                                <th>نوع حواله</th>
                                <th>انبار</th>
                                <th>انبار مقابل</th>
                                <th>نوع گردش</th>
                                <th>ورود</th>
                                <th>خروج</th>
                                <th>مانده بعد از گردش</th>
                                <th>واحد</th>
                                <th>وضعیت</th>
                                <th>شرح</th>
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className={styles.emptyState}>
                                        <strong>گردشی برای این کالا پیدا نشد</strong>
                                        <p>کالا، انبار یا بازه تاریخی را تغییر بده.</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>{item.date || "-"}</td>
                                        <td className={styles.codeCell}>{item.receipt_number}</td>
                                        <td>{item.receipt_type}</td>
                                        <td className={styles.nameCell}>{item.warehouse_name}</td>
                                        <td>{item.counter_warehouse_name || "-"}</td>
                                        <td>
                                            <span className={styles.statusBadge}>
                                                {item.movement_type}
                                            </span>
                                        </td>
                                        <td className={styles.positiveText}>
                                            {formatQty(item.in_qty)}
                                        </td>
                                        <td className={styles.dangerText}>
                                            {formatQty(item.out_qty)}
                                        </td>
                                        <td className={styles.codeCell}>
                                            {formatQty(item.balance_after)}
                                        </td>
                                        <td>{item.unit || "-"}</td>
                                        <td>{item.receipt_status}</td>
                                        <td>{item.description || item.reference || "-"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan="7">جمع کل</td>
                                <td>{formatQty(summary.in_qty)}</td>
                                <td>{formatQty(summary.out_qty)}</td>
                                <td>{formatQty(summary.ending_qty)}</td>
                                <td colSpan="3">{formatQty(summary.row_count)} ردیف</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}