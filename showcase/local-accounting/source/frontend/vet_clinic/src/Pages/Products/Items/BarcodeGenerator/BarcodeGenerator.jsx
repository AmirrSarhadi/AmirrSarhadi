import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import styles from "./BarcodeGenerator.module.css";

const MATERIALS_API = `${API_BASE_URL}/services/api/v2/materials/`;
const GENERATE_BARCODE_API = `${API_BASE_URL}/services/api/v2/materials/generate-barcode/`;

export default function BarcodeGenerator() {

    const [materials, setMaterials] = useState([]);
    const [selectedMaterialId, setSelectedMaterialId] = useState("");
    const [search, setSearch] = useState("");
    const [generatedBarcode, setGeneratedBarcode] = useState("");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const barcodeRef = useRef(null);

    useEffect(() => {
        fetchMaterials();
    }, []);

    useEffect(() => {
        if (generatedBarcode && barcodeRef.current) {
            JsBarcode(barcodeRef.current, String(generatedBarcode), {
                format: "CODE128",
                width: 2,
                height: 70,
                displayValue: true,
                fontSize: 16,
                margin: 12,
            });
        }
    }, [generatedBarcode]);

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

    const selectedMaterial = useMemo(() => {
        return materials.find((item) => String(item.id) === String(selectedMaterialId));
    }, [materials, selectedMaterialId]);

    const handleSelectMaterial = (item) => {
        setSelectedMaterialId(item.id);
        setGeneratedBarcode(item.barcode || "");
    };

    const generateBarcode = async () => {
        if (!selectedMaterialId) {
            alert("اول یک کالا انتخاب کن");
            return;
        }

        try {
            setGenerating(true);

            const res = await authFetch(GENERATE_BARCODE_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    material_id: selectedMaterialId,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                console.error(errorData);
                throw new Error("Generate barcode failed");
            }

            const data = await res.json();

            setGeneratedBarcode(data.barcode);
            await fetchMaterials();

            alert("بارکد با موفقیت ساخته شد");
        } catch (err) {
            console.error(err);
            alert("خطا در ساخت بارکد");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h3>ساخت بارکد کالا</h3>
                    <p>یک کالا انتخاب کن و برای آن بارکد جدید تولید کن.</p>
                </div>

                <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={generateBarcode}
                    disabled={generating || !selectedMaterialId}
                >
                    {generating ? "در حال ساخت..." : "ساخت بارکد"}
                </button>
            </div>

            <div className={styles.content}>
                <div className={styles.listPanel}>
                    <div className={styles.searchBox}>
                        <span>🔎</span>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="جستجو بر اساس نام، کد کالا یا بارکد..."
                        />
                    </div>

                    <div className={styles.materialList}>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, index) => (
                                <div className={styles.skeletonItem} key={index}>
                                    <span />
                                    <span />
                                </div>
                            ))
                        ) : filteredMaterials.length === 0 ? (
                            <div className={styles.emptyState}>
                                <strong>کالایی پیدا نشد</strong>
                                <p>عبارت جستجو را تغییر بده.</p>
                            </div>
                        ) : (
                            filteredMaterials.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={`${styles.materialItem} ${String(selectedMaterialId) === String(item.id)
                                            ? styles.activeItem
                                            : ""
                                        }`}
                                    onClick={() => handleSelectMaterial(item)}
                                >
                                    <div>
                                        <strong>{item.persian_name}</strong>
                                        <span>کد کالا: {item.sku_code || "-"}</span>
                                    </div>

                                    <small>{item.barcode || "بدون بارکد"}</small>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className={styles.previewPanel}>
                    {!selectedMaterial ? (
                        <div className={styles.emptyPreview}>
                            <div className={styles.previewIcon}>▦</div>
                            <h4>هنوز کالایی انتخاب نشده</h4>
                            <p>از لیست سمت راست یک کالا را انتخاب کن.</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.productInfo}>
                                <span>کالای انتخاب‌شده</span>
                                <h4>{selectedMaterial.persian_name}</h4>

                                <div className={styles.infoGrid}>
                                    <div>
                                        <small>کد کالا</small>
                                        <strong>{selectedMaterial.sku_code || "-"}</strong>
                                    </div>

                                    <div>
                                        <small>کد حسابداری</small>
                                        <strong>{selectedMaterial.accounting_code || "-"}</strong>
                                    </div>

                                    <div>
                                        <small>بارکد فعلی</small>
                                        <strong>{generatedBarcode || selectedMaterial.barcode || "-"}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.barcodeBox}>
                                {generatedBarcode || selectedMaterial.barcode ? (
                                    <svg ref={barcodeRef}></svg>
                                ) : (
                                    <div className={styles.noBarcode}>
                                        <strong>این کالا هنوز بارکد ندارد</strong>
                                        <p>روی دکمه ساخت بارکد بزن.</p>
                                    </div>
                                )}
                            </div>

                            <div className={styles.notice}>
                                با ساخت بارکد، مقدار جدید داخل فیلد barcode همین کالا ذخیره می‌شود.
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
