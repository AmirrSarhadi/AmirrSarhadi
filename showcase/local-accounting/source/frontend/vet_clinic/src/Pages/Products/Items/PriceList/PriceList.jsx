import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useState } from "react";
import styles from "./PriceList.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

// اگر مسیر پروژه‌ات Services هست، همین درست است
const MATERIALS_API = `${API_BASE_URL}/services/api/v2/materials/`;
const BULK_PRICE_API = `${API_BASE_URL}/services/api/v2/materials/bulk-price-update/`;
const BULK_PRICE_SET_API = `${API_BASE_URL}/services/api/v2/materials/bulk-price-set/`;

const PRICE_FIELDS = [
    { label: "قیمت فروش", type: "field", value: "unit_selling_price" },
    { label: "قیمت فروش 1", type: "level", value: 1 },
    { label: "قیمت فروش 2", type: "level", value: 2 },
    { label: "قیمت فروش 3", type: "level", value: 3 },
    { label: "قیمت فروش 4", type: "level", value: 4 },
    { label: "قیمت خرید", type: "field", value: "unit_buying_price" },
];

export default function PriceList() {
    const { canWrite, disabledReason } = useModulePermission("catalog");

    const [materials, setMaterials] = useState([]);
    const [editedRows, setEditedRows] = useState({});
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [changeType, setChangeType] = useState("percent");
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        priceTarget: "unit_selling_price",
        operation: "increase",
        value: "",
        rounding: false,
    });

    useEffect(() => {
        fetchMaterials();
    }, []);

    const normalizeMaterialsResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.results)) return data.results;
        return [];
    };

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const res = await authFetch(MATERIALS_API);
            const data = await res.json();

            setMaterials(normalizeMaterialsResponse(data));
            setSelectedIds([]);
            setEditedRows({});
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت لیست کالاها");
        } finally {
            setLoading(false);
        }
    };

    const convertPersianToEnglishDigits = (value) => {
        return String(value)
            .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    };

    const toNumberValue = (value) => {
        return convertPersianToEnglishDigits(value)
            .replace(/,/g, "")
            .replace(/[^\d]/g, "");
    };

    const formatNumber = (value) => {
        if (value === "" || value === null || value === undefined) return "";
        return String(value);
    };

    const filteredMaterials = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return materials;

        return materials.filter((item) => {
            return (
                String(item.persian_name || "").toLowerCase().includes(q) ||
                String(item.english_name || "").toLowerCase().includes(q) ||
                String(item.sku_code || "").includes(q) ||
                String(item.barcode || "").includes(q) ||
                String(item.accounting_code || "").includes(q)
            );
        });
    }, [materials, search]);

    const allVisibleSelected =
        filteredMaterials.length > 0 &&
        filteredMaterials.every((item) => selectedIds.includes(item.id));

    const getRowValue = (item, key) => {
        const edited = editedRows[item.id];

        if (key.startsWith("level_")) {
            const level = Number(key.replace("level_", ""));
            const source = edited?.selling_prices || item.selling_prices || [];
            return source.find((p) => Number(p.level) === level)?.price ?? "";
        }

        return edited?.[key] ?? item[key] ?? "";
    };

    const updateEditedRow = (id, key, value) => {
        setEditedRows((prev) => {
            const original = materials.find((m) => m.id === id);

            return {
                ...prev,
                [id]: {
                    ...original,
                    ...prev[id],
                    [key]: value,
                },
            };
        });
    };

    const setSellingPrice = (item, level, value) => {
        setEditedRows((prev) => {
            const original = materials.find((m) => m.id === item.id);
            const currentRow = {
                ...original,
                ...prev[item.id],
            };

            const currentPrices = currentRow.selling_prices || [];
            const exists = currentPrices.some((p) => Number(p.level) === Number(level));

            const nextPrices = exists
                ? currentPrices.map((p) =>
                    Number(p.level) === Number(level)
                        ? { ...p, level, price: value }
                        : p
                )
                : [...currentPrices, { level, price: value }];

            return {
                ...prev,
                [item.id]: {
                    ...currentRow,
                    selling_prices: nextPrices,
                },
            };
        });
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedIds((prev) =>
                prev.filter((id) => !filteredMaterials.some((item) => item.id === id))
            );
        } else {
            const visibleIds = filteredMaterials.map((item) => item.id);
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const openModal = (type) => {
        if (selectedIds.length === 0) {
            alert("اول حداقل یک ردیف را انتخاب کن");
            return;
        }

        setChangeType(type);
        setForm({
            priceTarget: "unit_selling_price",
            operation: "increase",
            value: "",
            rounding: false,
        });

        setModalOpen(true);
    };

    const submitBulkChange = async () => {
        if (!canWrite) {
            alert(disabledReason);
            return;
        }

        if (!form.value || Number(form.value) <= 0) {
            alert("مقدار تغییر را وارد کن");
            return;
        }

        const selectedTarget = PRICE_FIELDS.find(
            (item) => String(item.value) === String(form.priceTarget)
        );

        const payload = {
            ids: selectedIds,
            operation: form.operation,
            value_type: changeType,
            value: Number(form.value),
            rounding: form.rounding,
        };

        if (selectedTarget.type === "field") {
            payload.field = selectedTarget.value;
        } else {
            payload.level = selectedTarget.value;
        }

        try {
            setSaving(true);

            const res = await authFetch(BULK_PRICE_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Bulk update failed");

            setModalOpen(false);
            await fetchMaterials();
        } catch (err) {
            console.error(err);
            alert("خطا در بروزرسانی گروهی قیمت‌ها");
        } finally {
            setSaving(false);
        }
    };

    const saveEditedPrices = async () => {
        const rows = Object.values(editedRows).map((row) => ({
            id: row.id,
            unit_selling_price: row.unit_selling_price,
            unit_buying_price: row.unit_buying_price,
            selling_prices: row.selling_prices || [],
        }));

        if (rows.length === 0) {
            alert("تغییری برای ذخیره وجود ندارد");
            return;
        }

        try {
            setSaving(true);

            const res = await authFetch(BULK_PRICE_SET_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ rows }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                console.error(errorData);
                throw new Error("Save prices failed");
            }

            await fetchMaterials();
            alert("قیمت‌ها با موفقیت ذخیره شدند");
        } catch (err) {
            console.error(err);
            alert("خطا در ذخیره تغییرات قیمت");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.tableContainer}>
            <div className={styles.header}>
                <div>
                    <h3>بروزرسانی لیست قیمت کالاها</h3>
                    <p>
                        قیمت‌های فروش و خرید را مستقیم تغییر بده یا روی ردیف‌های انتخاب‌شده تغییر گروهی اعمال کن.
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => openModal("amount")}
                    >
                        تغییر مبلغی
                    </button>

                    <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => openModal("percent")}
                    >
                        تغییر درصدی
                    </button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس نام، کد، بارکد..."
                    />
                </div>

                <div className={styles.toolbarActions}>
                    <span className={styles.resultCount}>{filteredMaterials.length} کالا</span>

                    <span className={styles.selectedCount}>{selectedIds.length} انتخاب شده</span>

                    <button
                        type="button"
                        className={styles.saveBtn}
                        onClick={saveEditedPrices}
                        disabled={saving || Object.keys(editedRows).length === 0}
                    >
                        ذخیره تغییرات
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={styles.skeletonWrapper}>
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div className={styles.skeletonRow} key={index}>
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
                                <th>
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                    />
                                </th>
                                <th>ردیف</th>
                                <th>کد</th>
                                <th>دسته‌بندی</th>
                                <th>نام</th>
                                <th>کد کالا</th>
                                <th>بارکد</th>
                                <th>قیمت فروش</th>
                                <th>قیمت فروش 1</th>
                                <th>قیمت فروش 2</th>
                                <th>قیمت فروش 3</th>
                                <th>قیمت فروش 4</th>
                                <th>قیمت خرید</th>
                                <th>نوع کالا</th>
                                <th>تعداد</th>
                                <th>واحد</th>
                                <th>فعال</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredMaterials.length === 0 ? (
                                <tr>
                                    <td colSpan="17" className={styles.emptyState}>
                                        <strong>کالایی پیدا نشد</strong>
                                        <p>عبارت جستجو را تغییر بده یا دوباره لیست را بروزرسانی کن.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredMaterials.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className={selectedIds.includes(item.id) ? styles.selectedRow : ""}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>

                                        <td>{index + 1}</td>
                                        <td>{item.id}</td>
                                        <td>{item.material_category_name_name || item.material_category_name || "-"}</td>
                                        <td className={styles.nameCell}>{item.persian_name}</td>
                                        <td>{item.sku_code}</td>
                                        <td>{item.barcode}</td>

                                        <td>
                                            <input
                                                className={styles.priceInput}
                                                inputMode="numeric"
                                                value={formatNumber(getRowValue(item, "unit_selling_price"))}
                                                onChange={(e) =>
                                                    updateEditedRow(
                                                        item.id,
                                                        "unit_selling_price",
                                                        toNumberValue(e.target.value)
                                                    )
                                                }
                                            />
                                        </td>

                                        {[1, 2, 3, 4].map((level) => (
                                            <td key={level}>
                                                <input
                                                    className={styles.priceInput}
                                                    inputMode="numeric"
                                                    value={formatNumber(getRowValue(item, `level_${level}`))}
                                                    onChange={(e) =>
                                                        setSellingPrice(item, level, toNumberValue(e.target.value))
                                                    }
                                                />
                                            </td>
                                        ))}

                                        <td>
                                            <input
                                                className={styles.priceInput}
                                                inputMode="numeric"
                                                value={formatNumber(getRowValue(item, "unit_buying_price"))}
                                                onChange={(e) =>
                                                    updateEditedRow(
                                                        item.id,
                                                        "unit_buying_price",
                                                        toNumberValue(e.target.value)
                                                    )
                                                }
                                            />
                                        </td>

                                        <td>
                                            <span className={styles.normalBadge}>کالا</span>
                                        </td>

                                        <td>{item.initial_inventory ?? 0}</td>
                                        <td>{item.main_currency || "-"}</td>

                                        <td>
                                            <span className={`${styles.statusBadge} ${styles.activeBadge}`}>
                                                فعال
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalIcon}>
                            {changeType === "percent" ? "%" : "﷼"}
                        </div>

                        <h3>{changeType === "percent" ? "تغییر درصدی قیمت" : "تغییر مبلغی قیمت"}</h3>

                        <p>این عملیات روی {selectedIds.length} ردیف انتخاب‌شده اعمال می‌شود.</p>

                        <div className={styles.formGrid}>
                            <label>
                                عملیات
                                <select
                                    value={form.operation}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, operation: e.target.value }))
                                    }
                                >
                                    <option value="increase">افزایش</option>
                                    <option value="decrease">کاهش</option>
                                </select>
                            </label>

                            <label>
                                براساس
                                <select
                                    value={form.priceTarget}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, priceTarget: e.target.value }))
                                    }
                                >
                                    {PRICE_FIELDS.map((item) => (
                                        <option key={`${item.type}-${item.value}`} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                {changeType === "percent" ? "درصد" : "مبلغ"}
                                <input
                                    inputMode="numeric"
                                    value={form.value}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            value: toNumberValue(e.target.value),
                                        }))
                                    }
                                    placeholder={changeType === "percent" ? "مثلاً 10" : "مثلاً 50000"}
                                />
                            </label>

                            <label>
                                گرد کردن
                                <select
                                    value={form.rounding ? "yes" : "no"}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            rounding: e.target.value === "yes",
                                        }))
                                    }
                                >
                                    <option value="no">خیر</option>
                                    <option value="yes">بله</option>
                                </select>
                            </label>
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelBtn}
                                onClick={() => setModalOpen(false)}
                                disabled={saving || !canWrite}
                            >
                                انصراف
                            </button>

                            <button
                                type="button"
                                className={styles.confirmBtn}
                                onClick={submitBulkChange}
                                disabled={saving || !canWrite}
                            >
                                {saving ? "در حال اعمال..." : "اعمال تغییر"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
