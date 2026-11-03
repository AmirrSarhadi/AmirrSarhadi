import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import styles from "./BarcodePrint.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const MATERIALS_API = `${API_BASE_URL}/services/api/v2/materials/`;

export default function BarcodePrint() {
  const { canWrite } = useModulePermission("catalog");

  const [materials, setMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const barcodeRef = useRef(null);
  const printAreaRef = useRef(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const selectedMaterial = useMemo(() => {
    return materials.find((item) => String(item.id) === String(selectedMaterialId));
  }, [materials, selectedMaterialId]);

  useEffect(() => {
    if (selectedMaterial?.barcode && barcodeRef.current) {
      JsBarcode(barcodeRef.current, String(selectedMaterial.barcode), {
        format: "CODE128",
        width: 2,
        height: 70,
        displayValue: true,
        fontSize: 16,
        margin: 10,
      });
    }
  }, [selectedMaterial]);

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

  const handlePrint = () => {
    if (!selectedMaterial) {
      alert("اول یک کالا انتخاب کن");
      return;
    }

    if (!selectedMaterial.barcode) {
      alert("این کالا بارکد ندارد. اول از بخش ساخت بارکد برایش بارکد بساز.");
      return;
    }

    window.print();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>چاپ بارکد کالا</h3>
          <p>یک کالا انتخاب کن و لیبل بارکد آن را چاپ بگیر.</p>
        </div>

        <button
          type="button"
          className={styles.printBtn}
          onClick={handlePrint}
          disabled={!canWrite || !selectedMaterial?.barcode}
        >
          چاپ بارکد
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
                  className={`${styles.materialItem} ${
                    String(selectedMaterialId) === String(item.id)
                      ? styles.activeItem
                      : ""
                  }`}
                  onClick={() => setSelectedMaterialId(item.id)}
                >
                  <div>
                    <strong>{item.persian_name}</strong>
                    <span>کد کالا: {item.sku_code || "-"}</span>
                  </div>

                  <small className={item.barcode ? styles.hasBarcode : styles.noBarcodeBadge}>
                    {item.barcode || "بدون بارکد"}
                  </small>
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
          ) : !selectedMaterial.barcode ? (
            <div className={styles.emptyPreview}>
              <div className={styles.warningIcon}>!</div>
              <h4>این کالا بارکد ندارد</h4>
              <p>اول از بخش ساخت بارکد برای این کالا بارکد تولید کن.</p>
            </div>
          ) : (
            <>
              <div className={styles.productInfo}>
                <span>پیش‌نمایش چاپ</span>
                <h4>{selectedMaterial.persian_name}</h4>

                <div className={styles.infoGrid}>
                  <div>
                    <small>کد کالا</small>
                    <strong>{selectedMaterial.sku_code || "-"}</strong>
                  </div>

                  <div>
                    <small>بارکد</small>
                    <strong>{selectedMaterial.barcode}</strong>
                  </div>

                  <div>
                    <small>قیمت فروش</small>
                    <strong>
                      {selectedMaterial.unit_selling_price
                        ? Number(selectedMaterial.unit_selling_price).toLocaleString("fa-IR")
                        : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.printPreview}>
                <div ref={printAreaRef} className={styles.printArea}>
                  <div className={styles.labelCard}>
                    <div className={styles.labelTitle}>
                      {selectedMaterial.persian_name}
                    </div>

                    <svg ref={barcodeRef}></svg>

                    <div className={styles.labelFooter}>
                      <span>کد کالا: {selectedMaterial.sku_code || "-"}</span>
                      <span>
                        قیمت:{" "}
                        {selectedMaterial.unit_selling_price
                          ? Number(selectedMaterial.unit_selling_price).toLocaleString("fa-IR")
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.notice}>
                هنگام چاپ، فقط همین لیبل بارکد چاپ می‌شود.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
