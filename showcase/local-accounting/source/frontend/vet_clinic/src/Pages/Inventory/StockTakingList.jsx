import { API_BASE_URL } from "../../api/http";
// فایل انبارگردانی 
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./StockTaking.module.css";
import {
    FaPlus,
    FaSearch,
    FaClipboardCheck,
    FaEye,
} from "react-icons/fa";
import StartStockTakingModal from "./StartStockTakingModal";
import useModulePermission from "../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;
const STOCKTAKING_API = `${API_BASE}/warehousing/api/v2/stocktakings/`;

export default function StockTakingList() {
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("warehousing");

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState("");
    const [showModal, setShowModal] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(STOCKTAKING_API);
            setRows(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error(err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredRows = useMemo(() => {
        const keyword = q.trim().toLowerCase();
        if (!keyword) return rows;

        return rows.filter((item) =>
            [
                item.accounting_document,
                item.number,
                item.date,
                item.warehouse_name,
                item.description,
                item.operator,
                item.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(keyword)
        );
    }, [rows, q]);

    return (
        <>
            <div className={styles.tableContainer}>
                <div className={styles.header}>
                    <div>
                        <h3>انبارگردانی</h3>
                        <p>لیست همه انبارگردانی‌های انجام‌شده و در جریان</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addBtn}
                        onClick={() => {
                            if (!canWrite) {
                                alert(disabledReason);
                                return;
                            }
                            setShowModal(true);
                        }}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaPlus />
                        ایجاد انبارگردانی
                    </button>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchBox}>
                        <FaSearch />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="جستجو بر اساس شماره، انبار، متصدی یا وضعیت..."
                        />
                    </div>

                    <div className={styles.resultCount}>
                        {filteredRows.length.toLocaleString("fa-IR")} سند
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>سند حسابداری</th>
                                <th>شماره</th>
                                <th>تاریخ</th>
                                <th>انبار</th>
                                <th>توضیحات</th>
                                <th>متصدی</th>
                                <th>وضعیت</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9">در حال بارگذاری...</td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan="9">
                                        <div className={styles.emptyState}>
                                            <FaClipboardCheck />
                                            <strong>انبارگردانی‌ای پیدا نشد</strong>
                                            <p>برای شروع، یک انبارگردانی جدید ایجاد کن.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((item, index) => (
                                    <tr key={item.id}>
                                        <td>{index + 1}</td>
                                        <td>{item.accounting_document || "—"}</td>
                                        <td>
                                            <code className={styles.code}>{item.number || "—"}</code>
                                        </td>
                                        <td>{item.date || "—"}</td>
                                        <td>{item.warehouse_name || "—"}</td>
                                        <td>{item.description || "—"}</td>
                                        <td>{item.operator || "—"}</td>
                                        <td>
                                            <span
                                                className={
                                                    item.status === "پایان یافته"
                                                        ? styles.finishedBadge
                                                        : styles.progressBadge
                                                }
                                            >
                                                {item.status || "در جریان دارد"}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.detailsBtn}
                                                onClick={() => navigate(`/inventory/stocktaking/${item.id}`)}
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

            {showModal && (
                <StartStockTakingModal
                    onClose={() => setShowModal(false)}
                    canWrite={canWrite}
                    disabledReason={disabledReason}
                    onCreated={(id) => {
                        setShowModal(false);
                        navigate(`/inventory/stocktaking/${id}`);
                    }}
                />
            )}
        </>
    );
}