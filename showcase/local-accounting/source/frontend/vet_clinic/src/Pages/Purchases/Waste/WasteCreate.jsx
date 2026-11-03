import { getAllPages } from "../../../api/lists";
import { extractList, API_BASE_URL } from "../../../api/http";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import styles from "./Waste.module.css";
import { FaPlus, FaTrashAlt, FaTimes, FaSearch, FaSave, FaFileExcel, FaBarcode } from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import useModulePermission from "../../../hooks/useModulePermission";

const API = API_BASE_URL;

const money = (v) => Number(v || 0).toLocaleString("fa-IR");
const num = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
};

const toGregorianDate = (value) => {
    if (!value) return "";
    try {
        return value.toDate().toISOString().slice(0, 10);
    } catch {
        return "";
    }
};

export default function WasteCreate() {
    const navigate = useNavigate();
    const { canWrite, disabledReason } = useModulePermission("purchases");
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        code: "",
        reference: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        warehouse: null,
    });

    const [items, setItems] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerRow, setPickerRow] = useState(null);
    const [pickerSearch, setPickerSearch] = useState("");
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [barcodeModal, setBarcodeModal] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const totalQuantity = useMemo(
        () => items.reduce((sum, item) => sum + num(item.quantity), 0),
        [items]
    );

    const totalAmount = useMemo(
        () => items.reduce((sum, item) => sum + num(item.total_price), 0),
        [items]
    );

    useEffect(() => {
        appendRow();
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const { data } = await getAllPages(`${API}/warehousing/api/v2/warehouses/`);
            setWarehouses(extractList(data));
        } catch (err) {
            console.error(err);
            toast.error("خطا در دریافت لیست انبارها");
        }
    };

    const guardWrite = () => {
        if (!canWrite) {
            toast.error(disabledReason);
            return true;
        }

        return false;
    };

    const appendRow = () => {
        setItems((prev) => [
            ...prev,
            {
                localId: Date.now() + Math.random(),
                material: null,
                material_name: "",
                sku_code: "",
                barcode: "",
                description: "",
                quantity: 1,
                unit_price: 0,
                total_price: 0,
            },
        ]);
    };

    const addRow = () => {
        if (guardWrite()) return;
        appendRow();
    };

    const updateRow = (index, patch) => {
        setItems((prev) => {
            const copy = [...prev];
            const row = { ...copy[index], ...patch };
            row.total_price = num(row.quantity) * num(row.unit_price);
            copy[index] = row;
            return copy;
        });
    };

    const removeRow = (index) => {
        if (guardWrite()) return;

        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const fetchMaterials = async (q = "") => {
        try {
            setLoadingMaterials(true);
            const { data } = await getAllPages(
                `${API}/services/api/v2/materials/?search=${encodeURIComponent(q)}`
            );
            setMaterials(extractList(data));
        } catch (err) {
            console.error(err);
            toast.error("خطا در دریافت کالاها");
            setMaterials([]);
        } finally {
            setLoadingMaterials(false);
        }
    };

    const openPicker = (index) => {
        if (guardWrite()) return;

        setPickerRow(index);
        setPickerSearch("");
        setPickerOpen(true);
        fetchMaterials("");
    };

    const selectMaterial = (material, rowIndex = pickerRow) => {
        if (guardWrite()) return;

        updateRow(rowIndex, {
            material: material.id || material.material,
            material_name: material.persian_name || material.material_name,
            sku_code: material.sku_code || "",
            barcode: material.barcode || "",
            description: material.description || "",
            unit_price: num(material.unit_buying_price || material.unit_price || material.unit_selling_price),
        });

        setPickerOpen(false);
    };

    const findByBarcode = async (barcode, rowIndex) => {
        if (guardWrite()) return;

        if (!barcode) {
            toast.warning("بارکد را وارد کن");
            return;
        }

        try {
            const { data } = await getAllPages(
                `${API}/costs/api/v2/waste/materials/barcode/${encodeURIComponent(barcode)}/`
            );

            selectMaterial(data, rowIndex);
            setBarcodeModal(null);
            toast.success("کالا با بارکد انتخاب شد");
        } catch (err) {
            console.error(err);
            toast.error("کالایی با این بارکد پیدا نشد");
        }
    };

    const handleExcel = async (event) => {
        if (guardWrite()) {
            event.target.value = "";
            return;
        }

        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (!rows.length) {
                toast.warning("فایل اکسل خالی است");
                return;
            }

            const imported = rows.map((row) => {
                const quantity = num(row.quantity || row["تعداد"] || 1);
                const unit_price = num(row.unit_price || row["قیمت واحد"] || row["قیمت"] || 0);

                return {
                    localId: Date.now() + Math.random(),
                    material: row.material || row.material_id || row["شناسه کالا"] || null,
                    material_name: row.material_name || row["نام کالا"] || "",
                    sku_code: row.sku_code || row["کد کالا"] || "",
                    barcode: row.barcode || row["بارکد"] || "",
                    description: row.description || row["شرح"] || "",
                    quantity,
                    unit_price,
                    total_price: quantity * unit_price,
                };
            });

            setItems((prev) => [...prev.filter((x) => x.material || x.material_name), ...imported]);
            toast.success("لیست اکسل وارد شد");
        } catch (err) {
            console.error(err);
            toast.error("خطا در خواندن فایل اکسل");
        } finally {
            event.target.value = "";
        }
    };

    const submitWaste = async () => {
        if (guardWrite()) return;

        if (!form.warehouse) {
            toast.error("انبار خروج را انتخاب کنید");
            return;
        }

        if (!items.some((item) => item.material)) {
            toast.error("حداقل یک کالا انتخاب کن");
            return;
        }

        const payload = {
            code: Number(form.code || Date.now()),
            reference: form.reference || `WST-${Date.now()}`,
            date: form.date,
            description: form.description,
            warehouse: Number(form.warehouse),
            items: items
                .filter((item) => item.material)
                .map((item) => ({
                    material: Number(item.material),
                    description: item.description || "",
                    quantity: Number(item.quantity || 0),
                    unit_price: Number(item.unit_price || 0),
                })),
        };

        try {
            setSubmitting(true);
            await axios.post(`${API}/costs/api/v2/waste_invoices/`, payload);
            toast.success("فاکتور ضایعات ثبت شد");
            navigate("/purchases/waste");
        } catch (err) {
            console.error("Waste submit error:", err.response?.data || err);
            toast.error("ثبت ضایعات انجام نشد");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h2>ضایعات جدید</h2>
                    <p>ثبت فاکتور ضایعات با انتخاب کالا، بارکد یا ورود از اکسل</p>
                </div>

                <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => navigate("/purchases/waste")}
                >
                    بازگشت به لیست ضایعات
                </button>
            </div>

            <div className={styles.formCard}>
                <div className={styles.sectionTitle}>
                    <h3>اطلاعات اصلی</h3>
                    <span>فاکتور ضایعات</span>
                </div>

                <div className={styles.row}>
                    <Field label="شماره">
                        <input
                            value={form.code}
                            onChange={(e) => setForm({ ...form, code: e.target.value })}
                            placeholder="اختیاری"
                        />
                    </Field>

                    <Field label="ارجاع">
                        <input
                            value={form.reference}
                            onChange={(e) => setForm({ ...form, reference: e.target.value })}
                            placeholder="اختیاری"
                        />
                    </Field>

                    <Field label="تاریخ">
                        <DatePicker
                            calendar={persian}
                            locale={persian_fa}
                            inputClass={styles.dateInput}
                            onChange={(value) =>
                                setForm({ ...form, date: toGregorianDate(value) })
                            }
                        />
                    </Field>

                    <Field label="انبار خروج" grow>
                        <select
                            value={form.warehouse || ""}
                            onChange={(e) => setForm({ ...form, warehouse: e.target.value })}
                        >
                            <option value="">انتخاب انبار</option>
                            {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="توضیحات" grow>
                        <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="توضیحات کلی ضایعات"
                        />
                    </Field>
                </div>
            </div>

            <div className={styles.tableCard}>
                <div className={styles.sectionTitle}>
                    <h3>آیتم‌های ضایعات</h3>

                    <div className={styles.headerActions}>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            hidden
                            onChange={handleExcel}
                            disabled={!canWrite}
                        />

                        <button
                            type="button"
                            className={styles.excelBtn}
                            onClick={() => fileRef.current?.click()}
                            disabled={!canWrite}
                            title={!canWrite ? disabledReason : undefined}
                        >
                            <FaFileExcel />
                            ورود اکسل
                        </button>

                        <button
                            type="button"
                            className={styles.addItemBtn}
                            onClick={addRow}
                            disabled={!canWrite}
                            title={!canWrite ? disabledReason : undefined}
                        >
                            <FaPlus />
                            افزودن ردیف
                        </button>
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>حذف</th>
                                <th>ردیف</th>
                                <th>کالا</th>
                                <th>کد کالا</th>
                                <th>بارکد</th>
                                <th>شرح</th>
                                <th>تعداد</th>
                                <th>مبلغ واحد</th>
                                <th>مبلغ کل</th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan="9">
                                        <div className={styles.emptyState}>ردیفی اضافه نشده است.</div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={item.localId}>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.iconBtn}
                                                onClick={() => removeRow(index)}
                                                disabled={!canWrite}
                                                title={!canWrite ? disabledReason : undefined}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </td>

                                        <td>{index + 1}</td>

                                        <td>
                                            <button
                                                type="button"
                                                className={styles.selectBtn}
                                                onClick={() => openPicker(index)}
                                                disabled={!canWrite}
                                                title={!canWrite ? disabledReason : undefined}
                                            >
                                                {item.material_name || "انتخاب کالا"}
                                            </button>
                                        </td>

                                        <td>{item.sku_code || "-"}</td>

                                        <td>
                                            <div className={styles.barcodeCell}>
                                                <span>{item.barcode || "-"}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setBarcodeModal({ row: index, value: item.barcode || "" })}
                                                    disabled={!canWrite}
                                                    title={!canWrite ? disabledReason : undefined}
                                                >
                                                    <FaBarcode />
                                                </button>
                                            </div>
                                        </td>

                                        <td>
                                            <input
                                                value={item.description}
                                                onChange={(e) =>
                                                    updateRow(index, { description: e.target.value })
                                                }
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateRow(index, { quantity: e.target.value })
                                                }
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.unit_price}
                                                onChange={(e) =>
                                                    updateRow(index, { unit_price: e.target.value })
                                                }
                                            />
                                        </td>

                                        <td>
                                            <span className={styles.amountBadge}>
                                                {money(item.total_price)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.summaryCard}>
                <div className={styles.totals}>
                    <div>
                        <span>تعداد کل</span>
                        <b>{totalQuantity.toLocaleString("fa-IR")}</b>
                    </div>

                    <div className={styles.grand}>
                        <span>مبلغ کل ضایعات</span>
                        <b>{money(totalAmount)}</b>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => navigate("/purchases/waste")}
                    >
                        انصراف
                    </button>

                    <button
                        type="button"
                        className={styles.primary}
                        onClick={submitWaste}
                        disabled={submitting || !canWrite}
                        title={!canWrite ? disabledReason : undefined}
                    >
                        <FaSave />
                        {submitting ? "در حال ثبت..." : "ثبت ضایعات"}
                    </button>
                </div>
            </div>

            {pickerOpen && (
                <div className={styles.modalBackdrop} onClick={() => setPickerOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <b>انتخاب کالا</b>
                                <small>کالای ضایعاتی را انتخاب کن</small>
                            </div>

                            <button type="button" onClick={() => setPickerOpen(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className={styles.searchRow}>
                            <div className={styles.modalSearch}>
                                <FaSearch />
                                <input
                                    value={pickerSearch}
                                    onChange={(e) => setPickerSearch(e.target.value)}
                                    placeholder="جستجو..."
                                />
                            </div>

                            <button type="button" onClick={() => fetchMaterials(pickerSearch)}>
                                جستجو
                            </button>
                        </div>

                        <div className={styles.list}>
                            {loadingMaterials ? (
                                <div className={styles.emptyState}>در حال بارگذاری...</div>
                            ) : (
                                <table className={styles.pickTable}>
                                    <thead>
                                        <tr>
                                            <th>کد</th>
                                            <th>نام کالا</th>
                                            <th>بارکد</th>
                                            <th>قیمت خرید</th>
                                            <th>انتخاب</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {materials.map((m) => (
                                            <tr key={m.id}>
                                                <td>{m.sku_code || "-"}</td>
                                                <td>{m.persian_name || "-"}</td>
                                                <td>{m.barcode || "-"}</td>
                                                <td>{money(m.unit_buying_price || m.unit_selling_price)}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className={styles.selectMaterialBtn}
                                                        onClick={() => selectMaterial(m)}
                                                        disabled={!canWrite}
                                                        title={!canWrite ? disabledReason : undefined}
                                                    >
                                                        انتخاب
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {barcodeModal && (
                <BarcodeModal
                    initialValue={barcodeModal.value}
                    onClose={() => setBarcodeModal(null)}
                    onSave={(barcode) => findByBarcode(barcode, barcodeModal.row)}
                    disabled={!canWrite}
                    disabledReason={disabledReason}
                />
            )}
        </div>
    );
}

function Field({ label, children, grow }) {
    return (
        <div className={grow ? `${styles.field} ${styles.grow}` : styles.field}>
            <label>{label}</label>
            {children}
        </div>
    );
}

function BarcodeModal({ initialValue, onClose, onSave, disabled = false, disabledReason }) {
    const [value, setValue] = useState(initialValue || "");

    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            <div className={styles.smallModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <b>جستجو با بارکد</b>
                        <small>بارکد کالا را وارد کن</small>
                    </div>

                    <button type="button" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.field}>
                    <label>بارکد</label>
                    <input value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
                </div>

                <div className={styles.modalFooter}>
                    <button
                        type="button"
                        onClick={() => onSave(value)}
                        disabled={disabled}
                        title={disabled ? disabledReason : undefined}
                    >
                        جستجو
                    </button>
                </div>
            </div>
        </div>
    );
}