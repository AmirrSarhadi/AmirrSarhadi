import ReportDownloads from "../../../components/ReportDownloads/ReportDownloads";
import { authFetch } from "../../../api/http";
import { API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaSearch } from "react-icons/fa";
import styles from "../PersonTable.module.css";
import useModulePermission from "../../../hooks/useModulePermission";

const API_BASE = API_BASE_URL;

export default function PersonReceiveList() {
    const { canWrite, disabledReason } = useModulePermission("banking");

    const [receives, setReceives] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    const fetchReceives = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${API_BASE}/persons/api/v2/getpaid_list/`);
            const data = await res.json();

            setReceives(Array.isArray(data) ? data : data.results || []);
        } catch (error) {
            console.error("Fetch receives error:", error);
            setReceives([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReceives();
    }, []);

    const filteredReceives = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        if (!q) return receives;

        return receives.filter((r) =>
            [r.get_paid_number, r.date, r.amount, r.description]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [receives, searchTerm]);

    return (
        <div className={styles.tableContainer}>
            <div className={styles.header}>
                <div>
                    <h3>لیست دریافت‌ها</h3>
                    <p>مدیریت دریافت‌ها از اشخاص</p>
                </div>

                <button
                    type="button"
                    className={styles.addBtn}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                    onClick={() => {
                        if (!canWrite) {
                            alert(disabledReason);
                            return;
                        }
                        navigate("/persons/receive/add");
                    }}
                >
                    <FaPlus />
                    افزودن دریافت
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <FaSearch />
                    <input
                        placeholder="جستجو بر اساس شماره، تاریخ، مبلغ یا شرح..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.resultCount}>
                    {filteredReceives.length.toLocaleString("fa-IR")} دریافت
                </div>
            </div>

            {loading ? (
                <div>در حال بارگذاری...</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>شماره</th>
                                <th>تاریخ</th>
                                <th>مبلغ</th>
                                <th>شرح</th><th>رسید</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredReceives.length === 0 ? (
                                <tr>
                                    <td colSpan="6">دریافتی ثبت نشده است.</td>
                                </tr>
                            ) : (
                                filteredReceives.map((r, i) => (
                                    <tr key={r.id}>
                                        <td>{i + 1}</td>
                                        <td>{r.get_paid_number}</td>
                                        <td>{r.date || "—"}</td>
                                        <td>{Number(r.amount || 0).toLocaleString("fa-IR")}</td>
                                        <td>{r.description || "—"}</td><td><ReportDownloads url={`${API_BASE}/persons/api/v2/receipts/receipt/${r.id}/export/`} filename={`receipt-${r.id}`} /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

