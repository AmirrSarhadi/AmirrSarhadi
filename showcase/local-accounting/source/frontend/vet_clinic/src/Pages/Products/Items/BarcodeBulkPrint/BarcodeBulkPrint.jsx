import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import styles from "./BarcodeBulkPrint.module.css";

const MATERIALS_API = `${API_BASE_URL}/services/api/v2/materials/`;

export default function BarcodeBulkPrint() {

    const [materials, setMaterials] = useState([]);
    const [selectedRows, setSelectedRows] = useState({});
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const printAreaRef = useRef(null);

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
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت لیست کالاها");
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return materials;

        return materials.filter((item) => {
            return (
                String(item.persian_name || "").toLowerCase().includes(q) ||
                String(item.english_name || "").toLowerCase().includes(q) ||
                String(item.sku_code || "").includes(q) ||
                String(item.barcode || "").includes(q)
            );
        });
    }, [materials, search]);

    const selectedItems = useMemo(() => {
        return Object.values(selectedRows)
            .filter((row) => row.checked && row.material?.barcode)
            .map((row) => ({
                ...row.material,
                printCount: Number(row.count) || 1,
            }));
    }, [selectedRows]);

    const labels = useMemo(() => {
        const result = [];

        selectedItems.forEach((item) => {
            for (let i = 0; i < item.printCount; i += 1) {
                result.push({
                    ...item,
                    labelKey: `${item.id}-${i}`,
                });
            }
        });

        return result;
    }, [selectedItems]);

    useEffect(() => {
        labels.forEach((label, index) => {
            const el = document.getElementById(`bulk-barcode-${index}`);

            if (el && label.barcode) {
                el.innerHTML = "";

                JsBarcode(el, String(label.barcode), {
                    format: "CODE128",
                    width: 1.6,
                    height: 54,
                    displayValue: true,
                    fontSize: 13,
                    margin: 6,
                });
            }
        });
    }, [labels]);

    const toggleRow = (item) => {
        if (!item.barcode) {
            alert("این کالا بارکد ندارد. اول از بخش ساخت بارکد برایش بارکد بساز.");
            return;
        }

        setSelectedRows((prev) => {
            const current = prev[item.id];

            return {
                ...prev,
                [item.id]: {
                    material: item,
                    checked: !current?.checked,
                    count: current?.count || 1,
                },
            };
        });
    };

    const changeCount = (item, value) => {
        const count = String(value).replace(/[^\d]/g, "");

        setSelectedRows((prev) => ({
            ...prev,
            [item.id]: {
                material: item,
                checked: prev[item.id]?.checked || false,
                count,
            },
        }));
    };

    const handlePrint = () => {
        if (labels.length === 0) {
            alert("حداقل یک کالا با بارکد انتخاب کن");
            return;
        }

        window.print();
    };

    const clearSelected = () => {
        setSelectedRows({});
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>چاپ بارکد تعدادی</h3>
                    <p>چند کالا انتخاب کن، تعداد چاپ هرکدام را وارد کن و همه را یکجا چاپ بگیر.</p>
                </div>

                <div className={styles.headerActions}>
                    <button type="button" className={styles.clearBtn} onClick={clearSelected}>
                        پاک کردن انتخاب‌ها
                    </button>

                    <button type="button" className={styles.printBtn} onClick={handlePrint}>
                        چاپ {labels.length} لیبل
                    </button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <span>🔎</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="جستجو بر اساس نام، کد کالا یا بارکد..."
                    />
                </div>

                <span className={styles.resultCount}>{filteredMaterials.length} کالا</span>
                <span className={styles.selectedCount}>{selectedItems.length} کالا انتخاب شده</span>
            </div>

            <div className={styles.content}>
                <div className={styles.tablePanel}>
                    {loading ? (
                        <div className={styles.skeletonWrapper}>
                            {Array.from({ length: 7 }).map((_, index) => (
                                <div className={styles.skeletonRow} key={index}>
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
                                        <th>انتخاب</th>
                                        <th>ردیف</th>
                                        <th>نام کالا</th>
                                        <th>کد کالا</th>
                                        <th>بارکد</th>
                                        <th>تعداد چاپ</th>
                                        <th>وضعیت</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredMaterials.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className={styles.emptyState}>
                                                <strong>کالایی پیدا نشد</strong>
                                                <p>عبارت جستجو را تغییر بده.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMaterials.map((item, index) => {
                                            const row = selectedRows[item.id];

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={row?.checked ? styles.selectedRow : ""}
                                                >
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!row?.checked}
                                                            disabled={!item.barcode}
                                                            onChange={() => toggleRow(item)}
                                                        />
                                                    </td>

                                                    <td>{index + 1}</td>
                                                    <td className={styles.nameCell}>{item.persian_name}</td>
                                                    <td>{item.sku_code || "-"}</td>
                                                    <td>{item.barcode || "-"}</td>

                                                    <td>
                                                        <input
                                                            className={styles.countInput}
                                                            inputMode="numeric"
                                                            value={row?.count || ""}
                                                            disabled={!item.barcode}
                                                            onChange={(e) => changeCount(item, e.target.value)}
                                                            placeholder="1"
                                                        />
                                                    </td>

                                                    <td>
                                                        {item.barcode ? (
                                                            <span className={`${styles.statusBadge} ${styles.readyBadge}`}>
                                                                آماده چاپ
                                                            </span>
                                                        ) : (
                                                            <span className={`${styles.statusBadge} ${styles.missingBadge}`}>
                                                                بدون بارکد
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className={styles.previewPanel}>
                    <div className={styles.previewHeader}>
                        <div>
                            <h4>پیش‌نمایش لیبل‌ها</h4>
                            <p>{labels.length} لیبل برای چاپ آماده است.</p>
                        </div>
                    </div>

                    <div className={styles.previewBox}>
                        {labels.length === 0 ? (
                            <div className={styles.emptyPreview}>
                                <div className={styles.previewIcon}>▦</div>
                                <h4>هنوز لیبلی ساخته نشده</h4>
                                <p>از جدول سمت راست کالا انتخاب کن و تعداد چاپ را وارد کن.</p>
                            </div>
                        ) : (
                            <div ref={printAreaRef} className={styles.printArea}>
                                {labels.map((label, index) => (
                                    <div className={styles.labelCard} key={label.labelKey}>
                                        <div className={styles.labelTitle}>{label.persian_name}</div>

                                        <svg id={`bulk-barcode-${index}`}></svg>

                                        <div className={styles.labelFooter}>
                                            <span>کد: {label.sku_code || "-"}</span>
                                            <span>
                                                قیمت:{" "}
                                                {label.unit_selling_price
                                                    ? Number(label.unit_selling_price).toLocaleString("fa-IR")
                                                    : "-"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.notice}>
                        موقع چاپ فقط بخش پیش‌نمایش لیبل‌ها چاپ می‌شود.
                    </div>
                </div>
            </div>
        </div>
    );
}
