import { getAllPages } from "../../../api/lists";
import { extractList, API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import styles from "./Waste.module.css";
import { FaEye, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useModulePermission from "../../../hooks/useModulePermission";

const API = API_BASE_URL;

const money = (v) => Number(v || 0).toLocaleString("fa-IR");

const date = (v) => {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("fa-IR");
};

export default function WasteList() {
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("purchases");

    const [rows, setRows] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    const fetchWarehouses = async () => {
        try {
            const { data } = await getAllPages(`${API}/warehousing/api/v2/warehouses/`);
            setWarehouses(extractList(data));
        } catch (err) {
            console.error(err);
            setWarehouses([]);
        }
    };

    const fetchRows = async () => {
        try {
            setLoading(true);
            const { data } = await getAllPages(`${API}/costs/api/v2/waste_invoices/`);
            setRows(extractList(data));
        } catch (err) {
            console.error(err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
        fetchWarehouses();
    }, []);

    const getWarehouseName = (id) => {
        const w = warehouses.find((warehouse) => Number(warehouse.id) === Number(id));
        return w ? w.name : "-";
    };

    const handleReverse = async (invoiceId) => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!window.confirm("آیا از ابطال این فاکتور ضایعات مطمئن هستید؟")) return;

        try {
            await axios.post(`${API}/costs/api/${invoiceId}/v2/waste_invoices/reverse/`);
            toast.success("فاکتور ضایعات با موفقیت ابطال شد");
            fetchRows();
            setSelected(null);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "خطا در ابطال فاکتور");
        }
    };

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();

        if (!query) return rows;

        return rows.filter((item) =>
            [
                item.code,
                item.reference,
                item.date,
                item.description,
                item.total_quantity,
                item.total_amount,
                item.warehouse?.name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query)
        );
    }, [rows, q]);

    return (
        <>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>لیست ضایعات</h3>
                        <p>مدیریت فاکتورهای ضایعات ثبت‌شده در سیستم</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => navigate("/purchases/waste/new")}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaPlus />
                        ضایعات جدید
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            placeholder="جستجو بر اساس شماره، ارجاع، تاریخ یا توضیحات..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filtered.length.toLocaleString("fa-IR")} فاکتور
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.listTable}>
                        <thead>
                            <tr>
                                <th>شماره</th>
                                <th>ارجاع</th>
                                <th>تاریخ</th>
                                <th>تعداد کل</th>
                                <th>مبلغ کل</th>
                                <th>تعداد آیتم</th>
                                <th>توضیحات</th>
                                <th>وضعیت</th>
                                <th>جزئیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className={styles.center}>
                                        در حال بارگذاری...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className={styles.center}>
                                        فاکتور ضایعاتی پیدا نشد
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item.id}>
                                        <td className={styles.code}>{item.code || "-"}</td>
                                        <td>{item.reference || "-"}</td>
                                        <td>{date(item.date)}</td>
                                        <td>{Number(item.total_quantity || 0).toLocaleString("fa-IR")}</td>
                                        <td>
                                            <span className={styles.amountBadge}>
                                                {money(item.total_amount)}
                                            </span>
                                        </td>
                                        <td>{item.items?.length || 0}</td>
                                        <td>{item.description || "-"}</td>
                                        <td>
                                            {item.is_reversed ? (
                                                <span className={styles.badgeDanger}>باطل شده</span>
                                            ) : (
                                                <span className={styles.badgeOk}>فعال</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.viewBtn}
                                                onClick={() => setSelected(item)}
                                            >
                                                <FaEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selected && (
                <WasteDetailsModal
                    item={selected}
                    onClose={() => setSelected(null)}
                    getWarehouseName={getWarehouseName}
                    handleReverse={handleReverse}
                    canWrite={canWrite}
                    disabledReason={disabledReason}
                />
            )}
        </>
    );
}

function WasteDetailsModal({ item, onClose, getWarehouseName, handleReverse, canWrite, disabledReason }) {
    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <b>جزئیات ضایعات #{item.code}</b>
                        <small>{item.reference || "بدون ارجاع"}</small>
                    </div>

                    <button type="button" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.detailsGrid}>
                    <div>
                        <span>شماره</span>
                        <strong>{item.code || "-"}</strong>
                    </div>

                    <div>
                        <span>ارجاع</span>
                        <strong>{item.reference || "-"}</strong>
                    </div>

                    <div>
                        <span>تاریخ</span>
                        <strong>{date(item.date)}</strong>
                    </div>

                    <div>
                        <span>انبار خروج</span>
                        <strong>{getWarehouseName(item.warehouse)}</strong>
                    </div>

                    <div>
                        <span>تعداد کل</span>
                        <strong>{Number(item.total_quantity || 0).toLocaleString("fa-IR")}</strong>
                    </div>

                    <div>
                        <span>مبلغ کل</span>
                        <strong>{money(item.total_amount)}</strong>
                    </div>

                    <div>
                        <span>تعداد آیتم</span>
                        <strong>{item.items?.length || 0}</strong>
                    </div>
                </div>

                <div className={styles.descriptionBox}>
                    <span>توضیحات</span>
                    <p>{item.description || "توضیحی ثبت نشده است."}</p>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.listTable}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>کالا</th>
                                <th>کد کالا</th>
                                <th>بارکد</th>
                                <th>تعداد</th>
                                <th>مبلغ واحد</th>
                                <th>مبلغ کل</th>
                                <th>شرح</th>
                            </tr>
                        </thead>

                        <tbody>
                            {(item.items || []).map((row, index) => (
                                <tr key={row.id || index}>
                                    <td>{index + 1}</td>
                                    <td>{row.material_name || "-"}</td>
                                    <td>{row.sku_code || "-"}</td>
                                    <td>{row.barcode || "-"}</td>
                                    <td>{Number(row.quantity || 0).toLocaleString("fa-IR")}</td>
                                    <td>{money(row.unit_price)}</td>
                                    <td>
                                        <span className={styles.amountBadge}>
                                            {money(row.total_price)}
                                        </span>
                                    </td>
                                    <td>{row.description || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.detailsFooter}>
                    <button type="button" onClick={onClose}>
                        بستن
                    </button>

                    {!item.is_reversed && (
                        <button
                            type="button"
                            className={styles.reverseBtn}
                            onClick={() => handleReverse(item.id)}
                            disabled={!canWrite}
                            title={!canWrite ? disabledReason : undefined}
                        >
                            ابطال فاکتور
                        </button>
                    )}

                    {item.is_reversed && <span className={styles.badgeDanger}>باطل شده</span>}
                </div>
            </div>
        </div>
    );
}