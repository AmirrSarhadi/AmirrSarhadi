// src/Pages/Products/Items/AddProduct/Step6Review.jsx
import { useMemo } from "react";
import styles from "./AddProductForm.module.css";

// ------ helpers (خارج از کامپوننت) ------
const safe = (v) => (v === null || v === undefined || v === "" ? "—" : v);

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const money = (v) => {
  const n = num(v);
  return n === null
    ? "—"
    : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(n);
};

const percent = (v) => {
  const n = num(v);
  return n === null ? "—" : `${n}%`;
};

const formatDate = (v) => {
  if (!v) return "—";
  if (typeof v === "object") {
    try {
      if (typeof v.format === "function") return v.format("YYYY/MM/DD");
      if (v.toISOString) return v.toISOString().slice(0, 10);
    } catch  {
      return "—";
    }
  }
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s || "—";
};

// ------ component ------
export default function Step6Review({ formData, onBack, onSubmit, loading }) {
  const dims = useMemo(
    () => [
      ["وزن", formData?.weight],
      ["طول", formData?.length],
      ["عرض", formData?.width],
      ["ارتفاع", formData?.height],
    ],
    [formData]
  );

  const orderLimits = useMemo(
    () => [
      ["گام فروش", formData?.step_sell],
      ["حداقل سفارش", formData?.min_order],
      ["حداکثر سفارش", formData?.max_order],
      ["آستانه کمبود", formData?.shortage_threshold],
    ],
    [formData]
  );

  const prices = useMemo(
    () => [
      ["قیمت فروش واحد", money(formData?.unit_selling_price)],
      ["مالیات", percent(formData?.tax_percent)],
      ["قیمت خرید واحد", money(formData?.unit_buying_price)],
      ["عوارض", money(formData?.charges)],
    ],
    [formData]
  );

  const cats = useMemo(
    () => [
      ["گروه", safe(formData?.material_group_name)],
      ["دسته‌بندی", safe(formData?.material_category_name)],
      ["برند", safe(formData?.material_brand_name)],
      ["تأمین‌کننده", safe(formData?.material_vendor)],
    ],
    [formData]
  );

  const currencies = useMemo(() => {
    const conv =
      formData?.conversion_factor_currency ??
      formData?.Conversion_factor_currency ??
      formData?.conversionFactorCurrency;
    return [
      ["ارز اصلی", safe(formData?.main_currency)],
      ["ارز ثانویه", safe(formData?.secondary_currency)],
      ["ضریب تبدیل", safe(conv)],
      ["توضیح ارز", safe(formData?.currency_description)],
    ];
  }, [formData]);

  const inventories = useMemo(() => {
    const list =
      formData?.warehouses ??
      formData?.initial_inventories ??
      formData?.initialInventories ??
      [];
    return list.map((w, i) => {
      const wid = w.warehouse_id ?? w.warehouseId ?? w.warehouse ?? w.id ?? "—";
      const amt =
        w.material_initial_inventory ??
        w.initial_inventory ??
        w.amount ??
        w.qty ??
        w.quantity ??
        w.value ??
        null;
      return { i: i + 1, warehouse_id: wid, amount: amt };
    });
  }, [formData]);

  const discounts = useMemo(() => {
    const list = formData?.discounts ?? [];
    return list.map((d, i) => ({
      i: i + 1,
      title: d.title,
      target_type: d.target_type ?? d.targetType,
      target_id: d.target_id ?? d.targetId,
      discount_percent: d.discount_percent ?? d.percent,
      discount_amount: d.discount_amount ?? d.amount,
      valid_from: formatDate(d.valid_from ?? d.validFrom),
      valid_to: formatDate(d.valid_to ?? d.validTo),
    }));
  }, [formData]);

  return (
    <div className={styles.stepContainer}>
      <h3>بازبینی نهایی</h3>

      <div className={styles.reviewGrid}>
        <section>
          <h4>عمومی</h4>
          <ul>
            {[
              ["کد کالا (SKU)", formData?.sku_code],
              ["کد حسابداری", formData?.accounting_code],
              ["نام فارسی", formData?.persian_name],
              ["نام انگلیسی", formData?.english_name],
              ["بارکد", formData?.barcode],
              ["سریال", formData?.serial_code],
            ].map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {safe(v)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>ارز</h4>
          <ul>
            {currencies.map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {v}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>ابعاد</h4>
          <ul>
            {dims.map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {safe(v)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>سفارش/موجودی</h4>
          <ul>
            {orderLimits.map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {safe(v)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>دسته‌بندی</h4>
          <ul>
            {cats.map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {v}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4>قیمت‌گذاری</h4>
          <ul>
            {prices.map(([k, v]) => (
              <li key={k}>
                <b>{k}:</b> {v}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.sectionBox}>
        <h4>توضیحات</h4>
        <p>{safe(formData?.description)}</p>
      </div>

      <div className={styles.sectionBox}>
        <h4>موجودی اولیه انبارها</h4>
        {inventories.length ? (
          <table className={styles.reviewTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>ID انبار</th>
                <th>موجودی اولیه</th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((row) => (
                <tr key={row.i}>
                  <td>{row.i}</td>
                  <td>{safe(row.warehouse_id)}</td>
                  <td>{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>تعریف نشده</div>
        )}
      </div>

      <div className={styles.sectionBox}>
        <h4>تخفیف‌ها</h4>
        {discounts.length ? (
          <table className={styles.reviewTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>عنوان</th>
                <th>هدف</th>
                <th>ID هدف</th>
                <th>%</th>
                <th>مبلغ</th>
                <th>از</th>
                <th>تا</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.i}>
                  <td>{d.i}</td>
                  <td>{safe(d.title)}</td>
                  <td>{safe(d.target_type)}</td>
                  <td>{safe(d.target_id)}</td>
                  <td>{percent(d.discount_percent)}</td>
                  <td>{money(d.discount_amount)}</td>
                  <td>{d.valid_from}</td>
                  <td>{d.valid_to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>تعریف نشده</div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={onBack}
          disabled={loading}
        >
          بازگشت
        </button>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={onSubmit}
          disabled={loading}
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? "در حال ارسال..." : "ثبت نهایی ✅"}
        </button>
      </div>
    </div>
  );
}
