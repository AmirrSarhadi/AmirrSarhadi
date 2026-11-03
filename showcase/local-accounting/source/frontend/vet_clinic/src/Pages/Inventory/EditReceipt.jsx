import { API_BASE_URL } from "../../api/http";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./AddReceiptStep2.module.css";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import axios from "axios";
import { toast } from "react-toastify";
import {
    FaTrash,
    FaPlus,
    FaSave,
    FaArrowRight,
} from "react-icons/fa";
import useModulePermission from "../../hooks/useModulePermission";

const RECEIPT_DETAIL_API = (id) =>
    `${API_BASE_URL}/warehousing/api/${id}/v2/warehouse_receipts/`;

const WAREHOUSE_API = `${API_BASE_URL}/warehousing/api/v2/warehouses/`;
const MATERIAL_API = `${API_BASE_URL}/services/api/v2/materials/`;

const emptyItem = {
    material_id: "",
    material_code: "",
    unit: "",
    qty: "",
    ref: "",
    note: "",
};

export default function EditReceipt() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("warehousing");

    const [form, setForm] = useState({
        document_number: "",
        date: "",
        direction: "",
        document_type: "",
        from_warehouse_id: "",
        from_warehouse_name: "",
        description: "",
        delivery: "",
        handover: "",
        items: [{ ...emptyItem }],
    });

    const [materials, setMaterials] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [destWarehouseId, setDestWarehouseId] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const isTransfer = form.document_type === "انتقال";

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const [receiptRes, materialsRes, warehousesRes] = await Promise.all([
                    axios.get(RECEIPT_DETAIL_API(id)),
                    axios.get(MATERIAL_API),
                    axios.get(WAREHOUSE_API),
                ]);

                const data = receiptRes.data;

                const loadedItems =
                    data.items?.length > 0
                        ? data.items.map((item) => ({
                            material_id:
                                item.material_id ||
                                item.material ||
                                item.material_detail?.id ||
                                "",
                            material_code: item.material_code || "",
                            unit: item.unit || "",
                            qty: item.qty || item.quantity || "",
                            ref: item.ref || item.reference || "",
                            note: item.note || item.description || "",
                        }))
                        : [{ ...emptyItem }];

                setForm({
                    document_number: data.document_number || data.number || "",
                    date: data.date || "",
                    direction: data.direction || "",
                    document_type: data.document_type || data.type || "",
                    from_warehouse_id:
                        data.from_warehouse_id || data.from_warehouse || "",
                    from_warehouse_name:
                        data.from_warehouse_name || data.warehouse_name || "",
                    description: data.description || "",
                    delivery: data.delivery || data.transport || "",
                    handover: data.handover || "",
                    items: loadedItems,
                });

                setDestWarehouseId(
                    data.target_warehouse_id ||
                    data.destination_warehouse_id ||
                    data.destination_warehouse ||
                    ""
                );

                setMaterials(
                    Array.isArray(materialsRes.data)
                        ? materialsRes.data
                        : materialsRes.data?.results || []
                );

                setWarehouses(
                    Array.isArray(warehousesRes.data)
                        ? warehousesRes.data
                        : warehousesRes.data?.results || []
                );
            } catch (err) {
                console.error(err);
                toast.error("خطا در دریافت اطلاعات سند");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const selectedFromWarehouseName = useMemo(() => {
        if (form.from_warehouse_name) return form.from_warehouse_name;

        const warehouse = warehouses.find(
            (w) => String(w.id) === String(form.from_warehouse_id)
        );

        return warehouse?.name || "—";
    }, [form.from_warehouse_id, form.from_warehouse_name, warehouses]);

    const guardWrite = () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return true;
        }

        return false;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleItemChange = (index, field, value) => {
        setForm((prev) => {
            const updated = [...prev.items];

            updated[index] = {
                ...updated[index],
                [field]: value,
            };

            if (field === "material_id") {
                const selected = materials.find(
                    (m) => String(m.id) === String(value)
                );

                updated[index].material_code =
                    selected?.sku_code || selected?.code || selected?.barcode || "";

                updated[index].unit =
                    selected?.unit_name ||
                    selected?.main_unit ||
                    selected?.unit ||
                    selected?.main_currency ||
                    "";
            }

            return {
                ...prev,
                items: updated,
            };
        });
    };

    const addRow = () => {
        if (guardWrite()) return;

        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { ...emptyItem }],
        }));
    };

    const removeRow = (index) => {
        if (guardWrite()) return;

        setForm((prev) => ({
            ...prev,
            items:
                prev.items.length === 1
                    ? [{ ...emptyItem }]
                    : prev.items.filter((_, i) => i !== index),
        }));
    };

    const validate = () => {
        if (!form.document_number) {
            toast.error("شماره سند الزامی است");
            return false;
        }

        if (!form.date) {
            toast.error("تاریخ سند الزامی است");
            return false;
        }

        if (!form.from_warehouse_id) {
            toast.error("انبار مبدا مشخص نیست");
            return false;
        }

        if (isTransfer && !destWarehouseId) {
            toast.error("برای انتقال، انتخاب انبار مقصد الزامی است");
            return false;
        }

        if (
            isTransfer &&
            String(destWarehouseId) === String(form.from_warehouse_id)
        ) {
            toast.error("انبار مبدا و مقصد نمی‌توانند یکی باشند");
            return false;
        }

        const validItems = form.items.filter(
            (item) => item.material_id && Number(item.qty) > 0
        );

        if (validItems.length === 0) {
            toast.error("حداقل یک ردیف کالا با تعداد معتبر وارد کن");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (guardWrite()) return;
        if (!validate()) return;

        const validItems = form.items.filter(
            (item) => item.material_id && Number(item.qty) > 0
        );

        const payload = {
            number: Number(form.document_number),
            date: form.date,
            direction: form.direction,
            type: form.document_type,

            from_warehouse: Number(form.from_warehouse_id),

            transport: form.delivery || "",
            handover: form.handover || "",
            description: form.description || "",

            items: validItems.map((item) => ({
                material: Number(item.material_id),
                material_code: String(item.material_code || ""),
                unit: String(item.unit || ""),
                quantity: Number(item.qty),
                reference: item.ref || "",
                description: item.note || "",
            })),
        };

        if (isTransfer) {
            payload.destination_warehouse = Number(destWarehouseId);
        } else {
            payload.destination_warehouse = null;
        }

        try {
            setSubmitting(true);

            await axios.put(RECEIPT_DETAIL_API(id), payload);

            toast.success("سند با موفقیت ویرایش شد");
            navigate("/inventory/transfers");
        } catch (err) {
            console.error("Receipt update error:", err.response?.data || err);
            toast.error("خطا در ویرایش سند");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.card}>
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div>
                        <h3>ویرایش رسید / حواله انبار</h3>
                        <p>اطلاعات سند و ردیف‌های کالا را ویرایش کن.</p>
                    </div>

                    <button
                        type="button"
                        className={styles.backBtn}
                        onClick={() => navigate("/inventory/transfers")}
                    >
                        <FaArrowRight />
                        بازگشت
                    </button>
                </div>

                <div className={styles.summaryGrid}>
                    <div>
                        <span>نوع سند</span>
                        <strong>{form.document_type || "—"}</strong>
                    </div>

                    <div>
                        <span>نوع ورود / خروج</span>
                        <strong>{form.direction || "—"}</strong>
                    </div>

                    <div>
                        <span>انبار مبدا</span>
                        <strong>{selectedFromWarehouseName}</strong>
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formField}>
                        <label>شماره سند</label>
                        <input
                            type="number"
                            name="document_number"
                            value={form.document_number}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.formField}>
                        <label>تاریخ</label>
                        <DatePicker
                            calendar={persian}
                            locale={persian_fa}
                            value={form.date}
                            onChange={(dateObj) =>
                                setForm((prev) => ({
                                    ...prev,
                                    date: dateObj ? dateObj.format("YYYY-MM-DD") : "",
                                }))
                            }
                            format="YYYY/MM/DD"
                            inputClass={styles.dateInput}
                            calendarPosition="bottom-right"
                        />
                    </div>

                    {isTransfer && (
                        <div className={styles.formField}>
                            <label>انبار مقصد</label>
                            <select
                                value={destWarehouseId}
                                onChange={(e) => setDestWarehouseId(e.target.value)}
                            >
                                <option value="">انتخاب کنید</option>
                                {warehouses
                                    .filter(
                                        (w) => String(w.id) !== String(form.from_warehouse_id)
                                    )
                                    .map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.formField}>
                        <label>حمل و نقل</label>
                        <input
                            name="delivery"
                            value={form.delivery}
                            onChange={handleChange}
                            placeholder="نام راننده / روش ارسال"
                        />
                    </div>

                    <div className={styles.formField}>
                        <label>تحویل‌دهنده / تحویل‌گیرنده</label>
                        <input
                            name="handover"
                            value={form.handover}
                            onChange={handleChange}
                            placeholder="نام شخص"
                        />
                    </div>

                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>توضیحات</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="توضیحات سند"
                        />
                    </div>
                </div>

                <div className={styles.itemsHeader}>
                    <div>
                        <h4>اقلام سند</h4>
                        <p>ردیف‌های کالا را ویرایش یا ردیف جدید اضافه کن.</p>
                    </div>

                    <button
                        type="button"
                        className={styles.addRowBtn}
                        onClick={addRow}
                        disabled={!canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaPlus />
                        افزودن ردیف
                    </button>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ردیف</th>
                                <th>کالا</th>
                                <th>کد کالا</th>
                                <th>واحد</th>
                                <th>تعداد</th>
                                <th>ارجاع</th>
                                <th>توضیحات</th>
                                <th>حذف</th>
                            </tr>
                        </thead>

                        <tbody>
                            {form.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>

                                    <td>
                                        <select
                                            value={item.material_id}
                                            onChange={(e) =>
                                                handleItemChange(index, "material_id", e.target.value)
                                            }
                                        >
                                            <option value="">انتخاب کالا</option>
                                            {materials.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.persian_name || m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <input value={item.material_code} readOnly />
                                    </td>

                                    <td>
                                        <input value={item.unit} readOnly />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.qty}
                                            onChange={(e) =>
                                                handleItemChange(index, "qty", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            value={item.ref}
                                            onChange={(e) =>
                                                handleItemChange(index, "ref", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            value={item.note}
                                            onChange={(e) =>
                                                handleItemChange(index, "note", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className={styles.deleteBtn}
                                            onClick={() => removeRow(index)}
                                            disabled={!canWrite}
                                            title={!canWrite ? disabledReason : undefined}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => navigate("/inventory/transfers")}
                        disabled={submitting}
                    >
                        انصراف
                    </button>

                    <button
                        type="button"
                        className={styles.submitBtn}
                        onClick={handleSubmit}
                        disabled={submitting || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaSave />
                        {submitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
                    </button>
                </div>
            </div>
        </div>
    );
}