import { API_BASE_URL } from "../../../../api/http";
// src/pages/Products/Items/AddProduct/AddProductForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import moment from "moment-jalaali";
import styles from "./AddProductForm.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

import Step1General from "./Step1General";
import Step2Inventory from "./Step2Inventory";
import Step3Category from "./Step3Category";
import Step4Pricing from "./Step4Pricing";
import Step5Discount from "./Step5Discount";
import Step6Review from "./Step6Review";

const API = API_BASE_URL;
const MATERIALS_URL = `${API}/services/api/v2/materials/`;

const steps = [
  { num: 1, label: "عمومی", desc: "مشخصات پایه" },
  { num: 2, label: "انبار", desc: "موجودی و ابعاد" },
  { num: 3, label: "دسته‌بندی", desc: "گروه و برند" },
  { num: 4, label: "قیمت‌گذاری", desc: "خرید و فروش" },
  { num: 5, label: "تخفیف", desc: "شرایط تخفیف" },
  { num: 6, label: "بازبینی", desc: "ثبت نهایی" },
];

function dataURLtoBlob(dataURL) {
  const [meta, base64] = dataURL.split(",");
  const mimeMatch = /data:(.*?);base64/.exec(meta);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binStr = atob(base64);
  const len = binStr.length;
  const u8 = new Uint8Array(len);

  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);

  return new Blob([u8], { type: mime });
}

function AddProductForm() {
  const { canWrite, disabledReason } = useModulePermission("catalog");
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    description: "",
    serial_code: "",
    created_by: "admin",

    sku_code: "",
    accounting_code: "",
    persian_name: "",
    english_name: "",
    barcode: "",
    qrcode: null,

    main_currency: "ریال",
    secondary_currency: "تومان",
    Conversion_factor_currency: "1",
    currency_description: "",

    material_group_name: "",
    material_category_name: "",
    material_brand_name: "",
    material_vendor: "",

    weight: "",
    length: "",
    width: "",
    height: "",
    shortage_threshold: "",
    step_sell: "",
    min_order: "",
    max_order: "",
    initial_inventories: [{ warehouse_id: "", material_initial_inventory: "" }],

    unit_selling_price: "",
    selling_description: "",
    unit_buying_price: "",
    buying_description: "",
    tax_percent: "",
    charges: "",

    discounts: [],
  });

  const validateStep = (currentStep) => {
    const requiredByStep = {
      1: ["persian_name", "accounting_code", "sku_code", "description", "serial_code"],
      2: ["main_currency", "secondary_currency"],
      3: [
        "material_group_name",
        "material_category_name",
        "material_vendor",
        "material_brand_name",
      ],
      4: [
        "unit_selling_price",
        "selling_description",
        "unit_buying_price",
        "buying_description",
        "tax_percent",
        "charges",
      ],
      5: [],
      6: [],
    };

    const requiredFields = requiredByStep[currentStep] || [];
    const hasError = requiredFields.some((field) => !formData[field]);

    if (hasError) {
      setError("لطفاً فیلدهای الزامی این مرحله را کامل کنید.");
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep(step)) return;

    setStep((prev) => Math.min(prev + 1, 6));
    setError("");
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setError("");
  };

  const safeNumber = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    return Number.isNaN(number) ? value : number;
  };

  const handleSubmit = async () => {
    if (!canWrite) {
      alert(disabledReason);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { discounts = [], warehouses = [], qrcode, ...rest } = formData;

      const data = new FormData();

      if (qrcode) {
        if (typeof qrcode === "string" && qrcode.startsWith("data:")) {
          const blob = dataURLtoBlob(qrcode);
          data.append("qrcode", blob, "qrcode.png");
        } else if (qrcode instanceof File) {
          data.append("qrcode", qrcode);
        }
      }

      moment.loadPersian({ dialect: "persian-modern" });

      const payload = {
        ...rest,
        sku_code: rest.sku_code,
        accounting_code: safeNumber(rest.accounting_code),
        barcode: safeNumber(rest.barcode),
        serial_code: rest.serial_code,
        step_sell: safeNumber(rest.step_sell),
        shortage_threshold: safeNumber(rest.shortage_threshold),
        weight: safeNumber(rest.weight),
        length: safeNumber(rest.length),
        width: safeNumber(rest.width),
        height: safeNumber(rest.height),
        min_order: safeNumber(rest.min_order),
        max_order: safeNumber(rest.max_order),
        tax_percent: safeNumber(rest.tax_percent),
        charges: safeNumber(rest.charges),
        unit_selling_price: safeNumber(rest.unit_selling_price),
        unit_buying_price: safeNumber(rest.unit_buying_price),
        material_group_name: safeNumber(rest.material_group_name),
        material_category_name: safeNumber(rest.material_category_name),
        material_brand_name: safeNumber(rest.material_brand_name),
        material_vendor: safeNumber(rest.material_vendor),
        updated_by: (formData.updated_by || formData.created_by || "admin").trim(),
        updated_at: moment().format("jYYYY-jMM-jDD HH:mm:ss"),
      };

      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          data.append(key, value);
        }
      });

      const discountsForNested = (discounts || [])
        .filter((discount) => {
          return (
            discount.title ||
            discount.target_type ||
            discount.target_id ||
            discount.discount_percent ||
            discount.discount_amount ||
            discount.valid_from ||
            discount.valid_to
          );
        })
        .map((discount) => {
          const clone = { ...discount };
          delete clone.material;
          return clone;
        });


      if (discountsForNested.length > 0) {
        data.append("discounts", JSON.stringify(discountsForNested));
      }
      const warehousesArr =
        (warehouses && warehouses.length
          ? warehouses
          : formData.initial_inventories) || [];


      const warehousePayload = warehousesArr
        .filter(
          (w) =>
            w.warehouse_id &&
            w.material_initial_inventory !== ""
        )
        .map((w) => ({
          warehouse_id: Number(w.warehouse_id),
          material_initial_inventory: Number(
            w.material_initial_inventory || 0
          ),
        }));


      if (warehousePayload.length > 0) {
        data.append(
          "warehouses",
          JSON.stringify(warehousePayload)
        );
      }

      const res = await axios.post(MATERIALS_URL, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Material created:", res.data);
      alert("کالا با موفقیت ثبت شد.");
      navigate("/products/items");
    } catch (e) {
      console.log("BACKEND ERROR:", e?.response?.data);
      console.log("FULL ERROR:", e);

      setError(
        JSON.stringify(
          e?.response?.data || e.message,
          null,
          2
        )
      );

      alert("خطا در ثبت کالا.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1General formData={formData} setFormData={setFormData} />;
      case 2:
        return <Step2Inventory formData={formData} setFormData={setFormData} />;
      case 3:
        return <Step3Category formData={formData} setFormData={setFormData} />;
      case 4:
        return <Step4Pricing formData={formData} setFormData={setFormData} />;
      case 5:
        return <Step5Discount formData={formData} setFormData={setFormData} />;
      case 6:
        return (
          <Step6Review
            formData={formData}
            loading={loading}
            onBack={() => setStep(5)}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h2>افزودن کالای جدید</h2>
          <p>اطلاعات کالا را مرحله‌به‌مرحله وارد و در پایان ثبت کن.</p>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate("/products/items")}
        >
          بازگشت به لیست کالاها
        </button>
      </div>

      <div className={styles.container}>
        <div className={styles.progress}>
          {steps.map((item) => (
            <button
              key={item.num}
              type="button"
              className={`${styles.stepItem} ${step === item.num ? styles.stepCurrent : ""
                } ${step > item.num ? styles.stepDone : ""}`}
              onClick={() => setStep(item.num)}
            >
              <span className={styles.stepCircle}>
                {step > item.num ? "✓" : item.num}
              </span>

              <span>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
            </button>
          ))}
        </div>

        <div className={styles.stepTitle}>مرحله {step} از ۶</div>

        {error && <div className={styles.error}>{String(error)}</div>}

        <div className={styles.stepContainer}>{renderStep()}</div>

        {step <= 5 && (
          <div className={styles.buttons}>
            <button
              type="button"
              onClick={prevStep}
              className={`${styles.navBtn} ${styles.prevBtn}`}
              disabled={step === 1}
            >
              مرحله قبل
            </button>

            <button
              type="button"
              onClick={nextStep}
              className={`${styles.navBtn} ${styles.nextBtn}`}
            >
              مرحله بعد
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddProductForm;
