import { API_BASE_URL } from "../../api/http";
// انبارگردانی افزودن
import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./StockTaking.module.css";
import { toast } from "react-toastify";
import { FaTimes } from "react-icons/fa";

const API_BASE = API_BASE_URL;
const WAREHOUSE_API = `${API_BASE}/warehousing/api/v2/warehouses/`;
const ACTIVE_CHECK_API = `${API_BASE}/warehousing/api/v2/stocktakings/active-check/`;
const STOCKTAKING_API = `${API_BASE}/warehousing/api/v2/stocktakings/`;

export default function StartStockTakingModal({ onClose, onCreated, canWrite = true, disabledReason = "نقش کاربری شما اجازه انجام این عملیات را ندارد." }) {
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseId, setWarehouseId] = useState("");
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        axios
            .get(WAREHOUSE_API)
            .then((res) =>
                setWarehouses(Array.isArray(res.data) ? res.data : res.data.results || [])
            )
            .catch(() => toast.error("خطا در دریافت انبارها"));
    }, []);

    const createStockTaking = async () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return;
        }

        if (!warehouseId) {
            toast.error("ابتدا انبار را انتخاب کن");
            return;
        }

        try {
            setChecking(true);

            const check = await axios.get(`${ACTIVE_CHECK_API}?warehouse=${warehouseId}`);

            if (check.data?.has_active) {
                toast.error(
                    `برای این انبار یک انبارگردانی در جریان وجود دارد. شماره: ${check.data.number}`
                );
                return;
            }


            const payload = {
                warehouse: Number(warehouseId),
                number: Date.now(),
                date: "",
                description: "",
                operator: "",
                status: "در جریان دارد",
            };

            const { data } = await axios.post(STOCKTAKING_API, payload);

            toast.success("انبارگردانی ایجاد شد");
            onCreated(data.id);
        } catch (err) {
            console.error(err.response?.data || err);
            toast.error("ایجاد انبارگردانی انجام نشد");
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h3>شروع انبارگردانی</h3>
                        <p>ابتدا انبار مورد نظر را انتخاب کن.</p>
                    </div>

                    <button type="button" className={styles.closeIconBtn} onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.formField}>
                    <label>انبار</label>
                    <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                        <option value="">انتخاب کنید</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.modalActions}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onClose}
                        disabled={checking}
                    >
                        انصراف
                    </button>

                    <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={createStockTaking}
                        disabled={checking || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        {checking ? "در حال بررسی..." : "ادامه"}
                    </button>
                </div>
            </div>
        </div>
    );
}